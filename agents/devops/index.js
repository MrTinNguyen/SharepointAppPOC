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

  // 1. Install SPFx dependencies if node_modules is missing (e.g. cold runner, cache miss).
  console.log('── Installing SPFx dependencies ──');
  exec('npm ci');

  // Verify gulp is present before trying to run it.
  const gulpBin = path.join(process.cwd(), 'node_modules', '.bin', 'gulp');
  if (!fs.existsSync(gulpBin)) {
    throw new Error(
      `gulp not found at ${gulpBin} after npm ci.\n` +
      'Make sure gulp-cli is listed in the project devDependencies.'
    );
  }

  // 2. Build production bundle.
  // Always use the local gulp installed by SPFx — never `npx gulp` (downloads incompatible gulp 5).
  console.log('\n── Building SPFx solution ──');
  exec(`"${gulpBin}" bundle --ship`);
  exec(`"${gulpBin}" package-solution --ship`);

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
