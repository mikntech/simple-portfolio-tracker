import { Amplify } from 'aws-amplify';

export function configureAmplify() {
  const userPoolId = import.meta.env['VITE_COGNITO_USER_POOL_ID'];
  const userPoolClientId = import.meta.env['VITE_COGNITO_CLIENT_ID'];
  const domain = import.meta.env['VITE_COGNITO_DOMAIN'];
  const redirectSignIn = import.meta.env['VITE_REDIRECT_SIGN_IN'] || 'http://localhost:3001/';
  const redirectSignOut = import.meta.env['VITE_REDIRECT_SIGN_OUT'] || 'http://localhost:3001/';

  // Only configure if we have the required settings
  if (userPoolId && userPoolClientId && domain) {
    Amplify.configure({
      Auth: {
        Cognito: {
          userPoolId,
          userPoolClientId,
          loginWith: {
            oauth: {
              domain,
              scopes: ['openid', 'email', 'profile'],
              redirectSignIn: [redirectSignIn],
              redirectSignOut: [redirectSignOut],
              responseType: 'code' as const,
              providers: ['Google'],
            },
          },
        },
      },
    });
  } else {
    console.warn('AWS Cognito configuration is missing. Authentication will not work.');
  }
}
