import { prisma } from "../database";
import { getServerMetrics } from "../snmp/server.service";
import { pingServer } from "../services/servers/ping.service";
import { processServerAlerts } from "../services/server.alert.service";

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function resolveServerHealthStatus(params: {
  isOnlineNow: boolean;
  currentFailures: number;
}) {
  if (params.isOnlineNow) {
    return {
      online: true,
      status: "ONLINE",
      consecutiveFailures: 0,
      lastSeenOnlineAt: new Date(),
    };
  }

  const failures = params.currentFailures + 1;

  if (failures >= 3) {
    return {
      online: false,
      status: "OFFLINE",
      consecutiveFailures: failures,
      lastSeenOnlineAt: undefined,
    };
  }

  return {
    online: true,
    status: "SUSPECT",
    consecutiveFailures: failures,
    lastSeenOnlineAt: undefined,
  };
}

export async function checkServers() {
  const servers = await prisma.servers.findMany();

  const batches = chunkArray(servers, 5);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (server) => {
        try {
          // Primeiro fazer ping
          const isOnline = await pingServer(server.ip, 3000);

          if (!isOnline) {
            console.log(`Server ${server.name} (${server.ip}) is offline`);

            const currentSnapshot = await prisma.serverMetricsSnapshot.findUnique({
              where: { serverId: server.id },
            });

            const healthStatus = resolveServerHealthStatus({
              isOnlineNow: false,
              currentFailures: currentSnapshot?.consecutiveFailures || 0,
            });

            await prisma.serverMetricsSnapshot.upsert({
              where: { serverId: server.id },
              update: {
                online: healthStatus.online,
                status: healthStatus.status,
                consecutiveFailures: healthStatus.consecutiveFailures,
                lastSeenOnlineAt: healthStatus.lastSeenOnlineAt,
              },
              create: {
                serverId: server.id,
                ...healthStatus,
              },
            });

            return;
          }

          // Se estiver online, coletar métricas via SNMP
          const metrics = await getServerMetrics(server.ip, server.osType as any);

          const healthStatus = resolveServerHealthStatus({
            isOnlineNow: metrics.online,
            currentFailures: 0,
          });

          // Armazenar métricas no banco
          const snapshot = await prisma.serverMetricsSnapshot.upsert({
            where: { serverId: server.id },
            update: {
              online: healthStatus.online,
              status: healthStatus.status,
              consecutiveFailures: healthStatus.consecutiveFailures,
              lastSeenOnlineAt: healthStatus.lastSeenOnlineAt,
              cpuUsage: metrics.cpu?.usage,
              cpuCores: metrics.cpu?.cores,
              memoryTotal: metrics.memory?.total,
              memoryUsed: metrics.memory?.used,
              memoryFree: metrics.memory?.free,
              memoryUsagePercent: metrics.memory?.usagePercent,
              diskMetrics: metrics.disks ? JSON.stringify(metrics.disks) : null,
              networkInterfaces: metrics.interfaces
                ? JSON.stringify(metrics.interfaces)
                : null,
            },
            create: {
              serverId: server.id,
              online: healthStatus.online,
              status: healthStatus.status,
              consecutiveFailures: healthStatus.consecutiveFailures,
              lastSeenOnlineAt: healthStatus.lastSeenOnlineAt,
              cpuUsage: metrics.cpu?.usage,
              cpuCores: metrics.cpu?.cores,
              memoryTotal: metrics.memory?.total,
              memoryUsed: metrics.memory?.used,
              memoryFree: metrics.memory?.free,
              memoryUsagePercent: metrics.memory?.usagePercent,
              diskMetrics: metrics.disks ? JSON.stringify(metrics.disks) : null,
              networkInterfaces: metrics.interfaces
                ? JSON.stringify(metrics.interfaces)
                : null,
            },
          });

          // Processar alertas
          await processServerAlerts(server.id, snapshot);

          console.log("Server status:", {
            server: server.name,
            ip: server.ip,
            status: metrics.online ? "ONLINE" : "OFFLINE",
            cpu: metrics.cpu?.usage.toFixed(2) + "%",
            memory: metrics.memory?.usagePercent.toFixed(2) + "%",
            disks: metrics.disks?.length || 0,
          });
        } catch (error) {
          console.error(`Error checking server ${server.name}:`, error);
        }
      })
    );
  }
}
