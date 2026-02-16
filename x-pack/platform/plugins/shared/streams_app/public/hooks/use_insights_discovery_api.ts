/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useAbortController } from '@kbn/react-hooks';
import { useMemo } from 'react';
import { useKibana } from './use_kibana';

export function useInsightsDiscoveryApi(connectorId?: string) {
  const {
    dependencies: {
      start: {
        streams: { streamsRepositoryClient },
      },
    },
  } = useKibana();

  const { signal } = useAbortController();

  return useMemo(
    () => ({
      scheduleInsightsDiscoveryTask: async (streamNames: string[]) => {
        await streamsRepositoryClient.fetch('POST /internal/streams/_insights/_task', {
          signal,
          params: {
            body: {
              connectorId,
              streamNames,
            },
          },
        });
      },
      getInsightsDiscoveryTaskStatusList: async (taskIds?: string[]) => {
        return streamsRepositoryClient.fetch('POST /internal/streams/_insights/_status', {
          signal,
          params: {
            body: {
              taskIds,
            },
          },
        });
      },
      cancelInsightsDiscoveryTask: async (taskId: string) => {
        return streamsRepositoryClient.fetch(
          'POST /internal/streams/_insights/_task/{taskId}/cancel',
          {
            signal,
            params: {
              path: {
                taskId,
              },
            },
          }
        );
      },
    }),
    [connectorId, signal, streamsRepositoryClient]
  );
}
