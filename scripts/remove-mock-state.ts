import fs from 'fs';
import path from 'path';

const STORE_DIR = path.resolve(process.cwd(), 'apps/web/src/store');

function processFile(file: string, replacements: { find: RegExp, replace: string }[]) {
  const fullPath = path.join(STORE_DIR, file);
  if (!fs.existsSync(fullPath)) return;
  
  let content = fs.readFileSync(fullPath, 'utf-8');
  let changed = false;
  
  for (const r of replacements) {
    if (r.find.test(content)) {
      content = content.replace(r.find, r.replace);
      changed = true;
    }
  }
  
  if (changed) {
    fs.writeFileSync(fullPath, content);
    console.log(`Fixed ${file}`);
  }
}

// requestsSlice.ts
processFile('requestsSlice.ts', [
  { find: /initialState:\s*\{\s*items:\s*DEMO_ASSET_REQUESTS\s*as\s*AssetRequest\[\]\s*\}/g, replace: 'initialState: { items: [] as AssetRequest[] }' }
]);

// networkDevicesSlice.ts
processFile('networkDevicesSlice.ts', [
  { find: /initialState:\s*\{\s*items:\s*generateDemoNetworkDevices\(\)\s*\}/g, replace: 'initialState: { items: [] as NetworkDevice[] }' }
]);

// auditSlice.ts
processFile('auditSlice.ts', [
  { find: /initialState:\s*\{\s*items:\s*DEMO_AUDIT_LOGS\s*as\s*AuditLog\[\]\s*\}/g, replace: 'initialState: { items: [] as AuditLog[] }' }
]);

// vendorsSlice.ts
processFile('vendorsSlice.ts', [
  { find: /initialState:\s*\{\s*items:\s*DEMO_VENDORS\s*\}/g, replace: 'initialState: { items: [] as Vendor[] }' }
]);

// departmentsSlice.ts
processFile('departmentsSlice.ts', [
  { find: /initialState:\s*\{\s*items:\s*DEMO_DEPARTMENTS\s*\}/g, replace: 'initialState: { items: [] as Department[] }' }
]);

console.log('Removed mock states.');
