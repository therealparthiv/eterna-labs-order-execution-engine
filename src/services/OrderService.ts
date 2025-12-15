import { OrderRepository } from './OrderRepository';
import { MockDexRouter } from './dex/MockDexRouter';
import { wsManager } from './websocket/WebSocketManager';
import { OrderStatus, CreateOrderRequest, OrderStatusUpdate } from '../types/order.types';
import { generateOrderId } from '../utils/helpers';
import { Order } from '../models/Order';

/**
 * Service to handle order execution logic
 */
export class OrderService {
  private orderRepository: OrderRepository;
  private dexRouter: MockDexRouter;

  constructor() {
    this.orderRepository = new OrderRepository();
    this.dexRouter = new MockDexRouter();
  }

  /**
   * Create a new order and return order ID
   */
  async createOrder(request: CreateOrderRequest): Promise<string> {
    const orderId = generateOrderId();

    // Create order in database
    const order = await this.orderRepository.create({
      id: orderId,
      orderType: request.orderType,
      status: OrderStatus.PENDING,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      slippage: request.slippage || 1.0,
      retryCount: 0,
    });

    console.log(`\n Order created: ${orderId}`);
    console.log(`   Type: ${order.orderType}`);
    console.log(`   Pair: ${order.tokenIn} -> ${order.tokenOut}`);
    console.log(`   Amount: ${order.amountIn}`);

    return orderId;
  }

  /**
   * Execute order - This is the main order processing logic
   * Called by the queue worker
   */
  async executeOrder(orderId: string): Promise<void> {
    console.log(`\nStarting execution for order: ${orderId}`);

    try {
      // Fetch order from database
      const order = await this.orderRepository.findById(orderId);
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Step 1: PENDING -> ROUTING
      await this.updateOrderStatus(order, OrderStatus.ROUTING, {
        message: 'Fetching quotes from DEXs...',
      });

      // Step 2: Get best quote from DEXs
      const bestQuote = await this.dexRouter.getBestQuote(
        order.tokenIn,
        order.tokenOut,
        order.amountIn
      );

      // Step 3: ROUTING -> BUILDING
      await this.updateOrderStatus(order, OrderStatus.BUILDING, {
        message: `Building transaction on ${bestQuote.dex}...`,
        selectedDex: bestQuote.dex,
      });

      // Step 4: BUILDING -> SUBMITTED
      await this.updateOrderStatus(order, OrderStatus.SUBMITTED, {
        message: 'Transaction submitted to network...',
      });

      // Step 5: Execute swap on selected DEX
      const executionResult = await this.dexRouter.executeSwap(
        bestQuote.dex,
        order.tokenIn,
        order.tokenOut,
        order.amountIn,
        bestQuote.price,
        order.slippage
      );

      // Step 6: SUBMITTED -> CONFIRMED
      await this.orderRepository.updateExecutionResult(orderId, {
        selectedDex: executionResult.dex,
        executedPrice: executionResult.executedPrice,
        amountOut: executionResult.amountOut,
        txHash: executionResult.txHash,
      });

      await this.sendStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.CONFIRMED,
        timestamp: new Date(),
        message: 'Order executed successfully!',
        txHash: executionResult.txHash,
        executedPrice: executionResult.executedPrice,
        selectedDex: executionResult.dex,
      });

      console.log(`Order ${orderId} completed successfully`);
    } catch (error: any) {
      console.error(`Order ${orderId} failed:`, error.message);

      // Mark order as failed
      await this.orderRepository.markAsFailed(orderId, error.message);

      await this.sendStatusUpdate(orderId, {
        orderId,
        status: OrderStatus.FAILED,
        timestamp: new Date(),
        message: 'Order execution failed',
        error: error.message,
      });

      throw error; // Re-throw for queue retry logic
    }
  }

  /**
   * Update order status in database and send WebSocket update
   */
  private async updateOrderStatus(
    order: Order,
    status: OrderStatus,
    additionalInfo: Partial<OrderStatusUpdate>
  ): Promise<void> {
    // Update database
    const updateData: any = { status };
    if (additionalInfo.selectedDex) {
      updateData.selectedDex = additionalInfo.selectedDex;
    }

    await this.orderRepository.updateStatus(order.id, status, updateData);

    // Send WebSocket update
    await this.sendStatusUpdate(order.id, {
      orderId: order.id,
      status,
      timestamp: new Date(),
      ...additionalInfo,
    });
  }

  /**
   * Send status update via WebSocket
   */
  private async sendStatusUpdate(
    orderId: string,
    update: OrderStatusUpdate
  ): Promise<void> {
    wsManager.sendUpdate(orderId, update);
  }

  /**
   * Get order by ID
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return await this.orderRepository.findById(orderId);
  }

  /**
   * Get all orders
   */
  async getAllOrders(limit?: number, offset?: number): Promise<Order[]> {
    return await this.orderRepository.findAll(limit, offset);
  }

  /**
   * Get order statistics
   */
  async getStatistics() {
    return await this.orderRepository.getStatistics();
  }
}