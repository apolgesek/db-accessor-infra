import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { sharedParamNames } from './shared-params';

export interface SharedFrontendStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
  frontendGithubOrg: string;
  frontendGithubRepo: string;
}

export class SharedFrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SharedFrontendStackProps) {
    super(scope, id, props);

    const stack = cdk.Stack.of(this);
    const params = sharedParamNames(props.stage);
    const bucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `db-accessor-ui-${props.stage}`,
      versioned: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
      removalPolicy: props.stage === 'dev' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN,
      autoDeleteObjects: props.stage === 'dev',
    });

    new ssm.StringParameter(this, 'FrontendBucketNameParameter', {
      parameterName: params.frontendBucketName,
      stringValue: bucket.bucketName,
    });
    new ssm.StringParameter(this, 'FrontendBucketRegionalDomainNameParameter', {
      parameterName: params.frontendBucketRegionalDomainName,
      stringValue: bucket.bucketRegionalDomainName,
    });

    const oidcProvider = iam.OpenIdConnectProvider.fromOpenIdConnectProviderArn(
      this,
      'GitHubOidcProvider',
      `arn:aws:iam::${stack.account}:oidc-provider/token.actions.githubusercontent.com`,
    );
    const assumedBy = new iam.FederatedPrincipal(
      oidcProvider.openIdConnectProviderArn,
      {
        StringEquals: {
          'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
        },
        StringLike: {
          'token.actions.githubusercontent.com:sub': `repo:${props.frontendGithubOrg}/${props.frontendGithubRepo}:*`,
        },
      },
      'sts:AssumeRoleWithWebIdentity',
    );
    const ssmParameterArn = (parameterName: string) =>
      stack.formatArn({
        service: 'ssm',
        resource: 'parameter',
        resourceName: parameterName.replace(/^\//, ''),
      });

    const deployRole = new iam.Role(this, 'GitHubFrontendDeployRole', {
      roleName: `db-accessor-ui-${props.stage}-github-deploy`,
      assumedBy,
      description: 'Role assumed by db-accessor-ui GitHub Actions to upload static assets',
    });
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'S3Write',
        effect: iam.Effect.ALLOW,
        actions: [
          's3:PutObject',
          's3:GetObject',
          's3:DeleteObject',
          's3:ListBucket',
          's3:GetBucketLocation',
          's3:AbortMultipartUpload',
          's3:ListBucketMultipartUploads',
        ],
        resources: [bucket.bucketArn, bucket.arnForObjects('*')],
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'CloudFrontInvalidate',
        effect: iam.Effect.ALLOW,
        actions: ['cloudfront:CreateInvalidation'],
        resources: [`arn:${stack.partition}:cloudfront::${stack.account}:distribution/*`],
      }),
    );
    deployRole.addToPolicy(
      new iam.PolicyStatement({
        sid: 'ReadDeploymentConfig',
        effect: iam.Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          ssmParameterArn(params.frontendBucketName),
          ssmParameterArn(params.cloudFrontDistributionId),
          ssmParameterArn(`/db-accessor-${props.stage}/auth/authority`),
          ssmParameterArn(`/db-accessor-${props.stage}/auth/client-id`),
        ],
      }),
    );

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: bucket.bucketName,
      description: 'Static frontend S3 bucket name',
    });
    new cdk.CfnOutput(this, 'FrontendBucketRegionalDomainName', {
      value: bucket.bucketRegionalDomainName,
      description: 'Static frontend S3 regional domain name',
    });
    new cdk.CfnOutput(this, 'GitHubFrontendDeployRoleArn', {
      value: deployRole.roleArn,
      description: 'ARN to use for db-accessor-ui app deploy in GitHub',
    });
  }
}
