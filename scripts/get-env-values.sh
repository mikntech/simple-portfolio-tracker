#!/bin/bash

# Script to get environment values from deployed infrastructure
# This helps developers set up their local .env file

set -e

echo "Getting environment values from deployed infrastructure..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo -e "${RED}Error: AWS CLI is not configured or you don't have valid credentials${NC}"
    echo "Please run 'aws configure' or set your AWS credentials"
    exit 1
fi

# Get the API URL from base infrastructure
echo "Fetching API URL..."
API_URL=$(aws cloudformation describe-stacks \
    --stack-name BaseInfraStack \
    --query "Stacks[0].Outputs[?OutputKey=='ApiGatewayUrl'].OutputValue" \
    --output text 2>/dev/null)

if [ -z "$API_URL" ]; then
    echo -e "${YELLOW}Warning: Could not find BaseInfraStack. API URL will need to be set manually.${NC}"
    API_URL="http://localhost:3000"
fi

# Get Cognito values from Auth infrastructure
echo "Fetching Cognito configuration..."
USER_POOL_ID=$(aws cloudformation describe-stacks \
    --stack-name AuthInfraStack \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
    --output text 2>/dev/null || echo "")

CLIENT_ID=$(aws cloudformation describe-stacks \
    --stack-name AuthInfraStack \
    --query "Stacks[0].Outputs[?OutputKey=='UserPoolClientId'].OutputValue" \
    --output text 2>/dev/null || echo "")

COGNITO_DOMAIN=$(aws cloudformation describe-stacks \
    --stack-name AuthInfraStack \
    --query "Stacks[0].Outputs[?OutputKey=='CognitoDomain'].OutputValue" \
    --output text 2>/dev/null || echo "")

# Create the .env file for web package
ENV_FILE="packages/web/.env"

echo -e "\n${GREEN}Creating $ENV_FILE with the following values:${NC}"

cat > "$ENV_FILE" << EOF
# API Configuration
VITE_API_URL=$API_URL

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=${USER_POOL_ID:-your-user-pool-id}
VITE_COGNITO_CLIENT_ID=${CLIENT_ID:-your-client-id}
VITE_COGNITO_DOMAIN=${COGNITO_DOMAIN:-your-cognito-domain.auth.region.amazoncognito.com}
VITE_REDIRECT_SIGN_IN=http://localhost:3001/
VITE_REDIRECT_SIGN_OUT=http://localhost:3001/
EOF

echo -e "\n${GREEN}Environment file created at: $ENV_FILE${NC}"

# Show the current values
echo -e "\n${GREEN}Current configuration:${NC}"
echo "API_URL: $API_URL"

if [ ! -z "$USER_POOL_ID" ]; then
    echo "USER_POOL_ID: $USER_POOL_ID"
    echo "CLIENT_ID: $CLIENT_ID"
    echo "COGNITO_DOMAIN: $COGNITO_DOMAIN"
    echo -e "\n${GREEN}All values successfully retrieved from deployed infrastructure!${NC}"
    echo "Run 'pnpm dev' to start the development server"
else
    echo -e "\n${YELLOW}Cognito configuration not found. You need to:${NC}"
    echo "1. Deploy the auth infrastructure: cd packages/auth-infra && ./deploy.sh"
    echo "2. Run this script again to get the values"
    echo "3. Or manually update the values in $ENV_FILE"
fi

echo -e "\n${GREEN}Done!${NC}"
