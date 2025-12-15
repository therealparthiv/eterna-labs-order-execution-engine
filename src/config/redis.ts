import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Determine if need a secure connection (Upstash requires TLS)
const isSecure = process.env.REDIS_HOST?.includes('upstash');

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD, // Required for Upstash
  maxRetriesPerRequest: null, // Required for BullMQ
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  //  Enable TLS for Upstash, disable for Localhost
  ...(isSecure ? {
    tls: {
      rejectUnauthorized: false
    }
  } : {})
});

redisConnection.on('connect', () => {
  console.log('Redis connection established');
});

redisConnection.on('error', (err) => {
  console.error('Redis connection error:', err);
});

export const closeRedisConnection = async (): Promise<void> => {
  await redisConnection.quit();
  console.log('Redis connection closed');
};