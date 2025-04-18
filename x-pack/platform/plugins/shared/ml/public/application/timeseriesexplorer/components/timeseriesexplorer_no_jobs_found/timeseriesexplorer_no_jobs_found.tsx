/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * React component for rendering EuiEmptyPrompt when no jobs were found.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import { EuiEmptyPrompt, EuiButton } from '@elastic/eui';
import { useMlManagementLink } from '../../../contexts/kibana/use_create_url';
import { ML_PAGES } from '../../../../../common/constants/locator';
import { usePermissionCheck } from '../../../capabilities/check_capabilities';
import { mlNodesAvailable } from '../../../ml_nodes_check';
import { MANAGEMENT_SECTION_IDS } from '../../../management';

export const TimeseriesexplorerNoJobsFound = () => {
  const jobLink = useMlManagementLink(
    ML_PAGES.ANOMALY_DETECTION_CREATE_JOB,
    MANAGEMENT_SECTION_IDS.ANOMALY_DETECTION
  );

  const canCreateJob = usePermissionCheck('canCreateJob');
  const disableCreateAnomalyDetectionJob: boolean = !canCreateJob || !mlNodesAvailable();

  return (
    <EuiEmptyPrompt
      data-test-subj="mlNoSingleMetricJobsFound"
      iconType="warning"
      title={
        <h2>
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.noSingleMetricJobsFoundLabel"
            defaultMessage="No single metric jobs found"
          />
        </h2>
      }
      actions={
        // @ts-ignore disabled type expects undefined
        <EuiButton color="primary" fill href={jobLink} disabled={disableCreateAnomalyDetectionJob}>
          <FormattedMessage
            id="xpack.ml.timeSeriesExplorer.createNewSingleMetricJobLinkText"
            defaultMessage="Create new single metric job"
          />
        </EuiButton>
      }
    />
  );
};
