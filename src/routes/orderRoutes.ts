import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OrderService } from '../services/OrderService';
import { orderQueue, getQueueMetrics } from '../config/queue';
import { wsManager } from '../services/websocket/WebSocketManager';
import { OrderType } from '../types/order.types';

// Request validation schema
const createOrderSchema = z.object({
  tokenIn: z.string().min(1, 'tokenIn is required'),
  tokenOut: z.string().min(1, 'tokenOut is required'),
  amountIn: z.number().positive('amountIn must be positive'),
  orderType: z.nativeEnum(OrderType).default(OrderType.MARKET),
  slippage: z.number().min(0).max(100).default(1.0),
});

/**
 * Register order-related routes
 */
export async function orderRoutes(fastify: FastifyInstance) {
  const orderService = new OrderService();

  /**
   * GET /api/orders/execute (WebSocket endpoint)
   * Accepts WebSocket connection and processes order data sent via WebSocket
   */
  fastify.get(
    '/api/orders/execute',
    { websocket: true },
    (socket: any, request: FastifyRequest) => {
      console.log('New WebSocket connection established');

      // Listen for messages from client
      socket.on('message', async (message: Buffer) => {
        try {
          // Parse order data from WebSocket message
          const data = JSON.parse(message.toString());
          console.log('Received order data:', data);

          // Validate order data
          const validatedData = createOrderSchema.parse(data);

          // Create order
          const orderId = await orderService.createOrder(validatedData);

          // Register this WebSocket connection for this specific order
          // Wrap socket in connection object format expected by wsManager
          wsManager.registerConnection(orderId, { socket });

          // Add order to processing queue
          await orderQueue.add(
            'execute-order',
            { orderId },
            {
              jobId: orderId,
              removeOnComplete: true,
              removeOnFail: false,
            }
          );

          console.log(`Order ${orderId} added to queue`);
        } catch (error: any) {
          console.error('Error processing order:', error);

          // Send error message back to client
          try {
            socket.send(
              JSON.stringify({
                error: error.message || 'Failed to process order',
                timestamp: new Date(),
              })
            );
          } catch (wsError) {
            console.error('Failed to send error via WebSocket:', wsError);
          }

          // Close connection on error
          socket.close();
        }
      });

      // Handle connection close
      socket.on('close', () => {
        console.log('WebSocket connection closed');
      });

      // Handle errors
      socket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
      });
    }
  );

  /**
   * GET /api/orders/:orderId
   * Get order details by ID
   */
  fastify.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId',
    async (request, reply) => {
      const { orderId } = request.params;

      const order = await orderService.getOrder(orderId);

      if (!order) {
        return reply.status(404).send({
          error: 'Order not found',
          orderId,
        });
      }

      return reply.send({
        success: true,
        order,
      });
    }
  );

  /**
   * GET /api/orders
   * Get all orders with pagination
   */
  fastify.get<{ Querystring: { limit?: number; offset?: number } }>(
    '/api/orders',
    async (request, reply) => {
      const { limit = 50, offset = 0 } = request.query;

      const orders = await orderService.getAllOrders(Number(limit), Number(offset));

      return reply.send({
        success: true,
        count: orders.length,
        orders,
      });
    }
  );

  /**
   * GET /api/stats
   * Get order and queue statistics
   */
  fastify.get('/api/stats', async (request, reply) => {
    const [orderStats, queueMetrics] = await Promise.all([
      orderService.getStatistics(),
      getQueueMetrics(),
    ]);

    return reply.send({
      success: true,
      orders: orderStats,
      queue: queueMetrics,
      websockets: {
        activeConnections: wsManager.getConnectionCount(),
      },
    });
  });
}