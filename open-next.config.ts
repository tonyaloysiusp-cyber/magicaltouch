// OpenNext adapter config for Cloudflare Workers.
// Page cache (ISR) is kept in the R2 bucket bound in wrangler.jsonc.
import { defineCloudflareConfig } from '@opennextjs/cloudflare/config';
import r2IncrementalCache from '@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache';

export default defineCloudflareConfig({
  incrementalCache: r2IncrementalCache,
});
