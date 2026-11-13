/**
 * Bangladeshi payment options, shown by name only (no official logos).
 * None of them is connected: choosing any method opens the demo notice.
 */
export type PaymentMethod = {
  id: string;
  name: string;
  group: 'mfs' | 'card' | 'bank';
  hint: string;
  /** Muted tint so each option is recognisable without using brand artwork. */
  tint: string;
  monogram: string;
};

export const PAYMENT_GROUPS: { id: PaymentMethod['group']; title: string; blurb: string }[] = [
  { id: 'mfs', title: 'Mobile wallet', blurb: 'Pay from your phone wallet with a PIN and OTP.' },
  { id: 'card', title: 'Debit or credit card', blurb: 'Local and international cards.' },
  { id: 'bank', title: 'Internet banking & gateways', blurb: 'Pay from your bank account.' },
];

export const PAYMENT_METHODS: PaymentMethod[] = [
  { id: 'bkash', name: 'bKash', group: 'mfs', hint: 'Wallet number + PIN', tint: '#b8496f', monogram: 'bK' },
  { id: 'nagad', name: 'Nagad', group: 'mfs', hint: 'Wallet number + PIN', tint: '#c7783d', monogram: 'N' },
  { id: 'rocket', name: 'Rocket', group: 'mfs', hint: 'DBBL mobile banking', tint: '#7d4a8e', monogram: 'R' },
  { id: 'upay', name: 'Upay', group: 'mfs', hint: 'UCB wallet', tint: '#b59a3e', monogram: 'U' },
  { id: 'visa', name: 'Visa', group: 'card', hint: 'Debit & credit', tint: '#4a5f99', monogram: 'V' },
  { id: 'mastercard', name: 'Mastercard', group: 'card', hint: 'Debit & credit', tint: '#b0623e', monogram: 'MC' },
  { id: 'amex', name: 'American Express', group: 'card', hint: 'Credit', tint: '#3e7a96', monogram: 'AX' },
  { id: 'nexus', name: 'DBBL Nexus', group: 'card', hint: 'Local debit card', tint: '#3f7a5c', monogram: 'Nx' },
  { id: 'sslcommerz', name: 'SSLCommerz', group: 'bank', hint: 'All banks via gateway', tint: '#3f6c8e', monogram: 'SSL' },
  { id: 'citytouch', name: 'City Touch', group: 'bank', hint: 'City Bank internet banking', tint: '#8e3f4f', monogram: 'CT' },
  { id: 'astha', name: 'BRAC Bank Astha', group: 'bank', hint: 'BRAC Bank app', tint: '#3f5e8e', monogram: 'A' },
];
