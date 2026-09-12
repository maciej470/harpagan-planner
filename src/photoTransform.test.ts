import { describe, expect, it } from 'vitest';
import { constrainPhotoTranslation } from './photoTransform';

describe('ograniczenie przesuwania zdjęcia', () => {
  it('nie pozwala zgubić zdjęcia poza ekranem', () => {
    const result = constrainPhotoTranslation(
      { x: 5000, y: -5000, scale: 1, rotation: 0 },
      { width: 300, height: 500 },
      { width: 390, height: 600 }
    );
    expect(result.x).toBe(281);
    expect(result.y).toBe(-486);
  });

  it('uwzględnia powiększenie i obrót', () => {
    const result = constrainPhotoTranslation(
      { x: 1000, y: 1000, scale: 2, rotation: 90 },
      { width: 200, height: 400 },
      { width: 400, height: 600 }
    );
    expect(result.x).toBe(536);
    expect(result.y).toBe(436);
  });
});
