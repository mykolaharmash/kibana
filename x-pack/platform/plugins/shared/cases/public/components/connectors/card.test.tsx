/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';

import { ConnectorTypes } from '../../../common/types/domain';
import { ConnectorCard } from './card';
import { createQueryWithMarkup } from '../../common/test_utils';

describe('ConnectorCard ', () => {
  it('does not throw when accessing the icon if the connector type is not registered', () => {
    expect(() =>
      render(
        <ConnectorCard
          connectorType={ConnectorTypes.none}
          title="None"
          listItems={[]}
          isLoading={false}
        />
      )
    ).not.toThrowError();
  });

  it('shows the loading skeleton if loading', () => {
    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="None"
        listItems={[]}
        isLoading={true}
      />
    );

    expect(screen.getByTestId('connector-card-loading')).toBeInTheDocument();
    expect(screen.queryByTestId('connector-card')).not.toBeInTheDocument();
  });

  it('shows the connector title', () => {
    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        listItems={[]}
        isLoading={false}
      />
    );

    expect(screen.getByText('My connector')).toBeInTheDocument();
  });

  it('shows the connector list items', () => {
    const listItems = [
      { title: 'item 1 title', description: 'item 1 desc' },
      { title: 'item 2 title', description: 'item 2 desc' },
    ];

    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        listItems={listItems}
        isLoading={false}
      />
    );

    const getByTextWithMarkup = createQueryWithMarkup(screen.getByText);

    for (const item of listItems) {
      expect(getByTextWithMarkup(`${item.title}: ${item.description}`)).toBeInTheDocument();
    }
  });

  it('shows a codeblock when applicable', async () => {
    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        listItems={[{ title: 'some title', description: 'some code', displayAsCodeBlock: true }]}
        isLoading={false}
      />
    );

    expect(await screen.findByTestId('card-list-item')).toBeInTheDocument();
    expect(await screen.findByTestId('card-list-code-block')).toBeInTheDocument();
  });

  it('does not show a codeblock when not necessary', async () => {
    render(
      <ConnectorCard
        connectorType={ConnectorTypes.none}
        title="My connector"
        listItems={[{ title: 'some title', description: 'some code' }]}
        isLoading={false}
      />
    );

    expect(await screen.findByTestId('card-list-item')).toBeInTheDocument();
    expect(screen.queryByTestId('card-list-code-block')).not.toBeInTheDocument();
  });
});
