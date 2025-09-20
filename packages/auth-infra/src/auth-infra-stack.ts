import * as cdk from 'aws-cdk-lib';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface AuthInfraStackProps extends cdk.StackProps {
  googleClientId: string;
  googleClientSecret: string;
  domainPrefix: string;
  webDomain: string;
}

export class AuthInfraStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props: AuthInfraStackProps) {
    super(scope, id, props);

    // Create User Pool
    this.userPool = new cognito.UserPool(this, 'UserPool', {
      userPoolName: 'portfolio-tracker-users',
      selfSignUpEnabled: true,
      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      standardAttributes: {
        email: {
          required: true,
          mutable: true,
        },
        fullname: {
          required: false,
          mutable: true,
        },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: false,
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Create Cognito Domain
    this.userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: props.domainPrefix,
      },
    });

    // Configure Google Identity Provider
    if (props.googleClientId && props.googleClientSecret) {
      const googleProvider = new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleProvider', {
        userPool: this.userPool,
        clientId: props.googleClientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(props.googleClientSecret),
        scopes: ['openid', 'email', 'profile'],
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          fullname: cognito.ProviderAttribute.GOOGLE_NAME,
          profilePicture: cognito.ProviderAttribute.GOOGLE_PICTURE,
        },
      });

      // Create App Client
      this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPool: this.userPool,
        userPoolClientName: 'portfolio-tracker-web',
        generateSecret: false,
        authFlows: {
          userSrp: true,
          custom: true,
        },
        supportedIdentityProviders: [
          cognito.UserPoolClientIdentityProvider.GOOGLE,
          cognito.UserPoolClientIdentityProvider.COGNITO,
        ],
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
          callbackUrls: [
            `https://${props.webDomain}/`,
            'http://localhost:3001/', // For local development
          ],
          logoutUrls: [
            `https://${props.webDomain}/`,
            'http://localhost:3001/', // For local development
          ],
        },
      });

      // Ensure the client is created after the provider
      this.userPoolClient.node.addDependency(googleProvider);
    } else {
      // Create App Client without Google provider for development
      this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
        userPool: this.userPool,
        userPoolClientName: 'portfolio-tracker-web',
        generateSecret: false,
        authFlows: {
          userSrp: true,
          custom: true,
        },
        supportedIdentityProviders: [cognito.UserPoolClientIdentityProvider.COGNITO],
        oAuth: {
          flows: {
            authorizationCodeGrant: true,
          },
          scopes: [cognito.OAuthScope.OPENID, cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE],
          callbackUrls: [`https://${props.webDomain}/`, 'http://localhost:3001/'],
          logoutUrls: [`https://${props.webDomain}/`, 'http://localhost:3001/'],
        },
      });
    }

    // Store values in SSM Parameter Store
    new ssm.StringParameter(this, 'UserPoolIdParam', {
      parameterName: '/portfolio-tracker/auth/user-pool-id',
      stringValue: this.userPool.userPoolId,
    });

    new ssm.StringParameter(this, 'UserPoolClientIdParam', {
      parameterName: '/portfolio-tracker/auth/user-pool-client-id',
      stringValue: this.userPoolClient.userPoolClientId,
    });

    new ssm.StringParameter(this, 'UserPoolDomainParam', {
      parameterName: '/portfolio-tracker/auth/cognito-domain',
      stringValue: `${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'UserPoolId', {
      value: this.userPool.userPoolId,
      description: 'Cognito User Pool ID',
    });

    new cdk.CfnOutput(this, 'UserPoolClientId', {
      value: this.userPoolClient.userPoolClientId,
      description: 'Cognito User Pool Client ID',
    });

    new cdk.CfnOutput(this, 'CognitoDomain', {
      value: `${this.userPoolDomain.domainName}.auth.${this.region}.amazoncognito.com`,
      description: 'Cognito Hosted UI Domain',
    });

    new cdk.CfnOutput(this, 'UserPoolArn', {
      value: this.userPool.userPoolArn,
      description: 'Cognito User Pool ARN',
    });
  }
}
