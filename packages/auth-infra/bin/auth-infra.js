#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const tslib_1 = require('tslib');
require('source-map-support/register');
const cdk = tslib_1.__importStar(require('aws-cdk-lib'));
const auth_infra_stack_1 = require('../src/auth-infra-stack');
const app = new cdk.App();
const authStack = new auth_infra_stack_1.AuthInfraStack(app, 'AuthInfraStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  domainPrefix: process.env.COGNITO_DOMAIN_PREFIX || 'portfolio-tracker-dev',
  // These will come from CDK context or environment
  webDomain: process.env.WEB_DOMAIN || 'http://localhost:3001',
});
//# sourceMappingURL=auth-infra.js.map
