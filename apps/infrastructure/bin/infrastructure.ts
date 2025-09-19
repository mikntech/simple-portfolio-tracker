#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { InfrastructureStack } from '../src/infrastructure-stack';

const app = new cdk.App();

// Get environment from context or use defaults
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
};

new InfrastructureStack(app, 'TemplateInfrastructureStack', {
  env,
  description: 'Infrastructure for the Full-Stack Template Application',
});

app.synth();
