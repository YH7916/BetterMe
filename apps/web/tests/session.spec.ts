import { describe, it, expect, beforeEach } from 'vitest';
import { getUserId, setUserId, getAssessmentId, setAssessmentId } from '../src/lib/session';

describe('session', () => {
  beforeEach(() => localStorage.clear());
  it('stores and reads user id', () => {
    expect(getUserId()).toBeNull();
    setUserId('u1');
    expect(getUserId()).toBe('u1');
  });
  it('stores and reads assessment id', () => {
    expect(getAssessmentId()).toBeNull();
    setAssessmentId('a1');
    expect(getAssessmentId()).toBe('a1');
  });
});
