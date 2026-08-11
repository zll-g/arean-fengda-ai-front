import http from '../http';
const BaseUrl = '/api';
export function getSessionDetail(sessionId: string) {
  return http.get(`${BaseUrl}/voice-session/${sessionId}`);
}
export default { getSessionDetail };
