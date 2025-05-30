/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTitle } from '@elastic/eui';
import { EuiSpacer } from '@elastic/eui';
import { EuiForm } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { enableInfrastructureProfilingIntegration } from '@kbn/observability-plugin/common';
import type { useEditableSettings } from '@kbn/observability-shared-plugin/public';
import { withSuspense } from '@kbn/shared-ux-utility';
import { FieldRowProvider } from '@kbn/management-settings-components-field-row';
import type { ValueValidation } from '@kbn/core-ui-settings-browser/src/types';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

const LazyFieldRow = React.lazy(async () => ({
  default: (await import('@kbn/management-settings-components-field-row')).FieldRow,
}));

const FieldRow = withSuspense(LazyFieldRow);

type Props = Pick<
  ReturnType<typeof useEditableSettings>,
  'handleFieldChange' | 'fields' | 'unsavedChanges'
>;

export function FeaturesConfigurationPanel({ handleFieldChange, fields, unsavedChanges }: Props) {
  const {
    services: { docLinks, notifications },
  } = useKibanaContextForPlugin();

  // We don't validate the user input on these settings
  const settingsValidationResponse: ValueValidation = {
    successfulValidation: true,
    valid: true,
  };

  return (
    <EuiForm>
      <EuiTitle size="s" data-test-subj="sourceConfigurationFeaturesSectionTitle">
        <h3>
          <FormattedMessage
            id="xpack.infra.sourceConfiguration.featuresSectionTitle"
            defaultMessage="Features"
          />
        </h3>
      </EuiTitle>
      <EuiSpacer size="m" />
      <FieldRowProvider
        {...{
          links: docLinks.links.management,
          showDanger: (message: string) => notifications.toasts.addDanger(message),
          validateChange: async () => settingsValidationResponse,
        }}
      >
        <FieldRow
          field={fields[enableInfrastructureProfilingIntegration]}
          isSavingEnabled={true}
          onFieldChange={handleFieldChange}
          unsavedChange={unsavedChanges[enableInfrastructureProfilingIntegration]}
        />
      </FieldRowProvider>
    </EuiForm>
  );
}
