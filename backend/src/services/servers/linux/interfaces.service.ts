import { getServerMetrics } from "../../../snmp/server.service";
import { ServerNetworkInterface } from "../../../types/server";

/**
 * Obtém métricas de interfaces de rede via SNMP
 */
export async function getLinuxNetworkInterfaces(
  ip: string
): Promise<ServerNetworkInterface[]> {
  const metrics = await getServerMetrics(ip, "LINUX");
  return metrics.interfaces || [];
}
