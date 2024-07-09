/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiLink, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { CopyToClipboardButton } from '../shared/copy_to_clipboard_button';
import { buildSampleRecordCommand, FIREHOSE_STREAM_NAME } from './utils';

interface Props {
  onboardingId: string;
}

export function SampleDataCommandSnippet({ onboardingId }: Props) {
  const command = buildSampleRecordCommand({
    streamName: FIREHOSE_STREAM_NAME,
    onboardingId,
  });

  return (
    <>
      <EuiText>
        <p>
          <FormattedMessage
            id="xpack.observability_onboarding.firehosePanel.dataIngestDescription"
            defaultMessage="Reference {firehoseIngestDataLink} to configure your source and start ingesting data into the created delivery stream."
            values={{
              firehoseIngestDataLink: (
                <EuiLink
                  data-test-subj="observabilityOnboardingFirehosePanelAwsFirehoseIngestDataGuideLink"
                  href="https://docs.aws.amazon.com/firehose/latest/dev/basic-write.html"
                  external
                  target="_blank"
                >
                  {i18n.translate(
                    'xpack.observability_onboarding.firehosePanel.firehoseIngestDataGuideLinkLabel',
                    { defaultMessage: 'AWS Firehose Documentation' }
                  )}
                </EuiLink>
              ),
            }}
          />
        </p>

        <p>
          {i18n.translate('xpack.observability_onboarding.firehosePanel.sampleRecordDescription', {
            defaultMessage: 'You can also ingest a sample record by running the command bellow:',
          })}
        </p>
      </EuiText>

      <EuiSpacer />

      <EuiCodeBlock language="text" paddingSize="m" fontSize="m">
        {command}
      </EuiCodeBlock>

      <EuiSpacer />

      <CopyToClipboardButton textToCopy={command} />
    </>
  );
}
