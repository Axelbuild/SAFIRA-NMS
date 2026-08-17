import { prisma } from "../database";

export interface ServerAlertConfig {
  cpuThreshold?: number; // Porcentagem (0-100)
  memoryThreshold?: number; // Porcentagem (0-100)
  diskThreshold?: number; // Porcentagem (0-100)
}

const DEFAULT_CONFIG: ServerAlertConfig = {
  cpuThreshold: 80,
  memoryThreshold: 85,
  diskThreshold: 90,
};

/**
 * Processa alertas de servidores baseado em métricas
 */
export async function processServerAlerts(
  serverId: number,
  metrics: any, // ServerMetricsSnapshot
  config: ServerAlertConfig = DEFAULT_CONFIG
) {
  const thresholds = { ...DEFAULT_CONFIG, ...config };

  // Check CPU
  if (metrics.cpuUsage !== null && metrics.cpuUsage !== undefined) {
    const cpuThreshold = thresholds.cpuThreshold || 80;
    const cpuMetric = "usage";

    const existingAlert = await prisma.serverAlertState.findUnique({
      where: { serverId_alertType_metric: { serverId, alertType: "CPU", metric: cpuMetric } },
    });

    if (metrics.cpuUsage >= cpuThreshold) {
      if (existingAlert && !existingAlert.warnedAtThreshold) {
        await prisma.serverAlertState.update({
          where: { id: existingAlert.id },
          data: {
            warnedAtThreshold: true,
            currentLevel: metrics.cpuUsage,
            lastNotifiedAt: new Date(),
          },
        });
      } else if (!existingAlert) {
        await prisma.serverAlertState.create({
          data: {
            serverId,
            alertType: "CPU",
            metric: cpuMetric,
            warnedAtThreshold: true,
            currentLevel: metrics.cpuUsage,
            threshold: cpuThreshold,
            lastNotifiedAt: new Date(),
          },
        });
      }
    } else if (existingAlert && existingAlert.warnedAtThreshold) {
      await prisma.serverAlertState.update({
        where: { id: existingAlert.id },
        data: {
          warnedAtThreshold: false,
          currentLevel: metrics.cpuUsage,
        },
      });
    }
  }

  // Check Memory
  if (
    metrics.memoryUsagePercent !== null &&
    metrics.memoryUsagePercent !== undefined
  ) {
    const memThreshold = thresholds.memoryThreshold || 85;
    const memMetric = "usage";

    const existingAlert = await prisma.serverAlertState.findUnique({
      where: { serverId_alertType_metric: { serverId, alertType: "MEMORY", metric: memMetric } },
    });

    if (metrics.memoryUsagePercent >= memThreshold) {
      if (existingAlert && !existingAlert.warnedAtThreshold) {
        await prisma.serverAlertState.update({
          where: { id: existingAlert.id },
          data: {
            warnedAtThreshold: true,
            currentLevel: metrics.memoryUsagePercent,
            lastNotifiedAt: new Date(),
          },
        });
      } else if (!existingAlert) {
        await prisma.serverAlertState.create({
          data: {
            serverId,
            alertType: "MEMORY",
            metric: memMetric,
            warnedAtThreshold: true,
            currentLevel: metrics.memoryUsagePercent,
            threshold: memThreshold,
            lastNotifiedAt: new Date(),
          },
        });
      }
    } else if (existingAlert && existingAlert.warnedAtThreshold) {
      await prisma.serverAlertState.update({
        where: { id: existingAlert.id },
        data: {
          warnedAtThreshold: false,
          currentLevel: metrics.memoryUsagePercent,
        },
      });
    }
  }

  // Check Disk
  if (metrics.diskMetrics) {
    const diskThreshold = thresholds.diskThreshold || 90;

    try {
      const disks = JSON.parse(metrics.diskMetrics);

      for (const disk of disks) {
        const diskMetric = disk.name || disk.mountPoint;

        const existingAlert = await prisma.serverAlertState.findUnique({
          where: { serverId_alertType_metric: { serverId, alertType: "DISK", metric: diskMetric } },
        });

        if (disk.usagePercent >= diskThreshold) {
          if (existingAlert && !existingAlert.warnedAtThreshold) {
            await prisma.serverAlertState.update({
              where: { id: existingAlert.id },
              data: {
                warnedAtThreshold: true,
                currentLevel: disk.usagePercent,
                lastNotifiedAt: new Date(),
              },
            });
          } else if (!existingAlert) {
            await prisma.serverAlertState.create({
              data: {
                serverId,
                alertType: "DISK",
                metric: diskMetric,
                warnedAtThreshold: true,
                currentLevel: disk.usagePercent,
                threshold: diskThreshold,
                lastNotifiedAt: new Date(),
              },
            });
          }
        } else if (existingAlert && existingAlert.warnedAtThreshold) {
          await prisma.serverAlertState.update({
            where: { id: existingAlert.id },
            data: {
              warnedAtThreshold: false,
              currentLevel: disk.usagePercent,
            },
          });
        }
      }
    } catch (error) {
      console.error("Error parsing disk metrics:", error);
    }
  }
}
