/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';
import useAsync from 'react-use/lib/useAsync';
import { useKibana } from './use_kibana';

type IntegrationInstallStatus =
  | 'installed'
  | 'installing'
  | 'install_failed'
  | 'not_installed';

export function useNginxIntegration() {
  const {
    services: { http },
  } = useKibana();

  return useAsync(async () => {
    const options = {
      headers: { 'Elastic-Api-Version': '2023-10-31' },
    };

    const { item: nginxIntegration } = await http.get<{
      item: { version: string; status: IntegrationInstallStatus };
    }>('/api/fleet/epm/packages/nginx', options);

    if (nginxIntegration.status !== 'installed') {
      await http.post('/api/fleet/epm/packages/nginx', options);
    }

    return nginxIntegration.version;
  });
}
