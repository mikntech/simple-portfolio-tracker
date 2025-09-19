# Configuration Guide

This guide explains all the environment variables and configuration options for the template.

## Environment Variables

### Root Level (.env)

Create a `.env` file in the root directory with the following variables:

```bash
# API Configuration
PORT=4000
NODE_ENV=development

# AWS Configuration (for local development)
AWS_REGION=us-east-1
AWS_PROFILE=default

# Database
TABLE_NAME=template-data-table
```

### Frontend (apps/web/.env)

Create a `.env` file in the `apps/web` directory:

```bash
# API URL
VITE_API_URL=http://localhost:4000

# Feature Flags
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_AUTH=false
```

### Backend (apps/api/.env)

Create a `.env` file in the `apps/api` directory:

```bash
# Server Configuration
PORT=4000
NODE_ENV=development

# Database
TABLE_NAME=template-data-table

# AWS (for local development)
AWS_REGION=us-east-1
AWS_PROFILE=default

# Auth (when enabled)
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Infrastructure (apps/infrastructure/.env)

Create a `.env` file in the `apps/infrastructure` directory:

```bash
# AWS Account Configuration
CDK_DEFAULT_ACCOUNT=123456789012
CDK_DEFAULT_REGION=us-east-1

# Stack Configuration
STACK_NAME=TemplateInfrastructureStack
ENVIRONMENT=production

# Domain (optional)
DOMAIN_NAME=example.com
CERTIFICATE_ARN=arn:aws:acm:us-east-1:123456789012:certificate/xxx
```

## GitHub Secrets

For CI/CD, configure these secrets in your GitHub repository:

### Required Secrets

- `AWS_ACCESS_KEY_ID` - AWS access key for deployments
- `AWS_SECRET_ACCESS_KEY` - AWS secret key for deployments
- `AWS_ACCOUNT_ID` - Your AWS account ID

### Optional Secrets

- `CODECOV_TOKEN` - For code coverage reporting
- `SLACK_WEBHOOK_URL` - For deployment notifications
- `SENTRY_DSN` - For error tracking

## Local Development Setup

1. Copy the environment templates:

```bash
# Create root .env
cat > .env << EOF
PORT=4000
NODE_ENV=development
AWS_REGION=us-east-1
AWS_PROFILE=default
TABLE_NAME=template-data-table
EOF

# Create frontend .env
cat > apps/web/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_AUTH=false
EOF

# Create backend .env
cat > apps/api/.env << EOF
PORT=4000
NODE_ENV=development
TABLE_NAME=template-data-table
AWS_REGION=us-east-1
AWS_PROFILE=default
EOF
```

2. Update the values according to your setup

## Production Configuration

For production deployments:

1. Use AWS Systems Manager Parameter Store or AWS Secrets Manager
2. Reference secrets in your CDK stack
3. Never commit sensitive values to the repository

### Example CDK Secret Reference

```typescript
const apiKey = secretsmanager.Secret.fromSecretNameV2(this, 'ApiKey', 'prod/api/key');

const apiFunction = new lambda.Function(this, 'ApiFunction', {
  // ... other config
  environment: {
    API_KEY: apiKey.secretValue.toString(),
  },
});
```

## Configuration Best Practices

1. **Never commit secrets** - Use `.env` files locally and secrets management in production
2. **Use prefixes** - Prefix frontend env vars with `VITE_` for Vite to expose them
3. **Validate configuration** - Use Zod schemas to validate environment variables
4. **Document everything** - Keep this file updated with new configuration options
5. **Use defaults** - Provide sensible defaults for optional configuration
