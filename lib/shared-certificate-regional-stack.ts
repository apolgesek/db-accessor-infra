import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { sharedParamNames } from './shared-params';

export interface SharedCertificateRegionalStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
  domain: string;
}

export class SharedCertificateRegionalStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SharedCertificateRegionalStackProps) {
    super(scope, id, props);

    const params = sharedParamNames(props.stage);
    const hostedZoneId = ssm.StringParameter.valueForStringParameter(this, params.hostedZoneId);
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(this, 'StageHostedZone', {
      hostedZoneId,
      zoneName: props.domain,
    });

    const certificate = new acm.Certificate(this, 'RegionalCertificate', {
      domainName: `*.${props.domain}`,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    new ssm.StringParameter(this, 'RegionalCertificateArnParameter', {
      parameterName: params.regionalCertificateArn,
      stringValue: certificate.certificateArn,
    });

    new cdk.CfnOutput(this, 'RegionalCertificateArn', {
      value: certificate.certificateArn,
    });
  }
}
