import { prisma } from "../database";
import { ServerModel } from "../models/server.models";
import { isValidNumber } from "../utils/validators";
import { isValidIP } from "../utils/ip";
import { ServerInput, ServerOSType } from "../types/server";

function cleanString(value?: string | null) {
  if (!value) return null;

  const cleaned = value.replace(/\u0000/g, "").replace(/\0/g, "").trim();

  return cleaned.length > 0 ? cleaned : null;
}

export class ServerService {
  async create(data: ServerInput) {
    const { name, ip, osType, hostname, groupId } = data;

    if (!name) throw new Error("name is required");
    if (!isValidNumber(groupId)) throw new Error("groupId must be a valid number");
    if (!isValidIP(ip)) throw new Error("Invalid IP");
    if (!osType) throw new Error("osType is required");
    if (!["LINUX", "WINDOWS"].includes(osType)) {
      throw new Error("osType must be LINUX or WINDOWS");
    }

    const cleanedIp = cleanString(ip) ?? "";
    const cleanedName = cleanString(name) ?? "";
    const cleanedHostname = cleanString(hostname);

    const server = new ServerModel(
      cleanedName,
      cleanedIp,
      osType as ServerOSType,
      Number(groupId),
      cleanedHostname ?? undefined,
      new Date()
    );

    return prisma.servers.create({
      data: {
        name: server.name,
        ip: server.ip,
        osType: server.osType,
        hostname: server.hostname,
        groupId: server.groupId,
      },
    });
  }

  async findAll() {
    return prisma.servers.findMany({
      include: { group: true },
    });
  }

  async findById(id: number) {
    return prisma.servers.findUnique({
      where: { id },
      include: { group: true },
    });
  }

  async findByGroupId(groupId: number) {
    return prisma.servers.findMany({
      where: { groupId },
      include: { group: true },
    });
  }

  async update(id: number, data: Partial<ServerInput>) {
    if (data.ip && !isValidIP(data.ip)) {
      throw new Error("Invalid IP");
    }

    if (data.groupId !== undefined && !isValidNumber(data.groupId)) {
      throw new Error("groupId must be a valid number");
    }

    if (data.osType && !["LINUX", "WINDOWS"].includes(data.osType)) {
      throw new Error("osType must be LINUX or WINDOWS");
    }

    return prisma.servers.update({
      where: { id },
      data: {
        name: data.name !== undefined ? cleanString(data.name) ?? "" : undefined,
        ip: data.ip !== undefined ? cleanString(data.ip) ?? "" : undefined,
        osType: data.osType !== undefined ? data.osType : undefined,
        hostname:
          data.hostname !== undefined ? cleanString(data.hostname) : undefined,
        groupId: data.groupId !== undefined ? Number(data.groupId) : undefined,
      },
    });
  }

  async delete(id: number) {
    const serverExists = await prisma.servers.findUnique({
      where: { id },
    });

    if (!serverExists) {
      throw new Error("Server not found");
    }

    // Delete related data first
    await prisma.serverIpHistory.deleteMany({ where: { serverId: id } });
    await prisma.serverAlertState.deleteMany({ where: { serverId: id } });
    await prisma.serverMetricsSnapshot.deleteMany({ where: { serverId: id } });

    return prisma.servers.delete({
      where: { id },
    });
  }
}
