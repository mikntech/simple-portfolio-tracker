import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface WebInfraStackProps extends cdk.StackProps {
  domainName: string;
  webSubdomain?: string;
  apiDomainName: string;
  stage?: string;
}

export class WebInfraStack extends cdk.Stack {
  public readonly webBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: WebInfraStackProps) {
    super(scope, id, props);

    const { domainName, webSubdomain = 'app', apiDomainName, stage = 'dev' } = props;

    // Import resources from base infrastructure
    // Using valueForStringParameter instead of valueFromLookup to avoid synthesis-time lookups
    const hostedZoneId = ssm.StringParameter.valueForStringParameter(
      this,
      '/portfolio-tracker/base/hosted-zone-id'
    );
    const certificateArn = ssm.StringParameter.valueForStringParameter(
      this,
      '/portfolio-tracker/base/certificate-arn'
    );

    // Look up hosted zone
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId,
      zoneName: domainName,
    });

    // Look up certificate
    const certificate = acm.Certificate.fromCertificateArn(this, 'Certificate', certificateArn);

    // Create S3 bucket for web hosting
    this.webBucket = new s3.Bucket(this, 'WebBucket', {
      bucketName: `portfolio-tracker-web-${stage}-676206907471-${cdk.Aws.REGION}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html', // For SPA routing
      publicReadAccess: false,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      versioned: true,
      lifecycleRules: [
        {
          id: 'delete-old-versions',
          noncurrentVersionExpiration: cdk.Duration.days(30),
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(7),
        },
      ],
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For development only
      autoDeleteObjects: true, // For development only
    });

    // Create Origin Access Identity for CloudFront
    const originAccessIdentity = new cloudfront.OriginAccessIdentity(this, 'OriginAccessIdentity', {
      comment: 'Portfolio Tracker Web OAI',
    });

    // Grant read permissions to CloudFront
    this.webBucket.grantRead(originAccessIdentity);

    // Create CloudFront distribution
    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      domainNames: [`${webSubdomain}.${domainName}`],
      certificate,
      defaultRootObject: 'index.html',
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessIdentity(this.webBucket, {
          originAccessIdentity: originAccessIdentity,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy:
          cloudfront.ResponseHeadersPolicy
            .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
      },
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      enabled: true,
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
    });

    // Create Route53 record for CloudFront distribution
    new route53.ARecord(this, 'WebARecord', {
      zone: hostedZone,
      recordName: webSubdomain,
      target: route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(this.distribution)),
    });

    // Deploy initial placeholder content
    new s3deploy.BucketDeployment(this, 'DeployPlaceholder', {
      sources: [
        s3deploy.Source.data(
          'index.html',
          `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Portfolio Tracker</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background-color: #f5f5f5;
    }
    .container {
      text-align: center;
      padding: 2rem;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 1rem;
    }
    p {
      color: #666;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Portfolio Tracker${stage !== 'prod' ? ` (${stage})` : ''}</h1>
    <p>Application will be deployed here</p>
    <p>API: <code>${apiDomainName}</code></p>
    <p>Environment: <code>${stage}</code></p>
  </div>
</body>
</html>
        `
        ),
      ],
      destinationBucket: this.webBucket,
      distribution: this.distribution,
      distributionPaths: ['/*'],
    });

    // Export values to SSM for CI/CD pipeline
    new ssm.StringParameter(this, 'WebBucketNameParam', {
      parameterName: '/portfolio-tracker/web/bucket-name' + stage,
      stringValue: this.webBucket.bucketName,
    });

    new ssm.StringParameter(this, 'DistributionIdParam', {
      parameterName: '/portfolio-tracker/web/distribution-id' + stage,
      stringValue: this.distribution.distributionId,
    });

    new ssm.StringParameter(this, 'WebDomainParam', {
      parameterName: '/portfolio-tracker/web/domain' + stage,
      stringValue: `${webSubdomain}.${domainName}`,
    });

    // Outputs
    new cdk.CfnOutput(this, 'WebBucketName', {
      value: this.webBucket.bucketName,
      description: 'S3 bucket name for web hosting',
    });

    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'WebUrl', {
      value: `https://${webSubdomain}.${domainName}`,
      description: 'Web application URL',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distribution.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });
  }
}
