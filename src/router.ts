// Heuristic Smart Liquidity Routing (SLR) Engine.
// Note: This codebase strictly avoids the terms "trader" and "market".

interface LiquidityPool {
  id: string;
  bestBid: number;
  bidSize: number;
  bestAsk: number;
  askSize: number;
  executionFee: number; // fee per unit
}

interface OrderAllocation {
  poolId: string;
  quantity: number;
  expectedPrice: number;
}

class LiquidityRouter {
  // Routes a buy order to multiple pools to minimize the volume-weighted average price
  public routeBuyOrder(
    targetQuantity: number,
    pools: LiquidityPool[]
  ): OrderAllocation[] {
    const allocations: OrderAllocation[] = [];
    let remaining = targetQuantity;

    // Sort pools by total cost (Price + Execution Fee) ascending
    const sortedPools = [...pools].sort(
      (a, b) => (a.bestAsk + a.executionFee) - (b.bestAsk + b.executionFee)
    );

    for (const pool of sortedPools) {
      if (remaining <= 0) break;

      const fillable = Math.min(remaining, pool.askSize);
      if (fillable > 0) {
        allocations.push({
          poolId: pool.id,
          quantity: fillable,
          expectedPrice: pool.bestAsk + pool.executionFee,
        });
        remaining -= fillable;
      }
    }

    // If remaining quantity left, allocate to the cheapest pool as residual slippage
    if (remaining > 0 && sortedPools.length > 0) {
      allocations.push({
        poolId: sortedPools[0].id,
        quantity: remaining,
        expectedPrice: sortedPools[0].bestAsk + sortedPools[0].executionFee + 0.50, // Slippage estimate
      });
    }

    return allocations;
  }
}

// Demo usage
const pools: LiquidityPool[] = [
  { id: "Venue-A", bestBid: 99.80, bidSize: 1000, bestAsk: 100.10, askSize: 200, executionFee: 0.02 },
  { id: "Venue-B", bestBid: 99.85, bidSize: 500,  bestAsk: 100.05, askSize: 100, executionFee: 0.05 },
  { id: "Venue-C", bestBid: 99.75, bidSize: 1500, bestAsk: 100.15, askSize: 400, executionFee: 0.01 },
];

const router = new LiquidityRouter();
const routed = router.routeBuyOrder(350, pools);

console.log("[Router Console] Multi-venue allocation results for 350 Units:");
routed.forEach((allocation) => {
  console.log(` -> Pool: ${allocation.poolId} | Qty: ${allocation.quantity} | Cost/Unit: $${allocation.expectedPrice.toFixed(2)}`);
});
