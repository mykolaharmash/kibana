/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Payload } from '@hapi/boom';
import {
  SavedObjectsErrorHelpers,
  type ISavedObjectTypeRegistry,
  type SavedObjectsRawDoc,
  type SavedObjectsRawDocSource,
  type SavedObject,
  type SavedObjectsRawDocParseOptions,
  type DecoratedError,
} from '@kbn/core-saved-objects-server';
import { SavedObjectsUtils, ALL_NAMESPACES_STRING } from '@kbn/core-saved-objects-utils-server';
import {
  decodeRequestVersion,
  encodeHitVersion,
} from '@kbn/core-saved-objects-base-server-internal';

/**
 * Checks the raw response of a bulk operation and returns an error if necessary.
 *
 * @param type
 * @param id
 * @param rawResponse
 *
 * @internal
 */
export function getBulkOperationError(
  type: string,
  id: string,
  rawResponse: {
    status: number;
    error?: { type: string; reason?: string | null; index: string };
    // Other fields are present on a bulk operation result but they are irrelevant for this function
  }
): Payload | undefined {
  const { status, error } = rawResponse;
  if (error) {
    switch (status) {
      case 404:
        return error.type === 'index_not_found_exception'
          ? SavedObjectsErrorHelpers.createIndexAliasNotFoundError(error.index).output.payload
          : SavedObjectsErrorHelpers.createGenericNotFoundError(type, id).output.payload;
      case 409:
        return SavedObjectsErrorHelpers.createConflictError(type, id).output.payload;
      default:
        return {
          error: 'Internal Server Error',
          message: `Unexpected bulk response [${status}] ${error.type}: ${error.reason}`,
          statusCode: 500,
        };
    }
  }
}

/**
 * Returns an object with the expected version properties. This facilitates Elasticsearch's Optimistic Concurrency Control.
 *
 * @param version Optional version specified by the consumer.
 * @param document Optional existing document that was obtained in a preflight operation.
 *
 * @internal
 */
export function getExpectedVersionProperties(version?: string, document?: SavedObjectsRawDoc) {
  if (version) {
    return decodeRequestVersion(version);
  } else if (document) {
    return {
      if_seq_no: document._seq_no,
      if_primary_term: document._primary_term,
    };
  }
  return {};
}

/**
 * @internal
 */
export interface GetSavedObjectFromSourceOptions {
  /** {@link SavedObjectsRawDocParseOptions.migrationVersionCompatibility} */
  migrationVersionCompatibility?: SavedObjectsRawDocParseOptions['migrationVersionCompatibility'];
}

/**
 * Gets a saved object from a raw ES document.
 *
 * @param registry
 * @param type
 * @param id
 * @param doc
 *
 * @internal
 */
export function getSavedObjectFromSource<T>(
  registry: ISavedObjectTypeRegistry,
  type: string,
  id: string,
  doc: { _seq_no?: number; _primary_term?: number; _source: SavedObjectsRawDocSource },
  { migrationVersionCompatibility = 'raw' }: GetSavedObjectFromSourceOptions = {}
): SavedObject<T> {
  const {
    originId,
    updated_at: updatedAt,
    created_at: createdAt,
    created_by: createdBy,
    updated_by: updatedBy,
    coreMigrationVersion,
    typeMigrationVersion,
    managed,
    migrationVersion = migrationVersionCompatibility === 'compatible' && typeMigrationVersion
      ? { [type]: typeMigrationVersion }
      : undefined,
  } = doc._source;

  let namespaces: string[] = [];
  if (!registry.isNamespaceAgnostic(type)) {
    namespaces = doc._source.namespaces ?? [
      SavedObjectsUtils.namespaceIdToString(doc._source.namespace),
    ];
  }

  return {
    id,
    type,
    namespaces,
    migrationVersion,
    coreMigrationVersion,
    typeMigrationVersion,
    ...(originId && { originId }),
    ...(updatedAt && { updated_at: updatedAt }),
    ...(createdAt && { created_at: createdAt }),
    ...(createdBy && { created_by: createdBy }),
    ...(updatedBy && { updated_by: updatedBy }),
    version: encodeHitVersion(doc),
    attributes: doc._source[type],
    references: doc._source.references || [],
    managed,
  };
}

/**
 * Check to ensure that a raw document exists in a namespace. If the document is not a multi-namespace type, then this returns `true` as
 * we rely on the guarantees of the document ID format. If the document is a multi-namespace type, this checks to ensure that the
 * document's `namespaces` value includes the string representation of the given namespace.
 *
 * WARNING: This should only be used for documents that were retrieved from Elasticsearch. Otherwise, the guarantees of the document ID
 * format mentioned above do not apply.
 *
 * @param registry
 * @param raw
 * @param namespace
 *
 * @internal
 */
