/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCard,
  EuiCodeBlock,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
  SingleDatasetLocatorParams,
  SINGLE_DATASET_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { i18n } from '@kbn/i18n';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { default as React, useCallback, useEffect, useState } from 'react';
import { useWizard } from '.';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { ObservabilityOnboardingPluginSetupDeps } from '../../../plugin';
import {
  ElasticAgentPlatform,
  getElasticAgentSetupCommand,
} from '../shared/get_elastic_agent_setup_command';
import {
  EuiStepStatus,
  InstallElasticAgentSteps,
  ProgressStepId,
} from '../shared/install_elastic_agent_steps';
import { StepModal } from '../shared/step_panel';
import { TroubleshootingLink } from '../shared/troubleshooting_link';
import { WindowsInstallStep } from '../shared/windows_install_step';
import { ApiKeyBanner } from '../custom_logs/api_key_banner';
import { SystemIntegrationBanner, SystemIntegrationBannerState } from './system_integration_banner';
import { useFlowProgressTelemetry } from '../../../hooks/use_flow_progress_telemetry';

export function InstallElasticAgent() {
  const {
    services: { share },
  } = useKibana<ObservabilityOnboardingPluginSetupDeps>();

  const singleDatasetLocator =
    share.url.locators.get<SingleDatasetLocatorParams>(SINGLE_DATASET_LOCATOR_ID);
  const allDataSetsLocator =
    share.url.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID);

  const { getState, setState } = useWizard();
  const wizardState = getState();
  const [elasticAgentPlatform, setElasticAgentPlatform] =
    useState<ElasticAgentPlatform>('linux-tar');
  const [systemIntegrationStatus, setSystemIntegrationStatus] =
    useState<SystemIntegrationBannerState>('pending');

  const onIntegrationStatusChange = useCallback((status: SystemIntegrationBannerState) => {
    setSystemIntegrationStatus(status);
  }, []);

  const datasetName = 'system-logs';

  async function onContinue() {
    if (systemIntegrationStatus === 'rejected') {
      await allDataSetsLocator!.navigate({
        origin: { id: 'application-log-onboarding' },
      });
      return;
    }

    await singleDatasetLocator!.navigate({
      integration: 'system',
      dataset: 'system.syslog',
      origin: { id: 'application-log-onboarding' },
    });
  }

  function onAutoDownloadConfig() {
    setState((state) => ({
      ...state,
      autoDownloadConfig: !state.autoDownloadConfig,
    }));
  }

  const { data: monitoringRole, status: monitoringRoleStatus } = useFetcher((callApi) => {
    return callApi('GET /internal/observability_onboarding/logs/setup/privileges');
  }, []);

  const { data: setup } = useFetcher((callApi) => {
    return callApi('GET /internal/observability_onboarding/logs/setup/environment');
  }, []);

  const {
    data: installShipperSetup,
    status: installShipperSetupStatus,
    error,
  } = useFetcher(
    (callApi) => {
      if (monitoringRole?.hasPrivileges) {
        return callApi('POST /internal/observability_onboarding/logs/flow', {
          params: {
            body: {
              name: datasetName,
              type: 'systemLogs',
            },
          },
        });
      }
    },
    [monitoringRole?.hasPrivileges]
  );

  const { apiKeyEncoded, onboardingId } = installShipperSetup ?? getState();

  const { data: yamlConfig = '', status: yamlConfigStatus } = useFetcher(
    (callApi) => {
      if (apiKeyEncoded && onboardingId) {
        return callApi('GET /internal/observability_onboarding/elastic_agent/config', {
          headers: { authorization: `ApiKey ${apiKeyEncoded}` },
          params: { query: { onboardingId } },
        });
      }
    },
    [apiKeyEncoded, onboardingId, installShipperSetupStatus === FETCH_STATUS.SUCCESS]
  );

  useEffect(() => {
    setState((state) => ({ ...state, onboardingId, apiKeyEncoded }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingId, apiKeyEncoded]);

  const {
    data: progressData,
    status: progressStatus,
    refetch: refetchProgress,
  } = useFetcher(
    (callApi) => {
      if (onboardingId) {
        return callApi('GET /internal/observability_onboarding/flow/{onboardingId}/progress', {
          params: { path: { onboardingId } },
        });
      }
    },
    [onboardingId]
  );

  const progressSucceded = progressStatus === FETCH_STATUS.SUCCESS;

  useEffect(() => {
    if (progressSucceded) {
      setTimeout(() => {
        refetchProgress();
      }, 2000);
    }
  }, [progressSucceded, refetchProgress]);

  const snippet = `sudo API_KEY='${apiKeyEncoded}' node ./build/index.js`;

  return (
    <EuiCard
      textAlign="left"
      title={i18n.translate(
        'xpack.observability_onboarding.installElasticAgent.stepPanel.collectSystemLogsLabel',
        { defaultMessage: 'Run logs auto-detection script on the host' }
      )}
    >
      <EuiSpacer size="m" />
      <EuiCodeBlock language="html" isCopyable>
        {snippet}
      </EuiCodeBlock>
      <EuiHorizontalRule />
      <TroubleshootingLink />
    </EuiCard>
  );
}

const CHECK_LOGS_LABELS = {
  incomplete: i18n.translate(
    'xpack.observability_onboarding.systemLogs.installElasticAgent.progress.logsIngest.incompleteTitle',
    { defaultMessage: 'Ship logs to Elastic Observability' }
  ),
  loading: i18n.translate(
    'xpack.observability_onboarding.systemLogs.installElasticAgent.progress.logsIngest.loadingTitle',
    { defaultMessage: 'Waiting for logs to be shipped...' }
  ),
  completed: i18n.translate(
    'xpack.observability_onboarding.systemLogs.installElasticAgent.progress.logsIngest.completedTitle',
    { defaultMessage: 'Logs are being shipped!' }
  ),
};
