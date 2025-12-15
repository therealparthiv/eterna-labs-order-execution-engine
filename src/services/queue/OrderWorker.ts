import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { ORDER_QUEUE_NAME } from '../../config/queue';
import { OrderService } from '../OrderService';

interface OrderJobData {
  orderId: string;
}

/**
 * Worker to process order execution jobs from the queue
 * Handles concurrent processing with exponential backoff retry
 */
export class OrderWorker {
  private worker: Worker;
  private orderService: OrderService;
  private maxConcurrent: number;

  constructor() {
    this.orderService = new OrderService();
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_ORDERS || '10');

    this.worker = new Worker<OrderJobData>(
      ORDER_QUEUE_NAME,
      async (job: Job<OrderJobData>) => {
        return await this.processOrder(job);
      },
      {
        connection: redisConnection,
        concurrency: this.maxConcurrent, // Process up to 10 orders concurrently
        limiter: {
          max: 100, // Maximum 100 jobs
          duration: 60000, // Per minute
        },
      }
    );

    this.setupEventListeners();
  }

  /**
   * Process individual order job
   */
  private async processOrder(job: Job<OrderJobData>): Promise<void> {
    const { orderId } = job.data;
    const attemptNumber = job.attemptsMade + 1;

    console.log(`\n${'='.repeat(60)}`);
    console.log(`   Processing order: ${orderId}`);
    console.log(`   Attempt: ${attemptNumber}/${job.opts.attempts || 3}`);
    console.log(`   Job ID: ${job.id}`);
    console.log(`${'='.repeat(60)}`);

    try {
      await this.orderService.executeOrder(orderId);
      console.log(`Order ${orderId} processed successfully\n`);
    } catch (error: any) {
      console.error(`Order ${orderId} processing failed:`, error.message);

      // If this was the last attempt, log for post-mortem
      if (attemptNumber >= (job.opts.attempts || 3)) {
        console.error(`   Order ${orderId} failed permanently after ${attemptNumber} attempts`);
        console.error(`   Reason: ${error.message}`);
        console.error(`   Stack: ${error.stack}`);
      } else {
        console.log(`Order ${orderId} will be retried (attempt ${attemptNumber + 1})`);
      }

      throw error; // Re-throw to trigger retry
    }
  }

  /**
   * Setup event listeners for monitoring
   */
  private setupEventListeners(): void {
    this.worker.on('completed', (job) => {
      console.log(`Worker completed job ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      if (job) {
        console.error(`Worker failed job ${job.id}:`, err.message);
      }
    });

    this.worker.on('error', (err) => {
      console.error('Worker error:', err);
    });

    this.worker.on('ready', () => {
      console.log('   Order worker is ready');
      console.log(`   Concurrency: ${this.maxConcurrent} orders`);
      console.log(`   Rate limit: 100 orders/minute`);
    });
  }

  /**
   * Close the worker
   */
  async close(): Promise<void> {
    await this.worker.close();
    console.log('Order worker closed');
  }

  /**
   * Get worker instance
   */
  getWorker(): Worker {
    return this.worker;
  }
}

// Export singleton instance
export const orderWorker = new OrderWorker();