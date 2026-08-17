import { prisma } from "../database";
import { LinkMonitorConfig, LinkMonitorType, LinkStatus, SNMPMetrics } from "../types/link";
import { runProtocolMonitor } from "../services/links/protocol.monitors";
import { calculateSnmpTraffic, consolidateStatus } from "./link-job.utils";

let running = false;

type MonitorRow = { id: number; monitorType: string; enabled: boolean; config: string };

function statusKey(type: LinkMonitorType): "snmpStatus" | "icmpStatus" | "httpStatus" | "httpsStatus" | "tcpStatus" | "dnsStatus" {
  return `${type.toLowerCase()}Status` as ReturnType<typeof statusKey>;
}

export async function checkLinks() {
  if (running) {
    console.warn("[LinkJob] Previous execution is still running; skipping overlapping run.");
    return;
  }
  running = true;
  try {
    const links = await prisma.links.findMany({ where: { enabled: true }, include: { monitors: true } });
    await Promise.all(links.map((link) => checkLink(link.id, link.capacity, link.monitors)));
  } catch (error) {
    console.error("[LinkJob] Fatal error:", error);
  } finally {
    running = false;
  }
}

async function checkLink(linkId: number, capacity: number, monitors: MonitorRow[]) {
  const statuses: Partial<Record<ReturnType<typeof statusKey>, LinkStatus>> = {};
  const results: Partial<Record<LinkMonitorType, Record<string, any>>> = {};
  const now = new Date();

  await Promise.all(monitors.filter((monitor) => monitor.enabled).map(async (monitor) => {
    const type = monitor.monitorType as LinkMonitorType;
    try {
      const result = await runProtocolMonitor(type, JSON.parse(monitor.config) as LinkMonitorConfig);
      statuses[statusKey(type)] = result.status;
      results[type] = result.metrics;
    } catch (error) {
      console.error(`[LinkJob] ${type} failed for link ${linkId}:`, error);
      statuses[statusKey(type)] = "UNKNOWN";
    } finally {
      await prisma.linkMonitor.update({ where: { id: monitor.id }, data: { lastCheck: now } });
    }
  }));

  const overallStatus = consolidateStatus(Object.values(statuses));
  const reachable = overallStatus === "ONLINE" || overallStatus === "SUSPECT";
  const previous = await prisma.linkStatusSnapshot.findUnique({ where: { linkId } });
  const consecutiveFailures = overallStatus === "OFFLINE" ? (previous?.consecutiveFailures ?? 0) + 1 : 0;
  const previousMetric = await prisma.linkMetricHistory.findFirst({ where: { linkId }, orderBy: { timestamp: "desc" } });
  let previousSnmp: SNMPMetrics | undefined;
  try { previousSnmp = previousMetric?.snmpMetrics ? JSON.parse(previousMetric.snmpMetrics) : undefined; } catch { previousSnmp = undefined; }
  const snmp = results.SNMP as SNMPMetrics | undefined;
  const traffic = snmp ? calculateSnmpTraffic(previousSnmp, snmp, previousMetric?.timestamp, capacity) : {};
  const icmp = results.ICMP; const http = results.HTTP; const https = results.HTTPS; const tcp = results.TCP; const dns = results.DNS;

  const snapshotData = {
    online: reachable, status: overallStatus, overallStatus, consecutiveFailures,
    snmpStatus: statuses.snmpStatus, icmpStatus: statuses.icmpStatus, httpStatus: statuses.httpStatus, httpsStatus: statuses.httpsStatus, tcpStatus: statuses.tcpStatus, dnsStatus: statuses.dnsStatus,
    latency: icmp?.latency, packetLoss: icmp?.packetLoss,
    interfaceOperStatus: snmp?.ifOperStatus, interfaceSpeed: snmp?.ifSpeed,
    ...traffic,
    lastSeenOnlineAt: reachable ? now : previous?.lastSeenOnlineAt,
  };
  const snapshot = await prisma.linkStatusSnapshot.upsert({ where: { linkId }, create: { linkId, ...snapshotData }, update: snapshotData });
  await prisma.linkMetricHistory.create({ data: {
    linkId, timestamp: now, snmpMetrics: snmp ? JSON.stringify(snmp) : undefined,
    icmpLatency: icmp?.latency, icmpPacketLoss: icmp?.packetLoss, icmpSuccess: icmp?.success,
    httpStatusCode: http?.statusCode, httpResponseTime: http?.responseTime, httpSuccess: http?.success,
    httpsStatusCode: https?.statusCode, httpsResponseTime: https?.responseTime, httpsSuccess: https?.success,
    tcpResponseTime: tcp?.responseTime, tcpConnected: tcp?.connected,
    dnsResponseTime: dns?.responseTime, dnsResult: dns?.result, dnsSuccess: dns?.success,
    ...traffic,
  } });
  return snapshot;
}
