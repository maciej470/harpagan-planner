import { describe, expect, it } from 'vitest';
import { alternativeOrders } from './variants';
import type { Checkpoint } from './types';

const points: Checkpoint[] = [0, 1, 2, 3, 4].map(number => ({
  id: String(number), number: String(number), geo: { lat: 54, lon: 18 + number * 0.01 }, kind: 'checkpoint'
}));

describe('warianty trasy', () => {
  it('tworzy dwa różne warianty i zachowuje wybrane końce', () => {
    const variants = alternativeOrders(points, true, true, 2);
    expect(variants).toHaveLength(2);
    expect(new Set(variants.map(order => order.map(point => point.id).join('|'))).size).toBe(2);
    expect(variants.every(order => order[0].id === '0' && order.at(-1)?.id === '4')).toBe(true);
  });
});
