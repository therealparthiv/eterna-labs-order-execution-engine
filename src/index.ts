import Fastify from 'fastify';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { initializeDatabase, AppDataSource } from './config/database';
import { redisConnection } from './config/redis';
import { orderRoutes } from './routes/orderRoutes';
import { orderWorker } from './services/queue/OrderWorker';
import { closeQueue } from './config/queue';
import { wsManager } from './services/websocket/WebSocketManager';

dotenv.config();

const PORT = parseInt(process.env.PORT || '3000');

const fastify = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'info' : 'error',
  },
});

// Register WebSocket plugin
fastify.register(websocket);

// Register routes
fastify.register(orderRoutes);

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      database: 'connected',
      redis: redisConnection.status === 'ready' ? 'connected' : 'disconnected',
      worker: 'running',
    }
  };
});

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    message: 'Order Execution Engine API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      stats: 'GET /api/stats',
      orders: 'GET /api/orders',
      orderById: 'GET /api/orders/:orderId',
      executeOrder: 'POST /api/orders/execute (WebSocket upgrade)',
    },
  };
});

// Start server
const start = async () => {
  try {
    console.log('\nStarting Order Execution Engine...\n');

    // Initialize database
    console.log('Initializing database...');
    await initializeDatabase();

    // Run migrations automatically
    console.log('Running database migrations...');
    await AppDataSource.runMigrations();
    console.log('Migrations completed successfully.');
    
    // Check Redis connection
    console.log('Checking Redis connection...');
    await redisConnection.ping();
    console.log('Redis connection verified\n');

    // Start the order worker (already initialized as singleton)
    console.log('Order worker initialized\n');
    
    // Start server
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log('\n' + '='.repeat(60));
    console.log('Order Execution Engine is running!');
    console.log('='.repeat(60));
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`Health: http://localhost:${PORT}/health`);
    console.log(`Stats: http://localhost:${PORT}/api/stats`);
    console.log(`Orders: http://localhost:${PORT}/api/orders`);
    console.log(`Execute: POST http://localhost:${PORT}/api/orders/execute`);
    console.log('='.repeat(60) + '\n');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('\nShutting down gracefully...');
  
  try {
    // Close WebSocket connections
    wsManager.closeAll();
    
    // Close worker
    await orderWorker.close();
    
    // Close queue
    await closeQueue();
    
    // Close server
    await fastify.close();
    
    // Close Redis
    await redisConnection.quit();
    
    console.log('Shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

start();