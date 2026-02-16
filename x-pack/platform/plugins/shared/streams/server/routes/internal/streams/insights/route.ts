/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InsightsResult } from '@kbn/streams-schema';
import { z } from '@kbn/zod';
import type { TaskResult } from '@kbn/streams-schema';
import { STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE } from '@kbn/streams-schema/src/insights';
import { generateInsightsTaskId } from '../../../../../common';
import { STREAMS_API_PRIVILEGES } from '../../../../../common/constants';
import type { InsightsDiscoveryTaskParams } from '../../../../lib/tasks/task_definitions/insights_discovery';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { resolveConnectorId } from '../../../utils/resolve_connector_id';
import { handleTaskAction } from '../../../utils/task_helpers';

/* Insights Discovery Task */

export type InsightsTaskResult = TaskResult<InsightsResult>;

const insightsTaskRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_task',
  options: {
    access: 'internal',
    summary: 'Management of the insights discovery task',
    description: 'schedules/cancels/acknowledges the insights discovery task',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    body: z.object({
      connectorId: z
        .string()
        .optional()
        .describe(
          'Optional connector ID. If not provided, the default AI connector from settings will be used.'
        ),
      streamNames: z.array(z.string()).describe('List of stream names to generate insights for.'),
    }),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    logger,
  }): Promise<InsightsTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { body } = params;

    const taskId = generateInsightsTaskId({
      taskType: STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE,
      streamNames: body.streamNames,
    });

    return handleTaskAction<InsightsDiscoveryTaskParams, InsightsResult>({
      taskClient,
      taskId,
      action: 'schedule',
      scheduleConfig: {
        taskType: STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE,
        taskId,
        params: await (async (): Promise<InsightsDiscoveryTaskParams> => {
          const connectorId = await resolveConnectorId({
            connectorId: body.connectorId,
            uiSettingsClient,
            logger,
          });

          return {
            connectorId,
            streamNames: body.streamNames,
          };
        })(),
        request,
      },
    });
  },
});

const insightsTaskCancelRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_task/{taskId}/cancel',
  options: {
    access: 'internal',
    summary: 'Management of the insights discovery task',
    description: 'schedules/cancels/acknowledges the insights discovery task',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.manage],
    },
  },
  params: z.object({
    path: z.object({ taskId: z.string() }).describe('ID of the insights task to cancel'),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<InsightsTaskResult> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });

    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const { path } = params;

    return handleTaskAction<InsightsDiscoveryTaskParams, InsightsResult>({
      taskClient,
      taskId: path.taskId,
      action: 'cancel',
    });
  },
});

/**
 * Returns a list of statuses for all existing insights tasks,
 * included completed ones.
 * Can be filtered by `taskIds` parameter to returns statuses only
 * for specified list of tasks.
 */
const insightsStatusRoute = createServerRoute({
  endpoint: 'POST /internal/streams/_insights/_status',
  options: {
    access: 'internal',
    summary: 'Check the status of insights discovery',
    description: 'Check the status of insights discovery',
  },
  security: {
    authz: {
      requiredPrivileges: [STREAMS_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    body: z
      .object({
        taskIds: z
          .array(z.string())
          .optional()
          .describe('Optional list of insights discovery task IDs to retrieve statuses for.'),
      })
      .optional(),
  }),
  handler: async ({ params, request, getScopedClients, server }): Promise<InsightsTaskResult[]> => {
    const { licensing, uiSettingsClient, taskClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing, uiSettingsClient });

    const statuses = await taskClient.getStatusesByType<
      InsightsDiscoveryTaskParams,
      InsightsResult
    >(STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE);

    const taskIds = params?.body?.taskIds;

    if (!taskIds?.length) {
      return statuses;
    }

    const requestedTaskIds = new Set(taskIds);

    return statuses.filter((status) => requestedTaskIds.has(status.id));
  },
});

export const internalInsightsRoutes = {
  ...insightsTaskRoute,
  ...insightsStatusRoute,
  ...insightsTaskCancelRoute,
};
