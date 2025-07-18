/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getGroupingQuery } from '@kbn/grouping';
import {
  GroupingAggregation,
  GroupPanelRenderer,
  GetGroupStats,
  isNoneGroup,
  NamedAggregation,
  parseGroupingQuery,
  MAX_RUNTIME_FIELD_SIZE,
} from '@kbn/grouping/src';
import { useMemo } from 'react';
import {
  CDR_EXTENDED_VULN_RETENTION_POLICY,
  VULNERABILITIES_SEVERITY,
} from '@kbn/cloud-security-posture-common';
import type { VulnerabilitiesGroupingAggregation } from '@kbn/cloud-security-posture';
import { buildEsQuery, Filter } from '@kbn/es-query';
import { checkIsFlattenResults } from '@kbn/grouping/src/containers/query/helpers';
import {
  LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY,
  VULNERABILITY_GROUPING_OPTIONS,
  VULNERABILITY_FIELDS,
  CDR_VULNERABILITY_GROUPING_RUNTIME_MAPPING_FIELDS,
  EVENT_ID,
  VULNERABILITY_GROUPING_MULTIPLE_VALUE_FIELDS,
} from '../../../common/constants';
import { useDataViewContext } from '../../../common/contexts/data_view_context';
import {
  VulnerabilitiesRootGroupingAggregation,
  useGroupedVulnerabilities,
} from './use_grouped_vulnerabilities';
import { defaultGroupingOptions, getDefaultQuery } from '../constants';
import { useCloudSecurityGrouping } from '../../../components/cloud_security_grouping';
import { VULNERABILITIES_UNIT, groupingTitle, VULNERABILITIES_GROUPS_UNIT } from '../translations';

const getTermAggregation = (key: keyof VulnerabilitiesGroupingAggregation, field: string) => ({
  [key]: {
    terms: { field, size: 1 },
  },
});

const getAggregationsByGroupField = (field: string): NamedAggregation[] => {
  if (isNoneGroup([field])) {
    return [];
  }
  const aggMetrics: NamedAggregation[] = [
    {
      groupByField: {
        cardinality: {
          field,
        },
      },
      critical: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: VULNERABILITIES_SEVERITY.CRITICAL,
              case_insensitive: true,
            },
          },
        },
      },
      high: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: VULNERABILITIES_SEVERITY.HIGH,
              case_insensitive: true,
            },
          },
        },
      },
      medium: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: VULNERABILITIES_SEVERITY.MEDIUM,
              case_insensitive: true,
            },
          },
        },
      },
      low: {
        filter: {
          term: {
            'vulnerability.severity': {
              value: VULNERABILITIES_SEVERITY.LOW,
              case_insensitive: true,
            },
          },
        },
      },
    },
  ];

  switch (field) {
    case VULNERABILITY_GROUPING_OPTIONS.RESOURCE_ID:
      return [
        ...aggMetrics,
        getTermAggregation('resourceName', VULNERABILITY_FIELDS.RESOURCE_NAME),
      ];
    case VULNERABILITY_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID:
      return [
        ...aggMetrics,
        getTermAggregation('cloudProvider', VULNERABILITY_FIELDS.CLOUD_PROVIDER),
        getTermAggregation('accountName', VULNERABILITY_FIELDS.CLOUD_ACCOUNT_NAME),
      ];
    case VULNERABILITY_GROUPING_OPTIONS.CVE:
      return [...aggMetrics, getTermAggregation('description', VULNERABILITY_FIELDS.DESCRIPTION)];
  }
  return aggMetrics;
};

/**
 * Get runtime mappings for the given group field
 * Some fields require additional runtime mappings to aggregate additional information
 * Fallback to keyword type to support custom fields grouping
 */
const getRuntimeMappingsByGroupField = (
  field: string
): Record<string, { type: 'keyword' }> | undefined => {
  if (CDR_VULNERABILITY_GROUPING_RUNTIME_MAPPING_FIELDS?.[field]) {
    return CDR_VULNERABILITY_GROUPING_RUNTIME_MAPPING_FIELDS[field].reduce(
      (acc, runtimeField) => ({
        ...acc,
        [runtimeField]: {
          type: 'keyword',
        },
      }),
      {}
    );
  }
  return {};
};

/**
 * Returns the root aggregations query for the vulnerabilities grouping
 */
