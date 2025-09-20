# Authentication Setup Guide

This application uses AWS Cognito for authentication with Google Sign-In support.

## Prerequisites

1. AWS Account
2. AWS Cognito User Pool with Google as identity provider

## Setting up AWS Cognito

### 1. Create User Pool

1. Go to AWS Cognito Console
2. Create a new User Pool
3. Configure sign-in options:
   - Email as username
   - Allow users to sign in with email

### 2. Configure Google OAuth

1. In your User Pool, go to "Sign-in experience" → "Federated identity provider sign-in"
2. Add Google as identity provider:
   - Get Google OAuth credentials from [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 Client ID
   - Add authorized redirect URIs:
     - `https://your-cognito-domain.auth.region.amazoncognito.com/oauth2/idpresponse`
3. Configure attribute mapping:
   - email → email
   - name → name
   - picture → picture

### 3. Configure App Client

1. Create an app client in your User Pool
2. Enable Google as identity provider
3. Configure OAuth settings:
   - Callback URLs: `http://localhost:3001/` (for development)
   - Sign out URLs: `http://localhost:3001/`
   - OAuth grant types: Authorization code grant
   - OAuth scopes: openid, email, profile

### 4. Set up Cognito Domain

1. Go to "App integration" → "Domain"
2. Create a Cognito domain (e.g., `your-app-name`)

## Environment Configuration

Create a `.env` file in the web package directory:

```bash
# API Configuration
VITE_API_URL=http://localhost:3000

# AWS Cognito Configuration
VITE_COGNITO_USER_POOL_ID=your-user-pool-id
VITE_COGNITO_CLIENT_ID=your-client-id
VITE_COGNITO_DOMAIN=your-cognito-domain.auth.region.amazoncognito.com
VITE_REDIRECT_SIGN_IN=http://localhost:3001/
VITE_REDIRECT_SIGN_OUT=http://localhost:3001/
```

## Features Implemented

### 1. **Authentication Flow**

- Google Sign-In via AWS Cognito
- Protected routes that require authentication
- Automatic token management
- User session persistence

### 2. **User Context**

- Auth context provider for accessing user info
- Sign in/out functionality
- Access token retrieval for API calls

### 3. **Portfolio Allocations**

- Users can set target allocations for each asset
- View current vs target allocation
- See deviation and rebalancing suggestions
- Allocations are portfolio-specific

### 4. **API Authentication**

- All API calls include JWT token in Authorization header
- Token is automatically refreshed when needed
- User-specific data isolation

## Usage

### Sign In

Users are redirected to the login page if not authenticated. They can sign in using their Google account.

### Managing Allocations

1. Navigate to the "Allocations" tab
2. Click "Add Allocation" to set target percentages
3. The system will show:
   - Current allocation based on holdings
   - Target allocation set by user
   - Deviation from target
   - Rebalancing suggestions

### API Integration

The API client automatically includes authentication headers:

```typescript
// Headers sent with each request:
{
  'Authorization': 'Bearer <access-token>',
  'Content-Type': 'application/json'
}
```

## Production Deployment

For production, update the redirect URLs in:

1. AWS Cognito app client settings
2. Google OAuth client settings
3. Environment variables

Example production URLs:

```
VITE_REDIRECT_SIGN_IN=https://your-domain.com/
VITE_REDIRECT_SIGN_OUT=https://your-domain.com/
```
