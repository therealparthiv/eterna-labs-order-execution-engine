import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

export const redisConnection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
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