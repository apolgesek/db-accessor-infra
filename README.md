# db-accessor-infra

Shared edge, DNS, and certificate infrastructure for db-accessor.

This repo owns Route 53 hosted zones, ACM certificates, CloudFront, and DNS records. It depends on SSM parameters published by `db-accessor-ui` and `db-accessor`.

## Manual deployment order

1. Deploy `shared-deploy-stack` once locally if GitHub Actions will deploy later.
   .\cdk-deploy-to.bat 349036690903 eu-central-1 dev shared-deploy-stack --profile apolgesek-dev --require-approval never
2. Deploy `shared-dns-stack`. This creates the hosted zone and a temporary apex A record required by Cognito custom-domain validation.
3. Update parent NS delegation for the stage domain.
4. Deploy `shared-certificate-us-east-1-stack` and `shared-certificate-regional-stack`.
5. Deploy `db-accessor-ui` and `db-accessor` stacks so their SSM parameters exist.
6. Deploy `shared-edge-stack`. This replaces the temporary apex A record with the CloudFront alias.
