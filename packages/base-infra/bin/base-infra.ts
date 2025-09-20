#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfraStack } from '../src/base-infra-stack';

const app = new cdk.App();

const rawDomainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME;
const domainName = rawDomainName?.trim();

if (!domainName || domainName === '') {
  console.error('Error: Domain name is empty or not provided');
  console.error('Please ensure DOMAIN_NAME secret is properly set in GitHub');
  throw new Error(
    'Domain name must be provided via context (-c domainName=example.com) or DOMAIN_NAME environment variable'
  );
}

new BaseInfraStack(app, 'BaseInfraStack', {
  domainName,
  apiSubdomain: app.node.tryGetContext('apiSubdomain') || 'api',
  webSubdomain: app.node.tryGetContext('webSubdomain') || 'app',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '676206907471',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'Portfolio Tracker Base Infrastructure - Route53, ACM, API Gateway',
});
