import { describe, it, expect, beforeEach } from 'vitest';
import { getToken, setToken, getAssessmentId, setAssessmentId } from '../src/lib/session';

describe('session', () => {
  beforeEach(() => localStorage.clear());
  it('stores and reads the session token', () => {
    expect(getToken()).toBeNull();
    setToken('t1');
    expect(getToken()).toBe('t1');
  });
  it('stores and reads assessment id', () => {
    expect(getAssessmentId()).toBeNull();
    setAssessmentId('a1');
    expect(getAssessmentId()).toBe('a1');
  });
});
