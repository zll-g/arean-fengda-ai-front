import http from '../http';
import { aiPrefix } from '../http';
export function getSessionDetail(sessionId: string) {
  return http.get(`${aiPrefix}/voice-session/${sessionId}`);
}
export default { getSessionDetail };
