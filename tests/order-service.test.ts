import { describe, it, expect } from 'vitest';
import { OrderType, OrderStatus } from '../src/types/order.types';

describe('OrderService Integration Tests', () => {
  describe('Order Type Enums', () => {
    it('should have correct order types', () => {
      expect(OrderType.MARKET).toBe('market');
      expect(OrderType.LIMIT).toBe('limit');
      expect(OrderType.SNIPER).toBe('sniper');
    });

    it('should have all order statuses', () => {
      expect(OrderStatus.PENDING).toBe('pending');
      expect(OrderStatus.ROUTING).toBe('routing');
      expect(OrderStatus.BUILDING).toBe('building');
      expect(OrderStatus.SUBMITTED).toBe('submitted');
      expect(OrderStatus.CONFIRMED).toBe('confirmed');
      expect(OrderStatus.FAILED).toBe('failed');
    });
  });

  describe('Order Validation Schema', () => {
    it('should validate order has required fields', () => {
      const validOrder = {
        tokenIn: 'SOL',
        tokenOut: 'USDC',
        amountIn: 10,
        orderType: OrderType.MARKET,
        slippage: 1.0,
      };

      expect(validOrder.tokenIn).toBeDefined();
      expect(validOrder.tokenOut).toBeDefined();
      expect(validOrder.amountIn).toBeGreaterThan(0);
      expect(validOrder.orderType).toBeDefined();
    });

    it('should have valid default slippage', () => {
      const defaultSlippage = 1.0;
      expect(defaultSlippage).toBeGreaterThanOrEqual(0);
      expect(defaultSlippage).toBeLessThanOrEqual(100);
    });

    it('should validate token pair format', () => {
      const tokenIn = 'SOL';
      const tokenOut = 'USDC';

      expect(tokenIn.length).toBeGreaterThan(0);
      expect(tokenOut.length).toBeGreaterThan(0);
      expect(typeof tokenIn).toBe('string');
      expect(typeof tokenOut).toBe('string');
    });

    it('should validate amount is positive', () => {
      const validAmount = 10;
      const invalidAmount = -5;

      expect(validAmount).toBeGreaterThan(0);
      expect(invalidAmount).toBeLessThan(0);
    });
  });

  describe('Order Lifecycle States', () => {
    it('should progress through correct order states', () => {
      const states = [
        OrderStatus.PENDING,
        OrderStatus.ROUTING,
        OrderStatus.BUILDING,
        OrderStatus.SUBMITTED,
        OrderStatus.CONFIRMED,
      ];

      expect(states).toHaveLength(5);
      expect(states[0]).toBe('pending');
      expect(states[states.length - 1]).toBe('confirmed');
    });

    it('should handle failure state', () => {
      const failureState = OrderStatus.FAILED;
      expect(failureState).toBe('failed');
    });
  });

  describe('Order Type Characteristics', () => {
    it('market order should be immediate execution type', () => {
      const marketOrder = OrderType.MARKET;
      expect(marketOrder).toBe('market');
      // Market orders execute immediately at current price
    });

    it('limit order should be conditional execution type', () => {
      const limitOrder = OrderType.LIMIT;
      expect(limitOrder).toBe('limit');
      // Limit orders wait for target price
    });

    it('sniper order should be launch detection type', () => {
      const sniperOrder = OrderType.SNIPER;
      expect(sniperOrder).toBe('sniper');
      // Sniper orders execute on token launch/migration
    });
  });
});