import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';

export interface BaseInfraStackProps extends cdk.StackProps {
  domainName: string;
  apiSubdomain?: string;
  webSubdomain?: string;
}

export class BaseInfraStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;
  public readonly apiGateway: apigateway.RestApi;
  public readonly apiDomainName: apigateway.DomainName;

  constructor(scope: Construct, id: string, props: BaseInfraStackProps) {
    super(scope, id, props);

    const { domainName, apiSubdomain = 'api', webSubdomain = 'app' } = props;

    // Look up or create hosted zone
    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    // Create wildcard certificate for the domain
    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      subjectAlternativeNames: [
        `*.${domainName}`,
        `${apiSubdomain}.${domainName}`,
        `${webSubdomain}.${domainName}`,
      ],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    // Create API Gateway
    this.apiGateway = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'portfolio-tracker-api',
      description: 'Portfolio Tracker API Gateway',
      deployOptions: {
        stageName: 'prod',
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
    });

    // Add a root resource to prevent validation errors
    this.apiGateway.root.addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': '{"message": "Portfolio Tracker API"}',
            },
          },
        ],
        requestTemplates: {
          'application/json': '{"statusCode": 200}',
        },
      }),
      {
        methodResponses: [
          {
            statusCode: '200',
          },
        ],
      }
    );

    // Create custom domain for API Gateway
    this.apiDomainName = new apigateway.DomainName(this, 'ApiDomainName', {
      domainName: `${apiSubdomain}.${domainName}`,
      certificate: this.certificate,
      endpointType: apigateway.EndpointType.EDGE,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
    });

    // Map domain to API Gateway
    new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
      domainName: this.apiDomainName,
      restApi: this.apiGateway,
    });

    // Create Route53 record for API
    new route53.ARecord(this, 'ApiARecord', {
      zone: this.hostedZone,
      recordName: apiSubdomain,
      target: route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.ApiGatewayDomain(this.apiDomainName)
      ),
    });

    // Export values to SSM for other stacks to use
    new ssm.StringParameter(this, 'HostedZoneIdParam', {
      parameterName: '/portfolio-tracker/base/hosted-zone-id',
      stringValue: this.hostedZone.hostedZoneId,
    });

    new ssm.StringParameter(this, 'HostedZoneNameParam', {
      parameterName: '/portfolio-tracker/base/hosted-zone-name',
      stringValue: this.hostedZone.zoneName,
    });

    new ssm.StringParameter(this, 'CertificateArnParam', {
      parameterName: '/portfolio-tracker/base/certificate-arn',
      stringValue: this.certificate.certificateArn,
    });

    new ssm.StringParameter(this, 'ApiGatewayIdParam', {
      parameterName: '/portfolio-tracker/base/api-gateway-id',
      stringValue: this.apiGateway.restApiId,
    });

    new ssm.StringParameter(this, 'ApiGatewayRootResourceIdParam', {
      parameterName: '/portfolio-tracker/base/api-gateway-root-resource-id',
      stringValue: this.apiGateway.root.resourceId,
    });

    new ssm.StringParameter(this, 'ApiDomainNameParam', {
      parameterName: '/portfolio-tracker/base/api-domain-name',
      stringValue: `${apiSubdomain}.${domainName}`,
    });

    // Output values
    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: this.hostedZone.hostedZoneId,
      description: 'Hosted Zone ID',
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: this.certificate.certificateArn,
      description: 'ACM Certificate ARN',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: `https://${apiSubdomain}.${domainName}`,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'ApiDomain', {
      value: `${apiSubdomain}.${domainName}`,
      description: 'API Custom Domain',
    });
  }
}
