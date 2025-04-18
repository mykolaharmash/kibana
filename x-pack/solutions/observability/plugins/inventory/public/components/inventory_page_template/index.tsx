/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import React, { useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiEmptyPrompt, EuiLoadingLogo } from '@elastic/eui';
import {
  FeatureFeedbackButton,
  TechnicalPreviewBadge,
} from '@kbn/observability-shared-plugin/public';
import { useKibana } from '../../hooks/use_kibana';
import { SearchBar } from '../search_bar';
import { useInventoryAbortableAsync } from '../../hooks/use_inventory_abortable_async';
import { EmptyState } from '../empty_states/empty_state';
import { useIsLoadingComplete } from '../../hooks/use_is_loading_complete';

const pageTitle = (
  <EuiFlexGroup gutterSize="s">
    <EuiFlexItem grow={false}>
      {i18n.translate('xpack.inventory.inventoryPageHeaderLabel', {
        defaultMessage: 'Inventory',
      })}
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <TechnicalPreviewBadge />
    </EuiFlexItem>
  </EuiFlexGroup>
);

const INVENTORY_FEEDBACK_LINK = 'https://ela.st/feedback-new-inventory';

export function InventoryPageTemplate({ children }: { children: React.ReactNode }) {
  const {
    services: { observabilityShared, inventoryAPIClient, kibanaEnvironment, telemetry },
  } = useKibana();

  const { PageTemplate: ObservabilityPageTemplate } = observabilityShared.navigation;
  const { value = { hasData: false }, loading: hasDataLoading } = useInventoryAbortableAsync(
    ({ signal }) => {
      return inventoryAPIClient.fetch('GET /internal/inventory/has_data', {
        signal,
      });
    },
    [inventoryAPIClient]
  );

  const isLoadingComplete = useIsLoadingComplete({
    loadingStates: [hasDataLoading],
  });

  useEffect(() => {
    if (isLoadingComplete) {
      const viewState = value.hasData ? 'populated' : 'empty';
      telemetry.reportEntityInventoryViewed({
        view_state: viewState,
      });
    }
  }, [value.hasData, telemetry, isLoadingComplete]);

  if (hasDataLoading) {
    return (
      <ObservabilityPageTemplate
        pageHeader={{
          pageTitle,
        }}
      >
        <EuiEmptyPrompt icon={<EuiLoadingLogo logo="logoObservability" size="xl" />} />
      </ObservabilityPageTemplate>
    );
  }

  return (
    <ObservabilityPageTemplate
      pageHeader={{
        pageTitle,
        rightSideItems: [
          <FeatureFeedbackButton
            data-test-subj="inventoryFeedbackButton"
            formUrl={INVENTORY_FEEDBACK_LINK}
            kibanaVersion={kibanaEnvironment.kibanaVersion}
            isCloudEnv={kibanaEnvironment.isCloudEnv}
            isServerlessEnv={kibanaEnvironment.isServerlessEnv}
          />,
        ],
      }}
    >
      {value.hasData ? (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <SearchBar />
          </EuiFlexItem>
          <EuiFlexItem>{children}</EuiFlexItem>
        </EuiFlexGroup>
      ) : (
        <EmptyState />
      )}
    </ObservabilityPageTemplate>
  );
}
