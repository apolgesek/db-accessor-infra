import * as cdk from 'aws-cdk-lib';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as ssm from 'aws-cdk-lib/aws-ssm';
import { Construct } from 'constructs';
import { sharedParamNames } from './shared-params';

export interface SharedDnsStackProps extends cdk.StackProps {
  stage: 'dev' | 'prod';
  domain: string;
}

const COGNITO_PARENT_VALIDATION_IP = '192.0.2.1';

export class SharedDnsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: SharedDnsStackProps) {
    super(scope, id, props);

    const zone = new route53.PublicHostedZone(this, 'StageHostedZone', {
      zoneName: props.domain,
    });
    const params = sharedParamNames(props.stage);

    new route53.ARecord(this, 'CognitoParentValidationRecord', {
      zone,
      target: route53.RecordTarget.fromIpAddresses(COGNITO_PARENT_VALIDATION_IP),
      ttl: cdk.Duration.minutes(5),
    });

    new ssm.StringParameter(this, 'HostedZoneIdParameter', {
      parameterName: params.hostedZoneId,
      stringValue: zone.hostedZoneId,
    });

    new cdk.CfnOutput(this, 'HostedZoneId', {
      value: zone.hostedZoneId,
    });
    new cdk.CfnOutput(this, 'HostedZoneNameServers', {
      value: zone.hostedZoneNameServers ? cdk.Fn.join(',', zone.hostedZoneNameServers) : '',
    });
  }
}
