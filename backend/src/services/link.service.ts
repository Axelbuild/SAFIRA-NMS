import { prisma } from "../database";
import { LinkModel, LinkMonitorModel } from "../models/link.models";
import { isValidNumber } from "../utils/validators";
import { isValidIP } from "../utils/ip";
import { LinkInput, LinkMonitorInput, LinkMonitorType, LinkMonitorOutput } from "../types/link";
import { mapLinkMonitorResponse, mapLinkMonitorsResponse } from "../serializers/link-monitor.serializer";
import { assertValidDnsRecordType } from "./links/dns-monitor.config";

function cleanString(value?: string | null) {
  if (!value) return null;

  const cleaned = value.replace(/\u0000/g, "").replace(/\0/g, "").trim();

  return cleaned.length > 0 ? cleaned : null;
}

function assertPositiveMilliseconds(value: unknown, field: string) {
  if (value !== undefined && (!Number.isFinite(value) || Number(value) <= 0)) {
    throw new Error(`${field} must be a positive number in milliseconds`);
  }
}

function validateMonitorConfig(monitorType: LinkMonitorType, config: Record<string, unknown>) {
  if (monitorType === "ICMP") {
    if (typeof config.target !== "string" || !config.target.trim()) throw new Error("ICMP config.target is required");
    assertPositiveMilliseconds(config.timeout, "ICMP config.timeout");
    assertPositiveMilliseconds(config.latencyThresholdMs, "ICMP config.latencyThresholdMs");
  } else if (monitorType === "SNMP") {
    if (typeof config.ip !== "string" || !config.ip.trim() || !Number.isInteger(config.interfaceIndex)) throw new Error("SNMP config.ip and config.interfaceIndex are required");
    assertPositiveMilliseconds(config.timeout, "SNMP config.timeout");
  } else if (monitorType === "HTTP" || monitorType === "HTTPS") {
    if (typeof config.url !== "string") throw new Error(`${monitorType} config.url is required`);
    const url = new URL(config.url);
    if (url.protocol !== `${monitorType.toLowerCase()}:`) throw new Error(`${monitorType} config.url must use ${monitorType.toLowerCase()}://`);
    assertPositiveMilliseconds(config.timeout, `${monitorType} config.timeout`);
    assertPositiveMilliseconds(config.responseTimeThresholdMs, `${monitorType} config.responseTimeThresholdMs`);
  } else if (monitorType === "TCP") {
    if (typeof config.host !== "string" || !config.host.trim() || !Number.isInteger(config.port) || Number(config.port) < 1 || Number(config.port) > 65535) throw new Error("TCP config.host and a port between 1 and 65535 are required");
    assertPositiveMilliseconds(config.timeout, "TCP config.timeout");
    assertPositiveMilliseconds(config.responseTimeThresholdMs, "TCP config.responseTimeThresholdMs");
  } else {
    if (typeof config.dnsServer !== "string" || typeof config.query !== "string" || !config.dnsServer.trim() || !config.query.trim()) throw new Error("DNS config.dnsServer and config.query are required");
    assertValidDnsRecordType(config.recordType);
    assertPositiveMilliseconds(config.timeout, "DNS config.timeout");
    assertPositiveMilliseconds(config.responseTimeThresholdMs, "DNS config.responseTimeThresholdMs");
  }
}

export class LinkService {
  async create(data: LinkInput) {
    const { name, description, capacity, groupId, enabled } = data;

    if (!name) throw new Error("name is required");
    if (!capacity || capacity <= 0) throw new Error("capacity must be > 0");
    if (!isValidNumber(groupId)) throw new Error("groupId must be a valid number");

    const cleanedName = cleanString(name) ?? "";
    const cleanedDescription = cleanString(description);

    const link = new LinkModel(
      cleanedName,
      capacity,
      Number(groupId),
      cleanedDescription ?? undefined,
      enabled !== false,
      new Date()
    );

    return prisma.links.create({
      data: {
        name: link.name,
        description: link.description,
        enabled: link.enabled,
        capacity: link.capacity,
        groupId: link.groupId,
      },
      include: { group: true },
    });
  }

