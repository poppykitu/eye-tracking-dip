// Prefer a normal npm install; allow the bundled Codex runtime on this machine.
const path=require('path'),os=require('os');
try { module.exports=require('playwright'); }
catch (error) {
  try { module.exports=require(path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')); }
  catch { throw new Error('Install browser test dependencies: npm install && npx playwright install chromium', {cause:error}); }
}
