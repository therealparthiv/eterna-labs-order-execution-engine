import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Order } from '../models/Order';
import { OrderStatus, DexType } from '../types/order.types';

/**
 * Repository for Order database operations
 * Handles all CRUD operations for orders
 */
export class OrderRepository {
  private repository: Repository<Order>;

  constructor() {
    this.repository = AppDataSource.getRepository(Order);
  }

  /**
   * Create a new order
   */
  async create(orderData: Partial<Order>): Promise<Order> {
    const order = this.repository.create(orderData);
    return await this.repository.save(order);
  }

  /**
   * Find order by ID
   */
  async findById(orderId: string): Promise<Order | null> {
    return await this.repository.findOne({ where: { id: orderId } });
  }

  /**
   * Update order status
   */
  async updateStatus(
    orderId: string,
    status: OrderStatus,
    additionalData?: Partial<Order>
  ): Promise<void> {
    await this.repository.update(orderId, {
      status,
      ...additionalData,
      updatedAt: new Date(),
    });
  }

  /**
   * Update order with execution results
   */
  async updateExecutionResult(
    orderId: string,
    data: {
      selectedDex: DexType;
      executedPrice: number;
      amountOut: number;
      txHash: string;
    }
  ): Promise<void> {
    await this.repository.update(orderId, {
      status: OrderStatus.CONFIRMED,
      selectedDex: data.selectedDex,
      executedPrice: data.executedPrice,
      amountOut: data.amountOut,
      txHash: data.txHash,
      executedAt: new Date(),
      updatedAt: new Date(),
    });
  }

  /**
   * Mark order as failed
   */
  async markAsFailed(orderId: string, failureReason: string): Promise<void> {
    await this.repository.update(orderId, {
      status: OrderStatus.FAILED,
      failureReason,
      updatedAt: new Date(),
    });
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(orderId: string): Promise<void> {
    const order = await this.findById(orderId);
    if (order) {
      await this.repository.update(orderId, {
        retryCount: order.retryCount + 1,
        updatedAt: new Date(),
      });
    }
  }

  /**
   * Get all orders with pagination
   */
  async findAll(limit: number = 50, offset: number = 0): Promise<Order[]> {
    return await this.repository.find({
      take: limit,
      skip: offset,
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get orders by status
   */
  async findByStatus(status: OrderStatus): Promise<Order[]> {
    return await this.repository.find({
      where: { status },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get order statistics
   */
  async getStatistics(): Promise<{
    total: number;
    pending: number;
    confirmed: number;
    failed: number;
  }> {
    const [total, pending, confirmed, failed] = await Promise.all([
      this.repository.count(),
      this.repository.count({ where: { status: OrderStatus.PENDING } }),
      this.repository.count({ where: { status: OrderStatus.CONFIRMED } }),
      this.repository.count({ where: { status: OrderStatus.FAILED } }),
    ]);

    return { total, pending, confirmed, failed };
  }
}