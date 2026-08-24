import fs from 'fs';
import path from 'path';

const API_DIR = path.resolve(process.cwd(), 'api');

function processDirectory(dir: string) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (file !== '_lib') {
        processDirectory(fullPath);
      }
    } else if (fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf-8');
      let changed = false;
      
      // Fix imports
      if (content.includes('import {') && content.includes('(auth.tenantId || DEMO_TENANT_ID) }')) {
        content = content.replace(/\(auth\.tenantId\s*\|\|\s*DEMO_TENANT_ID\)\s*\}/g, 'DEMO_TENANT_ID }');
        changed = true;
      }
      
      // Also check if it was replaced like `, auth.tenantId || DEMO_TENANT_ID }` without parens
      if (content.includes('import {') && content.includes('auth.tenantId || DEMO_TENANT_ID }')) {
        content = content.replace(/auth\.tenantId\s*\|\|\s*DEMO_TENANT_ID\s*\}/g, 'DEMO_TENANT_ID }');
        changed = true;
      }
      
      // Wait, what if it's `(auth.tenantId || DEMO_TENANT_ID)` anywhere in the import statement?
      // Let's just fix the import lines specifically.
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].startsWith('import') && lines[i].includes('auth.tenantId || DEMO_TENANT_ID')) {
          lines[i] = lines[i].replace(/\(auth\.tenantId\s*\|\|\s*DEMO_TENANT_ID\)/g, 'DEMO_TENANT_ID');
          lines[i] = lines[i].replace(/auth\.tenantId\s*\|\|\s*DEMO_TENANT_ID/g, 'DEMO_TENANT_ID');
          changed = true;
        }
      }
      content = lines.join('\n');

      if (changed) {
        fs.writeFileSync(fullPath, content);
        console.log(`Fixed ${path.relative(process.cwd(), fullPath)}`);
      }
    }
  }
}

processDirectory(API_DIR);
console.log('Fix complete.');
