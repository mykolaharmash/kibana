/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isNumber } from 'lodash';
import type { SnapshotMetricType } from '@kbn/metrics-data-access-plugin/common';
import { InfraFormatterType } from '../../../../common/inventory/types';
import type { SnapshotMetricInput } from '../../../../../common/http_api/snapshot_api';
import { SnapshotCustomMetricInputRT } from '../../../../../common/http_api/snapshot_api';
import { createFormatterForMetric } from '../../metrics_explorer/components/helpers/create_formatter_for_metric';
import { createFormatter } from '../../../../../common/formatters';

interface MetricFormatter {
  formatter: InfraFormatterType;
  template: string;
  bounds?: { min: number; max: number };
}

type MetricFormatters = {
  [key in SnapshotMetricType]?: MetricFormatter;
};

const METRIC_FORMATTERS: MetricFormatters = {
  count: { formatter: InfraFormatterType.number, template: '{{value}}' },
  cpu: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  cpuV2: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  diskIOReadBytes: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}/s',
  },
  diskIOWriteBytes: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}/s',
  },
  diskLatency: {
    formatter: InfraFormatterType.number,
    template: '{{value}} ms',
  },
  diskSpaceUsage: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  memory: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  memoryFree: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  memoryTotal: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  normalizedLoad1m: {
    formatter: InfraFormatterType.percent,
    template: '{{value}}',
  },
  rx: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  tx: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  rxV2: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  txV2: { formatter: InfraFormatterType.bits, template: '{{value}}/s' },
  logRate: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}/s',
  },
  s3BucketSize: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  s3TotalRequests: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}',
  },
  s3NumberOfObjects: {
    formatter: InfraFormatterType.abbreviatedNumber,
    template: '{{value}}',
  },
  s3UploadBytes: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  s3DownloadBytes: {
    formatter: InfraFormatterType.bytes,
    template: '{{value}}',
  },
  sqsOldestMessage: {
    formatter: InfraFormatterType.number,
    template: '{{value}} seconds',
  },
  rdsLatency: {
    formatter: InfraFormatterType.number,
    template: '{{value}} ms',
  },
};

export const createInventoryMetricFormatter =
  (metric: SnapshotMetricInput) => (val: string | number) => {
    if (SnapshotCustomMetricInputRT.is(metric)) {
      const formatter = createFormatterForMetric(metric);
      return isNumber(val) ? formatter(val) : val;
    }
    const metricFormatter = get(METRIC_FORMATTERS, metric.type, METRIC_FORMATTERS.count);
    if (val == null || !metricFormatter) {
      return '';
    }
    const formatter = createFormatter(metricFormatter.formatter, metricFormatter.template);
    return formatter(val);
  };
