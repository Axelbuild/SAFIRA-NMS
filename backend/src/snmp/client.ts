import snmp from "net-snmp";

export const createSession = (ip: string) => {
  return snmp.createSession(ip, "public", {
    port: 161,
    timeout: 2000,
    retries: 1,
  });
};