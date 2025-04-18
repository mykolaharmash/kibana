/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Logger, ElasticsearchClient, DEFAULT_APP_CATEGORIES } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import type { DefaultAlert } from '@kbn/alerts-as-data-utils';
import {
  RuleType,
  RuleNotifyWhen,
  RuleExecutorOptions,
  RulesClient,
  RuleExecutorServices,
  DEFAULT_AAD_CONFIG,
  AlertsClientError,
} from '@kbn/alerting-plugin/server';
import {
  Rule,
  RuleTypeParams,
  RawAlertInstance,
  SanitizedRule,
  AlertInstanceContext,
} from '@kbn/alerting-plugin/common';
import { ActionsClient } from '@kbn/actions-plugin/server';
import { parseDuration } from '@kbn/alerting-plugin/common';
import {
  AlertState,
  AlertNodeState,
  AlertCluster,
  AlertMessage,
  AlertData,
  AlertInstanceState,
  AlertEnableAction,
  CommonAlertFilter,
  CommonAlertParams,
} from '../../common/types/alerts';
import { fetchClusters } from '../lib/alerts/fetch_clusters';
import { AlertSeverity } from '../../common/enums';
import { Globals } from '../static_globals';

type ExecutedState =
  | {
      lastChecked: number;
      lastExecutedAction: number;
      [key: string]: unknown;
    }
  | Record<string, any>;

interface RuleOptions {
  id: string;
  name: string;
  throttle?: string | null;
  interval?: string;
  defaultParams?: Partial<CommonAlertParams>;
  actionVariables: Array<{ name: string; description: string }>;
  fetchClustersRange?: number;
  accessorKey?: string;
}

const defaultRuleOptions = (): RuleOptions => {
  return {
    id: '',
    name: '',
    throttle: '1d',
    interval: '1m',
    defaultParams: { threshold: 85, duration: '1h' },
    actionVariables: [],
  };
};
export class BaseRule {
  protected scopedLogger: Logger;

  constructor(
    public sanitizedRule?: SanitizedRule,
    public ruleOptions: RuleOptions = defaultRuleOptions()
  ) {
    const defaultOptions = defaultRuleOptions();
    defaultOptions.defaultParams = {
      ...defaultOptions.defaultParams,
      ...this.ruleOptions.defaultParams,
    };
    this.ruleOptions = { ...defaultOptions, ...this.ruleOptions };
    this.scopedLogger = Globals.app.getLogger(ruleOptions.id);
  }

  public getRuleType(): RuleType<
    never,
    never,
    ExecutedState,
    AlertInstanceState,
    AlertInstanceContext,
    'default',
    never,
    DefaultAlert
  > {
    const { id, name, actionVariables } = this.ruleOptions;
    return {
      id,
      name,
      actionGroups: [
        {
          id: 'default',
          name: i18n.translate('xpack.monitoring.alerts.actionGroups.default', {
            defaultMessage: 'Default',
          }),
        },
      ],
      defaultActionGroupId: 'default',
      minimumLicenseRequired: 'basic',
      isExportable: false,
      executor: (
        options: RuleExecutorOptions<
          never,
          ExecutedState,
          AlertInstanceState,
          AlertInstanceContext,
          'default',
          DefaultAlert
        >
      ): Promise<any> => this.execute(options),
      category: DEFAULT_APP_CATEGORIES.management.id,
      producer: 'monitoring',
      solution: 'stack',
      actionVariables: {
        context: actionVariables,
      },
      alerts: DEFAULT_AAD_CONFIG,
      // As there is "[key: string]: unknown;" in CommonAlertParams,
      // we couldn't figure out a schema for validation and created a follow on issue:
      // https://github.com/elastic/kibana/issues/153754
      // Below validate function should be overwritten in each monitoring rule type
      validate: {
        params: { validate: (params) => params },
      },
    };
  }

  public getId() {
    return this.sanitizedRule?.id;
  }

