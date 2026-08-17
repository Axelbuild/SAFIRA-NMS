import { prisma } from "../database";
import { ICMPMonitor } from "../services/links/icmp.monitor";
import { LinkStatus } from "../types/link";

const icmpMonitor = new ICMPMonitor();

interface LinkMonitorDB {
  id: number;
  linkId: number;
  monitorType: string;
  enabled: boolean;
  config: string;
  lastCheck: Date | null;
  nextCheck: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Divide array em chunks
 */
function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Calcula status consolidado baseado nos status individuais dos monitores
 */
function consolidateStatus(
  snmpStatus?: string | null,
  icmpStatus?: string | null,
  httpStatus?: string | null,
  tcpStatus?: string | null,
  dnsStatus?: string | null
): LinkStatus {
  const statuses = [snmpStatus, icmpStatus, httpStatus, tcpStatus, dnsStatus].filter(
    (s) => s !== null && s !== undefined
  ) as LinkStatus[];

  if (statuses.length === 0) return "UNKNOWN";

  // Se algum está OFFLINE, link está OFFLINE
  if (statuses.includes("OFFLINE")) return "OFFLINE";

  // Se algum está SUSPECT, link está SUSPECT
  if (statuses.includes("SUSPECT")) return "SUSPECT";

  // Senão, está ONLINE
  return "ONLINE";
}

/**
 * Job: Verificar status de todos os links
 */
export async function checkLinks() {
  try {
    const links = await prisma.links.findMany({
      where: { enabled: true },
      include: { monitors: true },
    });

    if (links.length === 0) return;

    console.log(`[LinkJob] Checking ${links.length} links...`);

    // Processar em chunks de 5
    const chunks = chunkArray(links, 5);

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (link) => {
          try {
            await checkLink(link.id, link.monitors);
          } catch (error) {
            console.error(`[LinkJob] Error checking link ${link.id}:`, error);
          }
        })
      );
    }

    console.log(`[LinkJob] Completed checking links`);
  } catch (error) {
    console.error("[LinkJob] Fatal error:", error);
  }
}

/**
 * Verifica um link específico
 */
async function checkLink(
  linkId: number,
  monitors: LinkMonitorDB[]
) {
  let snmpStatus: LinkStatus | undefined;
  let icmpStatus: LinkStatus | undefined;
  let httpStatus: LinkStatus | undefined;
  let tcpStatus: LinkStatus | undefined;
  let dnsStatus: LinkStatus | undefined;

  const metrics: any = {};

  // Executar cada monitor em paralelo
  const monitorPromises = monitors
    .filter((m: LinkMonitorDB) => m.enabled)
    .map(async (monitor: LinkMonitorDB) => {
      try {
        const config = JSON.parse(monitor.config);

        if (monitor.monitorType === "ICMP") {
          const target = config.target || "8.8.8.8";
          const icmpMetrics = await icmpMonitor.monitor(
            target,
            config.count || 4,
            config.timeout || 3000
          );

          icmpStatus = icmpMonitor.getStatus(icmpMetrics);
          metrics.icmp = icmpMetrics;
          metrics.latency = icmpMetrics.latency;
          metrics.packetLoss = icmpMetrics.packetLoss;
        }
        // Outros monitores serão adicionados depois
      } catch (error: any) {
        console.error(
          `[LinkJob] Error running ${monitor.monitorType} monitor for link ${linkId}:`,
          error.message
        );
      }
    });

  await Promise.all(monitorPromises);

  // Calcular status consolidado
  const overallStatus = consolidateStatus(snmpStatus, icmpStatus, httpStatus, tcpStatus, dnsStatus);

  // Determinar se está online
  const isOnline = overallStatus === "ONLINE";

  // Obter status anterior
  const previousStatus = await prisma.linkStatusSnapshot.findUnique({
    where: { linkId },
  });

  // Calcular falhas consecutivas
  let consecutiveFailures = previousStatus?.consecutiveFailures || 0;

  if (!isOnline) {
    consecutiveFailures += 1;
  } else {
    consecutiveFailures = 0;
  }

  // Atualizar ou criar snapshot
  const snapshot = await prisma.linkStatusSnapshot.upsert({
    where: { linkId },
    create: {
      linkId,
      online: isOnline,
      status: overallStatus,
      overallStatus,
      consecutiveFailures,
      snmpStatus,
      icmpStatus,
      httpStatus,
      tcpStatus,
      dnsStatus,
      latency: metrics.latency,
      packetLoss: metrics.packetLoss,
      lastSeenOnlineAt: isOnline ? new Date() : previousStatus?.lastSeenOnlineAt,
    },
    update: {
      online: isOnline,
      status: overallStatus,
      overallStatus,
      consecutiveFailures,
      snmpStatus,
      icmpStatus,
      httpStatus,
      tcpStatus,
      dnsStatus,
      latency: metrics.latency,
      packetLoss: metrics.packetLoss,
      lastSeenOnlineAt: isOnline ? new Date() : previousStatus?.lastSeenOnlineAt,
      updatedAt: new Date(),
    },
  });

  // Armazenar histórico de métricas
  await prisma.linkMetricHistory.create({
    data: {
      linkId,
      timestamp: new Date(),
      icmpLatency: metrics.icmp?.latency,
      icmpPacketLoss: metrics.icmp?.packetLoss,
      icmpSuccess: metrics.icmp?.success,
      latency: metrics.latency,
      packetLoss: metrics.packetLoss,
    },
  });

  // TODO: Processar alertas quando sistema estiver completo
  // await processLinkAlerts(linkId, snapshot, consecutiveFailures);

  return snapshot;
}
