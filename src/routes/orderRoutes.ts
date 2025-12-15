import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { OrderService } from '../services/OrderService';
import { orderQueue, getQueueMetrics } from '../config/queue';
import { wsManager } from '../services/websocket/WebSocketManager';
import { OrderType } from '../types/order.types';

// Schema for creating orders (used in both POST and WS)
const createOrderSchema = z.object({
  tokenIn: z.string().min(1, 'tokenIn is required'),
  tokenOut: z.string().min(1, 'tokenOut is required'),
  amountIn: z.number().positive('amountIn must be positive'),
  orderType: z.nativeEnum(OrderType).default(OrderType.MARKET),
  slippage: z.number().min(0).max(100).default(1.0),
});

// Schema for WebSocket query params (Made optional now)
const wsQuerySchema = z.object({
  orderId: z.string().uuid().optional(),
});

export async function orderRoutes(fastify: FastifyInstance) {
  const orderService = new OrderService();

  /**
   * POST /api/orders/execute
   * Requirement: HTTP POST to create order
   */
  fastify.post('/api/orders/execute', async (request, reply) => {
    try {
      const validatedData = createOrderSchema.parse(request.body);
      const orderId = await orderService.createOrder(validatedData);

      await orderQueue.add('execute-order', { orderId }, {
        jobId: orderId,
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });

      return reply.status(201).send({
        success: true,
        orderId,
        message: 'Order queued',
        wsUrl: `/api/orders/execute?orderId=${orderId}`
      });
    } catch (error: any) {
      return reply.status(400).send({ success: false, error: error.message });
    }
  });

  /**
   * WebSocket Endpoint: /api/orders/execute
   */
  fastify.get(
    '/api/orders/execute',
    { websocket: true },
    async (socket: any, request: FastifyRequest) => {
      try {
        const query = request.query as any;
        
        // Check if orderId is in URL 
        if (query && query.orderId) {
            console.log(`[WS] Client connected to stream Order: ${query.orderId}`);
            
            // Register immediately
            wsManager.registerConnection(query.orderId, { socket });

            // Send current status if available
            const currentOrder = await orderService.getOrder(query.orderId);
            if (currentOrder) {
                socket.send(JSON.stringify({
                    type: 'ORDER_UPDATE',
                    status: currentOrder.status,
                    data: currentOrder
                }));
            }
        } 
        // No orderId 
        else {
            console.log('[WS] Client connected without ID. Waiting for order data...');
            
            socket.on('message', async (message: Buffer) => {
                try {
                    const data = JSON.parse(message.toString());
                    console.log('[WS] Received creation payload:', data);

                    // Validate
                    const validatedData = createOrderSchema.parse(data);
                    
                    //  Create
                    const orderId = await orderService.createOrder(validatedData);

                    // Register WS
                    wsManager.registerConnection(orderId, { socket });

                    // Queue
                    await orderQueue.add('execute-order', { orderId }, {
                        jobId: orderId,
                        removeOnComplete: true,
                        removeOnFail: false
                    });

                    //  Confirm to client
                    socket.send(JSON.stringify({ 
                        type: 'ORDER_CREATED', 
                        orderId, 
                        status: 'pending' 
                    }));

                } catch (error: any) {
                    console.error('[WS] Creation error:', error);
                    socket.send(JSON.stringify({ 
                        error: error.message || 'Invalid format' 
                    }));
                }
            });
        }

        // Common Cleanup
        socket.on('close', () => {
        });

      } catch (error: any) {
        console.error('WebSocket error:', error);
        socket.close();
      }
    }
  );



  fastify.get<{ Params: { orderId: string } }>(
    '/api/orders/:orderId',
    async (request, reply) => {
      const { orderId } = request.params;
      const order = await orderService.getOrder(orderId);
      if (!order) return reply.status(404).send({ error: 'Order not found' });
      return reply.send({ success: true, order });
    }
  );

  fastify.get<{ Querystring: { limit?: number; offset?: number } }>(
    '/api/orders',
    async (request, reply) => {
      const { limit = 50, offset = 0 } = request.query;
      const orders = await orderService.getAllOrders(Number(limit), Number(offset));
      return reply.send({ success: true, count: orders.length, orders });
    }
  );

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