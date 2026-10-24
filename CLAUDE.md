# Repository Guide

## Scope and navigation

Work from the repo root. This repo owns shared DNS, certificates, CloudFront, the static frontend bucket, and GitHub deployment roles. Sibling `db-accessor` owns backend APIs, Lambdas, queues, databases, and application CDK in its `infra/`; `db-accessor-ui` owns the Angular application and asset uploads.

- `bin/app.ts`: assembles stacks, stage domain, account/region, and edge settings.
- `lib/shared-dns-stack.ts`: hosted zone and temporary apex record for Cognito domain validation.
- `lib/shared-frontend-stack.ts`: private frontend bucket and UI deployment role.
- `lib/shared-certificate-*.ts`: global and regional certificates.
- `lib/shared-edge-stack.ts`: CloudFront origins/behaviors, origin access control, bucket policy, and apex/auth/WebSocket DNS aliases.
- `lib/shared-deploy-stack.ts`: infrastructure GitHub OIDC role and CDK bootstrap permissions.
- `lib/shared-params.ts`: SSM parameter names shared across repositories.

## Verification

- Install: `npm ci`.
- Type-check: `npm run build` (`tsc` uses `noEmit`; do not create generated JS/declarations).
- Synthesize: set `STAGE=dev|prod` and the intended account/region, then `npm run synth`. PowerShell: `$env:STAGE='dev'; npm run synth`. `bin/app.ts` resolves `CDK_DEPLOY_ACCOUNT/REGION` before `CDK_DEFAULT_ACCOUNT/REGION`; use the intended AWS profile when relying on CLI defaults.
- PR CI runs build/synth with `STAGE=dev` and region `eu-central-1`, optionally assuming `CDK_ROLE_TO_ASSUME_ARN`. There is no lint script. Jest is configured for `test/**/*.test.ts`, but there are currently no test files; `npm test` is not an established passing check.
- Resource changes need build/synth and template inspection. Documentation-only edits need content/diff checks. Synthesis does not confirm SSM values exist or DNS delegation is ready at deployment.

## Infrastructure contracts

- Reuse `sharedParamNames(stage)`; parameter paths are cross-repository contracts. This repo also publishes certificate ARNs under `/db-accessor-<stage>/acm/`, despite that backend prefix.
- Edge imports backend API/auth/WebSocket settings through SSM; frontend deployment consumes this repo's bucket/distribution parameters. Update producers and consumers together when changing a parameter.
- The global certificate is issued in `us-east-1` through `DnsValidatedCertificate`; its stack uses the app environment and publishes the ARN in that stack's SSM region. Do not infer stack region from its name alone.
- Preserve private S3 access through CloudFront OAC. `/api/*` routes to the REST origin with caching disabled, viewer headers forwarded except Host, and `/api` stripped by the viewer-request function. WebSocket and auth use separate DNS aliases.
- The viewer-request function enforces `allowedIp` on both static and API behaviors; `bin/app.ts` supplies it. Non-API GET/HEAD requests accepting `text/html` are rewritten to `/index.html`, without an Angular route list. Filenames with extensions and `/assets`, `/media`, and `/.well-known` paths are excluded; keep extensionless assets under those directories. Unknown frontend URLs reach Angular. Asset paths and API errors must not be replaced with SPA HTML. Do not add distribution-wide 403/404 fallback responses.
- Prefer `Boolean(value)` over `!!value` when converting values to booleans.

## Workflow

- Follow `README.md` for first deployment: deploy role if needed → DNS and parent NS delegation → frontend bucket → certificates → backend API/auth parameters → edge. Stacks exchange SSM values rather than explicit CDK dependencies; deploying all stacks does not establish prerequisites automatically.
- `cdk-deploy-to.ps1`/`.bat` accept account, region, stage, then CDK deploy arguments. `.github/workflows/cd-dev.yml` and `cd-prod.yml` are manual workflows with stack selection.
- Preserve resource IDs, parameter names, OIDC trust scope, and stage-specific retention unless the task calls for changes. The frontend bucket is versioned; dev allows automatic deletion, while prod retains it.
- Keep changes focused and preserve unrelated work. Do not commit, deploy, or open PRs unless explicitly asked. Prefer source pointers and README deployment details over duplicated configuration values or task logs in this guide.

## Pull request descriptions

Use these three sections, in this order, for every PR. Keep descriptions concise and describe the final change for a reviewer who has not seen the conversation. Include a relevant architecture diagram in Summary when expanding the architecture. Report only checks actually performed; use "None" in Deployment notes when no additional steps are needed.

```markdown
## Summary

- Describe the change and its purpose, including user-visible behavior where applicable.
- Include relevant behavior or implementation decisions.

## Verification

- List checks performed and their results.
- State any relevant behavior that wasn't verified.

## Deployment notes

- List prerequisites, migrations, or configuration changes.
- Write "None" when no additional steps are needed.
```

## Agent skills

### Issue tracker

Issues are tracked in GitHub Issues for `apolgesek/db-accessor-infra` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context, using the shared glossary and ADRs in sibling `db-accessor` plus any repo-local `docs/adr/`. See `docs/agents/domain.md`.
