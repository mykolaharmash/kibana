/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { useSourceContext } from '../../../../../containers/metrics_source';
import type { HostNodeRow } from '../../hooks/use_hosts_table';
import { AssetDetails } from '../../../../../components/asset_details/asset_details';
import { orderedFlyoutTabs } from './tabs';
import { useAssetDetailsUrlState } from '../../../../../components/asset_details/hooks/use_asset_details_url_state';
import { useUnifiedSearchStorageState } from '../../hooks/use_unified_search_url_state';

export interface Props {
  node: HostNodeRow;
  closeFlyout: () => void;
}

export const FlyoutWrapper = ({ node: { name }, closeFlyout }: Props) => {
  const { source } = useSourceContext();
  const [{ dateRange }] = useUnifiedSearchStorageState();
  const [urlState] = useAssetDetailsUrlState();

  return source ? (
    <AssetDetails
      asset={{ id: name, name }}
      assetType="host"
      dateRange={urlState?.dateRange ?? dateRange}
      overrides={{
        metadata: {
          showActionsColumn: true,
        },
      }}
      tabs={orderedFlyoutTabs}
      links={['apmServices', 'nodeDetails']}
      renderMode={{
        mode: 'flyout',
        closeFlyout,
      }}
      metricAlias={source.configuration.metricAlias}
    />
  ) : null;
};
