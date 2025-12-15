import Redis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

// Support both REDIS_URL and individual env vars
const createRedisConnection = (): Redis => {
  const commonOptions = {
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
  };

  if (process.env.REDIS_URL) {
    // Use REDIS_URL for production (Render, Heroku, etc.)
    return new Redis(process.env.REDIS_URL, commonOptions);
  }

  // Use individual env vars for local development
  return new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    ...commonOptions,
  });
};

export const redisConnection = createRedisConnection();

redisConnection.on('connect', () => {
  console.log(' Redis connection established');
});

redisConnection.on('error', (err) => {
  console.error(' Redis connection error:', err);
});

export const closeRedisConnection = async (): Promise<void> => {
  await redisConnection.quit();
  console.log('Redis connection closed');
};