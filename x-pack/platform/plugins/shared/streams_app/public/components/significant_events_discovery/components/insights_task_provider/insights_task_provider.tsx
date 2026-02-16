/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { TaskStatus, type InsightsResult, type TaskResult } from '@kbn/streams-schema';
import { useMutation, useQuery } from '@kbn/react-query';
import { STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE } from '@kbn/streams-schema/src/insights';
import { i18n } from '@kbn/i18n';
import { generateInsightsTaskId } from '@kbn/streams-plugin/common';
import { unionBy } from 'lodash';
import { getFormattedError } from '../../../../util/errors';
import { useKibana } from '../../../../hooks/use_kibana';
import { useAIFeatures } from '../../../../hooks/use_ai_features';
import { useInsightsDiscoveryApi } from '../../../../hooks/use_insights_discovery_api';

const TASK_STATUS_LIST_QUERY_KEY = ['insightsTaskStatusList'] as const;

interface InsightsTasksContextValue {
  insightsTaskList: TaskResult<InsightsResult>[];
  // TODO: Add time range parameter to schedule method
  scheduleInsightsTask: (streamNames: string[]) => void;
  cancelInsightsTask: (taskId: string) => void;
}

const InsightsTasksContext = createContext<InsightsTasksContextValue>({
  insightsTaskList: [],
  scheduleInsightsTask: () => {},
  cancelInsightsTask: () => {},
});

export function InsightsTaskProvider({ children }: { children: React.ReactNode }) {
  const {
    core: {
      notifications: { toasts },
    },
  } = useKibana();
  const [insightsTaskList, setInsightsTaskList] = useState<TaskResult<InsightsResult>[]>([]);
  const aiFeatures = useAIFeatures();
  const {
    getInsightsDiscoveryTaskStatusList,
    scheduleInsightsDiscoveryTask,
    cancelInsightsDiscoveryTask,
  } = useInsightsDiscoveryApi(aiFeatures?.genAiConnectors.selectedConnector);

  const scheduleTaskMutation = useMutation({
    mutationFn: scheduleInsightsDiscoveryTask,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: INSIGHTS_DISCOVERY_SCHEDULING_FAILURE_TITLE,
      });
    },
  });

  const cancelTaskMutation = useMutation({
    mutationFn: cancelInsightsDiscoveryTask,
    onError: (error: Error) => {
      toasts.addError(getFormattedError(error), {
        title: INSIGHTS_DISCOVERY_CANCELLATION_FAILURE_TITLE,
      });
    },
  });

  useEffect(() => {
    getInsightsDiscoveryTaskStatusList().then((taskStateList) => {
      setInsightsTaskList(taskStateList);
    });
    /**
     * Explicitly running this hook only once to get the initial
     * list of tasks
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scheduleInsightsTask = useCallback(
    (streamNames: string[]) => {
      const taskId = generateInsightsTaskId({
        taskType: STREAMS_INSIGHTS_DISCOVERY_TASK_TYPE,
        streamNames,
      });
      setInsightsTaskList((currentStatusList) => {
        /**
         * Optimistically setting the task status to
         * InProgress, so the UI can show the loading
         * state immediately
         */
        const newStatus: TaskResult<InsightsResult> = {
          id: taskId,
          status: TaskStatus.InProgress,
        };

        return unionBy([newStatus], currentStatusList, 'id');
      });

      scheduleTaskMutation.mutate(streamNames);
    },
    [scheduleTaskMutation]
  );

  const cancelInsightsTask = useCallback(
    (taskId: string) => {
      setInsightsTaskList((currentStatusList) => {
        /**
         * Optimistically setting the task status to
         * BeingCanceled, so the UI can show the loading
         * state immediately
         */
        const newStatus: TaskResult<InsightsResult> = {
          id: taskId,
          status: TaskStatus.BeingCanceled,
        };

        return unionBy([newStatus], currentStatusList, 'id');
      });

      cancelTaskMutation.mutate(taskId);
    },
    [cancelTaskMutation]
  );

  const hasPendingTasks = insightsTaskList.some((taskState) =>
    [TaskStatus.InProgress, TaskStatus.BeingCanceled].includes(taskState.status)
  );

  const fetchStatus = async () => {
    const taskStateList = await getInsightsDiscoveryTaskStatusList();

    setInsightsTaskList(taskStateList);

    return taskStateList;
  };

  useQuery<Array<TaskResult<InsightsResult>>, Error>({
    queryKey: TASK_STATUS_LIST_QUERY_KEY,
    queryFn: fetchStatus,
    enabled: hasPendingTasks && !scheduleTaskMutation.isLoading && !cancelTaskMutation.isLoading,
    refetchInterval: 2000,
  });

  return (
    <InsightsTasksContext.Provider
      value={{
        insightsTaskList,
        scheduleInsightsTask,
        cancelInsightsTask,
      }}
    >
      {children}
    </InsightsTasksContext.Provider>
  );
}

export function useInsightsTasksContext() {
  const ctx = useContext(InsightsTasksContext);

  if (!ctx) {
    throw new Error('useInsightsTasksContext must be used within InsightsTaskProvider');
  }
  return ctx;
}

const INSIGHTS_DISCOVERY_SCHEDULING_FAILURE_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.insightsDiscoverySchedulingFailureTitle',
  {
    defaultMessage: 'Failed to schedule insights discovery',
  }
);

const INSIGHTS_DISCOVERY_CANCELLATION_FAILURE_TITLE = i18n.translate(
  'xpack.streams.significantEventsDiscovery.insightsDiscoveryCancellationFailureTitle',
  {
    defaultMessage: 'Failed to cancel insights discovery',
  }
);
