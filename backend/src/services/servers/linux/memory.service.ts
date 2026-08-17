import { getServerMetrics } from "../../../snmp/server.service";
import { ServerMemoryMetrics } from "../../../types/server";

/**
 * Obtém métricas de memória via SNMP
 */
export async function getLinuxMemoryMetrics(
  ip: string
): Promise<ServerMemoryMetrics> {
  const metrics = await getServerMetrics(ip, "LINUX");
  return (
    metrics.memory || {
      total: 0,
      used: 0,
      free: 0,
      usagePercent: 0,
    }
  );
}
