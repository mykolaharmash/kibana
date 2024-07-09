/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiIcon, EuiSpacer, useEuiTheme, useGeneratedHtmlId } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';
import useInterval from 'react-use/lib/useInterval';
import { AWS_LOGS_INDEX_NAME_LIST } from '../../../../common/aws_index_name_list';
import { FETCH_STATUS, useFetcher } from '../../../hooks/use_fetcher';
import { AccordionWithIcon } from '../shared/accordion_with_icon';
import { GetStartedPanel } from '../shared/get_started_panel';
import { ProgressIndicator } from '../shared/progress_indicator';
import { useAWSServiceGetStartedList } from './use_aws_service_get_started_list';

interface Props {
  streamName: string;
}

const FETCH_INTERVAL = 2000;
const REQUEST_PENDING_STATUS_LIST = [FETCH_STATUS.LOADING, FETCH_STATUS.NOT_INITIATED];

export function VisualizeData({ streamName }: Props) {
  const accordionId = useGeneratedHtmlId({ prefix: 'accordion' });
  const { euiTheme } = useEuiTheme();
  const {
    data: populatedAWSLogsIndexList,
    status,
    refetch,
  } = useFetcher(
    (callApi) => {
      return callApi('GET /internal/observability_onboarding/firehose/{streamName}/has-data', {
        params: { path: { streamName } },
      });
    },
    [streamName]
  );
  const awsServiceGetStartedConfigList = useAWSServiceGetStartedList();

  const isWaitingForMoreData =
    populatedAWSLogsIndexList?.length !== AWS_LOGS_INDEX_NAME_LIST.length;

  useInterval(
    () => {
      if (REQUEST_PENDING_STATUS_LIST.includes(status)) {
        return;
      }

      refetch();
    },
    isWaitingForMoreData ? FETCH_INTERVAL : null
  );

  if (populatedAWSLogsIndexList === undefined) {
    return null;
  }

  return (
    <>
      <ProgressIndicator
        title={
          isWaitingForMoreData
            ? i18n.translate('xpack.observability_onboarding.firehosePanel.waitingForDataTitle', {
                defaultMessage: 'Waiting for data from the Firehose stream',
              })
            : i18n.translate('xpack.observability_onboarding.firehosePanel.allDataFoundTitle', {
                defaultMessage: 'Found data for all supported AWS services!',
              })
        }
        iconType="cheer"
        isLoading={isWaitingForMoreData}
        css={css`
          max-width: 40%;
        `}
      />

      <EuiSpacer size="xl" />

      {awsServiceGetStartedConfigList.map(
        ({ id, indexNameList, actionLinks, title, logoURL, previewImage }) => {
          const isEnabled = indexNameList.some((indexName) =>
            populatedAWSLogsIndexList.includes(indexName)
          );

          return (
            <AccordionWithIcon
              key={id}
              id={`${accordionId}_${id}`}
              icon={<EuiIcon type={logoURL} size="l" />}
              title={i18n.translate(
                'xpack.observability_onboarding.firehosePanel.awsServiceDataFoundTitle',
                {
                  defaultMessage: '{title}',
                  values: { title },
                }
              )}
              extraAction={
                isEnabled ? <EuiIcon type="checkInCircleFilled" color="success" /> : null
              }
              isDisabled={!isEnabled}
              css={{
                paddingRight: euiTheme.size.s,
                filter: `grayscale(${isEnabled ? 0 : 1})`,
              }}
            >
              <GetStartedPanel
                integration="aws"
                newTab
                isLoading={false}
                actionLinks={actionLinks}
                previewImage={previewImage}
              />
            </AccordionWithIcon>
          );
        }
      )}
    </>
  );
}
