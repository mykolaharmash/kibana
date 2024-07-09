/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { DASHBOARD_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { SINGLE_DATASET_LOCATOR_ID } from '@kbn/deeplinks-observability';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { AWSLogsIndexName } from '../../../../common/aws_index_name_list';
import { ObservabilityOnboardingContextValue } from '../../../plugin';

interface AWSServiceGetStartedConfig {
  id: string;
  indexNameList: AWSLogsIndexName[];
  title: string;
  logoURL: string;
  previewImage?: string;
  actionLinks: Array<{
    id: string;
    title: string;
    label: string;
    href: string;
  }>;
}

export function useAWSServiceGetStartedList(): AWSServiceGetStartedConfig[] {
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingContextValue>();
  const dashboardLocator = share.url.locators.get(DASHBOARD_APP_LOCATOR);
  const singleDatasetLocator = share.url.locators.get(SINGLE_DATASET_LOCATOR_ID);

  return useMemo(
    () => [
      {
        id: 'vpc-flow',
        indexNameList: ['logs-aws.vpcflow'],
        title: 'VPC',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_vpcflow.svg',
        actionLinks: [
          {
            id: 'vpc-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'Overview your logs data with this pre-made dashboard',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs data',
              }
            ),
            href:
              dashboardLocator?.getRedirectUrl({
                dashboardId: 'aws-15503340-4488-11ea-ad63-791a5dc86f10',
              }) ?? '',
          },
        ],
      },
      {
        id: 'api-gateway',
        indexNameList: ['logs-aws.apigateway_logs'],
        title: 'API Gateway',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_apigateway.svg',
        actionLinks: [
          {
            id: 'api-gateway-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'Overview your logs data with this pre-made dashboard',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs data',
              }
            ),
            href:
              dashboardLocator?.getRedirectUrl({
                dashboardId: 'aws-5465f0f0-26e4-11ee-9051-011d57d86fe2',
              }) ?? '',
          },
        ],
      },
      {
        id: 'cloudtrail',
        indexNameList: ['logs-aws.cloudtrail'],
        title: 'CloudTrail',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_cloudtrail.svg',
        actionLinks: [
          {
            id: 'cloudtrail-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'Overview your logs data with this pre-made dashboard',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs data',
              }
            ),
            href:
              dashboardLocator?.getRedirectUrl({
                dashboardId: 'aws-9c09cd20-7399-11ea-a345-f985c61fe654',
              }) ?? '',
          },
        ],
      },
      {
        id: 'firewall',
        indexNameList: ['logs-aws.firewall_logs'],
        title: 'Network Firewall',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_firewall.svg',
        actionLinks: [
          {
            id: 'firewall-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'Overview your logs data with this pre-made dashboard',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs data',
              }
            ),
            href:
              dashboardLocator?.getRedirectUrl({
                dashboardId: 'aws-2ba11b50-4b9d-11ec-8282-5342b8988acc',
              }) ?? '',
          },
        ],
      },
      {
        id: 'route53',
        indexNameList: ['logs-aws.route53_public_logs', 'logs-aws.route53_resolver_logs'],
        title: 'Route53',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_route53.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          {
            id: 'route53-public-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'See Route53 public logs in Logs Explorer',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs',
              }
            ),
            href:
              singleDatasetLocator?.getRedirectUrl({
                integration: 'AWS',
                dataset: 'route53_public_logs',
              }) ?? '',
          },
          {
            id: 'route53-resolver-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'See Route53 resolver logs in Logs Explorer',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs',
              }
            ),
            href:
              singleDatasetLocator?.getRedirectUrl({
                integration: 'AWS',
                dataset: 'route53_resolver_logs',
              }) ?? '',
          },
        ],
      },
      {
        id: 'waf',
        indexNameList: ['logs-aws.waf'],
        title: 'WAF',
        logoURL: 'https://epr.elastic.co/package/aws/2.21.0/img/logo_waf.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          {
            id: 'waf-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'See WAF logs in Logs Explorer',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs',
              }
            ),
            href:
              singleDatasetLocator?.getRedirectUrl({
                integration: 'AWS',
                dataset: 'waf',
              }) ?? '',
          },
        ],
      },
      {
        id: 'firehose',
        indexNameList: ['logs-awsfirehose'],
        title: 'Uncategorized Firehose Logs',
        logoURL: 'https://epr.elastic.co/package/awsfirehose/1.1.0/img/logo_firehose.svg',
        previewImage: 'waterfall_screen.svg',
        actionLinks: [
          {
            id: 'uncategorized-firehose-logs-overview-dashboard',
            title: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataTitle',
              {
                defaultMessage: 'See all logs in Logs Explorer',
              }
            ),
            label: i18n.translate(
              'xpack.observability_onboarding.firehosePanel.exploreLogsDataLabel',
              {
                defaultMessage: 'Explore logs',
              }
            ),
            href:
              singleDatasetLocator?.getRedirectUrl({
                integration: 'firehose',
                dataset: 'logs',
              }) ?? '',
          },
        ],
      },
    ],
    [dashboardLocator, singleDatasetLocator]
  );
}
