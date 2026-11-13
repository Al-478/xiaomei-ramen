import { BALANCE } from '../config/gameBalance';
import { INGREDIENTS, type PotSnapshot } from './Pot';

export interface Judgment { price: number; label: string; burnt: boolean }
export function judge(pot: PotSnapshot): Judgment | null {
  if (pot.state === 'BURNT') return { price: 0, label: '烧焦了', burnt: true };
  if (pot.state !== 'READY' && pot.state !== 'OVERCOOKED') return null;
  const missing = INGREDIENTS.filter(ingredient => pot.ingredients[ingredient].count === 0).length;
  const early = Number(pot.ingredients.egg.early) + Number(pot.ingredients.scallion.early);
  const duplicate = INGREDIENTS.filter(ingredient => ingredient !== 'seasoning')
    .reduce((sum, ingredient) => sum + Math.max(0, pot.ingredients[ingredient].count - 1), 0);
  const overcooked = pot.state === 'OVERCOOKED';
  let price = Math.max(BALANCE.minCookedPrice, BALANCE.standardBowlPrice - missing * BALANCE.missingPenalty -
    early * BALANCE.earlyPenalty - duplicate * BALANCE.duplicatePenalty - (overcooked ? BALANCE.overcookPenalty : 0));
  if (pot.ingredients.seasoning.count > 1) price = Math.min(price, BALANCE.repeatedSeasoningPrice);
  const label = pot.ingredients.seasoning.count > 1 ? '调料放多了' : missing ? '配料不齐' :
    overcooked ? '煮得太久了' : early ? '葱蛋放早了' : duplicate ? '配料放多了' : '火候正好，真好吃';
  return { price, label, burnt: false };
}
