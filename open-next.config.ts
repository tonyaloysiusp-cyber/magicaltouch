// OpenNext adapter config for Cloudflare Workers.
// Page cache: pre-built pages are served from the Worker's own static files
// (no R2 upload at deploy time — R2's bulk upload kept failing with 521s).
// Pages not pre-built are rendered on request. Switch back to the R2 cache
// (r2-incremental-cache + `npm run deploy:cf`) once deploys are stable.
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config';
import staticAssetsIncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache';

export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
});
