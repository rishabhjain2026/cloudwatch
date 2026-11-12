import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
import { startScheduler } from './services/scheduler.js';

const app = createApp();

async function main() {
  await prisma.$connect();
  app.listen(env.PORT, () => {
    console.log(`InfraPulse API listening on http://localhost:${env.PORT}`);
    startScheduler();
  });
}

main().catch(async (err) => {
  console.error('Failed to start API', err);
  await prisma.$disconnect();
  process.exit(1);
});
