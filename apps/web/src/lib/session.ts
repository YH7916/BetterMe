const TOKEN = 'bm_token';
const ASSESS = 'bm_assessment_id';
export const getToken = () => localStorage.getItem(TOKEN);
export const setToken = (v: string) => localStorage.setItem(TOKEN, v);
export const getAssessmentId = () => localStorage.getItem(ASSESS);
export const setAssessmentId = (v: string) => localStorage.setItem(ASSESS, v);
export const clearSession = () => {
  localStorage.removeItem(TOKEN);
  localStorage.removeItem(ASSESS);
};
