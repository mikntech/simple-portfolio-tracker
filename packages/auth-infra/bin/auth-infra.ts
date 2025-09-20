#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthInfraStack } from '../src/auth-infra-stack';

const app = new cdk.App();

const authStack = new AuthInfraStack(app, 'AuthInfraStack', {
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
