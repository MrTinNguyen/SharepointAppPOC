// DevOps Agent — entry point.
// Called by: .github/workflows/ai-agents.yml (on push to main)
//
// 1. Install SPFx dependencies (npm ci)
// 2. Build the .sppkg via gulp
// 3. Deploy to SharePoint App Catalog (if m365 CLI is available)

'use strict';

const { execSync, spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function exec(cmd, opts = {}) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', shell: true, ...opts });
}

function isAvailable(binary) {
  const result = spawnSync(binary, ['--version'], { encoding: 'utf8' });
  return result.status === 0;
}

/** Glob the first .sppkg under sharepoint/solution/ */
function findSppkg() {
  const dir = path.join(process.cwd(), 'sharepoint', 'solution');
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sppkg'));
  return files.length > 0 ? path.join(dir, files[0]) : null;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n🚀 DevOps Agent — SPFx Build & Deploy\n');

  // Dependencies are installed by the workflow (npm ci step) before this agent runs.

  // 2. Build production bundle
  // Use the local gulp installed by SPFx (node_modules/.bin/gulp).
  // Never use `npx gulp` — it downloads gulp 5 which is incompatible with SPFx.
  console.log('\n── Building SPFx solution ──');
  exec('./node_modules/.bin/gulp bundle --ship');
  exec('./node_modules/.bin/gulp package-solution --ship');

  const sppkgPath = findSppkg();
  if (!sppkgPath) {
    throw new Error('Build completed but no .sppkg file found under sharepoint/solution/');
  }
  console.log(`\n📦 Package built: ${sppkgPath}`);

  // 3. Deploy
  const catalogUrl = process.env.SHAREPOINT_CATALOG_URL;

  if (!catalogUrl) {
    console.log('\n⚠️  SHAREPOINT_CATALOG_URL not set — skipping auto-deploy.');
    printManualInstructions(sppkgPath);
    return;
  }

  if (!isAvailable('m365')) {
    console.log('\n⚠️  m365 CLI not found — skipping auto-deploy.');
    printManualInstructions(sppkgPath);
    return;
  }

  // Optional: m365 login (service principal or pre-authenticated runner)
  if (process.env.M365_USERNAME && process.env.M365_PASSWORD) {
    exec(
      `m365 login --authType password --userName "${process.env.M365_USERNAME}" --password "${process.env.M365_PASSWORD}"`
    );
  }

  console.log('\n── Deploying to App Catalog ──');
  exec(`m365 spo app add --filePath "${sppkgPath}" --appCatalogUrl "${catalogUrl}" --overwrite`);
  exec(`m365 spo app deploy --name "${path.basename(sppkgPath)}" --appCatalogUrl "${catalogUrl}"`);

  console.log(`\n✅ Deployment complete. App Catalog: ${catalogUrl}`);
}

function printManualInstructions(sppkgPath) {
  console.log('\n── Manual deployment steps ──');
  console.log('1. Download the artifact:');
  console.log(`     ${sppkgPath}`);
  console.log('2. Go to: <your-tenant>.sharepoint.com/sites/appcatalog/_layouts/15/tenantAppCatalog.aspx');
  console.log('3. Click "Upload" → select the .sppkg file → check "Make this solution available to all sites"');
  console.log('4. Click "Deploy"');
  console.log('\n❌ Deployment skipped. Artifact at: sharepoint/solution/');
}

main().catch(err => {
  console.error('\n❌ DevOps agent failed:', err);
  process.exit(1);
});
