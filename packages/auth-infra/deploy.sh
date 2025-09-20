#!/bin/bash

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}Deploying Authentication Infrastructure...${NC}"

# Check for Google OAuth credentials
if [ -z "$GOOGLE_CLIENT_ID" ] || [ -z "$GOOGLE_CLIENT_SECRET" ]; then
    echo -e "${YELLOW}Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set${NC}"
    echo "Deploying without Google OAuth provider"
fi

# Get web domain from environment or use default
WEB_DOMAIN=${WEB_DOMAIN:-"http://localhost:3001"}
COGNITO_DOMAIN_PREFIX=${COGNITO_DOMAIN_PREFIX:-"portfolio-tracker-dev"}

echo "Using domain prefix: $COGNITO_DOMAIN_PREFIX"
echo "Using web domain: $WEB_DOMAIN"

# Bootstrap if needed
echo -e "${GREEN}Bootstrapping CDK...${NC}"
npm run cdk bootstrap

# Deploy the stack
echo -e "${GREEN}Deploying Auth Infrastructure Stack...${NC}"
npm run cdk deploy -- \
    --require-approval never \
    --outputs-file outputs.json \
    --context googleClientId="$GOOGLE_CLIENT_ID" \
    --context googleClientSecret="$GOOGLE_CLIENT_SECRET" \
    --context domainPrefix="$COGNITO_DOMAIN_PREFIX" \
    --context webDomain="$WEB_DOMAIN"

echo -e "${GREEN}Deployment complete!${NC}"

# Display outputs
if [ -f outputs.json ]; then
    echo -e "\n${GREEN}Stack Outputs:${NC}"
    cat outputs.json | jq '.AuthInfraStack'
fi
