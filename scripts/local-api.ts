import { createServer } from 'node:http';
import { handleApiRequest, loadEnv } from './api-dev-core';

loadEnv();

const port = Number(process.env.API_PORT ?? 3000);

const server = createServer((req, res) => {
  void handleApiRequest(req, res);
});

server.on('error', (err) => {
  if (err && 'code' in err && err.code === 'EADDRINUSE') {
    console.error(`\nPort ${port} is already in use.`);
    console.error('Run: npm run dev   (from apps/web) — it will restart a stale API automatically.');
    console.error('Or stop the old process manually and run: npm run dev:api\n');
  } else {
    console.error(err);
  }
  process.exit(1);
});

server.listen(port, '127.0.0.1', () => {
  const hasDb = Boolean(process.env.DATABASE_URL);
  console.log(`Local API listening on http://127.0.0.1:${port}`);
  console.log(`DATABASE_URL: ${hasDb ? 'configured' : 'MISSING — add to .env'}`);
});
