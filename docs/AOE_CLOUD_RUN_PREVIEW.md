# AOE Cloud Run Preview

This is the reversible deployment lane for the AOE hackathon preview. It is
separate from existing Sapphire and 0guard services.

## Preview Service

- Project: `sapphire-479610`
- Region: `us-central1`
- Service: `aoe-hackathon-preview`
- Payment mode: `simulated`
- Model provider gates: unset
- Telegram token: unset
- x402 pay-to: unset unless a separate Base Sepolia testnet release is approved

## Build And Deploy

```bash
npm ci --dry-run --ignore-scripts
npm run verify
npm run build
npm run sellability
PLAYWRIGHT_HTML_OPEN=never npm run browser:smoke
gcloud builds submit --project sapphire-479610 --config cloudbuild.preview.yaml .
```

For local source submissions, pass an explicit image tag from the checked-out
commit:

```bash
gcloud builds submit --project sapphire-479610 \
  --config cloudbuild.preview.yaml \
  --substitutions=_IMAGE_TAG="$(git rev-parse --short HEAD)" .
```

After deploy, read the URL from Cloud Run and verify:

```bash
export AOE_BASE_URL="https://<preview-url>"
AOE_BASE_URL="$AOE_BASE_URL" npm run gcp:smoke
curl -fsS "$AOE_BASE_URL/v1/hackathon/0g-proof" | jq '.report.readiness, .report.safety'
```

## Rollback

Because this is an isolated preview service, rollback is deletion:

```bash
gcloud run services delete aoe-hackathon-preview \
  --project sapphire-479610 \
  --region us-central1 \
  --quiet
```

If the service is later promoted into a traffic-managed production service,
rollback must shift traffic back to the prior revision instead of deleting the
service.

## Hard Boundaries

Do not configure live settlement, Telegram sends, model-provider gates, 0G
signers, private TRM/KYT credentials, or production secrets on this preview.
`GET /v1/hackathon/0g-proof` may read a public 0G receipt only; it must not
sign, broadcast, start a node, or post a new proof.
