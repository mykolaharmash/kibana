/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  createWizardContext,
  Step,
} from '../../../context/create_wizard_context';
import { SetupGuide } from './setup_guide';

interface WizardState {
  elasticAgentPlatform: 'linux-tar' | 'macos' | 'windows';
  autoDownloadConfig: boolean;
  apiKeyEncoded: string;
  onboardingId: string;
}

const initialState: WizardState = {
  elasticAgentPlatform: 'linux-tar',
  autoDownloadConfig: false,
  apiKeyEncoded: '',
  onboardingId: '',
};

export type NginxSteps = 'setupGuide';

const steps: Record<NginxSteps, Step> = {
  setupGuide: {
    component: SetupGuide,
    title: i18n.translate(
      'xpack.observability_onboarding.nginx.setupGuide.title',
      {
        defaultMessage:
          'Setting up Nginx with Elastic Agent in Standalone mode',
      }
    ),
  },
};

const {
  Provider,
  useWizard,
  routes: nginxRoutes,
} = createWizardContext({
  initialState,
  initialStep: 'setupGuide',
  steps,
  basePath: '/nginx',
});

export { Provider, useWizard, nginxRoutes };
