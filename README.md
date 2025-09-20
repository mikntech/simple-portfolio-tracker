# Simple Portfolio Tracker

A modern portfolio tracking application built with AWS serverless technologies, React, and TypeScript. Track your investments, manage portfolios, set target allocations, and analyze your holdings.

## Features

- 🔐 **Secure Authentication**: Google Sign-In via AWS Cognito
- 📊 **Portfolio Management**: Create and manage multiple investment portfolios
- 💰 **Transaction Tracking**: Add transactions individually or bulk import via CSV
- 🎯 **Target Allocations**: Set desired portfolio allocations and track deviations
- 📈 **Real-time Analytics**: View holdings, performance, and rebalancing suggestions
- 🔄 **Automated Deployments**: GitHub Actions CI/CD pipeline

## Tech Stack

### Frontend

- React 18 with TypeScript
- Vite for fast development
- TanStack Query for data fetching
- Tailwind CSS for styling
- AWS Amplify for authentication

### Backend

- AWS Lambda functions
- API Gateway REST API
- DynamoDB for data storage
- AWS CDK for infrastructure as code

### Infrastructure

- CloudFront for global content delivery
- S3 for static website hosting
- Route53 for DNS management
- ACM for SSL certificates

## Project Structure

```
simple-portfolio-tracker/
├── packages/
│   ├── web/                 # React frontend application
│   ├── api/                 # API Lambda functions (future)
│   ├── portfolio-service/   # Portfolio management service
│   ├── shared-types/        # Shared TypeScript types
│   ├── api-contracts/       # API contract definitions
│   ├── base-infra/         # Base AWS infrastructure
│   └── web-infra/          # Web hosting infrastructure
├── scripts/                 # Utility scripts
├── docs/                    # Documentation
└── .github/workflows/       # CI/CD pipelines
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm 8+
- AWS Account
- AWS CLI configured
- GitHub repository (for automated deployments)

### Quick Start

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd simple-portfolio-tracker
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   ```bash
   ./scripts/get-env-values.sh
   ```

   Then add your Cognito values to `packages/web/.env`

4. **Start development servers**
   ```bash
   pnpm dev
   ```

The application will be available at:

- Web: http://localhost:3001
- API: http://localhost:3000

## Deployment

### Automated Deployment (Recommended)

The project includes GitHub Actions workflows for automated deployment:

1. **Set up GitHub Secrets**
   - `AWS_ACCESS_KEY_ID` - AWS access key
   - `AWS_SECRET_ACCESS_KEY` - AWS secret key
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
   - `DOMAIN_NAME` - Your production domain (e.g., example.com)
   - `COGNITO_DOMAIN_PREFIX` (optional) - Unique prefix for Cognito domain (defaults to 'portfolio-tracker-prod')

2. **Deploy to Production**
   - Push to `main` branch
   - GitHub Actions will automatically deploy

3. **Preview Deployments**
   - Create a pull request
   - Preview build will be created

### Manual Deployment

1. **Deploy Infrastructure**

   ```bash
   # Base infrastructure
   cd packages/base-infra
   DOMAIN_NAME="your-domain.com" npm run deploy

   # Authentication infrastructure
   cd ../auth-infra
   GOOGLE_CLIENT_ID="your-client-id" \
   GOOGLE_CLIENT_SECRET="your-client-secret" \
   WEB_DOMAIN="your-domain.com" \
   COGNITO_DOMAIN_PREFIX="your-unique-prefix" \
   ./deploy.sh

   # Portfolio service
   cd ../portfolio-service/cdk
   npm run deploy

   # Web infrastructure
   cd ../../web-infra
   npm run deploy
   ```

2. **Build and Deploy Web App**
   ```bash
   cd packages/web
   pnpm build
   aws s3 sync dist/ s3://YOUR-BUCKET-NAME/
   aws cloudfront create-invalidation --distribution-id YOUR-DIST-ID --paths "/*"
   ```

## Environment Configuration

### Required Environment Variables

```bash
# API Configuration
VITE_API_URL=https://api.yourdomain.com

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxxxxxx
VITE_COGNITO_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
VITE_COGNITO_DOMAIN=your-domain.auth.us-east-1.amazoncognito.com
VITE_REDIRECT_SIGN_IN=https://app.yourdomain.com/
VITE_REDIRECT_SIGN_OUT=https://app.yourdomain.com/
```

### Authentication Setup

The authentication infrastructure is managed via CDK and includes:

- AWS Cognito User Pool with email authentication
- Google Sign-In integration (optional)
- Automated configuration via infrastructure as code

**Note**: Cognito configuration is automatically created during deployment. You only need to provide Google OAuth credentials as GitHub secrets.

See [Authentication Infrastructure](./packages/auth-infra/README.md) for detailed setup.

## Development

### Local Development

See [Local Development Guide](./docs/LOCAL_DEVELOPMENT.md) for detailed setup instructions.

### Key Commands

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint code
pnpm lint

# Type check
pnpm typecheck
```

### Adding a New Package

```bash
# Create a new package
mkdir packages/new-package
cd packages/new-package
pnpm init

# Add to workspace
# Edit package.json name to @portfolio-tracker/new-package
```

## Architecture

The application follows a serverless microservices architecture:

- **Frontend**: Single-page React application served via CloudFront
- **API**: RESTful API built with API Gateway and Lambda
- **Database**: DynamoDB tables for each domain entity
- **Authentication**: Managed by AWS Cognito with JWT tokens

See [Architecture Documentation](./docs/ARCHITECTURE.md) for more details.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

See [Contributing Guidelines](./CONTRIBUTING.md) for more details.

## Security

- All API endpoints require authentication
- Data is encrypted at rest in DynamoDB
- SSL/TLS encryption for all communications
- Principle of least privilege for IAM roles

## License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## Support

- 📧 Email: support@example.com
- 💬 Discussions: [GitHub Discussions](https://github.com/yourusername/simple-portfolio-tracker/discussions)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/simple-portfolio-tracker/issues)

## Acknowledgments

- Built with AWS CDK
- UI components inspired by Tailwind UI
- Authentication powered by AWS Cognito
