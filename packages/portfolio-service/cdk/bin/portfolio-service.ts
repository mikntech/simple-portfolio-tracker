#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PortfolioServiceStack } from '../src/portfolio-service-stack';

const app = new cdk.App();

const stage = app.node.tryGetContext('stage') || process.env.STAGE || 'dev';

new PortfolioServiceStack(app, 'PortFolioServiceStack', {
  stage,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '676206907471',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});
