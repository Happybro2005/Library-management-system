import app from './app';
import { config } from './config';
import { prisma } from './config/prisma';

const server = app.listen(config.port, () => {
  console.log(`🚀 LMS Backend Server running on http://localhost:${config.port} [${config.nodeEnv}]`);
});

// Graceful shutdown
async function gracefulShutdown(signal: string) {
  console.log(`\nReceived ${signal}. Gracefully terminating server...`);
  server.close(async () => {
    await prisma.$disconnect();
    console.log('PostgreSQL Prisma connection closed. Server exited cleanly.');
    process.exit(0);
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
