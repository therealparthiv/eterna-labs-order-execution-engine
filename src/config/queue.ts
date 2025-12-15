import { Queue, QueueEvents } from 'bullmq';
import { redisConnection } from './redis';

/**
 * Queue configuration for order processing
 */
export const ORDER_QUEUE_NAME = 'order-execution';

/**
 * Queue options
 */
const queueOptions = {
  connection: redisConnection,
};

/**
 * Order execution queue
 */
export const orderQueue = new Queue(ORDER_QUEUE_NAME, {
  ...queueOptions,
  defaultJobOptions: {
    attempts: 3, // Maximum 3 retry attempts
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second delay
    },
    removeOnComplete: {
      count: 100, // Keep last 100 completed jobs
      age: 24 * 3600, // Keep for 24 hours
    },
    removeOnFail: {
      count: 200, // Keep last 200 failed jobs
      age: 7 * 24 * 3600, // Keep for 7 days
    },
  },
});

/**
 * Queue events for monitoring
 */
export const orderQueueEvents = new QueueEvents(ORDER_QUEUE_NAME, queueOptions);

// Log queue events
orderQueueEvents.on('completed', ({ jobId }) => {
  console.log(`Job ${jobId} completed`);
});

orderQueueEvents.on('failed', ({ jobId, failedReason }) => {
  console.error(`Job ${jobId} failed: ${failedReason}`);
});

orderQueueEvents.on('active', ({ jobId }) => {
  console.log(`Job ${jobId} is now active`);
});

/**
 * Get queue metrics
 */
export async function getQueueMetrics() {
  const [waiting, active, completed, failed] = await Promise.all([
    orderQueue.getWaitingCount(),
    orderQueue.getActiveCount(),
    orderQueue.getCompletedCount(),
    orderQueue.getFailedCount(),
  ]);

  return {
    waiting,
    active,
    completed,
    failed,
    total: waiting + active + completed + failed,
  };
}

/**
 * Clean up queue connections
 */
export async function closeQueue() {
  await orderQueue.close();
  await orderQueueEvents.close();
  console.log('Queue connections closed');
}