/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { schema } from '@kbn/config-schema';
import { createRoot, request } from '@kbn/core-test-helpers-kbn-server';

describe('http resources service', () => {
  describe('register', () => {
    applyTestsWithDisableUnsafeEvalSetTo(true);
    applyTestsWithDisableUnsafeEvalSetTo(false);
  });
});

function applyTestsWithDisableUnsafeEvalSetTo(disableUnsafeEval: boolean) {
  describe(`with disableUnsafeEval=${disableUnsafeEval}`, () => {
    let root: ReturnType<typeof createRoot>;
    const defaultCspRules = disableUnsafeEval
      ? `script-src 'report-sample' 'self'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'`
      : `script-src 'report-sample' 'self' 'unsafe-eval'; worker-src 'report-sample' 'self' blob:; style-src 'report-sample' 'self' 'unsafe-inline'`;
    beforeEach(async () => {
      root = createRoot({
        csp: { disableUnsafeEval },
        plugins: { initialize: false },
        elasticsearch: { skipStartupConnectionCheck: true },
        server: { restrictInternalApis: false },
      });
      await root.preboot();
    });

    afterEach(async () => {
      await root.shutdown();
    });

    describe('renderAnonymousCoreApp', () => {
      it('renders core application', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        resources.register(
          {
            path: '/render-core',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) => res.renderAnonymousCoreApp()
        );

        await root.start();
        const response = await request.get(root, '/render-core').expect(200);

        expect(response.text.length).toBeGreaterThan(0);
      });

      it('applies default CSP header', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        resources.register(
          {
            path: '/render-core',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) => res.renderAnonymousCoreApp()
        );

        await root.start();
        const response = await request.get(root, '/render-core').expect(200);

        expect(response.header['content-security-policy']).toBe(defaultCspRules);
      });

      it('can attach headers, except the CSP header', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        resources.register(
          {
            path: '/render-core',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) =>
            res.renderAnonymousCoreApp({
              headers: {
                'content-security-policy': "script-src 'unsafe-eval'",
                'x-kibana': '42',
              },
            })
        );

        await root.start();
        const response = await request.get(root, '/render-core').expect(200);

        expect(response.header['content-security-policy']).toBe(defaultCspRules);
        expect(response.header['x-kibana']).toBe('42');
      });
    });

    describe('custom renders', () => {
      it('renders html', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        const htmlBody = `
          <!DOCTYPE html>
          <html>
            <body>
              <p>HTML body</p>
            </body>
          </html>
        `;
        resources.register(
          {
            path: '/render-html',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) => res.renderHtml({ body: htmlBody })
        );

        await root.start();
        const response = await request.get(root, '/render-html').expect(200);

        expect(response.text).toBe(htmlBody);
        expect(response.header['content-type']).toBe('text/html; charset=utf-8');
      });

      it('renders javascript', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        const jsBody = 'window.alert("from js body");';
        resources.register(
          {
            path: '/render-js',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) => res.renderJs({ body: jsBody })
        );

        await root.start();
        const response = await request.get(root, '/render-js').expect(200);

        expect(response.text).toBe(jsBody);
        expect(response.header['content-type']).toBe('text/javascript; charset=utf-8');
      });

      it('attaches CSP header', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        const htmlBody = `
          <!DOCTYPE html>
          <html>
            <body>
              <p>HTML body</p>
            </body>
          </html>
        `;
        resources.register(
          {
            path: '/render-html',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) => res.renderHtml({ body: htmlBody })
        );

        await root.start();
        const response = await request.get(root, '/render-html').expect(200);

        expect(response.header['content-security-policy']).toBe(defaultCspRules);
      });

      it('can attach headers, except the CSP & "content-type" headers', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        resources.register(
          {
            path: '/render-core',
            validate: false,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) =>
            res.renderHtml({
              body: '<html><p>Hi</p></html>',
              headers: {
                'content-security-policy': "script-src 'unsafe-eval'",
                'content-type': 'text/html',
                'x-kibana': '42',
              },
            })
        );

        await root.start();
        const response = await request.get(root, '/render-core').expect(200);

        expect(response.header['content-security-policy']).toBe(defaultCspRules);
        expect(response.header['x-kibana']).toBe('42');
      });

      it('can adjust route config', async () => {
        const { http, httpResources } = await root.setup();

        const router = http.createRouter('');
        const resources = httpResources.createRegistrar(router);
        const validate = {
          params: schema.object({
            id: schema.string(),
          }),
        };

        resources.register(
          {
            path: '/render-js-with-param/{id}',
            validate,
            security: { authz: { requiredPrivileges: ['foo'] } },
          },
          (context, req, res) => res.renderJs({ body: `window.alert(${req.params.id});` })
        );

        await root.start();
        const response = await request.get(root, '/render-js-with-param/42').expect(200);

        expect(response.text).toBe('window.alert(42);');
      });
    });

    it('responses do not contain the elastic-api-version header', async () => {
      const { http, httpResources } = await root.setup();

      const router = http.createRouter('');
      const resources = httpResources.createRegistrar(router);
      const htmlBody = `<p>HtMlr00lz</p>`;
      resources.register(
        {
          path: '/render-html',
          validate: false,
          security: { authz: { requiredPrivileges: ['foo'] } },
        },
        (context, req, res) => res.renderHtml({ body: htmlBody })
      );

      await root.start();
      const { header } = await request.get(root, '/render-html').expect(200);
      expect(header).not.toMatchObject({ 'elastic-api-version': expect.any(String) });
    });
  });
}
