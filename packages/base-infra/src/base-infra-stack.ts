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
  stage: string;
}

export class BaseInfraStack extends cdk.Stack {
  public readonly hostedZone: route53.IHostedZone;
  public readonly certificate: acm.Certificate;
  public readonly apiGateway: apigateway.RestApi;
  public readonly apiDomainName: apigateway.DomainName;

  constructor(scope: Construct, id: string, props: BaseInfraStackProps) {
    super(scope, id, props);

    const { domainName, apiSubdomain = 'api', webSubdomain = 'app', stage } = props;

    this.hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName,
    });

    this.certificate = new acm.Certificate(this, 'Certificate', {
      domainName: domainName,
      subjectAlternativeNames: [
        `*.${domainName}`,
        `${apiSubdomain}.${domainName}`,
        `${webSubdomain}.${domainName}`,
      ],
      validation: acm.CertificateValidation.fromDns(this.hostedZone),
    });

    this.apiGateway = new apigateway.RestApi(this, 'ApiGateway', {
      restApiName: 'portfolio-tracker-api-' + stage,
      description: 'Portfolio Tracker API Gateway',
      deployOptions: {
        stageName: stage,
        tracingEnabled: true,
        dataTraceEnabled: true,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
        // Force a new deployment by adding a deployment description with timestamp
        description: `Deployment at ${new Date().toISOString()}`,
      },
      // Removed defaultCorsPreflightOptions - handling CORS manually in each stack
    });

    this.apiGateway.root.addMethod(
      'GET',
      new apigateway.MockIntegration({
        integrationResponses: [
          {
            statusCode: '200',
            responseTemplates: {
              'application/json': `{"message": "Portfolio Tracker API ${stage}"}`,
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

    this.apiDomainName = new apigateway.DomainName(this, 'ApiDomainName', {
      domainName: `${apiSubdomain}.${domainName}`,
      certificate: this.certificate,
      endpointType: apigateway.EndpointType.EDGE,
      securityPolicy: apigateway.SecurityPolicy.TLS_1_2,
    });

    new apigateway.BasePathMapping(this, 'ApiBasePathMapping', {
      domainName: this.apiDomainName,
      restApi: this.apiGateway,
    });

    new route53.ARecord(this, 'ApiARecord', {
      zone: this.hostedZone,
      recordName: apiSubdomain,
      target: route53.RecordTarget.fromAlias(
        new cdk.aws_route53_targets.ApiGatewayDomain(this.apiDomainName)
      ),
    });

    new ssm.StringParameter(this, 'HostedZoneIdParam', {
      parameterName: '/portfolio-tracker/base/hosted-zone-id' + stage,
      stringValue: this.hostedZone.hostedZoneId,
    });

    new ssm.StringParameter(this, 'HostedZoneNameParam', {
      parameterName: '/portfolio-tracker/base/hosted-zone-name' + stage,
      stringValue: this.hostedZone.zoneName,
    });

    new ssm.StringParameter(this, 'CertificateArnParam', {
      parameterName: '/portfolio-tracker/base/certificate-arn' + stage,
      stringValue: this.certificate.certificateArn,
    });

    new ssm.StringParameter(this, 'ApiGatewayIdParam', {
      parameterName: '/portfolio-tracker/base/api-gateway-id' + stage,
      stringValue: this.apiGateway.restApiId,
    });

    new ssm.StringParameter(this, 'ApiGatewayRootResourceIdParam', {
      parameterName: '/portfolio-tracker/base/api-gateway-root-resource-id' + stage,
      stringValue: this.apiGateway.root.resourceId,
    });

    new ssm.StringParameter(this, 'ApiDomainNameParam', {
      parameterName: '/portfolio-tracker/base/api-domain-name' + stage,
      stringValue: `${apiSubdomain}.${domainName}`,
    });

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
