/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpFetchOptions } from '@kbn/core-http-browser';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from './use_kibana';

export function useOnboardingFlow() {
  const {
    services: { http },
  } = useKibana();

  return useAsync(async () => {
    const options: HttpFetchOptions = {
      headers: { 'Elastic-Api-Version': '2023-10-31' },
    };

    const [
      { apiEndpoint, scriptDownloadUrl, elasticAgentVersion },
      { apiKeyEncoded, onboardingId },
    ] = await Promise.all([
      http.get<{
        apiEndpoint: string;
        scriptDownloadUrl: string;
        elasticAgentVersion: string;
      }>('/internal/observability_onboarding/logs/setup/environment', options),
      http.post<{
        apiKeyEncoded: string;
        onboardingId: string;
      }>('/internal/observability_onboarding/logs/flow', {
        ...options,
        body: JSON.stringify({
          name: 'nginx',
          type: 'nginx',
        }),
      }),
    ]);

    return {
      apiEndpoint,
      scriptDownloadUrl,
      elasticAgentVersion,
      apiKeyEncoded,
      onboardingId,
    };
  });
}
