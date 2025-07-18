/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { EuiHighlight, EuiSelectable, UseEuiTheme, useEuiTheme } from '@elastic/eui';
import { EuiSelectableOption } from '@elastic/eui/src/components/selectable/selectable_option';
import { useBatchedPublishingSubjects } from '@kbn/presentation-publishing';

import { css } from '@emotion/react';
import { useMemoCss } from '@kbn/css-utils/public/use_memo_css';
import { OptionsListSuggestions } from '../../../../../common/options_list/types';
import { OptionsListSelection } from '../../../../../common/options_list/options_list_selections';
import { MAX_OPTIONS_LIST_REQUEST_SIZE } from '../constants';
import { useOptionsListContext } from '../options_list_context_provider';
import { OptionsListStrings } from '../options_list_strings';
import { OptionsListPopoverEmptyMessage } from './options_list_popover_empty_message';
import { OptionsListPopoverSuggestionBadge } from './options_list_popover_suggestion_badge';

interface OptionsListPopoverSuggestionsProps {
  showOnlySelected: boolean;
}

export const OptionsListPopoverSuggestions = ({
  showOnlySelected,
}: OptionsListPopoverSuggestionsProps) => {
  const {
    componentApi,
    displaySettings: { hideExists },
  } = useOptionsListContext();

  const { euiTheme } = useEuiTheme();
  const styles = useMemoCss(optionListPopoverSuggestionsStyles);

  const [
    sort,
    searchString,
    existsSelected,
    searchTechnique,
    selectedOptions,
    fieldName,
    invalidSelections,
    availableOptions,
    totalCardinality,
    loading,
    fieldFormatter,
    allowExpensiveQueries,
  ] = useBatchedPublishingSubjects(
    componentApi.sort$,
    componentApi.searchString$,
    componentApi.existsSelected$,
    componentApi.searchTechnique$,
    componentApi.selectedOptions$,
    componentApi.fieldName$,
    componentApi.invalidSelections$,
    componentApi.availableOptions$,
    componentApi.totalCardinality$,
    componentApi.dataLoading$,
    componentApi.fieldFormatter,
    componentApi.parentApi.allowExpensiveQueries$
  );

  const listRef = useRef<HTMLDivElement>(null);

  const canLoadMoreSuggestions = useMemo<boolean>(
    () =>
      allowExpensiveQueries && totalCardinality && !showOnlySelected // && searchString.valid
        ? (availableOptions ?? []).length <
          Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE)
        : false,
    [availableOptions, totalCardinality, showOnlySelected, allowExpensiveQueries]
  );

  const suggestions = useMemo<OptionsListSuggestions | OptionsListSelection[]>(() => {
    return (showOnlySelected ? selectedOptions : availableOptions) ?? [];
  }, [availableOptions, selectedOptions, showOnlySelected]);

  const existsSelectableOption = useMemo<EuiSelectableOption | undefined>(() => {
    if (hideExists || (!existsSelected && (showOnlySelected || suggestions?.length === 0))) return;

    return {
      key: 'exists-option',
      checked: existsSelected ? 'on' : undefined,
      label: OptionsListStrings.controlAndPopover.getExists(),
      css: styles.optionsListExistsFilter,
      'data-test-subj': 'optionsList-control-selection-exists',
    };
  }, [suggestions, existsSelected, showOnlySelected, hideExists, styles]);

  const [selectableOptions, setSelectableOptions] = useState<EuiSelectableOption[]>([]); // will be set in following useEffect
  useEffect(() => {
    /* This useEffect makes selectableOptions responsive to search, show only selected, and clear selections */
    const options: EuiSelectableOption[] = suggestions.map((suggestion) => {
      if (typeof suggestion !== 'object') {
        // this means that `showOnlySelected` is true, and doc count is not known when this is the case
        suggestion = { value: suggestion };
      }

      return {
        key: String(suggestion.value),
        label: String(fieldFormatter(suggestion.value) ?? suggestion.value),
        checked: (selectedOptions ?? []).includes(suggestion.value) ? 'on' : undefined,
        'data-test-subj': `optionsList-control-selection-${suggestion.value}`,
        className:
          showOnlySelected && invalidSelections.has(suggestion.value)
            ? 'optionsList__selectionInvalid'
            : 'optionsList__validSuggestion',
        append:
          !showOnlySelected && suggestion?.docCount ? (
            <OptionsListPopoverSuggestionBadge documentCount={suggestion.docCount} />
          ) : undefined,
      } as EuiSelectableOption;
    });

    if (canLoadMoreSuggestions) {
      options.push({
        key: 'loading-option',
        'data-test-subj': 'optionslist--canLoadMore',
        label: OptionsListStrings.popover.getLoadingMoreMessage(),
        isGroupLabel: true,
        css: styles.loadMore,
      });
    } else if (options.length === MAX_OPTIONS_LIST_REQUEST_SIZE) {
      options.push({
        key: 'no-more-option',
        label: OptionsListStrings.popover.getAtEndOfOptionsMessage(),
        isGroupLabel: true,
        css: styles.noMoreOptions,
      });
    }
    setSelectableOptions(existsSelectableOption ? [existsSelectableOption, ...options] : options);
  }, [
    suggestions,
    availableOptions,
    showOnlySelected,
    selectedOptions,
    invalidSelections,
    existsSelectableOption,
    canLoadMoreSuggestions,
    fieldFormatter,
    styles,
  ]);

  const loadMoreOptions = useCallback(() => {
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    if (!listbox) return;

    const { scrollTop, scrollHeight, clientHeight } = listbox;
    if (scrollTop + clientHeight >= scrollHeight - parseInt(euiTheme.size.xxl, 10)) {
      // reached the "bottom" of the list, where euiSizeXXL acts as a "margin of error" so that the user doesn't
      // have to scroll **all the way** to the bottom in order to load more options
      componentApi.setRequestSize(Math.min(totalCardinality, MAX_OPTIONS_LIST_REQUEST_SIZE));
      componentApi.loadMoreSubject.next(); // trigger refetch with loadMoreSubject
    }
  }, [componentApi, euiTheme.size.xxl, totalCardinality]);

  const renderOption = useCallback(
    (option: EuiSelectableOption, searchStringValue: string) => {
      if (!allowExpensiveQueries || searchTechnique === 'exact') return option.label;

      return (
        <EuiHighlight search={option.key === 'exists-option' ? '' : searchStringValue}>
          {option.label}
        </EuiHighlight>
      );
    },
    [searchTechnique, allowExpensiveQueries]
  );

  useEffect(() => {
    const container = listRef.current;
    if (!loading && canLoadMoreSuggestions) {
      container?.addEventListener('scroll', loadMoreOptions, true);
      return () => {
        container?.removeEventListener('scroll', loadMoreOptions, true);
      };
    }
  }, [loadMoreOptions, loading, canLoadMoreSuggestions]);

  useEffect(() => {
    // scroll back to the top when changing the sorting or the search string
    const listbox = listRef.current?.querySelector('.euiSelectableList__list');
    listbox?.scrollTo({ top: 0 });
  }, [sort, searchString]);

  return (
    <>
      <div data-test-subj="optionsList--scrollListener" ref={listRef}>
        <EuiSelectable
          options={selectableOptions}
          renderOption={(option) => renderOption(option, searchString)}
          listProps={{ onFocusBadge: false }}
          aria-label={OptionsListStrings.popover.getSuggestionsAriaLabel(
            fieldName,
            selectableOptions.length
          )}
          emptyMessage={<OptionsListPopoverEmptyMessage showOnlySelected={showOnlySelected} />}
          onChange={(newSuggestions, event, changedOption) => {
            componentApi.makeSelection(changedOption.key, showOnlySelected);
          }}
        >
          {(list) => list}
        </EuiSelectable>
      </div>
    </>
  );
};

const optionListPopoverSuggestionsStyles = {
  optionsListExistsFilter: ({ euiTheme }: UseEuiTheme) => css`
    font-style: italic;
    font-weight: ${euiTheme.font.weight.medium};
  `,
  loadMore: ({ euiTheme }: UseEuiTheme) => css`
    text-align: center;
    padding: ${euiTheme.size.m};
    font-style: italic;
    height: ${euiTheme.size.xxl} !important;
  `,
  noMoreOptions: ({ euiTheme }: UseEuiTheme) =>
    css({
      textAlign: 'center',
      fontSize: euiTheme.size.m,
      height: 'auto !important',
      color: euiTheme.colors.textSubdued,
      padding: euiTheme.size.m,
    }),
};
