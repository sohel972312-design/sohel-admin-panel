/**
 * Pre-build script — runs before `next build`
 * If ENV_PRODUCTION_BASE64 is set, decodes it and writes .env.production.local
 * This allows Hostinger (and any host) to inject all secrets via a single env var.
 */
const fs = require('fs');
const path = require('path');

const encoded = process.env.ENV_PRODUCTION_BASE64;

if (encoded) {
  const content = Buffer.from(encoded, 'base64').toString('utf-8');
  const envPath = path.join(__dirname, '..', '.env.production.local');
  fs.writeFileSync(envPath, content, 'utf-8');
  console.log('[pre-build] .env.production.local created from ENV_PRODUCTION_BASE64 ✓');
} else {
  console.log('[pre-build] ENV_PRODUCTION_BASE64 not set — skipping env file creation');
}
