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
      
      // Only process files that have requireAuth
      if (content.includes('const auth = await requireAuth(req);')) {
        let changed = false;
        
        // Replace ${DEMO_TENANT_ID} with ${auth.tenantId || DEMO_TENANT_ID}
        if (content.includes('${DEMO_TENANT_ID}')) {
          content = content.replace(/\$\{DEMO_TENANT_ID\}/g, '${auth.tenantId || DEMO_TENANT_ID}');
          changed = true;
        }

        // Special case: if DEMO_TENANT_ID is passed as an argument without interpolation (e.g. mappers or function calls)
        // Wait, for function arguments, we might need to replace DEMO_TENANT_ID with (auth.tenantId || DEMO_TENANT_ID)
        // Let's just handle exact matches of `, DEMO_TENANT_ID`
        if (content.includes(', DEMO_TENANT_ID')) {
          content = content.replace(/, DEMO_TENANT_ID/g, ', (auth.tenantId || DEMO_TENANT_ID)');
          changed = true;
        }
        
        if (changed) {
          fs.writeFileSync(fullPath, content);
          console.log(`Updated ${path.relative(process.cwd(), fullPath)}`);
        }
      }
    }
  }
}

processDirectory(API_DIR);
console.log('Refactoring complete.');
