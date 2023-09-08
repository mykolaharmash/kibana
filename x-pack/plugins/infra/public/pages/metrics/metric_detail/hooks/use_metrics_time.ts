/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import createContainer from 'constate';
import { useState, useCallback, useEffect } from 'react';
import moment from 'moment';
import dateMath from '@kbn/datemath';
import * as rt from 'io-ts';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { constant, identity } from 'fp-ts/lib/function';
import type { TimeRange } from '@kbn/es-query';
import { replaceStateKeyInQueryString } from '../../../../../common/url_state_storage_service';
import { useUrlState } from '../../../../utils/use_url_state';

const parseRange = (range: TimeRange) => {
  const parsedFrom = dateMath.parse(range.from);
  const parsedTo = dateMath.parse(range.to, { roundUp: true });
  return {
    from: (parsedFrom && parsedFrom.valueOf()) || moment().subtract(1, 'hour').valueOf(),
    to: (parsedTo && parsedTo.valueOf()) || moment().valueOf(),
  };
};

const DEFAULT_TIME_RANGE: TimeRange = {
  from: 'now-1h',
  to: 'now',
};

const DEFAULT_URL_STATE: MetricsTimeUrlState = {
  time: DEFAULT_TIME_RANGE,
  autoReload: false,
  refreshInterval: 5000,
};

export const useMetricsTime = () => {
  const [urlState, setUrlState] = useUrlState<MetricsTimeUrlState>({
    defaultState: DEFAULT_URL_STATE,
    decodeUrlState,
    encodeUrlState,
    urlStateKey: '_a',
  });

  const [isAutoReloading, setAutoReload] = useState(urlState.autoReload || false);
  const [refreshInterval, setRefreshInterval] = useState(urlState.refreshInterval || 5000);
  const [lastRefresh, setLastRefresh] = useState<number>(moment().valueOf());
  const [timeRange, setTimeRange] = useState<TimeRange>({
    ...DEFAULT_TIME_RANGE,
    ...urlState.time,
  });

  useEffect(() => {
    const newState = {
      time: timeRange,
      autoReload: isAutoReloading,
      refreshInterval,
    };
    return setUrlState(newState);
  }, [isAutoReloading, refreshInterval, setUrlState, timeRange]);

  const [parsedTimeRange, setParsedTimeRange] = useState(
    parseRange(urlState.time || DEFAULT_TIME_RANGE)
  );

  const updateTimeRange = useCallback((range: TimeRange, parseDate = true) => {
    setTimeRange(range);
    if (parseDate) {
      setParsedTimeRange(parseRange(range));
    }
  }, []);

  return {
    timeRange,
    setTimeRange: updateTimeRange,
    parsedTimeRange,
    refreshInterval,
    setRefreshInterval,
    isAutoReloading,
    setAutoReload,
    lastRefresh,
    triggerRefresh: useCallback(() => {
      return setLastRefresh(moment().valueOf());
    }, [setLastRefresh]),
  };
};

export const MetricsTimeUrlStateRT = rt.partial({
  time: rt.type({
    from: rt.string,
    to: rt.string,
  }),
  autoReload: rt.boolean,
  refreshInterval: rt.number,
});
export type MetricsTimeUrlState = rt.TypeOf<typeof MetricsTimeUrlStateRT>;

const encodeUrlState = MetricsTimeUrlStateRT.encode;
const decodeUrlState = (value: unknown) =>
  pipe(MetricsTimeUrlStateRT.decode(value), fold(constant(undefined), identity));

export const replaceMetricTimeInQueryString = (from: string, to: string) =>
  replaceStateKeyInQueryString<MetricsTimeUrlState>('_a', {
    autoReload: false,
    time: { from, to },
  });

export const MetricsTimeContainer = createContainer(useMetricsTime);
export const [MetricsTimeProvider, useMetricsTimeContext] = MetricsTimeContainer;
