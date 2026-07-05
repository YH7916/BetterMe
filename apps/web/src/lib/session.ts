const TOKEN = 'bm_token';
const ASSESS = 'bm_assessment_id';
const LEGACY_USER = 'bm_user_id'; // pre-token builds stored a raw user id here

export const getToken = () => localStorage.getItem(TOKEN);
export const setToken = (v: string) => localStorage.setItem(TOKEN, v);
export const getAssessmentId = () => localStorage.getItem(ASSESS);
export const setAssessmentId = (v: string) => localStorage.setItem(ASSESS, v);
export const clearSession = () => {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(ASSESS);
  localStorage.removeItem(LEGACY_USER);
};

/**
 * Drops a session that can never authenticate — either left over from an older
 * build (a `bm_user_id` with no bearer token) or an assessment id without a
 * token. Without this, such stale state makes every request 401 with
 * "missing bearer token" instead of starting a fresh funnel.
 */
export const pruneStaleSession = () => {
  if (localStorage.getItem(LEGACY_USER) || (getAssessmentId() && !getToken())) {
    clearSession();
  }
};
