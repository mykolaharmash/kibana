/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { chain } from 'fp-ts/Either';
import { pipe } from 'fp-ts/function';
import * as t from 'io-ts';
import { isoToEpochRt } from '../iso_to_epoch_rt';

export const isoToEpochSecsRt = new t.Type<number, string, unknown>(
  'isoToEpochSecsRt',
  t.number.is,
  (value) =>
    pipe(
      isoToEpochRt.decode(value),
      chain((epochMsValue) => {
        return t.success(epochMsValue / 1000);
      })
    ),
  (output) => new Date(output).toISOString()
);
