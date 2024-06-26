/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, PropsWithChildren } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiText, EuiIcon } from '@elastic/eui';

export const LoadingIssuesError: FC<PropsWithChildren<unknown>> = ({ children }) => (
  <EuiText color="subdued" data-test-subj="loadingIssuesError">
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiIcon type="warning" color="danger" />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
    </EuiFlexGroup>
  </EuiText>
);
