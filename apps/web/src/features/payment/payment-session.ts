const PAYMENT_UNLOCKED = 'bm_payment_unlocked';

export function markPaymentUnlocked() {
  sessionStorage.setItem(PAYMENT_UNLOCKED, '1');
}

export function hasPaymentUnlocked() {
  return sessionStorage.getItem(PAYMENT_UNLOCKED) === '1';
}

export function clearPaymentUnlocked() {
  sessionStorage.removeItem(PAYMENT_UNLOCKED);
}
