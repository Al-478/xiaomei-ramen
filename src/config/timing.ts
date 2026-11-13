// 局长依据视频约93秒；底层阈值未由视频精确确认，作为集中校准参数。
export const TIMING = {
  roundSeconds: 93, boilSeconds: 2.4, readySeconds: 3.4,
  overcookSeconds: 5.6, burntSeconds: 8.2, drySeconds: 13,
  serveSeconds: 0.65, feedbackSeconds: 2.2,
  pourLiftSeconds:.18,pourFlowSeconds:.72,pourReturnSeconds:.25,
  eggDropSeconds:.65,eggSetSeconds:1.1,noodleSoftenSeconds:1.4,ingredientDropSeconds:.48,
} as const;
