import { getServerMetrics } from "../../../snmp/server.service";
import { ServerCPUMetrics } from "../../../types/server";

/**
 * Obtém métricas de CPU via SNMP
 */
export async function getLinuxCPUMetrics(ip: string): Promise<ServerCPUMetrics> {
  const metrics = await getServerMetrics(ip, "LINUX");
  return metrics.cpu || { usage: 0, cores: 0 };
}
