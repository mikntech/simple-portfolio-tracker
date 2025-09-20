#!/bin/bash

# Deploy script for base infrastructure
# This script handles argument passing better than pnpm

# Check if domain name is provided
if [ -z "$DOMAIN_NAME" ] && [ -z "$1" ]; then
  echo "Error: Domain name must be provided"
  echo "Usage: DOMAIN_NAME=example.com ./deploy.sh"
  echo "   or: ./deploy.sh example.com"
  exit 1
fi

# Use first argument as domain if DOMAIN_NAME env var is not set
DOMAIN="${DOMAIN_NAME:-$1}"
API_SUBDOMAIN="${API_SUBDOMAIN:-api}"
WEB_SUBDOMAIN="${WEB_SUBDOMAIN:-app}"

echo "Deploying with domain: $DOMAIN"
echo "API subdomain: $API_SUBDOMAIN"
echo "Web subdomain: $WEB_SUBDOMAIN"

# Set AWS account
export CDK_DEFAULT_ACCOUNT="${CDK_DEFAULT_ACCOUNT:-676206907471}"
export CDK_DEFAULT_REGION="${CDK_DEFAULT_REGION:-us-east-1}"

# Bootstrap the CDK environment if needed
echo "Bootstrapping CDK environment..."
echo "Using account: $CDK_DEFAULT_ACCOUNT in region: $CDK_DEFAULT_REGION"
npx cdk bootstrap aws://$CDK_DEFAULT_ACCOUNT/$CDK_DEFAULT_REGION || true

# Run CDK deploy with proper context
npx cdk deploy --all --require-approval never \
  -c domainName="$DOMAIN" \
  -c apiSubdomain="$API_SUBDOMAIN" \
  -c webSubdomain="$WEB_SUBDOMAIN"
