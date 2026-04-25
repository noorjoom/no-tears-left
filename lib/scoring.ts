import { MAX_PLACEMENT, MIN_PLACEMENT, PLACEMENT_BONUS_TABLE } from './constants';

export function getPlacementBonus(placement: number): number {
  if (!Number.isInteger(placement)) {
    throw new Error(`placement must be an integer, got ${placement}`);
  }
  if (placement < MIN_PLACEMENT || placement > MAX_PLACEMENT) {
    throw new Error(
      `placement must be between ${MIN_PLACEMENT} and ${MAX_PLACEMENT}, got ${placement}`,
    );
  }
  const bracket = PLACEMENT_BONUS_TABLE.find(
    (b) => placement >= b.min && placement <= b.max,
  );
  return bracket?.points ?? 0;
}

export function calcMatchScore(eliminations: number, placement: number): number {
  if (!Number.isInteger(eliminations)) {
    throw new Error(`eliminations must be an integer, got ${eliminations}`);
  }
  if (eliminations < 0) {
    throw new Error(`eliminations cannot be negative, got ${eliminations}`);
  }
  return eliminations + getPlacementBonus(placement);
}

export function calcTeamTotal(
  verifiedSubmissions: ReadonlyArray<{ eliminations: number; placement: number }>,
): number {
  return verifiedSubmissions.reduce(
    (sum, s) => sum + calcMatchScore(s.eliminations, s.placement),
    0,
  );
}
