import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { sharedParamNames } from './shared-params';

export interface SharedCertificateUsEast1StackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
  domain: string;
}

export class SharedCertificateUsEast1Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SharedCertificateUsEast1StackProps) {
    super(scope, id, props);

    const params = sharedParamNames(props.stage);
    const hostedZoneId = ssm.StringParameter.valueForStringParameter(this, params.hostedZoneId);
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'StageHostedZone', {
      hostedZoneId,
      zoneName: props.domain,
    });

    const certificate = new acm.DnsValidatedCertificate(this, 'GlobalCertificate', {
      domainName: props.domain,
      hostedZone,
      region: 'us-east-1',
      subjectAlternativeNames: [`*.${props.domain}`],
    });

    new ssm.StringParameter(this, 'GlobalCertificateArnParameter', {
      parameterName: params.globalCertificateArn,
      stringValue: certificate.certificateArn,
    });

    new cdk.CfnOutput(this, 'GlobalCertificateArn', {
      value: certificate.certificateArn,
    });
  }
}
