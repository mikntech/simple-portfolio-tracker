#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { BaseInfraStack } from '../src/base-infra-stack';

const app = new cdk.App();

const getEnvFromGACIC = ({
  name,
  camelCase,
  UPPER_CASE,
}: {
  name: string;
  camelCase: string;
  UPPER_CASE: string;
}) => {
  const rawValue = app.node.tryGetContext(camelCase) || process.env[UPPER_CASE];
  const value = rawValue?.trim();

  if (!value || value === '') {
    console.error(`Error: ${name} is empty or not provided`);
    console.error(`Please ensure ${UPPER_CASE} secret is properly set in GitHub`);
    throw new Error(
      `${name} must be provided via context (-c ${camelCase}=example) or ${UPPER_CASE} environment variable`
    );
  }
  return value;
};

const domainName = getEnvFromGACIC({
  name: 'domain name',
  camelCase: 'domainName',
  UPPER_CASE: 'DOMAIN_NAME',
});
const stage = getEnvFromGACIC({ name: 'stage', camelCase: 'stage', UPPER_CASE: 'STAGE' });

new BaseInfraStack(app, 'PortFolioBaseInfraStack', {
  domainName,
  apiSubdomain: app.node.tryGetContext('apiSubdomain') || (stage !== 'prod' ? stage : '') + 'api',
  webSubdomain: app.node.tryGetContext('webSubdomain') || (stage !== 'prod' ? stage : '') + 'app',
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT || '676206907471',
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  stage,
});
