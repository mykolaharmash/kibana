/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem, EuiTitle } from '@elastic/eui';
import type { FC } from 'react';
import React, { useMemo, useCallback } from 'react';
import { isEmpty } from 'lodash';
import { css } from '@emotion/react';
import { useExpandableFlyoutApi } from '@kbn/expandable-flyout';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useKibana } from '../../../../common/lib/kibana';
import { useDocumentDetailsContext } from '../../shared/context';
import { useBasicDataFromDetailsData } from '../../shared/hooks/use_basic_data_from_details_data';
import {
  ALERT_DESCRIPTION_DETAILS_TEST_ID,
  ALERT_DESCRIPTION_TITLE_TEST_ID,
  RULE_SUMMARY_BUTTON_TEST_ID,
} from './test_ids';
import { RULE_PREVIEW_BANNER, RulePreviewPanelKey } from '../../../rule_details/right';
import { DocumentEventTypes } from '../../../../common/lib/telemetry';

/**
 * Displays the rule description of a signal document.
 */
export const AlertDescription: FC = () => {
  const { telemetry } = useKibana().services;
  const { dataFormattedForFieldBrowser, scopeId, isRulePreview } = useDocumentDetailsContext();
  const { isAlert, ruleDescription, ruleName, ruleId } = useBasicDataFromDetailsData(
    dataFormattedForFieldBrowser
  );
  const { openPreviewPanel } = useExpandableFlyoutApi();
  const openRulePreview = useCallback(() => {
    openPreviewPanel({
      id: RulePreviewPanelKey,
      params: {
        ruleId,
        banner: RULE_PREVIEW_BANNER,
        isPreviewMode: true,
      },
    });
    telemetry.reportEvent(DocumentEventTypes.DetailsFlyoutOpened, {
      location: scopeId,
      panel: 'preview',
    });
  }, [openPreviewPanel, scopeId, ruleId, telemetry]);

  const viewRule = useMemo(
    () => (
      <EuiFlexItem grow={false}>
        <EuiButtonEmpty
          size="s"
          iconType="expand"
          onClick={openRulePreview}
          iconSide="right"
          data-test-subj={RULE_SUMMARY_BUTTON_TEST_ID}
          aria-label={i18n.translate(
            'xpack.securitySolution.flyout.right.about.description.ruleSummaryButtonAriaLabel',
            {
              defaultMessage: 'Show rule summary',
            }
          )}
          disabled={isEmpty(ruleName) || isEmpty(ruleId) || isRulePreview}
        >
          <FormattedMessage
            id="xpack.securitySolution.flyout.right.about.description.ruleSummaryButtonLabel"
            defaultMessage="Show rule summary"
          />
        </EuiButtonEmpty>
      </EuiFlexItem>
    ),
    [ruleName, openRulePreview, ruleId, isRulePreview]
  );

  const alertRuleDescription =
    ruleDescription?.length > 0 ? (
      ruleDescription
    ) : (
      <FormattedMessage
        id="xpack.securitySolution.flyout.right.about.description.noRuleDescription"
        defaultMessage="There's no description for this rule."
      />
    );

  return (
    <EuiFlexGroup direction="column" gutterSize="s">
      <EuiFlexItem data-test-subj={ALERT_DESCRIPTION_TITLE_TEST_ID}>
        <EuiTitle size="xxs">
          {isAlert ? (
            <EuiFlexGroup
              justifyContent="spaceBetween"
              alignItems="center"
              gutterSize="none"
              responsive={false}
            >
              <EuiFlexItem>
                <h5>
                  <FormattedMessage
                    id="xpack.securitySolution.flyout.right.about.description.ruleTitle"
                    defaultMessage="Rule description"
                  />
                </h5>
              </EuiFlexItem>
              {viewRule}
            </EuiFlexGroup>
          ) : (
            <h5>
              <FormattedMessage
                id="xpack.securitySolution.flyout.right.about.description.documentTitle"
                defaultMessage="Document description"
              />
            </h5>
          )}
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem data-test-subj={ALERT_DESCRIPTION_DETAILS_TEST_ID}>
        <p
          css={css`
            word-break: break-word;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
          `}
        >
          {isAlert ? alertRuleDescription : '-'}
        </p>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

AlertDescription.displayName = 'AlertDescription';
