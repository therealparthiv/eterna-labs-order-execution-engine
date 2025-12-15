import { MockDexRouter } from './MockDexRouter';

/**
 * Test script to verify DEX router functionality
 * Run with: tsx src/services/dex/test-router.ts
 */
async function testDexRouter() {
  console.log('Testing Mock DEX Router\n');
  console.log('='.repeat(60));

  const router = new MockDexRouter();

  try {
    // Test Case 1: SOL to USDC swap
    console.log('\nTest Case 1: SOL -> USDC');
    console.log('-'.repeat(60));
    const bestQuote = await router.getBestQuote('SOL', 'USDC', 10);
    
    console.log('Selected DEX:', bestQuote.dex);
    console.log('Price:', bestQuote.price);
    console.log('Fee:', bestQuote.fee);
    console.log('Estimated Output:', bestQuote.estimatedOutput);

    // Test Case 2: Execute swap
    console.log('\nTest Case 2: Execute Swap');
    console.log('-'.repeat(60));
    const executionResult = await router.executeSwap(
      bestQuote.dex,
      'SOL',
      'USDC',
      10,
      bestQuote.price,
      1.0 // 1% slippage
    );

    console.log('Transaction Hash:', executionResult.txHash);
    console.log('Executed Price:', executionResult.executedPrice);
    console.log('Amount Out:', executionResult.amountOut);
    console.log('DEX Used:', executionResult.dex);

    console.log('\nAll tests passed!');
  } catch (error) {
    console.error('\nTest failed:', error);
    process.exit(1);
  }
}

testDexRouter();