/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import hash from 'object-hash';
import { stableStringify } from '@kbn/std';

interface Params {
  taskType: string;
  streamNames: string[];
  from?: string;
  to?: string;
}

export function generateInsightsTaskId({ taskType, streamNames, from = '', to = '' }: Params) {
  return hash(
    stableStringify({
      taskType,
      streamNames: streamNames.toSorted((a, b) => a.localeCompare(b)),
      from,
      to,
    })
  );
}
