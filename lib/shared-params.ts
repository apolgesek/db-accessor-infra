export interface SharedParamNames {
  hostedZoneId: string;
  globalCertificateArn: string;
  regionalCertificateArn: string;
  frontendBucketName: string;
  frontendBucketRegionalDomainName: string;
  apiOriginDomainName: string;
  apiOriginPath: string;
  websocketRegionalDomainName: string;
  websocketRegionalHostedZoneId: string;
  authCloudFrontDomainName: string;
  authCloudFrontHostedZoneId: string;
  cloudFrontDistributionId: string;
  cloudFrontDomainName: string;
}

export function sharedParamNames(stage: string): SharedParamNames {
  return {
    hostedZoneId: `/db-accessor-infra-${stage}/route53/hosted-zone-id`,
    globalCertificateArn: `/db-accessor-${stage}/acm/global-certificate-arn`,
    regionalCertificateArn: `/db-accessor-${stage}/acm/regional-certificate-arn`,
    frontendBucketName: `/db-accessor-infra-${stage}/static-site/bucket-name`,
    frontendBucketRegionalDomainName: `/db-accessor-infra-${stage}/static-site/bucket-regional-domain-name`,
    apiOriginDomainName: `/db-accessor-${stage}/api/rest-api-origin-domain-name`,
    apiOriginPath: `/db-accessor-${stage}/api/rest-api-origin-path`,
    websocketRegionalDomainName: `/db-accessor-${stage}/websocket/regional-domain-name`,
    websocketRegionalHostedZoneId: `/db-accessor-${stage}/websocket/regional-hosted-zone-id`,
    authCloudFrontDomainName: `/db-accessor-${stage}/auth/cloudfront-domain-name`,
    authCloudFrontHostedZoneId: `/db-accessor-${stage}/auth/cloudfront-hosted-zone-id`,
    cloudFrontDistributionId: `/db-accessor-infra-${stage}/cloudfront/distribution-id`,
    cloudFrontDomainName: `/db-accessor-infra-${stage}/cloudfront/domain-name`,
  };
}
