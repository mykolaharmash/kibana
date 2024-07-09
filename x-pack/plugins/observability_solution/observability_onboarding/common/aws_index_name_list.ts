/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const AWS_LOGS_INDEX_NAME_LIST = [
  'logs-aws.vpcflow',
  'logs-aws.apigateway_logs',
  'logs-aws.cloudtrail',
  'logs-aws.firewall_logs',
  'logs-aws.route53_public_logs',
  'logs-aws.route53_resolver_logs',
  'logs-aws.waf',
  'logs-awsfirehose',
] as const;

export type AWSLogsIndexName = (typeof AWS_LOGS_INDEX_NAME_LIST)[number];
