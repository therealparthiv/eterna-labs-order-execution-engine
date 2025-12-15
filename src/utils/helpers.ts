import { v4 as uuidv4 } from 'uuid';

/**
 * Generate a mock Solana transaction hash
 */
export function generateMockTxHash(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let hash = '';
  for (let i = 0; i < 88; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Generate a unique order ID
 */
export function generateOrderId(): string {
  return uuidv4();
}

/**
 * Calculate output amount based on input and price
 */
export function calculateOutputAmount(
  amountIn: number,
  price: number,
  fee: number
): number {
  const feeAmount = amountIn * fee;
  const amountAfterFee = amountIn - feeAmount;
  return amountAfterFee * price;
}

/**
 * Format number to fixed decimal places
 */
export function formatNumber(num: number, decimals: number = 8): number {
  return Number(num.toFixed(decimals));
}

/**
 * Generate a random price with variance
 */
export function generatePriceWithVariance(
  basePrice: number,
  minVariance: number,
  maxVariance: number
): number {
  const variance = minVariance + Math.random() * (maxVariance - minVariance);
  return basePrice * variance;
}