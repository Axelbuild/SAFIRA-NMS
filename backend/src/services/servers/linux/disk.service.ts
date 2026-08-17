import { getServerMetrics } from "../../../snmp/server.service";
import { ServerDiskMetric } from "../../../types/server";

/**
 * Obtém métricas de disco via SNMP
 */
export async function getLinuxDiskMetrics(ip: string): Promise<ServerDiskMetric[]> {
  const metrics = await getServerMetrics(ip, "LINUX");
  return metrics.disks || [];
}
