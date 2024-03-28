/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiCodeBlock, EuiSpacer } from '@elastic/eui';
import { useOnboardingProgress } from '../../../hooks/use_onboarding_progress';
import { useOnboardingFlow } from '../../../hooks/use_onboarding_flow';
import { useNginxAgentConfig } from '../../../hooks/use_nginx_agent_config';
import { useNginxIntegration } from '../../../hooks/use_nginx_integration';
import { StepPanel, StepPanelContent } from '../../shared/step_panel';
import { SystemIntegrationBanner } from '../system_logs/system_integration_banner';
import { getElasticAgentSetupCommand } from '../../shared/get_elastic_agent_setup_command';

export function SetupGuide() {
  const { loading: integrationInstallPending, value: integrationVersion } =
    useNginxIntegration();
  const { loading: onboardingFlowPending, value: onboardingFlow } =
    useOnboardingFlow();

  const progress = useOnboardingProgress(onboardingFlow?.onboardingId);

  console.log(progress);

  return (
    <StepPanel panelFooter={null}>
      <StepPanelContent>
        <EuiCallOut
          title={
            integrationInstallPending
              ? 'Installing Nginx integration'
              : `Nginx integration installed (version ${integrationVersion})`
          }
          color={integrationInstallPending ? 'primary' : 'success'}
          iconType={integrationInstallPending ? 'clock' : 'check'}
        />
        <EuiSpacer />
        <EuiCallOut
          title={
            onboardingFlowPending || !onboardingFlow
              ? 'Creating API key'
              : `API key created`
          }
          color={integrationInstallPending ? 'primary' : 'success'}
          iconType={integrationInstallPending ? 'clock' : 'check'}
        >
          {onboardingFlow && (
            <EuiCodeBlock fontSize="m" paddingSize="m" isCopyable>
              {onboardingFlow.apiKeyEncoded}
            </EuiCodeBlock>
          )}
        </EuiCallOut>

        <EuiSpacer />

        {onboardingFlow && (
          <EuiCallOut>
            <EuiCodeBlock
              language="bash"
              fontSize="m"
              paddingSize="m"
              isCopyable
            >
              {getElasticAgentSetupCommand({
                elasticAgentPlatform: 'macos',
                apiKeyEncoded: onboardingFlow.apiKeyEncoded,
                apiEndpoint: onboardingFlow.apiEndpoint,
                scriptDownloadUrl: onboardingFlow.scriptDownloadUrl,
                elasticAgentVersion: onboardingFlow.elasticAgentVersion,
                autoDownloadConfig: true,
                onboardingId: onboardingFlow.onboardingId,
              })}
            </EuiCodeBlock>
          </EuiCallOut>
        )}
      </StepPanelContent>
    </StepPanel>
  );
}
