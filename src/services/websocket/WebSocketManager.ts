import { WebSocket } from 'ws';
import { OrderStatusUpdate } from '../../types/order.types';

interface WebSocketConnection {
  socket: WebSocket;
}

/**
 * Manages WebSocket connections for order status updates
 */
export class WebSocketManager {
  private connections: Map<string, WebSocketConnection>;

  constructor() {
    this.connections = new Map();
  }

  /**
   * Register a new WebSocket connection for an order
   * @param orderId - The order ID
   * @param connection - The Fastify WebSocket connection object (has .socket property)
   */
  registerConnection(orderId: string, connection: any): void {
    console.log(`WebSocket connected for order: ${orderId}`);
    
    // Extract the actual WebSocket from the Fastify connection wrapper
    const socket = connection.socket as WebSocket;
    this.connections.set(orderId, { socket });

    // Handle socket close
    socket.on('close', () => {
      console.log(`WebSocket disconnected for order: ${orderId}`);
      this.connections.delete(orderId);
    });

    // Handle socket errors
    socket.on('error', (error: any) => {
      console.error(`WebSocket error for order ${orderId}:`, error);
      this.connections.delete(orderId);
    });

    // Send initial connection confirmation
    this.sendUpdate(orderId, {
      orderId,
      status: 'pending' as any,
      timestamp: new Date(),
      message: 'Connected. Waiting for order processing...',
    });
  }

  /**
   * REQUIRED FIX: Removes a connection from the map
   * Added to satisfy the 'removeConnection' call in orderRoutes.ts
   */
  removeConnection(orderId: string): void {
    if (this.connections.has(orderId)) {
      this.connections.delete(orderId);
      // Console log optional, keeping it silent to match your style if preferred
    }
  }

  /**
   * Send status update to a specific order's WebSocket
   */
  sendUpdate(orderId: string, update: OrderStatusUpdate): void {
    const connection = this.connections.get(orderId);
    
    if (!connection || connection.socket.readyState !== WebSocket.OPEN) {
      console.warn(`No active WebSocket for order: ${orderId}`);
      return;
    }

    try {
      const message = JSON.stringify(update);
      connection.socket.send(message);
      console.log(`Sent update to ${orderId}:`, update.status);
    } catch (error) {
      console.error(`Error sending WebSocket update for ${orderId}:`, error);
      this.connections.delete(orderId);
    }
  }

  /**
   * COMPATIBILITY FIX: Alias for sendUpdate
   * Allows the Queue Worker to call notifyOrderUpdate without breaking your existing naming
   */
  notifyOrderUpdate(orderId: string, status: string, data?: any): void {
    this.sendUpdate(orderId, {
        orderId,
        status: status as any, // Type casting to fit your OrderStatusUpdate type
        timestamp: new Date(),
        ...data
    });
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(message: any): void {
    const messageStr = JSON.stringify(message);
    
    this.connections.forEach((connection, orderId) => {
      try {
        if (connection.socket.readyState === WebSocket.OPEN) {
          connection.socket.send(messageStr);
        }
      } catch (error) {
        console.error(`Error broadcasting to ${orderId}:`, error);
        this.connections.delete(orderId);
      }
    });
  }

  /**
   * Close connection for a specific order
   */
  closeConnection(orderId: string): void {
    const connection = this.connections.get(orderId);
    if (connection) {
      connection.socket.close();
      this.connections.delete(orderId);
      console.log(`Closed WebSocket for order: ${orderId}`);
    }
  }

  /**
   * Get number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check if order has active connection
   */
  hasConnection(orderId: string): boolean {
    const connection = this.connections.get(orderId);
    return connection !== undefined && connection.socket.readyState === WebSocket.OPEN;
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.forEach((connection, orderId) => {
      try {
        connection.socket.close();
      } catch (error) {
        console.error(`Error closing socket for ${orderId}:`, error);
      }
    });
    this.connections.clear();
    console.log('All WebSocket connections closed');
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();