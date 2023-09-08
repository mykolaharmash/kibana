/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Location } from 'history';

import { getParamFromQueryString, getQueryStringFromLocation } from '../../utils/url_state';

export const getTimeFromLocation = (location: Location) => {
  const timeParam = getParamFromQueryString(getQueryStringFromLocation(location), 'time');
  return timeParam ? parseFloat(timeParam) : NaN;
};

export const getFilterFromLocation = (location: Location) => {
  const param = getParamFromQueryString(getQueryStringFromLocation(location), 'filter');
  return param ? param : '';
};

export const getToFromLocation = (location: Location) => {
  return getParamFromQueryString(getQueryStringFromLocation(location), 'to') ?? '';
};

export const getFromFromLocation = (location: Location) => {
  return getParamFromQueryString(getQueryStringFromLocation(location), 'from') ?? '';
};

export const getNodeNameFromLocation = (location: Location) => {
  const nameParam = getParamFromQueryString(getQueryStringFromLocation(location), 'assetName');
  return nameParam;
};

export const getStateFromLocation = (location: Location) => {
  const nameParam = getParamFromQueryString(getQueryStringFromLocation(location), 'state');
  return nameParam;
};
