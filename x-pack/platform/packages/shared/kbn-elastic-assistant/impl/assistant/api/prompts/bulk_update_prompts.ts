/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HttpSetup, IToasts } from '@kbn/core/public';
import {
  ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
  API_VERSIONS,
} from '@kbn/elastic-assistant-common';
import {
  PerformPromptsBulkActionRequestBody,
  PerformPromptsBulkActionResponse,
} from '@kbn/elastic-assistant-common/impl/schemas';

export const bulkUpdatePrompts = async (
  http: HttpSetup,
  prompts: PerformPromptsBulkActionRequestBody,
  toasts?: IToasts
): Promise<PerformPromptsBulkActionResponse | { success: false }> => {
  try {
    const result = await http.fetch<PerformPromptsBulkActionResponse>(
      ELASTIC_AI_ASSISTANT_PROMPTS_URL_BULK_ACTION,
      {
        method: 'POST',
        version: API_VERSIONS.public.v1,
        body: JSON.stringify(prompts),
      }
    );

    if (!result.success) {
      const serverError = result.attributes.errors
        ?.map(
          (e) =>
            `${e.status_code ? `Error code: ${e.status_code}. ` : ''}Error message: ${
              e.message
            } for prompt ${e.prompts.map((c) => c.name).join(',')}`
        )
        .join(',\n');
      throw new Error(serverError);
    }
    return result;
  } catch (error) {
    toasts?.addError(error.body && error.body.message ? new Error(error.body.message) : error, {
      title: i18n.translate('xpack.elasticAssistant.prompts.bulkActionspromptsError', {
        defaultMessage: 'Error updating prompts {error}',
        values: {
          error: error.message
            ? Array.isArray(error.message)
              ? error.message.join(',')
              : error.message
            : error,
        },
      }),
    });
    return { success: false };
  }
};
