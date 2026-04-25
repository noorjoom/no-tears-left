import { describe, expect, it } from 'vitest';
import { calcMatchScore, calcTeamTotal, getPlacementBonus } from './scoring';

describe('getPlacementBonus', () => {
  it('returns 10 for 1st place', () => {
    expect(getPlacementBonus(1)).toBe(10);
  });

  it('returns 7 for 2nd–3rd place', () => {
    expect(getPlacementBonus(2)).toBe(7);
    expect(getPlacementBonus(3)).toBe(7);
  });

  it('returns 5 for 4th–5th place', () => {
    expect(getPlacementBonus(4)).toBe(5);
    expect(getPlacementBonus(5)).toBe(5);
  });

  it('returns 3 for 6th–10th place', () => {
    expect(getPlacementBonus(6)).toBe(3);
    expect(getPlacementBonus(10)).toBe(3);
  });

  it('returns 1 for 11th–25th place', () => {
    expect(getPlacementBonus(11)).toBe(1);
    expect(getPlacementBonus(25)).toBe(1);
  });

  it('returns 0 for 26th and beyond', () => {
    expect(getPlacementBonus(26)).toBe(0);
    expect(getPlacementBonus(50)).toBe(0);
    expect(getPlacementBonus(100)).toBe(0);
  });

  it('throws on invalid placement (< 1)', () => {
    expect(() => getPlacementBonus(0)).toThrow();
    expect(() => getPlacementBonus(-1)).toThrow();
  });

  it('throws on invalid placement (> 100)', () => {
    expect(() => getPlacementBonus(101)).toThrow();
  });

  it('throws on non-integer placement', () => {
    expect(() => getPlacementBonus(1.5)).toThrow();
    expect(() => getPlacementBonus(NaN)).toThrow();
  });
});

describe('calcMatchScore', () => {
  it('sums eliminations and placement bonus', () => {
    expect(calcMatchScore(5, 1)).toBe(15); // 5 + 10
    expect(calcMatchScore(3, 2)).toBe(10); // 3 + 7
    expect(calcMatchScore(0, 100)).toBe(0); // 0 + 0
    expect(calcMatchScore(7, 11)).toBe(8); // 7 + 1
  });

  it('throws on negative eliminations', () => {
    expect(() => calcMatchScore(-1, 1)).toThrow();
  });

  it('throws on non-integer eliminations', () => {
    expect(() => calcMatchScore(2.5, 1)).toThrow();
  });

  it('propagates placement validation errors', () => {
    expect(() => calcMatchScore(0, 0)).toThrow();
    expect(() => calcMatchScore(0, 101)).toThrow();
  });
});

describe('calcTeamTotal', () => {
  it('returns 0 for empty list', () => {
    expect(calcTeamTotal([])).toBe(0);
  });

  it('sums multiple match scores', () => {
    const subs = [
      { eliminations: 5, placement: 1 }, // 15
      { eliminations: 3, placement: 4 }, // 8
      { eliminations: 0, placement: 50 }, // 0
    ];
    expect(calcTeamTotal(subs)).toBe(23);
  });

  it('handles a single submission', () => {
    expect(calcTeamTotal([{ eliminations: 2, placement: 6 }])).toBe(5);
  });
});