  public async createIfDoesNotExist(
    rulesClient: RulesClient,
    actionsClient: ActionsClient,
    actions: AlertEnableAction[]
  ): Promise<SanitizedRule<RuleTypeParams>> {
    const existingRuleData = await rulesClient.find({
      options: {
        search: this.ruleOptions.id,
      },
    });

    if (existingRuleData.total > 0) {
      return existingRuleData.data[0] as Rule;
    }

    const {
      defaultParams: params = {},
      name,
      id: alertTypeId,
      throttle = '1d',
      interval = '1m',
    } = this.ruleOptions;

    const ruleActions = [];
    for (const actionData of actions) {
      const action = await actionsClient.get({ id: actionData.id });
      if (!action) {
        continue;
      }
      if (!action.isSystemAction) {
        ruleActions.push({
          group: 'default',
          id: actionData.id,
          params: {
            message: '{{context.internalShortMessage}}',
            ...actionData.config,
          },
          frequency: {
            summary: false,
            notifyWhen: RuleNotifyWhen.THROTTLE,
            throttle,
          },
        });
      }
    }

    return await rulesClient.create<RuleTypeParams>({
      data: {
        enabled: true,
        tags: [],
        params,
        consumer: 'monitoring',
        name,
        alertTypeId,
        schedule: { interval },
        actions: ruleActions,
      },
    });
  }

  public async getStates(
    rulesClient: RulesClient,
    id: string,
    filters: CommonAlertFilter[]
  ): Promise<{ [instanceId: string]: RawAlertInstance }> {
    const states = await rulesClient.getAlertState({ id });
    if (!states || !states.alertInstances) {
      return {};
    }

    return Object.keys(states.alertInstances).reduce(
      (accum: { [instanceId: string]: RawAlertInstance }, instanceId) => {
        if (!states.alertInstances) {
          return accum;
        }
        const alertInstance: RawAlertInstance = states.alertInstances[instanceId];
        const { state, ...filteredAlertInstance } = this.filterAlertInstance(
          alertInstance,
          filters
        );
        if (filteredAlertInstance) {
          accum[instanceId] = {
            ...filteredAlertInstance,
            // Only keep "alertStates" within the state
            ...(state ? { state: { alertStates: state.alertStates } } : {}),
          } as RawAlertInstance;
        }
        return accum;
      },
      {}
    );
  }

  protected filterAlertInstance(
    alertInstance: RawAlertInstance,
    filters: CommonAlertFilter[],
    filterOnNodes: boolean = false
  ) {
    if (!filterOnNodes) {
      return alertInstance;
    }
    const alertInstanceStates = alertInstance.state?.alertStates as AlertNodeState[];
    const nodeFilter = filters?.find((filter) => filter.nodeUuid);
    if (!filters || !filters.length || !alertInstanceStates?.length || !nodeFilter?.nodeUuid) {
      return alertInstance;
    }
    const alertStates = alertInstanceStates.filter(({ nodeId }) => nodeId === nodeFilter.nodeUuid);
    return { state: { alertStates } };
  }

  protected async execute({
    services,
    params,
    state,
  }: RuleExecutorOptions<
    never,
    ExecutedState,
    AlertInstanceState,
    AlertInstanceContext,
    'default',
    DefaultAlert
  >): Promise<any> {
    this.scopedLogger.debug(
      () =>
        `Executing alert with params: ${JSON.stringify(params)} and state: ${JSON.stringify(state)}`
    );

    const { alertsClient } = services;
    if (!alertsClient) {
      throw new AlertsClientError();
    }

    const esClient = services.scopedClusterClient.asCurrentUser;
    const clusters = await this.fetchClusters(esClient, params as CommonAlertParams);
    const data = await this.fetchData(params, esClient, clusters);
    return await this.processData(data, clusters, services, state);
  }

  protected async fetchClusters(esClient: ElasticsearchClient, params: CommonAlertParams) {
    if (!params.limit) {
      return await fetchClusters(esClient);
    }
    const limit = parseDuration(params.limit);
    const rangeFilter = this.ruleOptions.fetchClustersRange
      ? {
          timestamp: {
            format: 'epoch_millis',
            gte: String(+new Date() - limit - this.ruleOptions.fetchClustersRange),
          },
        }
      : undefined;
    return await fetchClusters(esClient, rangeFilter);
  }

