import { DexType, DexQuote, ExecutionResult } from '../../types/order.types';
import {
  sleep,
  generateMockTxHash,
  calculateOutputAmount,
  formatNumber,
  generatePriceWithVariance,
} from '../../utils/helpers';

/**
 * Mock DEX Router - Simulates Raydium and Meteora DEX interactions
 * This implementation focuses on architecture and flow without real blockchain calls
 */
export class MockDexRouter {
  private basePrice: number = 1.0; // Base exchange rate

  /**
   * Get quote from Raydium DEX
   * Simulates network delay and returns mock price with variance
   */
  async getRaydiumQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    console.log(`[Raydium] Fetching quote for ${amountIn} ${tokenIn} -> ${tokenOut}`);
    
    // Simulate network delay (200ms)
    await sleep(200);

    // Calculate base price for this token pair
    const pairBasePrice = this.calculateBasePriceForPair(tokenIn, tokenOut);

    // Raydium: price variance between 0.98 and 1.02 (±2%)
    const price = generatePriceWithVariance(pairBasePrice, 0.98, 1.02);
    
    const fee = 0.003; // 0.3% fee
    const estimatedOutput = calculateOutputAmount(amountIn, price, fee);

    console.log(`[Raydium] Quote: Price=${formatNumber(price, 6)}, Fee=${fee}, Output=${formatNumber(estimatedOutput)}`);

    return {
      dex: DexType.RAYDIUM,
      price: formatNumber(price, 6),
      fee,
      estimatedOutput: formatNumber(estimatedOutput),
    };
  }

  /**
   * Get quote from Meteora DEX
   * Simulates network delay and returns mock price with variance
   */
  async getMeteorQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    console.log(`[Meteora] Fetching quote for ${amountIn} ${tokenIn} -> ${tokenOut}`);
    
    // Simulate network delay (200ms)
    await sleep(200);

    // Calculate base price for this token pair
    const pairBasePrice = this.calculateBasePriceForPair(tokenIn, tokenOut);

    // Meteora: price variance between 0.97 and 1.02
    const price = generatePriceWithVariance(pairBasePrice, 0.97, 1.02);
    
    const fee = 0.002; // 0.2% fee (lower than Raydium)
    const estimatedOutput = calculateOutputAmount(amountIn, price, fee);

    console.log(`[Meteora] Quote: Price=${formatNumber(price, 6)}, Fee=${fee}, Output=${formatNumber(estimatedOutput)}`);

    return {
      dex: DexType.METEORA,
      price: formatNumber(price, 6),
      fee,
      estimatedOutput: formatNumber(estimatedOutput),
    };
  }

  /**
   * Compare quotes from both DEXs and select the best one
   * Best = highest estimated output amount
   */
  async getBestQuote(
    tokenIn: string,
    tokenOut: string,
    amountIn: number
  ): Promise<DexQuote> {
    console.log(`\nComparing quotes from Raydium and Meteora...`);

    // Fetch quotes from both DEXs in parallel
    const [raydiumQuote, meteorQuote] = await Promise.all([
      this.getRaydiumQuote(tokenIn, tokenOut, amountIn),
      this.getMeteorQuote(tokenIn, tokenOut, amountIn),
    ]);

    // Select the DEX with better estimated output
    const bestQuote =
      raydiumQuote.estimatedOutput > meteorQuote.estimatedOutput
        ? raydiumQuote
        : meteorQuote;

    const difference = Math.abs(
      raydiumQuote.estimatedOutput - meteorQuote.estimatedOutput
    );
    const percentageDiff = (difference / amountIn) * 100;

    console.log(`   Best DEX: ${bestQuote.dex.toUpperCase()}`);
    console.log(`   Output difference: ${formatNumber(difference)} (${formatNumber(percentageDiff, 2)}%)`);
    console.log(`   Selected output: ${bestQuote.estimatedOutput}\n`);

    return bestQuote;
  }

  /**
   * Execute swap on the selected DEX
   * Simulates transaction execution with realistic delays
   */
  async executeSwap(
    dex: DexType,
    tokenIn: string,
    tokenOut: string,
    amountIn: number,
    expectedPrice: number,
    slippage: number
  ): Promise<ExecutionResult> {
    console.log(`[${dex.toUpperCase()}] Executing swap...`);
    console.log(`   ${amountIn} ${tokenIn} -> ${tokenOut}`);
    console.log(`   Expected price: ${expectedPrice}`);
    console.log(`   Slippage tolerance: ${slippage}%`);

    // HANDLING WRAPPED SOL (New addition)
    if (tokenIn === 'SOL') {
      console.log(`   ℹ️  Wrapping SOL to wSOL before swap...`);
      await sleep(500); // Simulate wrapping time
    }

    // Simulate transaction building and execution (2-3 seconds)
    const executionTime = 2000 + Math.random() * 1000;
    await sleep(executionTime);

    // Calculate final execution price with slight slippage
    const slippageVariance = 1 + (Math.random() * slippage * 0.01 * 0.5); // Up to 50% of slippage
    const executedPrice = formatNumber(expectedPrice * slippageVariance, 6);

    // Calculate actual output
    const fee = dex === DexType.RAYDIUM ? 0.003 : 0.002;
    const amountOut = calculateOutputAmount(amountIn, executedPrice, fee);

    // Generate mock transaction hash
    const txHash = generateMockTxHash();

    console.log(`  Swap executed successfully!`);
    console.log(`   TxHash: ${txHash}`);
    console.log(`   Executed price: ${executedPrice}`);
    console.log(`   Amount out: ${formatNumber(amountOut)}\n`);

    return {
      txHash,
      executedPrice,
      amountOut: formatNumber(amountOut),
      dex,
    };
  }

  /**
   * Calculate base price for a token pair
   * In a real implementation, this would fetch from price oracles
   */
  private calculateBasePriceForPair(tokenIn: string, tokenOut: string): number {
    // Mock base prices for common pairs
    const pairs: Record<string, number> = {
      'SOL-USDC': 100.0,
      'SOL-USDT': 100.5,
      'USDC-USDT': 1.0,
      'BONK-USDC': 0.00001234,
      'RAY-USDC': 2.5,
    };

    const pairKey = `${tokenIn}-${tokenOut}`;
    const reversePairKey = `${tokenOut}-${tokenIn}`;

    if (pairs[pairKey]) {
      return pairs[pairKey];
    } else if (pairs[reversePairKey]) {
      return 1 / pairs[reversePairKey];
    }

    // Default price for unknown pairs
    return this.basePrice;
  }
}