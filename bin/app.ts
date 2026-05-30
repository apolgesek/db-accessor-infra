#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { SharedCertificateRegionalStack } from '../lib/shared-certificate-regional-stack';
import { SharedCertificateUsEast1Stack } from '../lib/shared-certificate-us-east-1-stack';
import { SharedDeployStack } from '../lib/shared-deploy-stack';
import { SharedDnsStack } from '../lib/shared-dns-stack';
import { SharedEdgeStack } from '../lib/shared-edge-stack';

const app = new cdk.App();
const env = {
  account: process.env.CDK_DEPLOY_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEPLOY_REGION || process.env.CDK_DEFAULT_REGION,
};
const stage = process.env.STAGE as 'dev' | 'prod';
const projectName = 'db-accessor';
const githubOrg = 'apolgesek';
const githubRepo = 'db-accessor-infra';
const domain = `${stage}.4eyesdb.com`;

new SharedDeployStack(app, 'shared-deploy-stack', {
  env,
  stage,
  projectName,
  githubOrg,
  githubRepo,
});

new SharedDnsStack(app, 'shared-dns-stack', {
  env,
  stage,
  domain,
});

new SharedCertificateUsEast1Stack(app, 'shared-certificate-us-east-1-stack', {
  env,
  stage,
  domain,
});

new SharedCertificateRegionalStack(app, 'shared-certificate-regional-stack', {
  env,
  stage,
  domain,
});

new SharedEdgeStack(app, 'shared-edge-stack', {
  env,
  stage,
  domain,
  allowedIp: '63.176.89.71',
  priceClass: 'PriceClass_100',
});
