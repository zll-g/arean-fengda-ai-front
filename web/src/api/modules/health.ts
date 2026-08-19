import http from '../http';
import { opcPrefix } from '../http';

export const getHealth = () => {
  return http.get(`${opcPrefix}/actuator/health/opcuaHealth`, {
    isToken: false,
  });
};

export default { getHealth };
