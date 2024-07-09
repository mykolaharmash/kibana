/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import Boom from '@hapi/boom';
import * as t from 'io-ts';
import { termQuery } from '@kbn/observability-plugin/server';
import type { estypes } from '@elastic/elasticsearch';
import { AWSLogsIndexName, AWS_LOGS_INDEX_NAME_LIST } from '../../../common/aws_index_name_list';
import { getFallbackESUrl } from '../../lib/get_fallback_urls';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';

export interface CreateFirehoseOnboardingFlowRouteResponse {
  apiKeyEncoded: string;
  onboardingId: string;
  elasticsearchUrl: string;
  templateUrl: string;
}

interface DocumentCountPerIndexBucket {
  key: string;
  doc_count: number;
}

export type HasFirehoseDataRouteResponse = AWSLogsIndexName[];

const createFirehoseOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/firehose/flow',
  options: { tags: [] },
  async handler({
    context,
    core,
    request,
    plugins,
    services,
  }): Promise<CreateFirehoseOnboardingFlowRouteResponse> {
    const {
      elasticsearch: { client },
    } = await context.core;

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);

    if (!hasPrivileges) {
      throw Boom.forbidden(
        "You don't have enough privileges to start a new onboarding flow. Contact your system administrator to grant you the required privileges."
      );
    }

    const fleetPluginStart = await plugins.fleet.start();
    const packageClient = fleetPluginStart.packageService.asScoped(request);

    await Promise.all([
      packageClient.ensureInstalledPackage({ pkgName: 'awsfirehose' }),
      packageClient.ensureInstalledPackage({ pkgName: 'aws' }),
    ]);

    const { encoded: apiKeyEncoded } = await createShipperApiKey(
      client.asCurrentUser,
      'firehose_onboarding'
    );
    const elasticsearchUrlList = plugins.cloud?.setup?.elasticsearchUrl
      ? [plugins.cloud?.setup?.elasticsearchUrl]
      : await getFallbackESUrl(services.esLegacyConfigService);

    return {
      onboardingId: uuidv4(),
      apiKeyEncoded,
      elasticsearchUrl: elasticsearchUrlList.length > 0 ? elasticsearchUrlList[0] : '',
      templateUrl:
        'https://mykolaharmash-cf-template.s3.us-west-2.amazonaws.com/cloudwatch_logs.yml',
    };
  },
});

const hasFirehoseDataRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/firehose/{streamName}/has-data',
  params: t.type({
    path: t.type({
      streamName: t.string,
    }),
  }),
  options: { tags: [] },
  async handler(resources): Promise<HasFirehoseDataRouteResponse> {
    const { streamName } = resources.params.path;
    const { elasticsearch } = await resources.context.core;
    const indexPatternList = AWS_LOGS_INDEX_NAME_LIST.map((index) => `${index}-*`);

    try {
      const result = await elasticsearch.client.asCurrentUser.search<
        unknown,
        Record<
          'documents_per_index',
          estypes.AggregationsMultiBucketAggregateBase<DocumentCountPerIndexBucket>
        >
      >({
        index: indexPatternList,
        ignore_unavailable: true,
        size: 0,
        query: {
          bool: {
            filter: termQuery('aws.kinesis.name', streamName),
          },
        },
        aggs: {
          documents_per_index: {
            terms: {
              field: '_index',
              size: indexPatternList.length,
            },
          },
        },
      });

      const buckets = result.aggregations?.documents_per_index.buckets;

      if (!Array.isArray(buckets)) {
        return [];
      }

      return AWS_LOGS_INDEX_NAME_LIST.filter((indexName) => {
        return buckets.some((bucket) => bucket.key.includes(indexName) && bucket.doc_count > 0);
      });
    } catch (error) {
      throw Boom.internal(`Elasticsearch responded with an error. ${error.message}`);
    }
  },
});

export const firehoseOnboardingRouteRepository = {
  ...createFirehoseOnboardingFlowRoute,
  ...hasFirehoseDataRoute,
};
