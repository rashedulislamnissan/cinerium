const fmt = new Intl.NumberFormat('en-BD', { maximumFractionDigits: 0 });

/** ৳1,250 */
export const taka = (n: number) => `৳${fmt.format(Math.round(n))}`;

export const CONVENIENCE_FEE = 20; // per ticket, demo
