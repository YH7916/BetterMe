import { describe, it, expect, beforeEach } from 'vitest';
import { getUserId, setUserId } from '../src/lib/session';

describe('session', () => {
  beforeEach(() => localStorage.clear());
  it('stores and reads user id', () => {
    expect(getUserId()).toBeNull();
    setUserId('u1');
    expect(getUserId()).toBe('u1');
  });
});
