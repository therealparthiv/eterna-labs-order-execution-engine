import { describe, it, expect, beforeEach } from 'vitest';
import { MockDexRouter } from '../src/services/dex/MockDexRouter';
import { DexType } from '../src/types/order.types';

describe('MockDexRouter', () => {
  let router: MockDexRouter;

  beforeEach(() => {
    router = new MockDexRouter();
  });

  describe('getRaydiumQuote', () => {
    it('should return a valid quote with correct structure', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 10);

      expect(quote).toHaveProperty('dex');
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('fee');
      expect(quote).toHaveProperty('estimatedOutput');
      expect(quote.dex).toBe(DexType.RAYDIUM);
    });

    it('should have Raydium fee of 0.3%', async () => {
      const quote = await router.getRaydiumQuote('SOL', 'USDC', 10);
      expect(quote.fee).toBe(0.003);
    });

    it('should return different prices on multiple calls', async () => {
      const quote1 = await router.getRaydiumQuote('SOL', 'USDC', 10);
      const quote2 = await router.getRaydiumQuote('SOL', 'USDC', 10);

      // Prices should vary due to randomness
      expect(quote1.price).not.toBe(quote2.price);
    });

    it('should calculate output amount correctly', async () => {
      const amountIn = 100;
      const quote = await router.getRaydiumQuote('SOL', 'USDC', amountIn);

      // Output should be less than input * price due to fees
      expect(quote.estimatedOutput).toBeLessThan(amountIn * quote.price);
      expect(quote.estimatedOutput).toBeGreaterThan(0);
    });
  });

  describe('getMeteorQuote', () => {
    it('should return a valid quote with correct structure', async () => {
      const quote = await router.getMeteorQuote('SOL', 'USDC', 10);

      expect(quote).toHaveProperty('dex');
      expect(quote).toHaveProperty('price');
      expect(quote).toHaveProperty('fee');
      expect(quote).toHaveProperty('estimatedOutput');
      expect(quote.dex).toBe(DexType.METEORA);
    });

    it('should have Meteora fee of 0.2%', async () => {
      const quote = await router.getMeteorQuote('SOL', 'USDC', 10);
      expect(quote.fee).toBe(0.002);
    });

    it('should return lower fee than Raydium', async () => {
      const raydiumQuote = await router.getRaydiumQuote('SOL', 'USDC', 10);
      const meteoraQuote = await router.getMeteorQuote('SOL', 'USDC', 10);

      expect(meteoraQuote.fee).toBeLessThan(raydiumQuote.fee);
    });
  });

  describe('getBestQuote', () => {
    it('should return the quote with higher estimated output', async () => {
      const bestQuote = await router.getBestQuote('SOL', 'USDC', 10);

      expect(bestQuote).toHaveProperty('dex');
      expect(bestQuote).toHaveProperty('estimatedOutput');
      expect([DexType.RAYDIUM, DexType.METEORA]).toContain(bestQuote.dex);
    });

    it('should compare both DEXs and select one', async () => {
      const bestQuote = await router.getBestQuote('SOL', 'USDC', 100);

      expect(bestQuote.estimatedOutput).toBeGreaterThan(0);
      expect(bestQuote.price).toBeGreaterThan(0);
    });

    it('should handle different token pairs', async () => {
      const quote1 = await router.getBestQuote('SOL', 'USDC', 10);
      const quote2 = await router.getBestQuote('USDC', 'USDT', 100);

      expect(quote1).toBeDefined();
      expect(quote2).toBeDefined();
    });
  });

  describe('executeSwap', () => {
    it('should execute swap and return transaction details', async () => {
      const result = await router.executeSwap(
        DexType.RAYDIUM,
        'SOL',
        'USDC',
        10,
        100,
        1.0
      );

      expect(result).toHaveProperty('txHash');
      expect(result).toHaveProperty('executedPrice');
      expect(result).toHaveProperty('amountOut');
      expect(result).toHaveProperty('dex');
      expect(result.dex).toBe(DexType.RAYDIUM);
    });

    it('should return valid transaction hash', async () => {
      const result = await router.executeSwap(
        DexType.METEORA,
        'SOL',
        'USDC',
        10,
        100,
        1.0
      );

      expect(result.txHash).toBeDefined();
      expect(result.txHash.length).toBeGreaterThan(50);
    });

    it('should respect slippage tolerance', async () => {
      const expectedPrice = 100;
      const slippage = 1.0; // 1%

      const result = await router.executeSwap(
        DexType.RAYDIUM,
        'SOL',
        'USDC',
        10,
        expectedPrice,
        slippage
      );

      // Executed price should be within slippage tolerance
      const maxPrice = expectedPrice * (1 + slippage / 100);
      expect(result.executedPrice).toBeLessThanOrEqual(maxPrice);
    });

    it('should take realistic time to execute (2-3 seconds)', async () => {
      const startTime = Date.now();

      await router.executeSwap(
        DexType.RAYDIUM,
        'SOL',
        'USDC',
        10,
        100,
        1.0
      );

      const duration = Date.now() - startTime;
      expect(duration).toBeGreaterThanOrEqual(2000);
      expect(duration).toBeLessThanOrEqual(3500);
    }, 5000); // Increase timeout for this test
  });
});