const getRootAggregations = (currentSelectedGroup: string): NamedAggregation[] => {
  // Skip creating null group if "None" is selected
  if (isNoneGroup([currentSelectedGroup])) {
    return [{}];
  }

  const shouldFlattenMultiValueField = checkIsFlattenResults(
    currentSelectedGroup,
    VULNERABILITY_GROUPING_MULTIPLE_VALUE_FIELDS
  );

  // Create null group filter based on whether we need to flatten results
  const nullGroupFilter = shouldFlattenMultiValueField
    ? {
        // For multi-value fields, check if field doesn't exist OR has too many values
        bool: {
          should: [
            {
              bool: {
                must_not: {
                  exists: { field: currentSelectedGroup },
                },
              },
            },
            {
              script: {
                script: {
                  source: `doc['${currentSelectedGroup}'].size() > ${MAX_RUNTIME_FIELD_SIZE}`,
                  lang: 'painless',
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      }
    : undefined; // Not used for simple fields

  return [
    {
      nullGroupItems: shouldFlattenMultiValueField
        ? { filter: nullGroupFilter }
        : { missing: { field: currentSelectedGroup } },
    },
  ];
};

/**
 * Type Guard for checking if the given source is a VulnerabilitiesRootGroupingAggregation
 */
export const isVulnerabilitiesRootGroupingAggregation = (
  groupData: Record<string, any> | undefined
): groupData is VulnerabilitiesRootGroupingAggregation => {
  return groupData?.unitsCount?.value !== undefined;
};

/**
 * Utility hook to get the latest vulnerabilities grouping data
 * for the vulnerabilities page
 */
export const useLatestVulnerabilitiesGrouping = ({
  groupPanelRenderer,
  getGroupStats,
  groupingLevel = 0,
  groupFilters = [],
  selectedGroup,
}: {
  groupPanelRenderer?: GroupPanelRenderer<VulnerabilitiesGroupingAggregation>;
  getGroupStats?: GetGroupStats<VulnerabilitiesGroupingAggregation>;
  groupingLevel?: number;
  groupFilters?: Filter[];
  selectedGroup?: string;
}) => {
  const { dataView } = useDataViewContext();

  const {
    activePageIndex,
    grouping,
    pageSize,
    query,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    urlQuery,
    setUrlQuery,
    uniqueValue,
    isNoneSelected,
    onResetFilters,
    error,
    filters,
    setActivePageIndex,
  } = useCloudSecurityGrouping({
    dataView,
    groupingTitle,
    defaultGroupingOptions,
    getDefaultQuery,
    unit: VULNERABILITIES_UNIT,
    groupPanelRenderer,
    getGroupStats,
    groupingLocalStorageKey: LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY,
    groupingLevel,
    groupsUnit: VULNERABILITIES_GROUPS_UNIT,
  });

  const additionalFilters = buildEsQuery(dataView, [], groupFilters);
  const currentSelectedGroup = selectedGroup || grouping.selectedGroups[0];

  const groupingQuery = getGroupingQuery({
    additionalFilters: query ? [query, additionalFilters] : [additionalFilters],
    groupByField: currentSelectedGroup,
    uniqueValue,
    timeRange: {
      from: `now-${CDR_EXTENDED_VULN_RETENTION_POLICY}`,
      to: 'now',
    },
    pageNumber: activePageIndex * pageSize,
    size: pageSize,
    sort: [{ groupByField: { order: 'desc' } }],
    statsAggregations: getAggregationsByGroupField(currentSelectedGroup),
    runtimeMappings: getRuntimeMappingsByGroupField(currentSelectedGroup),
    rootAggregations: getRootAggregations(currentSelectedGroup),
    multiValueFieldsToFlatten: VULNERABILITY_GROUPING_MULTIPLE_VALUE_FIELDS,
    countByKeyForMultiValueFields: EVENT_ID,
  });

  const { data, isFetching } = useGroupedVulnerabilities({
    query: groupingQuery,
    enabled: !isNoneSelected,
  });

  const groupData = useMemo(
    () =>
      parseGroupingQuery(
        currentSelectedGroup,
        uniqueValue,
        data as GroupingAggregation<VulnerabilitiesGroupingAggregation>
      ),
    [data, currentSelectedGroup, uniqueValue]
  );

  const isEmptyResults =
    !isFetching &&
    isVulnerabilitiesRootGroupingAggregation(groupData) &&
    groupData.unitsCount?.value === 0;

  return {
    groupData,
    grouping,
    isFetching,
    activePageIndex,
    setActivePageIndex,
    pageSize,
    selectedGroup,
    onChangeGroupsItemsPerPage,
    onChangeGroupsPage,
    urlQuery,
    setUrlQuery,
    isGroupSelected: !isNoneSelected,
    isGroupLoading: !data,
    onResetFilters,
    filters,
    error,
    isEmptyResults,
  };
};
