import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { initializeDatabase } from './config/database';
import { redisConnection } from './config/redis';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'error',
  },
});

// Register WebSocket plugin
fastify.register(websocket);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return { 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: redisConnection.status === 'ready' ? 'connected' : 'disconnected',
    }
  };
});

// Start server
const start = async () => {
  try {
    // Initialize database
    await initializeDatabase();
    
    // Check Redis connection
    await redisConnection.ping();
    
    // Start server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  await fastify.close();
  await redisConnection.quit();
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();