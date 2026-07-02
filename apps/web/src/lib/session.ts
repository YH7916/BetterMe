const USER = 'bm_user_id';
const ASSESS = 'bm_assessment_id';
export const getUserId = () => localStorage.getItem(USER);
export const setUserId = (v: string) => localStorage.setItem(USER, v);
export const getAssessmentId = () => localStorage.getItem(ASSESS);
export const setAssessmentId = (v: string) => localStorage.setItem(ASSESS, v);
