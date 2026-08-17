import { prisma } from "../database";
import { LinkModel, LinkMonitorModel } from "../models/link.models";
import { isValidNumber } from "../utils/validators";
import { isValidIP } from "../utils/ip";
import { LinkInput, LinkMonitorInput, LinkMonitorType, LinkMonitorOutput } from "../types/link";

function cleanString(value?: string | null) {
  if (!value) return null;

  const cleaned = value.replace(/\u0000/g, "").replace(/\0/g, "").trim();

  return cleaned.length > 0 ? cleaned : null;
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

    return prisma.links.findMany({
      where,
      include: {
        group: true,
        monitors: true,
        snapshots: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
  }

  async findById(id: number) {
    return prisma.links.findUnique({
      where: { id },
      include: {
        group: true,
        monitors: true,
        snapshots: { take: 1, orderBy: { createdAt: "desc" } },
        alerts: true,
      },
    });
  }

  async findByGroupId(groupId: number) {
    return prisma.links.findMany({
      where: { groupId },
      include: {
        group: true,
        monitors: true,
        snapshots: { take: 1, orderBy: { createdAt: "desc" } },
      },
    });
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

    const monitor = new LinkMonitorModel(linkId, monitorType, config, enabled !== false);

    return prisma.linkMonitor.create({
      data: {
        linkId: monitor.linkId,
        monitorType: monitor.monitorType,
        enabled: monitor.enabled,
        config: JSON.stringify(monitor.config),
      },
    });
  }

  async getMonitors(linkId: number): Promise<LinkMonitorOutput[]> {
    const monitors = await prisma.linkMonitor.findMany({
      where: { linkId },
    });

    // Parse config JSON
    return monitors.map((m) => ({
      ...m,
      config: JSON.parse(m.config),
    })) as LinkMonitorOutput[];
  }

  async getMonitorById(id: number): Promise<LinkMonitorOutput | null> {
    const monitor = await prisma.linkMonitor.findUnique({
      where: { id },
    });

    if (!monitor) return null;

    return {
      ...monitor,
      config: JSON.parse(monitor.config),
    } as LinkMonitorOutput;
  }

  async updateMonitor(id: number, data: Partial<LinkMonitorInput>): Promise<LinkMonitorOutput> {
    const monitor = await prisma.linkMonitor.findUnique({
      where: { id },
    });

    if (!monitor) throw new Error("Monitor not found");

    return prisma.linkMonitor.update({
      where: { id },
      data: {
        enabled: data.enabled !== undefined ? data.enabled : undefined,
        config: data.config ? JSON.stringify(data.config) : undefined,
      },
    }).then((m) => ({
      ...m,
      config: JSON.parse(m.config),
    })) as Promise<LinkMonitorOutput>;
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
