import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { sharedParamNames } from './shared-params';

export interface SharedEdgeStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
  domain: string;
  allowedIp: string;
  priceClass?: 'PriceClass_100' | 'PriceClass_200' | 'PriceClass_All';
}

const CLOUDFRONT_HOSTED_ZONE_ID = 'Z2FDTNDATAQYW2';
const CACHING_OPTIMIZED_POLICY_ID = '658327ea-f89d-4fab-a63d-7e88639e58f6';
const CACHING_DISABLED_POLICY_ID = '413f2a3a-6630-46c3-9b6a-1c1b3d4905f8';
const ALL_VIEWER_EXCEPT_HOST_HEADER_POLICY_ID = 'b689b0a8-53d0-40ab-baf2-68738e2966ac';

export class SharedEdgeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SharedEdgeStackProps) {
    super(scope, id, props);

    const params = sharedParamNames(props.stage);
    const hostedZoneId = ssm.StringParameter.valueForStringParameter(this, params.hostedZoneId);
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'StageHostedZone', {
      hostedZoneId,
      zoneName: props.domain,
    });
    const globalCertificateArn = ssm.StringParameter.valueForStringParameter(this, params.globalCertificateArn);
    const frontendBucketName = ssm.StringParameter.valueForStringParameter(this, params.frontendBucketName);
    const frontendBucketRegionalDomainName = ssm.StringParameter.valueForStringParameter(
      this,
      params.frontendBucketRegionalDomainName,
    );
    const apiOriginDomainName = ssm.StringParameter.valueForStringParameter(this, params.apiOriginDomainName);
    const apiOriginPath = ssm.StringParameter.valueForStringParameter(this, params.apiOriginPath);
    const websocketRegionalDomainName = ssm.StringParameter.valueForStringParameter(
      this,
      params.websocketRegionalDomainName,
    );
    const websocketRegionalHostedZoneId = ssm.StringParameter.valueForStringParameter(
      this,
      params.websocketRegionalHostedZoneId,
    );
    const authCloudFrontDomainName = ssm.StringParameter.valueForStringParameter(this, params.authCloudFrontDomainName);
    const authCloudFrontHostedZoneId = ssm.StringParameter.valueForStringParameter(
      this,
      params.authCloudFrontHostedZoneId,
    );

    const oac = new cloudfront.CfnOriginAccessControl(this, 'OriginAccessControl', {
      originAccessControlConfig: {
        name: `db-accessor-${props.stage}-oac`,
        description: `OAC for ${props.domain}`,
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    const viewerRequestFunction = new cloudfront.CfnFunction(this, 'ViewerRequestFunction', {
      name: `db-accessor-${props.stage}-viewer-request`,
      autoPublish: true,
      functionConfig: {
        comment: 'Restrict dev access and normalize API paths',
        runtime: 'cloudfront-js-2.0',
      },
      functionCode: `function handler(event) {
  var request = event.request;

  if (event.viewer.ip !== ${JSON.stringify(props.allowedIp)}) {
    return {
      statusCode: 403,
      statusDescription: 'Forbidden',
      headers: { 'content-type': { value: 'text/plain; charset=utf-8' } },
      body: 'Forbidden'
    };
  }

  if (request.uri === '/api') {
    request.uri = '/';
  } else if (request.uri.indexOf('/api/') === 0) {
    request.uri = request.uri.substring(4);
  }

  return request;
}`,
    });

    const distribution = new cloudfront.CfnDistribution(this, 'CloudFrontDistribution', {
      distributionConfig: {
        enabled: true,
        httpVersion: 'http2and3',
        priceClass: props.priceClass ?? 'PriceClass_100',
        defaultRootObject: 'index.html',
        aliases: [props.domain],
        origins: [
          {
            id: 's3-site',
            domainName: frontendBucketRegionalDomainName,
            s3OriginConfig: {},
            originAccessControlId: oac.attrId,
          },
          {
            id: 'rest-api',
            domainName: apiOriginDomainName,
            originPath: apiOriginPath,
            customOriginConfig: {
              httpPort: 80,
              httpsPort: 443,
              originProtocolPolicy: 'https-only',
              originSslProtocols: ['TLSv1.2'],
            },
          },
        ],
        defaultCacheBehavior: {
          targetOriginId: 's3-site',
          viewerProtocolPolicy: 'redirect-to-https',
          allowedMethods: ['GET', 'HEAD', 'OPTIONS'],
          cachedMethods: ['GET', 'HEAD'],
          compress: true,
          functionAssociations: [
            {
              eventType: 'viewer-request',
              functionArn: viewerRequestFunction.attrFunctionArn,
            },
          ],
          cachePolicyId: CACHING_OPTIMIZED_POLICY_ID,
        },
        cacheBehaviors: [
          {
            pathPattern: '/api/*',
            targetOriginId: 'rest-api',
            viewerProtocolPolicy: 'redirect-to-https',
            allowedMethods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'PATCH', 'POST', 'DELETE'],
            cachedMethods: ['GET', 'HEAD', 'OPTIONS'],
            compress: true,
            functionAssociations: [
              {
                eventType: 'viewer-request',
                functionArn: viewerRequestFunction.attrFunctionArn,
              },
            ],
            cachePolicyId: CACHING_DISABLED_POLICY_ID,
            originRequestPolicyId: ALL_VIEWER_EXCEPT_HOST_HEADER_POLICY_ID,
          },
        ],
        customErrorResponses: [
          { errorCode: 403, responseCode: 200, responsePagePath: '/index.html' },
          { errorCode: 404, responseCode: 200, responsePagePath: '/index.html' },
        ],
        viewerCertificate: {
          acmCertificateArn: globalCertificateArn,
          sslSupportMethod: 'sni-only',
          minimumProtocolVersion: 'TLSv1.2_2021',
        },
      },
    });

    const distributionArn = cdk.Arn.format(
      {
        service: 'cloudfront',
        region: '',
        resource: 'distribution',
        resourceName: distribution.attrId,
      },
      this,
    );

    new s3.CfnBucketPolicy(this, 'FrontendBucketPolicy', {
      bucket: frontendBucketName,
      policyDocument: {
        Version: '2012-10-17',
        Statement: [
          {
            Sid: 'AllowCloudFrontRead',
            Effect: 'Allow',
            Principal: { Service: 'cloudfront.amazonaws.com' },
            Action: 's3:GetObject',
            Resource: `arn:${cdk.Aws.PARTITION}:s3:::${frontendBucketName}/*`,
            Condition: {
              StringEquals: {
                'AWS:SourceArn': distributionArn,
              },
            },
          },
        ],
      },
    });

    new route53.ARecord(this, 'ApexAliasRecord', {
      zone: hostedZone,
      recordName: props.domain,
      target: route53.RecordTarget.fromAlias({
        bind: () => ({
          dnsName: distribution.attrDomainName,
          hostedZoneId: CLOUDFRONT_HOSTED_ZONE_ID,
        }),
      }),
      deleteExisting: true,
    });
    new route53.CfnRecordSet(this, 'AuthAliasRecord', {
      hostedZoneId,
      name: `auth.${props.domain}`,
      type: 'A',
      aliasTarget: {
        dnsName: authCloudFrontDomainName,
        hostedZoneId: authCloudFrontHostedZoneId,
      },
    });
    new route53.CfnRecordSet(this, 'WebSocketAliasRecord', {
      hostedZoneId,
      name: `ws.${props.domain}`,
      type: 'A',
      aliasTarget: {
        dnsName: websocketRegionalDomainName,
        hostedZoneId: websocketRegionalHostedZoneId,
      },
    });

    new ssm.StringParameter(this, 'CloudFrontDistributionIdParameter', {
      parameterName: params.cloudFrontDistributionId,
      stringValue: distribution.attrId,
    });
    new ssm.StringParameter(this, 'CloudFrontDomainNameParameter', {
      parameterName: params.cloudFrontDomainName,
      stringValue: distribution.attrDomainName,
    });

    new cdk.CfnOutput(this, 'CloudFrontDistributionId', {
      value: distribution.attrId,
    });
    new cdk.CfnOutput(this, 'CloudFrontDomainName', {
      value: distribution.attrDomainName,
    });
  }
}
