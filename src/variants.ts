import { geoDistance } from './math';
import type { Checkpoint } from './types';

const key = (order: Checkpoint[]) => order.map(point => point.id).join('|');
const length = (order: Checkpoint[]) => order.slice(0, -1).reduce(
  (sum, point, index) => sum + geoDistance(point.geo, order[index + 1].geo), 0
);

export function alternativeOrders(order: Checkpoint[], fixedStart: boolean, fixedEnd: boolean, limit = 2) {
  const start = fixedStart ? 1 : 0;
  const end = order.length - (fixedEnd ? 1 : 0);
  const original = key(order);
  const candidates = new Map<string, Checkpoint[]>();
  for (let from = start; from < end; from++) {
    for (let to = from + 1; to < end; to++) {
      const candidate = [...order.slice(0, from), ...order.slice(from, to + 1).reverse(), ...order.slice(to + 1)];
      if (key(candidate) !== original) candidates.set(key(candidate), candidate);
    }
  }
  if (end - start > 2) {
    const middle = order.slice(start, end);
    for (let shift = 1; shift < middle.length; shift++) {
      const rotated = [...middle.slice(shift), ...middle.slice(0, shift)];
      const candidate = [...order.slice(0, start), ...rotated, ...order.slice(end)];
      if (key(candidate) !== original) candidates.set(key(candidate), candidate);
    }
  }
  return [...candidates.values()].sort((a, b) => length(a) - length(b)).slice(0, limit);
}
