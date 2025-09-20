# Authentication Infrastructure

This package manages the AWS Cognito User Pool and authentication configuration for the Portfolio Tracker application.

## Overview

The auth infrastructure stack creates:

- AWS Cognito User Pool with email-based authentication
- Google OAuth integration (optional)
- User Pool Client for web application
- Cognito hosted UI domain
- SSM parameters for easy access

## Prerequisites

- AWS CDK CLI installed
- AWS credentials configured
- Google OAuth credentials (optional, for Google Sign-In)

## Configuration

### Environment Variables

For Google OAuth integration:

- `GOOGLE_CLIENT_ID`: OAuth 2.0 Client ID from Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: OAuth 2.0 Client Secret
- `COGNITO_DOMAIN_PREFIX`: Unique prefix for Cognito domain (e.g., 'portfolio-tracker-dev')
- `WEB_DOMAIN`: Your web application domain (e.g., 'https://app.example.com')

## Deployment

### Using the Deploy Script

```bash
cd packages/auth-infra

# With Google OAuth
GOOGLE_CLIENT_ID="your-client-id" \
GOOGLE_CLIENT_SECRET="your-client-secret" \
COGNITO_DOMAIN_PREFIX="your-unique-prefix" \
WEB_DOMAIN="https://app.example.com" \
./deploy.sh

# Without Google OAuth (development)
./deploy.sh
```

### Manual CDK Deployment

```bash
# Bootstrap CDK (first time only)
npm run cdk bootstrap

# Deploy the stack
npm run cdk deploy -- \
  --context googleClientId="$GOOGLE_CLIENT_ID" \
  --context googleClientSecret="$GOOGLE_CLIENT_SECRET" \
  --context domainPrefix="$COGNITO_DOMAIN_PREFIX" \
  --context webDomain="$WEB_DOMAIN"
```

## Google OAuth Setup

1. **Create Google OAuth Credentials**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing
   - Enable Google+ API
   - Create OAuth 2.0 credentials

2. **Configure Authorized Redirect URIs**
   After deploying this stack, add the following to your Google OAuth app:

   ```
   https://<your-cognito-domain>.auth.<region>.amazoncognito.com/oauth2/idpresponse
   ```

3. **Update and Redeploy**
   If you need to update Google OAuth settings, redeploy the stack.

## Outputs

The stack provides the following outputs:

- `UserPoolId`: Cognito User Pool ID
- `UserPoolClientId`: App Client ID
- `CognitoDomain`: Full Cognito hosted UI domain
- `UserPoolArn`: User Pool ARN for IAM policies

These values are also stored in SSM Parameter Store:

- `/portfolio-tracker/auth/user-pool-id`
- `/portfolio-tracker/auth/user-pool-client-id`
- `/portfolio-tracker/auth/cognito-domain`

## Local Development

For local development without Google OAuth:

1. Deploy without Google credentials
2. Use Cognito's built-in authentication
3. Create test users via AWS Console or CLI

## Security Considerations

- Never commit Google OAuth secrets to version control
- Use environment variables or AWS Secrets Manager
- Regularly rotate OAuth credentials
- Monitor sign-in activity via CloudWatch

## Troubleshooting

### Domain Already Exists

Cognito domains must be globally unique. If deployment fails:

1. Choose a different `COGNITO_DOMAIN_PREFIX`
2. Redeploy the stack

### Google Sign-In Not Working

1. Verify redirect URIs are correctly configured in Google Console
2. Check that both client ID and secret are provided
3. Ensure the domain is accessible (may take a few minutes after deployment)

### User Pool Already Exists

The stack uses `RemovalPolicy.RETAIN` for the User Pool. To fully remove:

1. Delete the CloudFormation stack
2. Manually delete the User Pool in AWS Console
