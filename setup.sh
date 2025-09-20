#!/bin/bash

# Full-Stack Template Setup Script

echo "🚀 Setting up Full-Stack Monorepo Template..."

# Check for required tools
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Please install $1 and try again."
        exit 1
    fi
}

echo "📋 Checking prerequisites..."
check_command node
check_command pnpm
check_command git

# Check Node version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version must be 18 or higher. Current version: $(node -v)"
    exit 1
fi

echo "✅ All prerequisites met!"

# Install dependencies
echo "📦 Installing dependencies..."
pnpm install

# Create environment files
echo "🔧 Creating environment files..."

# Root .env
cat > .env << EOF
PORT=4000
NODE_ENV=development
AWS_REGION=us-east-1
AWS_PROFILE=default
TABLE_NAME=template-data-table
EOF

# Frontend .env
cat > packages/web/.env << EOF
VITE_API_URL=http://localhost:4000
VITE_ENABLE_ANALYTICS=false
VITE_ENABLE_AUTH=false
EOF

# Backend .env
cat > packages/api/.env << EOF
PORT=4000
NODE_ENV=development
TABLE_NAME=template-data-table
AWS_REGION=us-east-1
AWS_PROFILE=default
EOF

echo "✅ Environment files created!"

# Initialize git hooks
echo "🪝 Setting up git hooks..."
pnpm husky install

# Build all packages
echo "🔨 Building all packages..."
pnpm build

echo ""
echo "✨ Setup complete! ✨"
echo ""
echo "🚀 Quick Start:"
echo "   pnpm dev        - Start all services in development mode"
echo "   pnpm build      - Build all packages"
echo "   pnpm test       - Run all tests"
echo "   pnpm lint       - Lint all packages"
echo ""
echo "📚 Documentation:"
echo "   README.md       - Main documentation"
echo "   CONFIGURATION.md - Configuration guide"
echo ""
echo "Happy coding! 🎉"
