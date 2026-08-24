import { getSql } from '../api/_lib/db.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const envStr = fs.readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../.env'), 'utf8');
envStr.split('\n').forEach(line => {
  if (line.trim() && !line.startsWith('#') && line.includes('=')) {
    const [k, ...rest] = line.split('=');
    process.env[k.trim()] = rest.join('=').trim();
  }
});

async function run() {
  try {
    const sql = getSql();
    await sql`
      CREATE TABLE IF NOT EXISTS endpoint_commands (
        id SERIAL PRIMARY KEY,
        endpoint_id UUID REFERENCES endpoints(id) ON DELETE CASCADE,
        command VARCHAR(50) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        result TEXT
      )
    `;
    console.log('Table endpoint_commands created successfully.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to create table:', err);
    process.exit(1);
  }
}

run();
