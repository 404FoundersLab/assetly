import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const envStr = readFileSync(resolve(process.cwd(), '.env'), 'utf-8');
for (const line of envStr.split('\n')) {
  if (line.trim() && !line.startsWith('#')) {
    const [k, ...v] = line.split('=');
    if (k && v) process.env[k.trim()] = v.join('=').trim();
  }
}

async function run() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    const tenant_id = '11111111-1111-1111-1111-111111111111';
    const mac_address = 'c8:95:ce:8c:d6:c4';
    const hostname = 'LAPTOP-6U5HE320';
    const os_version = 'Microsoft Windows 11';
    const ip_address = '10.20.10.50';
    const cpu_model = 'Intel Core i9';
    const ram_total_gb = 32;
    const storage_total_gb = 1000;
    const windows_updates = ['KB12345'];

    const [existing] = await sql`
      SELECT id FROM endpoints 
      WHERE tenant_id = ${tenant_id} AND mac_address = ${mac_address}
      LIMIT 1
    `;

    if (existing) {
      await sql`
        UPDATE endpoints 
        SET 
          hostname = ${hostname},
          os_version = ${os_version},
          ip_address = ${ip_address},
          last_seen_at = CURRENT_TIMESTAMP,
          status = 'active',
          cpu_model = ${cpu_model || null},
          ram_total_gb = ${ram_total_gb || null},
          storage_total_gb = ${storage_total_gb || null},
          windows_updates = ${windows_updates ? JSON.stringify(windows_updates) : null}
        WHERE id = ${existing.id}
      `;
      console.log('Updated existing:', existing.id);
    } else {
      const [inserted] = await sql`
        INSERT INTO endpoints (
          tenant_id, hostname, os_version, ip_address, mac_address, status, last_seen_at, cpu_model, ram_total_gb, storage_total_gb, windows_updates
        )
        VALUES (
          ${tenant_id}, ${hostname}, ${os_version}, ${ip_address}, ${mac_address}, 'active', NOW(), ${cpu_model || null}, ${ram_total_gb || null}, ${storage_total_gb || null}, ${windows_updates ? JSON.stringify(windows_updates) : null}
        )
        RETURNING id
      `;
      console.log('Inserted new:', inserted.id);
    }
  } catch (e) {
    console.error('SQL Error:', e);
  }
}

run();
