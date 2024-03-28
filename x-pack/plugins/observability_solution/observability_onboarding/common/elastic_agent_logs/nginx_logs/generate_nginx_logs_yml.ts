/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dump } from 'js-yaml';

export const generateNginxLogsYml = ({
  namespace = 'default',
  apiKey,
  esHost,
  uuid,
}: {
  namespace?: string;
  apiKey: string;
  esHost: string[];
  uuid: string;
}) => {
  return dump({
    outputs: {
      default: {
        type: 'elasticsearch',
        hosts: esHost,
        api_key: apiKey,
        protocol: 'https',
        /**
          Giving the Agent the CA cert that matches with the key
          that serverless ES uses under the hood when running locally.
          Without this Agent cannot reach ES thorough https.
        */
        // ssl: {
        //   enabled: true,
        //   certificate_authorities: [
        //     '/Users/mykolaharmash/Developer/kibana/packages/kbn-dev-utils/certs/ca.crt',
        //   ],
        // },
      },
    },
    inputs: [
      {
        id: `nginx-logs-${uuid}`,
        type: 'logfile',
        data_stream: {
          namespace,
        },
        streams: [
          {
            id: `logfile-nginx.access-${uuid}`,
            data_stream: {
              dataset: 'nginx.access',
              type: 'logs',
            },
            ignore_older: '72h',
            paths: ['/var/log/nginx/access.log*'],
            exclude_files: ['.gz$'],
            tags: ['nginx-access'],
            processors: [
              {
                add_locale: null,
              },
            ],
          },
        ],
      },
    ],
  });
};
