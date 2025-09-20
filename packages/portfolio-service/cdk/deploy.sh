#!/bin/bash

# Deploy script for portfolio service
# This script handles argument passing better than pnpm

# Use environment variable or default to 'dev'
STAGE="${STAGE:-dev}"

echo "Deploying portfolio service with stage: $STAGE"

# Set AWS account
export CDK_DEFAULT_ACCOUNT="${CDK_DEFAULT_ACCOUNT:-676206907471}"
export CDK_DEFAULT_REGION="${CDK_DEFAULT_REGION:-us-east-1}"

# Bootstrap the CDK environment if needed
echo "Bootstrapping CDK environment..."
echo "Using account: $CDK_DEFAULT_ACCOUNT in region: $CDK_DEFAULT_REGION"
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION || true

# Run CDK deploy with proper context
npx cdk deploy --all --require-approval never -c stage="$STAGE"
