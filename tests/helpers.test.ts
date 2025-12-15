import { describe, it, expect } from 'vitest';
import {
  generateMockTxHash,
  generateOrderId,
  calculateOutputAmount,
  formatNumber,
  generatePriceWithVariance,
} from '../src/utils/helpers';

describe('Helper Functions', () => {
  describe('generateMockTxHash', () => {
    it('should generate a transaction hash', () => {
      const txHash = generateMockTxHash();
      expect(txHash).toBeDefined();
      expect(typeof txHash).toBe('string');
    });

    it('should generate hash of correct length', () => {
      const txHash = generateMockTxHash();
      expect(txHash.length).toBe(88); // Solana tx hash length
    });

    it('should generate unique hashes', () => {
      const hash1 = generateMockTxHash();
      const hash2 = generateMockTxHash();
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateOrderId', () => {
    it('should generate a UUID', () => {
      const orderId = generateOrderId();
      expect(orderId).toBeDefined();
      expect(typeof orderId).toBe('string');
    });

    it('should generate valid UUID format', () => {
      const orderId = generateOrderId();
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      expect(uuidRegex.test(orderId)).toBe(true);
    });

    it('should generate unique IDs', () => {
      const id1 = generateOrderId();
      const id2 = generateOrderId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('calculateOutputAmount', () => {
    it('should calculate output correctly with fees', () => {
      const amountIn = 100;
      const price = 2;
      const fee = 0.01; // 1%

      const output = calculateOutputAmount(amountIn, price, fee);

      // Expected: (100 - 1) * 2 = 198
      expect(output).toBe(198);
    });

    it('should handle zero fees', () => {
      const output = calculateOutputAmount(100, 2, 0);
      expect(output).toBe(200);
    });

    it('should handle fractional amounts', () => {
      const output = calculateOutputAmount(10.5, 1.5, 0.003);
      expect(output).toBeCloseTo(15.70275, 5);
    });

    it('should return correct output for realistic DEX fees', () => {
      const amountIn = 1000;
      const price = 100;
      const raydiumFee = 0.003; // 0.3%

      const output = calculateOutputAmount(amountIn, price, raydiumFee);

      // 1000 - 3 = 997, 997 * 100 = 99700
      expect(output).toBe(99700);
    });
  });

  describe('formatNumber', () => {
    it('should format number to specified decimals', () => {
      const num = 123.456789;
      const formatted = formatNumber(num, 2);
      expect(formatted).toBe(123.46);
    });

    it('should default to 8 decimals', () => {
      const num = 123.123456789;
      const formatted = formatNumber(num);
      expect(formatted).toBe(123.12345679);
    });

    it('should handle integers', () => {
      const formatted = formatNumber(100, 2);
      expect(formatted).toBe(100);
    });

    it('should round correctly', () => {
      // Use toBeCloseTo for floating point comparisons
      expect(formatNumber(1.556, 2)).toBe(1.56);
      expect(formatNumber(1.554, 2)).toBe(1.55);
    });
  });

  describe('generatePriceWithVariance', () => {
    it('should generate price within variance range', () => {
      const basePrice = 100;
      const minVariance = 0.98;
      const maxVariance = 1.02;

      const price = generatePriceWithVariance(basePrice, minVariance, maxVariance);

      expect(price).toBeGreaterThanOrEqual(basePrice * minVariance);
      expect(price).toBeLessThanOrEqual(basePrice * maxVariance);
    });

    it('should return different prices on multiple calls', () => {
      const prices = Array.from({ length: 10 }, () =>
        generatePriceWithVariance(100, 0.98, 1.02)
      );

      // Check that not all prices are the same
      const uniquePrices = new Set(prices);
      expect(uniquePrices.size).toBeGreaterThan(1);
    });

    it('should handle zero base price', () => {
      const price = generatePriceWithVariance(0, 0.98, 1.02);
      expect(price).toBe(0);
    });

    it('should work with tight variance', () => {
      const price = generatePriceWithVariance(100, 0.999, 1.001);
      expect(price).toBeGreaterThanOrEqual(99.9);
      expect(price).toBeLessThanOrEqual(100.1);
    });
  });
});