  async findAll(enabled?: boolean) {
    const where = enabled !== undefined ? { enabled } : {};

    const links = await prisma.links.findMany({
      where,
      include: {
        group: true,
        monitors: true,
        snapshots: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
    return links.map(mapLinkMonitorsResponse);
  }

  async findById(id: number) {
    const link = await prisma.links.findUnique({
      where: { id },
      include: {
        group: true,
        monitors: true,
        snapshots: { take: 1, orderBy: { createdAt: "desc" } },
        alerts: true,
      },
    });
    return link ? mapLinkMonitorsResponse(link) : null;
  }

  async findByGroupId(groupId: number) {
    const links = await prisma.links.findMany({
      where: { groupId },
      include: {
        group: true,
        monitors: true,
        snapshots: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
    return links.map(mapLinkMonitorsResponse);
  }

  async update(id: number, data: Partial<LinkInput>) {
    if (data.capacity && data.capacity <= 0) {
      throw new Error("capacity must be > 0");
    }

    if (data.groupId !== undefined && !isValidNumber(data.groupId)) {
      throw new Error("groupId must be a valid number");
    }

    return prisma.links.update({
      where: { id },
      data: {
        name: data.name !== undefined ? cleanString(data.name) ?? "" : undefined,
        description:
          data.description !== undefined ? cleanString(data.description) : undefined,
        capacity: data.capacity !== undefined ? data.capacity : undefined,
        groupId: data.groupId !== undefined ? Number(data.groupId) : undefined,
        enabled: data.enabled !== undefined ? data.enabled : undefined,
      },
      include: { group: true },
    });
  }

  async delete(id: number) {
    const linkExists = await prisma.links.findUnique({
      where: { id },
    });

    if (!linkExists) {
      throw new Error("Link not found");
    }

    // Cascade delete via Prisma
    return prisma.links.delete({
      where: { id },
    });
  }

  // ===== MONITOR OPERATIONS =====

  async createMonitor(data: LinkMonitorInput) {
    const { linkId, monitorType, enabled, config } = data;

    // Validar link existe
    const link = await prisma.links.findUnique({ where: { id: linkId } });
    if (!link) throw new Error("Link not found");

    // Validar tipo de monitor
    const validMonitors: LinkMonitorType[] = ["SNMP", "ICMP", "HTTP", "HTTPS", "TCP", "DNS"];
    if (!validMonitors.includes(monitorType)) {
      throw new Error(`Invalid monitor type. Must be one of: ${validMonitors.join(", ")}`);
    }

    // Validar configuração básica
    if (!config || typeof config !== "object") {
      throw new Error("config must be an object");
    }

    validateMonitorConfig(monitorType, config as Record<string, unknown>);

    const monitor = new LinkMonitorModel(linkId, monitorType, config, enabled !== false);

    const created = await prisma.linkMonitor.create({
      data: {
        linkId: monitor.linkId,
        monitorType: monitor.monitorType,
        enabled: monitor.enabled,
        config: JSON.stringify(monitor.config),
      },
    });
    return mapLinkMonitorResponse(created);
  }

  async getMonitors(linkId: number): Promise<LinkMonitorOutput[]> {
    const monitors = await prisma.linkMonitor.findMany({
      where: { linkId },
    });

    return monitors.map(mapLinkMonitorResponse);
  }

  async getMonitorById(id: number): Promise<LinkMonitorOutput | null> {
    const monitor = await prisma.linkMonitor.findUnique({
      where: { id },
    });

    if (!monitor) return null;

    return mapLinkMonitorResponse(monitor);
  }

  async updateMonitor(id: number, data: Partial<LinkMonitorInput>): Promise<LinkMonitorOutput> {
    const monitor = await prisma.linkMonitor.findUnique({
      where: { id },
    });

    if (!monitor) throw new Error("Monitor not found");

    if (data.config) validateMonitorConfig(monitor.monitorType as LinkMonitorType, data.config as Record<string, unknown>);

    const updated = await prisma.linkMonitor.update({
      where: { id },
      data: {
        enabled: data.enabled !== undefined ? data.enabled : undefined,
        config: data.config ? JSON.stringify(data.config) : undefined,
      },
    });
    return mapLinkMonitorResponse(updated);
  }

  async deleteMonitor(id: number) {
    const monitor = await prisma.linkMonitor.findUnique({
      where: { id },
    });

    if (!monitor) throw new Error("Monitor not found");

    return prisma.linkMonitor.delete({
      where: { id },
    });
  }

  // ===== STATUS & METRICS =====

  async getLatestStatus(linkId: number) {
    return prisma.linkStatusSnapshot.findUnique({
      where: { linkId },
    });
  }

  async getMetricsHistory(linkId: number, limit: number = 100) {
    return prisma.linkMetricHistory.findMany({
      where: { linkId },
      orderBy: { timestamp: "desc" },
      take: limit,
    });
  }
}
