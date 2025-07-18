/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from 'expect';
import {
  BulkActionTypeEnum,
  BulkActionEditTypeEnum,
} from '@kbn/security-solution-plugin/common/api/detection_engine/rule_management';
import moment from 'moment';
import {
  getCustomQueryRuleParams,
  getSimpleMlRule,
  getSimpleRule,
  getThresholdRuleForAlertTesting,
} from '../../../utils';
import {
  createRule,
  createAlertsIndex,
  deleteAllRules,
  deleteAllAlerts,
} from '../../../../../../common/utils/security_solution';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');
  const securitySolutionApi = getService('securitySolutionApi');
  const log = getService('log');
  const es = getService('es');

  describe('@ess @serverless @skipInServerlessMKI perform_bulk_action dry_run', () => {
    beforeEach(async () => {
      await createAlertsIndex(supertest, log);
    });

    afterEach(async () => {
      await deleteAllAlerts(supertest, log, es);
      await deleteAllRules(supertest, log);
    });

    it('should not support export action', async () => {
      await createRule(supertest, log, getSimpleRule());

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: { dry_run: true },
          body: { action: BulkActionTypeEnum.export },
        })
        .expect(400);

      expect(body).toEqual({
        message: "Export action doesn't support dry_run mode",
        status_code: 400,
      });
    });

    it('should handle delete action', async () => {
      const ruleId = 'ruleId';
      const testRule = getSimpleRule(ruleId);
      await createRule(supertest, log, testRule);

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: { dry_run: true },
          body: { action: BulkActionTypeEnum.delete },
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({
        updated: [],
        skipped: [],
        created: [],
        deleted: [],
      });

      // Check that rule wasn't deleted
      await securitySolutionApi.readRule({ query: { rule_id: ruleId } }).expect(200);
    });

    it('should handle enable action', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId));

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: { dry_run: true },
          body: { action: BulkActionTypeEnum.enable },
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({
        updated: [],
        skipped: [],
        created: [],
        deleted: [],
      });

      // Check that the updates have not been persisted
      const { body: ruleBody } = await securitySolutionApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);
      expect(ruleBody.enabled).toBe(false);
    });

    it('should handle disable action', async () => {
      const ruleId = 'ruleId';
      await createRule(supertest, log, getSimpleRule(ruleId, true));

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: { dry_run: true },
          body: { action: BulkActionTypeEnum.disable },
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({
        updated: [],
        skipped: [],
        created: [],
        deleted: [],
      });

      // Check that the updates have not been persisted
      const { body: ruleBody } = await securitySolutionApi
        .readRule({ query: { rule_id: ruleId } })
        .expect(200);
      expect(ruleBody.enabled).toBe(true);
    });

    it('should handle duplicate action', async () => {
      const ruleId = 'ruleId';
      const ruleToDuplicate = getSimpleRule(ruleId);
      await createRule(supertest, log, ruleToDuplicate);

      const { body } = await securitySolutionApi
        .performRulesBulkAction({
          query: { dry_run: true },
          body: { action: BulkActionTypeEnum.disable },
        })
        .expect(200);

      expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });
      // dry_run mode shouldn't return any rules in results
      expect(body.attributes.results).toEqual({
        updated: [],
        skipped: [],
        created: [],
        deleted: [],
      });

      // Check that the rule wasn't duplicated
      const { body: rulesResponse } = await securitySolutionApi
        .findRules({ query: {} })
        .expect(200);

      expect(rulesResponse.total).toBe(1);
    });

    describe('edit action', () => {
      it('should handle edit action', async () => {
        const ruleId = 'ruleId';
        const tags = ['tag1', 'tag2'];
        await createRule(supertest, log, { ...getSimpleRule(ruleId), tags });

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_tags,
                  value: ['reset-tag'],
                },
              ],
            },
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({ failed: 0, skipped: 0, succeeded: 1, total: 1 });
        // dry_run mode shouldn't return any rules in results
        expect(body.attributes.results).toEqual({
          updated: [],
          skipped: [],
          created: [],
          deleted: [],
        });

        // Check that the updates have not been persisted
        const { body: ruleBody } = await securitySolutionApi
          .readRule({ query: { rule_id: ruleId } })
          .expect(200);
        expect(ruleBody.tags).toEqual(tags);
      });

      describe('validate updating index pattern for machine learning rule', () => {
        const actions = [
          BulkActionEditTypeEnum.add_index_patterns,
          BulkActionEditTypeEnum.set_index_patterns,
          BulkActionEditTypeEnum.delete_index_patterns,
        ];

        actions.forEach((editAction) => {
          it(`should return error if ${editAction} action is applied to machine learning rule`, async () => {
            const mlRule = await createRule(supertest, log, getSimpleMlRule());

            const { body } = await securitySolutionApi
              .performRulesBulkAction({
                query: { dry_run: true },
                body: {
                  ids: [mlRule.id],
                  action: BulkActionTypeEnum.edit,
                  [BulkActionTypeEnum.edit]: [{ type: editAction, value: [] }],
                },
              })
              .expect(500);

            expect(body.attributes.summary).toEqual({
              failed: 1,
              skipped: 0,
              succeeded: 0,
              total: 1,
            });
            expect(body.attributes.results).toEqual({
              updated: [],
              skipped: [],
              created: [],
              deleted: [],
            });

            expect(body.attributes.errors).toHaveLength(1);
            expect(body.attributes.errors[0]).toEqual({
              err_code: 'MACHINE_LEARNING_INDEX_PATTERN',
              message: "Machine learning rule doesn't have index patterns",
              status_code: 500,
              rules: [
                {
                  id: mlRule.id,
                  name: mlRule.name,
                },
              ],
            });
          });
        });
      });
    });

    describe('@skipInServerless @skipInServerlessMKI schedule manual rule run action', () => {
      it('should return all existing and enabled rules as succeeded', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 2,
          total: 2,
        });
        expect(body.attributes.errors).toBeUndefined();
      });

      it('should return 500 error if some rules do not exist', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, 'rule-2'],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          message: 'Rule not found',
          status_code: 500,
          rules: [
            {
              id: 'rule-2',
            },
          ],
        });
      });

      it('should return 500 error if some rules are disabled', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: false,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.run,
              [BulkActionTypeEnum.run]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          err_code: 'MANUAL_RULE_RUN_DISABLED_RULE',
          message: 'Cannot schedule manual rule run for a disabled rule',
          status_code: 500,
          rules: [
            {
              id: createdRule1.id,
              name: createdRule1.name,
            },
          ],
        });
      });
    });

    describe('@skipInServerless @skipInServerlessMKI schedule bulk gap filling action', () => {
      it('should return all existing and enabled rules as succeeded', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(200);

        expect(body.attributes.summary).toEqual({
          failed: 0,
          skipped: 0,
          succeeded: 2,
          total: 2,
        });
        expect(body.attributes.errors).toBeUndefined();
      });

      it('should return 500 error if some rules do not exist', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, 'rule-2'],
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          message: 'Rule not found',
          status_code: 500,
          rules: [
            {
              id: 'rule-2',
            },
          ],
        });
      });

      it('should return 500 error if some rules are disabled', async () => {
        const intervalInMinutes = 25;
        const interval = `${intervalInMinutes}m`;
        const createdRule1 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
            enabled: false,
            interval,
          })
        );
        const createdRule2 = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-2',
            enabled: true,
            interval,
          })
        );

        const endDate = moment();
        const startDate = endDate.clone().subtract(1, 'h');

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule1.id, createdRule2.id],
              action: BulkActionTypeEnum.fill_gaps,
              [BulkActionTypeEnum.fill_gaps]: {
                start_date: startDate.toISOString(),
                end_date: endDate.toISOString(),
              },
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 1,
          total: 2,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          err_code: 'RULE_FILL_GAPS_DISABLED_RULE',
          message: 'Cannot bulk fill gaps for a disabled rule',
          status_code: 500,
          rules: [
            {
              id: createdRule1.id,
              name: createdRule1.name,
            },
          ],
        });
      });
    });

    // skips serverless MKI due to feature flag
    describe('@skipInServerlessMKI alert suppression', () => {
      it('should return error when attempting to apply set_alert_suppression bulk action to a threshold rule', async () => {
        const createdRule = await createRule(
          supertest,
          log,
          getThresholdRuleForAlertTesting(['*'], 'ruleId')
        );

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression,
                  value: { group_by: ['host.name'], duration: { value: 5, unit: 'm' as const } },
                },
              ],
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 0,
          total: 1,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          err_code: 'THRESHOLD_RULE_TYPE_IN_SUPPRESSION',
          message:
            "Threshold rule doesn't support this action. Use 'set_alert_suppression_for_threshold' action instead",
          rules: [
            {
              id: createdRule.id,
              name: createdRule.name,
            },
          ],
          status_code: 500,
        });
      });

      it('should return error when attempting to apply set_alert_suppression_for_threshold bulk action to a non-threshold rule', async () => {
        const createdRule = await createRule(
          supertest,
          log,
          getCustomQueryRuleParams({
            rule_id: 'rule-1',
          })
        );

        const { body } = await securitySolutionApi
          .performRulesBulkAction({
            query: { dry_run: true },
            body: {
              ids: [createdRule.id],
              action: BulkActionTypeEnum.edit,
              [BulkActionTypeEnum.edit]: [
                {
                  type: BulkActionEditTypeEnum.set_alert_suppression_for_threshold,
                  value: { duration: { value: 5, unit: 'm' as const } },
                },
              ],
            },
          })
          .expect(500);

        expect(body.attributes.summary).toEqual({
          failed: 1,
          skipped: 0,
          succeeded: 0,
          total: 1,
        });

        expect(body.attributes.errors).toHaveLength(1);
        expect(body.attributes.errors[0]).toEqual({
          err_code: 'UNSUPPORTED_RULE_IN_SUPPRESSION_FOR_THRESHOLD',
          message:
            "Rule type doesn't support this action. Use 'set_alert_suppression' action instead.",
          rules: [
            {
              id: createdRule.id,
              name: createdRule.name,
            },
          ],
          status_code: 500,
        });
      });
    });
  });
};
