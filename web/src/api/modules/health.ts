import http from '../http';

export const getHealth = () => {
  return http.get(`/actuator/health/opcuaHealth`, {
    isToken: false,
  });
};

export default { getHealth };
