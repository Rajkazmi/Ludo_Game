import { httpsCallable } from '@firebase/functions';
import { functions } from '../config/firebase';

export const PLAY_STORE_PACKAGES = [
  { productId: 'gapes_099', gapes: 1000 },
  { productId: 'gapes_499', gapes: 10000 },
];

const economyCommand = httpsCallable(functions, 'economyCommand');

async function callEconomyCommand(command, values = {}) {
  const result = await economyCommand({ command, ...values });
  return result.data;
}

export async function getEconomy() {
  return callEconomyCommand('getEconomy');
}

export async function claimDailyReward() {
  return callEconomyCommand('claimDailyReward');
}

export async function redeemEconomyItem(itemId) {
  return callEconomyCommand('redeemItem', { item_id: itemId });
}

export async function chargeMatchFee(gameModeId) {
  return callEconomyCommand('chargeMatchFee', {
    game_mode_id: gameModeId,
  });
}

export async function confirmPlayPurchase(productId, purchaseToken) {
  return callEconomyCommand('purchasePackage', {
    product_id: productId,
    purchase_token: purchaseToken,
  });
}
