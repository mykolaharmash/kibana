/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin, CoreSetup } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
// import directly to support examples functional tests (@kbn-test/src/functional_tests/lib/babel_register_for_test_plugins.js)
import { DEFAULT_APP_CATEGORIES } from '@kbn/core-application-common';
import { AlertingServerSetup } from '@kbn/alerting-plugin/server';
import { FeaturesPluginSetup } from '@kbn/features-plugin/server';

import { ALERTING_FEATURE_ID } from '@kbn/alerting-plugin/common';
import { KibanaFeatureScope } from '@kbn/features-plugin/common';
import { ruleType as alwaysFiringRule } from './rule_types/always_firing';
import { ruleType as peopleInSpaceRule } from './rule_types/astros';
import { ruleType as patternRule } from './rule_types/pattern';
// can't import static code from another plugin to support examples functional test
const INDEX_THRESHOLD_ID = '.index-threshold';
import { ALERTING_EXAMPLE_APP_ID } from '../common/constants';

// this plugin's dependencies
export interface AlertingExampleDeps {
  alerting: AlertingServerSetup;
  features: FeaturesPluginSetup;
}

export class AlertingExamplePlugin implements Plugin<void, void, AlertingExampleDeps> {
  public setup(core: CoreSetup, { alerting, features }: AlertingExampleDeps) {
    alerting.registerType(alwaysFiringRule);
    alerting.registerType(peopleInSpaceRule);
    alerting.registerType(patternRule);

    features.registerKibanaFeature({
      id: ALERTING_EXAMPLE_APP_ID,
      name: i18n.translate('alertsExample.featureRegistry.alertsExampleFeatureName', {
        defaultMessage: 'Alerting Examples',
      }),
      app: [],
      management: {
        insightsAndAlerting: ['triggersActions'],
      },
      category: DEFAULT_APP_CATEGORIES.management,
      scope: [KibanaFeatureScope.Spaces, KibanaFeatureScope.Security],
      alerting: [
        {
          ruleTypeId: alwaysFiringRule.id,
          consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
        },
        {
          ruleTypeId: peopleInSpaceRule.id,
          consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
        },
        {
          ruleTypeId: INDEX_THRESHOLD_ID,
          consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
        },
      ],
      privileges: {
        all: {
          alerting: {
            rule: {
              all: [
                {
                  ruleTypeId: alwaysFiringRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: peopleInSpaceRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: INDEX_THRESHOLD_ID,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
              ],
            },
            alert: {
              all: [
                {
                  ruleTypeId: alwaysFiringRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: peopleInSpaceRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: INDEX_THRESHOLD_ID,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
              ],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
        read: {
          alerting: {
            rule: {
              read: [
                {
                  ruleTypeId: alwaysFiringRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: peopleInSpaceRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: INDEX_THRESHOLD_ID,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
              ],
            },
            alert: {
              read: [
                {
                  ruleTypeId: alwaysFiringRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: peopleInSpaceRule.id,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
                {
                  ruleTypeId: INDEX_THRESHOLD_ID,
                  consumers: [ALERTING_EXAMPLE_APP_ID, ALERTING_FEATURE_ID],
                },
              ],
            },
          },
          savedObject: {
            all: [],
            read: [],
          },
          management: {
            insightsAndAlerting: ['triggersActions'],
          },
          ui: [],
        },
      },
    });
  }

  public start() {}
  public stop() {}
}