  protected async fetchData(
    params: CommonAlertParams | unknown,
    esClient: ElasticsearchClient,
    clusters: AlertCluster[]
  ): Promise<Array<AlertData & unknown>> {
    throw new Error('Child classes must implement `fetchData`');
  }

  protected async processData(
    data: AlertData[],
    clusters: AlertCluster[],
    services: RuleExecutorServices<
      AlertInstanceState,
      AlertInstanceContext,
      'default',
      DefaultAlert
    >,
    state: ExecutedState
  ) {
    const currentUTC = +new Date();
    // for each cluster filter the nodes that belong to this cluster
    for (const cluster of clusters) {
      const nodes = data.filter((node) => node.clusterUuid === cluster.clusterUuid);
      if (!nodes.length) {
        continue;
      }

      const key = this.ruleOptions.accessorKey;

      // for each node, update the alert's state with node state
      for (const node of nodes) {
        const newAlertStates: AlertNodeState[] = [];
        // quick fix for now so that non node level alerts will use the cluster id

        if (node.shouldFire) {
          const { meta } = node;
          // create a default alert state for this node and add data from node.meta and other data
          const nodeState = this.getDefaultAlertState(cluster, node) as AlertNodeState;
          if (key) {
            nodeState[key] = meta[key];
          }
          nodeState.nodeId = meta.nodeId || node.nodeId! || meta.instanceId;
          // TODO: make these functions more generic, so it's node/item agnostic
          nodeState.nodeName = meta.itemLabel || meta.nodeName || node.nodeName || nodeState.nodeId;
          nodeState.itemLabel = meta.itemLabel;
          nodeState.meta = meta;
          nodeState.ui.triggeredMS = currentUTC;
          nodeState.ui.isFiring = true;
          nodeState.ui.severity = node.severity;
          nodeState.ui.message = this.getUiMessage(nodeState, node);
          // store the state of each node in array.
          newAlertStates.push(nodeState);

          const alertInstanceState = { alertStates: newAlertStates };
          // update the alert's state with the new node states
          if (newAlertStates.length) {
            const alertId = node.meta.nodeId || node.meta.instanceId || cluster.clusterUuid;
            services.alertsClient?.report({
              id: alertId,
              actionGroup: 'default',
              state: alertInstanceState,
            });
            this.executeActions(services, alertId, alertInstanceState, null, cluster);
            state.lastExecutedAction = currentUTC;
          }
        }
      }
    }

    state.lastChecked = currentUTC;
    return state;
  }

  protected getDefaultAlertState(cluster: AlertCluster, item: AlertData): AlertState {
    return {
      cluster,
      ccs: item.ccs,
      ui: {
        isFiring: false,
        message: null,
        severity: AlertSeverity.Success,
        triggeredMS: 0,
        lastCheckedMS: 0,
      },
    };
  }

  protected getUiMessage(
    alertState: AlertState | unknown,
    item: AlertData | unknown
  ): AlertMessage {
    throw new Error('Child classes must implement `getUiMessage`');
  }

  protected executeActions(
    services: RuleExecutorServices<
      AlertInstanceState,
      AlertInstanceContext,
      'default',
      DefaultAlert
    >,
    alertId: string,
    alertState: AlertInstanceState | AlertState | unknown,
    item: AlertData | unknown,
    cluster?: AlertCluster | unknown
  ) {
    throw new Error('Child classes must implement `executeActions`');
  }

  protected createGlobalStateLink(link: string, clusterUuid: string, ccs?: string) {
    const globalState = [`cluster_uuid:'${clusterUuid}'`];
    if (ccs) {
      globalState.push(`ccs:${ccs}`);
    }

    return `${Globals.app.url ?? ''}/app/monitoring#/${link}?_g=(${globalState.toString()})`;
  }
}
