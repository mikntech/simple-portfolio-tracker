#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthInfraStack } from '../src/auth-infra-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';
const domainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME || 'keeride.com';

new AuthInfraStack(app, `PortfolioAuthInfraStack-${stage}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  googleClientId: process.env.GOOGLE_CLIENT_ID || '',
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
  domainPrefix: process.env.COGNITO_DOMAIN_PREFIX || 'portfolio-tracker-' + stage,
  // These will come from CDK context or environment
  webDomain:
    process.env.WEB_DOMAIN ||
    (stage === 'prod' ? 'app.' + domainName : stage + 'app.' + domainName),
  stage: stage,
});
