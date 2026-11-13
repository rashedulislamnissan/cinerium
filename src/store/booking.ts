import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Seat } from '../lib/seats';

export const MAX_SEATS = 8;
export const HOLD_MINUTES = 8;

export type Booking = {
  ref: string;
  showId: string;
  seatIds: string[];
  subtotal: number;
  fees: number;
  total: number;
  method: string;
  name: string;
  email: string;
  phone: string;
  createdAt: number;
};

type State = {
  showId: string | null;
  selected: string[];
  holdUntil: number | null;
  bookings: Booking[];
  notice: string | null;

  setShow: (showId: string) => void;
  toggleSeat: (seat: Seat, byId: Map<string, Seat>) => void;
  clearSelection: () => void;
  removeSeats: (ids: string[]) => void;
  startHold: () => void;
  releaseHold: () => void;
  addBooking: (b: Booking) => void;
  setNotice: (n: string | null) => void;
};

export const useBooking = create<State>()(
  persist(
    (set, get) => ({
      showId: null,
      selected: [],
      holdUntil: null,
      bookings: [],
      notice: null,

      setShow: (showId) => {
        if (get().showId !== showId) set({ showId, selected: [], holdUntil: null });
      },

      toggleSeat: (seat, byId) => {
        const { selected } = get();
        const group = seat.pairId ? [seat.id, seat.pairId] : [seat.id];
        const isOn = selected.includes(seat.id);
        if (isOn) {
          set({ selected: selected.filter((id) => !group.includes(id)), notice: null });
          return;
        }
        if (selected.length + group.length > MAX_SEATS) {
          set({ notice: `You can book up to ${MAX_SEATS} seats at a time.` });
          return;
        }
        const partner = seat.pairId ? byId.get(seat.pairId) : undefined;
        set({
          selected: [...selected, ...group],
          notice: partner ? `Loveseats are booked in pairs — ${seat.label} and ${partner.label} are both selected.` : null,
        });
      },

      clearSelection: () => set({ selected: [], holdUntil: null, notice: null }),
      removeSeats: (ids) => set({ selected: get().selected.filter((s) => !ids.includes(s)) }),

      startHold: () => {
        const { holdUntil } = get();
        if (!holdUntil || holdUntil < Date.now()) set({ holdUntil: Date.now() + HOLD_MINUTES * 60_000 });
      },
      releaseHold: () => set({ holdUntil: null }),

      addBooking: (b) => set({ bookings: [b, ...get().bookings], selected: [], holdUntil: null, showId: null }),
      setNotice: (notice) => set({ notice }),
    }),
    {
      name: 'cinerium-booking',
      version: 1,
      storage: createJSONStorage(() => {
        try {
          const k = '__cinerium_probe__';
          localStorage.setItem(k, '1');
          localStorage.removeItem(k);
          return localStorage;
        } catch {
          // private mode / blocked storage — fall back to memory so the app still works
          const mem = new Map<string, string>();
          return {
            getItem: (k: string) => mem.get(k) ?? null,
            setItem: (k: string, v: string) => void mem.set(k, v),
            removeItem: (k: string) => void mem.delete(k),
          };
        }
      }),
      partialize: (s) => ({ showId: s.showId, selected: s.selected, holdUntil: s.holdUntil, bookings: s.bookings }),
    },
  ),
);

/** Booking reference — CIN- + 6 Crockford base32 chars. */
export function newBookingRef(existing: Booking[]) {
  const alphabet = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  for (;;) {
    const bytes = crypto.getRandomValues(new Uint8Array(6));
    const ref = 'CIN-' + Array.from(bytes, (b) => alphabet[b % 32]).join('');
    if (!existing.some((e) => e.ref === ref)) return ref;
  }
}
