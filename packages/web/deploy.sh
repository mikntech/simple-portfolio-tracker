#!/bin/bash

# Deploy script for web application
# This script builds and deploys the web app to S3/CloudFront

set -e

echo "🚀 Starting web application deployment..."

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ Error: AWS CLI is not installed. Please install it first."
    exit 1
fi

# Get deployment parameters from SSM
echo "📦 Fetching deployment parameters..."
BUCKET_NAME=$(aws ssm get-parameter --name "/portfolio-tracker/web/bucket-name" --query "Parameter.Value" --output text 2>/dev/null || echo "")
DISTRIBUTION_ID=$(aws ssm get-parameter --name "/portfolio-tracker/web/distribution-id" --query "Parameter.Value" --output text 2>/dev/null || echo "")

if [ -z "$BUCKET_NAME" ] || [ -z "$DISTRIBUTION_ID" ]; then
    echo "❌ Error: Could not fetch deployment parameters from SSM."
    echo "   Please ensure the web infrastructure is deployed first."
    echo "   Run: cd ../web-infra && ./deploy.sh"
    exit 1
fi

echo "📍 Deployment targets:"
echo "   S3 Bucket: $BUCKET_NAME"
echo "   CloudFront Distribution: $DISTRIBUTION_ID"

# Build the application
echo "🔨 Building web application..."
pnpm build

if [ ! -d "dist" ]; then
    echo "❌ Error: Build failed. No dist directory found."
    exit 1
fi

# Sync files to S3
echo "📤 Uploading files to S3..."
aws s3 sync dist/ "s3://$BUCKET_NAME/" \
    --delete \
    --cache-control "public, max-age=31536000" \
    --exclude "index.html" \
    --exclude "*.map"

# Upload index.html with no-cache headers (to ensure fresh content)
aws s3 cp dist/index.html "s3://$BUCKET_NAME/index.html" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html"

# Upload source maps if they exist (optional, for debugging)
if ls dist/assets/*.map 1> /dev/null 2>&1; then
    echo "📤 Uploading source maps..."
    aws s3 sync dist/ "s3://$BUCKET_NAME/" \
        --exclude "*" \
        --include "*.map" \
        --cache-control "public, max-age=31536000"
fi

# Create CloudFront invalidation
echo "🔄 Creating CloudFront invalidation..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$DISTRIBUTION_ID" \
    --paths "/*" \
    --query "Invalidation.Id" \
    --output text)

echo "📋 Invalidation created: $INVALIDATION_ID"

# Wait for invalidation to complete (optional)
if [ "$1" == "--wait" ]; then
    echo "⏳ Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID"
    echo "✅ Invalidation completed!"
fi

# Get the web URL
WEB_URL=$(aws ssm get-parameter --name "/portfolio-tracker/web/domain" --query "Parameter.Value" --output text 2>/dev/null || echo "")

echo ""
echo "✅ Deployment complete!"
if [ -n "$WEB_URL" ]; then
    echo "🌐 Application URL: https://$WEB_URL"
else
    echo "🌐 CloudFront URL: https://$(aws cloudfront get-distribution --id "$DISTRIBUTION_ID" --query "Distribution.DomainName" --output text)"
fi
echo ""
echo "Note: CloudFront invalidation may take a few minutes to propagate globally."
echo "If you still see old content, try clearing your browser cache."
