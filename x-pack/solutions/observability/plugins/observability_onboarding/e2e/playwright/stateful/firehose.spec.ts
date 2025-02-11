/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { expect } from '@playwright/test';
import { test } from './fixtures/base_page';
import { assertEnv } from '../lib/assert_env';

test.beforeEach(async ({ page }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/observabilityOnboarding`);
});

test('Firehose', async ({ page, onboardingHomePage, firehoseFlowPage }) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');

  const fileName = 'code_snippet_firehose.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);

  await onboardingHomePage.useCaseCloud.click();
  await onboardingHomePage.awsCollectionCard.click();
  await onboardingHomePage.firehoseQuickstartCard.click();

  await firehoseFlowPage.cliOptionButton.click();
  await firehoseFlowPage.copyToClipboardButton.click();

  const clipboardData = (await page.evaluate('navigator.clipboard.readText()')) as string;

  /**
   * Ensemble story watches for the code snippet file
   * to be created and then executes it
   */
  fs.writeFileSync(outputPath, clipboardData);

  /**
   * The page waits for the browser window to loose
   * focus as a signal to start checking for incoming data
   */
  await page.evaluate('window.dispatchEvent(new Event("blur"))');

  await expect(
    firehoseFlowPage.waitingForDataIndicator,
    'Waiting for data indicator should be visible'
  ).toBeVisible();

  // await page.waitForTimeout(2 * 60000);

  // await autoDetectFlowPage.clickAutoDetectSystemIntegrationCTA();

  /**
   * Host Details pages open in a new tab, so it
   * needs to be captured using the `popup` event.
   */
  // const hostDetailsPage = new HostDetailsPage(await page.waitForEvent('popup'));

  // await hostDetailsPage.assertCpuPercentageNotEmpty();
});
