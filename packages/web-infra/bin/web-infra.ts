#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { WebInfraStack } from '../src/web-infra-stack';

const app = new cdk.App();

// Get configuration from context or environment
const rawDomainName = app.node.tryGetContext('domainName') || process.env.DOMAIN_NAME;
const domainName = rawDomainName?.trim();
const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';

// Generate subdomains based on stage
const apiSubdomain =
  app.node.tryGetContext('apiSubdomain') || (stage !== 'prod' ? stage : '') + 'api';
const webSubdomain =
  app.node.tryGetContext('webSubdomain') || (stage !== 'prod' ? stage : '') + 'app';

// Debug logging
console.log('Debug - Context domainName:', app.node.tryGetContext('domainName'));
console.log('Debug - Environment DOMAIN_NAME:', process.env.DOMAIN_NAME);
console.log('Debug - Stage:', stage);
console.log('Debug - Final domainName:', domainName);

if (!domainName || domainName === '') {
  console.error('Error: Domain name is empty or not provided');
  throw new Error(
    'Domain name must be provided via context (-c domainName=example.com) or DOMAIN_NAME environment variable'
  );
}

console.log(`Domain configured: ${domainName}`);
console.log(`Stage: ${stage}`);

new WebInfraStack(app, `PortfolioWebInfraStack-${stage}`, {
  domainName,
  webSubdomain,
  apiDomainName: `${apiSubdomain}.${domainName}`,
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '676206907471',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1', // CloudFront requires us-east-1
  },
  description: `Portfolio Tracker Web Infrastructure - S3, CloudFront (${stage})`,
});
