import { describe, expect, it } from 'vitest';
import { hasRole, isAdminDiscordId, parseAdminDiscordIds } from './role-guard';

describe('hasRole', () => {
  it('returns true when role matches exactly', () => {
    expect(hasRole('MEMBER', 'MEMBER')).toBe(true);
    expect(hasRole('MOD', 'MOD')).toBe(true);
    expect(hasRole('ADMIN', 'ADMIN')).toBe(true);
  });

  it('respects hierarchy: ADMIN satisfies MOD requirement', () => {
    expect(hasRole('ADMIN', 'MOD')).toBe(true);
    expect(hasRole('ADMIN', 'MEMBER')).toBe(true);
  });

  it('respects hierarchy: MOD satisfies MEMBER requirement', () => {
    expect(hasRole('MOD', 'MEMBER')).toBe(true);
  });

  it('does not allow lower role to satisfy higher requirement', () => {
    expect(hasRole('MEMBER', 'MOD')).toBe(false);
    expect(hasRole('MEMBER', 'ADMIN')).toBe(false);
    expect(hasRole('MOD', 'ADMIN')).toBe(false);
  });

  it('returns false for null/undefined role', () => {
    expect(hasRole(null, 'MEMBER')).toBe(false);
    expect(hasRole(undefined, 'MEMBER')).toBe(false);
  });
});

describe('parseAdminDiscordIds', () => {
  it('returns empty set for undefined or empty string', () => {
    expect(parseAdminDiscordIds(undefined).size).toBe(0);
    expect(parseAdminDiscordIds('').size).toBe(0);
    expect(parseAdminDiscordIds('   ').size).toBe(0);
  });

  it('parses single id', () => {
    const ids = parseAdminDiscordIds('123456789');
    expect(ids.has('123456789')).toBe(true);
    expect(ids.size).toBe(1);
  });

  it('parses comma-separated list and trims whitespace', () => {
    const ids = parseAdminDiscordIds(' 123 , 456,789 ');
    expect(ids.has('123')).toBe(true);
    expect(ids.has('456')).toBe(true);
    expect(ids.has('789')).toBe(true);
    expect(ids.size).toBe(3);
  });

  it('skips empty entries from trailing commas', () => {
    const ids = parseAdminDiscordIds('123,,456,');
    expect(ids.size).toBe(2);
  });
});

describe('isAdminDiscordId', () => {
  it('returns true when id is in env list', () => {
    expect(isAdminDiscordId('111', '111,222')).toBe(true);
    expect(isAdminDiscordId('222', '111,222')).toBe(true);
  });

  it('returns false when id is not in env list', () => {
    expect(isAdminDiscordId('333', '111,222')).toBe(false);
  });

  it('returns false when env is unset', () => {
    expect(isAdminDiscordId('111', undefined)).toBe(false);
    expect(isAdminDiscordId('111', '')).toBe(false);
  });
});