export function rawDocExistsInNamespace(
  registry: ISavedObjectTypeRegistry,
  raw: SavedObjectsRawDoc,
  namespace: string | undefined
) {
  const rawDocType = raw._source.type;

  // if the type is namespace isolated, or namespace agnostic, we can continue to rely on the guarantees
  // of the document ID format and don't need to check this
  if (!registry.isMultiNamespace(rawDocType)) {
    return true;
  }

  const namespaces = raw._source.namespaces;
  const existsInNamespace =
    namespaces?.includes(SavedObjectsUtils.namespaceIdToString(namespace)) ||
    namespaces?.includes(ALL_NAMESPACES_STRING);
  return existsInNamespace ?? false;
}

/**
 * Check to ensure that a raw document exists in at least one of the given namespaces. If the document is not a multi-namespace type, then
 * this returns `true` as we rely on the guarantees of the document ID format. If the document is a multi-namespace type, this checks to
 * ensure that the document's `namespaces` value includes the string representation of at least one of the given namespaces.
 *
 * WARNING: This should only be used for documents that were retrieved from Elasticsearch. Otherwise, the guarantees of the document ID
 * format mentioned above do not apply.
 *
 * @param registry
 * @param raw
 * @param namespaces
 *
 * @internal
 */
export function rawDocExistsInNamespaces(
  registry: ISavedObjectTypeRegistry,
  raw: SavedObjectsRawDoc,
  namespaces: string[]
) {
  const rawDocType = raw._source.type;

  // if the type is namespace isolated, or namespace agnostic, we can continue to rely on the guarantees
  // of the document ID format and don't need to check this
  if (!registry.isMultiNamespace(rawDocType)) {
    return true;
  }

  const namespacesToCheck = new Set(namespaces);
  const existingNamespaces = raw._source.namespaces ?? [];

  if (namespacesToCheck.size === 0 || existingNamespaces.length === 0) {
    return false;
  }
  if (namespacesToCheck.has(ALL_NAMESPACES_STRING)) {
    return true;
  }

  return existingNamespaces.some((x) => x === ALL_NAMESPACES_STRING || namespacesToCheck.has(x));
}

/**
 * Ensure that a namespace is always in its namespace ID representation.
 * This allows `'default'` to be used interchangeably with `undefined`.
 *
 * @param namespace
 *
 * @internal
 */
export function normalizeNamespace(namespace?: string) {
  if (namespace === ALL_NAMESPACES_STRING) {
    throw SavedObjectsErrorHelpers.createBadRequestError('"options.namespace" cannot be "*"');
  } else if (namespace === undefined) {
    return namespace;
  } else {
    return SavedObjectsUtils.namespaceStringToId(namespace);
  }
}

/**
 * Returns the current time. For use in Elasticsearch operations.
 *
 * @internal
 */
export function getCurrentTime() {
  return new Date(Date.now()).toISOString();
}

/**
 * Returns the managed boolean to apply to a document as it's managed value.
 * For use by applications to modify behavior for managed saved objects.
 * The behavior is as follows:
 * If `optionsManaged` is set, it will override any existing `managed` value in all the documents being created
 * If `optionsManaged` is not provided, then the documents are created with whatever may be assigned to their `managed` property
 * or default to `false`.
 *
 * @internal
 */

export function setManaged({
  optionsManaged,
  objectManaged,
}: {
  optionsManaged?: boolean;
  objectManaged?: boolean;
}): boolean {
  return optionsManaged ?? objectManaged ?? false;
}

/**
 * Returns a string array of namespaces for a given saved object. If the saved object is undefined, the result is an array that contains the
 * current namespace. Value may be undefined if an existing saved object has no namespaces attribute; this should not happen in normal
 * operations, but it is possible if the Elasticsearch document is manually modified.
 *
 * @param namespace The current namespace.
 * @param document Optional existing saved object that was obtained in a preflight operation.
 */
export function getSavedObjectNamespaces(
  namespace?: string,
  document?: SavedObjectsRawDoc
): string[] | undefined {
  if (document) {
    return document._source?.namespaces;
  }
  return [SavedObjectsUtils.namespaceIdToString(namespace)];
}

/**
 * Extracts the contents of a decorated error to return the attributes for bulk operations.
 */
export const errorContent = (error: DecoratedError) => error.output.payload;

export function isMgetDoc(doc?: estypes.MgetResponseItem<unknown>): doc is estypes.GetGetResult {
  return Boolean(doc && 'found' in doc);
}
