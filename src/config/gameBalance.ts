export const BALANCE = {
  targetAmount: 100000, standardBowlPrice: 10000, reservePots: 3,
  maxIngredientCount: 3, maxWaterCount: 3, reheatLossSeconds: 1,
  earlyPenalty: 2000, missingPenalty: 4000, overcookPenalty: 2000,
  duplicatePenalty: 1000, repeatedSeasoningPrice: 5000, minCookedPrice: 5000,
} as const;
