/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { apiCanAddNewPanel } from '@kbn/presentation-containers';
import { EmbeddableApiContext } from '@kbn/presentation-publishing';
import { IncompatibleActionError, ADD_PANEL_TRIGGER } from '@kbn/ui-actions-plugin/public';
import { UiActionsPublicStart } from '@kbn/ui-actions-plugin/public/plugin';
import { embeddableExamplesGrouping } from '../embeddable_examples_grouping';
import { ADD_FIELD_LIST_ACTION_ID, FIELD_LIST_ID } from './constants';
import { FieldListSerializedState } from './types';

export const registerCreateFieldListAction = (uiActions: UiActionsPublicStart) => {
  uiActions.registerAction<EmbeddableApiContext>({
    id: ADD_FIELD_LIST_ACTION_ID,
    grouping: [embeddableExamplesGrouping],
    getIconType: () => 'indexOpen',
    isCompatible: async ({ embeddable }) => {
      return apiCanAddNewPanel(embeddable);
    },
    execute: async ({ embeddable }) => {
      if (!apiCanAddNewPanel(embeddable)) throw new IncompatibleActionError();
      embeddable.addNewPanel<FieldListSerializedState>({
        panelType: FIELD_LIST_ID,
      });
    },
    getDisplayName: () =>
      i18n.translate('embeddableExamples.unifiedFieldList.displayName', {
        defaultMessage: 'Field list',
      }),
  });
  uiActions.attachAction(ADD_PANEL_TRIGGER, ADD_FIELD_LIST_ACTION_ID);
};
