import { describe, expect, it } from 'vitest';
import { buildRoutePoints } from './services';
import type { Checkpoint } from './types';

const checkpoints: Checkpoint[] = [
  { id: '1', number: '1', geo: { lat: 54, lon: 18 }, kind: 'checkpoint' },
  { id: '2', number: '2', geo: { lat: 54.1, lon: 18.1 }, kind: 'checkpoint' }
];

describe('punkty końcowe trasy', () => {
  it('pozwala użyć bazy tylko jako końca', () => {
    const order = buildRoutePoints({ lat: 54.2, lon: 18.2 }, checkpoints, undefined, undefined, {
      includeBaseStart: false, includeBaseEnd: true
    });
    expect(order[0].kind).toBe('checkpoint');
    expect(order.at(-1)?.kind).toBe('base');
  });

  it('pozwala zaplanować trasę bez bazy', () => {
    const order = buildRoutePoints(undefined, checkpoints, undefined, undefined, {
      includeBaseStart: false, includeBaseEnd: false
    });
    expect(order).toHaveLength(2);
    expect(order.every(point => point.kind === 'checkpoint')).toBe(true);
  });
});
