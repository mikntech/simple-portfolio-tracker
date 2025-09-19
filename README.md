# Full-Stack Monorepo Template

A modern, production-ready full-stack monorepo template featuring pnpm workspaces, Nx build system, tRPC for type-safe APIs, AWS CDK for infrastructure as code, Vite + React + Tailwind CSS for the frontend, and GitHub Actions for CI/CD.

## 🚀 Features

- **Monorepo Management**: Efficient workspace management with pnpm and Nx
- **Type-Safe API**: End-to-end type safety with tRPC
- **Modern Frontend**: React 18 with Vite for lightning-fast HMR and Tailwind CSS for styling
- **Infrastructure as Code**: AWS CDK for declarative cloud infrastructure
- **CI/CD Pipeline**: Automated workflows with GitHub Actions
- **Developer Experience**: TypeScript, ESLint, Prettier, and Husky pre-configured

## 📦 Tech Stack

### Frontend

- **React 18** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **TanStack Query** - Data fetching and caching
- **tRPC Client** - Type-safe API client

### Backend

- **Node.js** - Runtime environment
- **Express** - Web framework
- **tRPC Server** - Type-safe API framework
- **Zod** - Schema validation

### Infrastructure

- **AWS CDK** - Infrastructure as code
- **AWS Lambda** - Serverless compute
- **AWS S3** - Static file hosting
- **AWS CloudFront** - CDN
- **AWS DynamoDB** - NoSQL database
- **AWS API Gateway** - API management

### DevOps

- **GitHub Actions** - CI/CD pipelines
- **pnpm** - Fast, disk space efficient package manager
- **Nx** - Smart, fast build system
- **TypeScript** - Type safety across the stack

## 🏗️ Project Structure

```
.
├── apps/
│   ├── web/                 # React frontend application
│   │   ├── src/
│   │   ├── public/
│   │   └── package.json
│   ├── api/                 # tRPC backend API
│   │   ├── src/
│   │   └── package.json
│   └── infrastructure/      # AWS CDK infrastructure
│       ├── src/
│       ├── bin/
│       └── package.json
├── packages/                # Shared packages
│   └── trpc-shared/        # Shared tRPC types
├── .github/
│   └── workflows/          # GitHub Actions workflows
├── nx.json                 # Nx configuration
├── pnpm-workspace.yaml     # pnpm workspace config
└── package.json            # Root package.json
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- AWS CLI (for deployment)
- AWS Account (for deployment)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd pnpm-nx-trpc-cdk-vite-react-tailwind-template-ga
```

2. Install dependencies:

```bash
pnpm install
```

3. Set up environment variables:

```bash
cp .env.example .env
# Edit .env with your configuration
```

### Development

Start all services in development mode:

```bash
pnpm dev
```

Or start specific services:

```bash
# Frontend only
pnpm nx dev web

# Backend only
pnpm nx dev api
```

The frontend will be available at http://localhost:3000 and the API at http://localhost:4000.

### Building

Build all packages:

```bash
pnpm build
```

Build specific packages:

```bash
pnpm nx build web
pnpm nx build api
```

### Testing

Run all tests:

```bash
pnpm test
```

Run tests for affected packages:

```bash
pnpm nx affected --target=test
```

### Linting and Formatting

```bash
# Lint all packages
pnpm lint

# Format all files
pnpm format

# Type check
pnpm nx run-many --target=typecheck
```

## 🚀 Deployment

### Prerequisites

1. Configure AWS credentials:

```bash
aws configure
```

2. Set up GitHub secrets:

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_ACCOUNT_ID`

### Manual Deployment

1. Build the applications:

```bash
pnpm build
```

2. Deploy infrastructure:

```bash
cd apps/infrastructure
pnpm cdk deploy
```

3. The GitHub Actions workflow will automatically deploy on push to main branch.

### Automated Deployment

Push to the main branch triggers automatic deployment via GitHub Actions.

## 📝 Available Scripts

### Root Level

- `pnpm dev` - Start all services in development mode
- `pnpm build` - Build all packages
- `pnpm test` - Run all tests
- `pnpm lint` - Lint all packages
- `pnpm format` - Format all files
- `pnpm clean` - Clean all build artifacts and node_modules

### Per Package

- `pnpm nx dev <package>` - Start specific package in dev mode
- `pnpm nx build <package>` - Build specific package
- `pnpm nx test <package>` - Test specific package
- `pnpm nx lint <package>` - Lint specific package

## 🏗️ Infrastructure

The CDK stack includes:

- S3 bucket for hosting the React app
- CloudFront distribution for CDN
- Lambda function for the API
- API Gateway for HTTP endpoints
- DynamoDB table for data storage

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
PORT=4000
NODE_ENV=development

# AWS Configuration (for local development)
AWS_REGION=us-east-1
AWS_PROFILE=default

# Database
TABLE_NAME=template-data-table
```

### TypeScript Paths

The monorepo uses TypeScript path aliases:

- `@template/shared/*` - Shared utilities
- `@template/trpc-shared` - Shared tRPC types
- `@/*` - Within each app for local imports

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- [Nx](https://nx.dev/) for the amazing monorepo tools
- [tRPC](https://trpc.io/) for type-safe APIs
- [AWS CDK](https://aws.amazon.com/cdk/) for infrastructure as code
- [Vite](https://vitejs.dev/) for the blazing fast dev experience
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
