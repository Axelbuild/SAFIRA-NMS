import * as snmp from "net-snmp";
import {
  SYSTEM_NAME_OID,
  SYSTEM_DESCRIPTION_OID,
  SYSTEM_UPTIME_OID,
  LINUX_CPU_LOAD_1MIN_OID,
  LINUX_MEM_TOTAL_OID,
  LINUX_MEM_USED_OID,
  HOST_STORAGE_TABLE_OID,
  HOST_STORAGE_DESCR_OID,
  HOST_STORAGE_SIZE_OID,
  HOST_STORAGE_USED_OID,
  HOST_STORAGE_ALLOCATION_UNITS_OID,
  IF_DESCR_OID,
  IF_OPER_STATUS_OID,
  IF_IN_OCTETS_OID,
  IF_OUT_OCTETS_OID,
  IF_PHYS_ADDRESS_OID,
  IP_ADDR_TABLE_OID,
  IP_ADDR_ENT_ADDR_OID,
} from "./server.oids";
import { ServerMetrics, ServerOSType } from "../types/server";

const SNMP_TIMEOUT = 3000; // 3 segundos
const SNMP_RETRIES = 0;

function createSession(ip: string, community: string = "public"): any {
  const options = {
    timeout: SNMP_TIMEOUT,
    retries: SNMP_RETRIES,
    idBranch: [1, 3, 6, 1, 4, 1, 99999],
  };

  return snmp.createSession(ip, community, options);
}

function snmpGet(session: any, oids: string[]): Promise<Record<string, any>> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.close();
      reject(new Error("SNMP GET timeout"));
    }, SNMP_TIMEOUT + 1000);

    session.get(oids, (err: any, varbinds: any) => {
      clearTimeout(timeout);
      if (err) {
        session.close();
        reject(err);
      } else {
        const result: Record<string, any> = {};
        varbinds.forEach((vb: any) => {
          result[vb.oid] = vb.value;
        });
        session.close();
        resolve(result);
      }
    });
  });
}

function snmpWalk(session: any, oid: string): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      session.close();
      reject(new Error("SNMP WALK timeout"));
    }, SNMP_TIMEOUT + 1000);

    const varbinds: any[] = [];

    session.walk(
      oid,
      (vb: any) => {
        // feedCb - called for each varbind
        if (!snmp.isVarbindError(vb)) {
          varbinds.push(vb);
        }
      },
      (err: any) => {
        // doneCb - called when done
        clearTimeout(timeout);
        session.close();

        if (err) {
          reject(err);
        } else {
          resolve(varbinds);
        }
      }
    );

    // Workaround: close after a reasonable time for walk operations
    const walkTimeout = setTimeout(() => {
      clearTimeout(timeout);
      session.close();
      resolve(varbinds);
    }, SNMP_TIMEOUT + 1000);
  });
}

export async function getServerSystemInfo(
  ip: string,
  osType: ServerOSType
): Promise<Partial<ServerMetrics>> {
  const session = createSession(ip);

  try {
    const oids = [SYSTEM_NAME_OID, SYSTEM_DESCRIPTION_OID, SYSTEM_UPTIME_OID];
    const varbinds = await snmpGet(session, oids);

    const hostname = varbinds[SYSTEM_NAME_OID];
    const description = varbinds[SYSTEM_DESCRIPTION_OID];
    const uptimeRaw = varbinds[SYSTEM_UPTIME_OID]; // em centiseconds
    const uptime = uptimeRaw ? uptimeRaw / 100 : undefined; // converter para segundos

    // Parse OS version from description se possível
    let osVersion: string | undefined;
    if (description && typeof description === "string") {
      osVersion = description;
    }

    return {
      hostname: typeof hostname === "string" ? hostname : undefined,
      osVersion,
      uptime: typeof uptime === "number" ? uptime : undefined,
    };
  } catch (error) {
    console.error(`SNMP error getting system info from ${ip}:`, error);
    return {};
  }
}

export async function getServerCPUMetrics(
  ip: string,
  osType: ServerOSType
): Promise<any> {
  const session = createSession(ip);

  try {
    if (osType === "LINUX") {
      // Use load average como aproximação de CPU
      const varbinds = await snmpGet(session, [LINUX_CPU_LOAD_1MIN_OID]);
      const load1min = varbinds[LINUX_CPU_LOAD_1MIN_OID];

      return {
        usage: typeof load1min === "number" ? Math.min(load1min * 100, 100) : 0,
        cores: 1, // Será refinado se conseguir descobrir
      };
    } else {
      // Windows - implementar depois
      return { usage: 0, cores: 1 };
    }
  } catch (error) {
    console.error(`SNMP error getting CPU metrics from ${ip}:`, error);
    return { usage: 0, cores: 1 };
  }
}

export async function getServerMemoryMetrics(
  ip: string,
  osType: ServerOSType
): Promise<any> {
  const session = createSession(ip);

  try {
    if (osType === "LINUX") {
      const varbinds = await snmpGet(session, [
        LINUX_MEM_TOTAL_OID,
        LINUX_MEM_USED_OID,
      ]);

      const memTotal = varbinds[LINUX_MEM_TOTAL_OID]; // em KB
      const memUsed = varbinds[LINUX_MEM_USED_OID]; // em KB

      const totalMB = typeof memTotal === "number" ? memTotal / 1024 : 0;
      const usedMB = typeof memUsed === "number" ? memUsed / 1024 : 0;
      const freeMB = totalMB - usedMB;

      return {
        total: totalMB,
        used: usedMB,
        free: freeMB,
        usagePercent: totalMB > 0 ? (usedMB / totalMB) * 100 : 0,
      };
    } else {
      // Windows - implementar depois
      return { total: 0, used: 0, free: 0, usagePercent: 0 };
    }
  } catch (error) {
    console.error(`SNMP error getting memory metrics from ${ip}:`, error);
    return { total: 0, used: 0, free: 0, usagePercent: 0 };
  }
}

export async function getServerStorageMetrics(
  ip: string,
  osType: ServerOSType
): Promise<any[]> {
  const session = createSession(ip);

  try {
    // Walk da tabela de storage
    const varbinds = await snmpWalk(session, HOST_STORAGE_TABLE_OID);

    if (varbinds.length === 0) {
      return [];
    }

    // Parse varbinds para construir array de storage
    const storageMap: Record<string, Record<string, any>> = {};

    varbinds.forEach((vb) => {
      const oidParts = vb.oid.split(".");
      const storageIndex = oidParts[oidParts.length - 1];
      const oidType = oidParts.slice(0, -1).join(".");

      if (!storageMap[storageIndex]) {
        storageMap[storageIndex] = { index: storageIndex };
      }

      if (oidType === HOST_STORAGE_DESCR_OID) {
        storageMap[storageIndex].description = vb.value;
      } else if (oidType === HOST_STORAGE_SIZE_OID) {
        storageMap[storageIndex].size = vb.value;
      } else if (oidType === HOST_STORAGE_USED_OID) {
        storageMap[storageIndex].used = vb.value;
      } else if (oidType === HOST_STORAGE_ALLOCATION_UNITS_OID) {
        storageMap[storageIndex].allocationUnits = vb.value;
      }
    });

    // Converter para formato de discos, filtrando apenas volumes de disco
    const disks = Object.values(storageMap)
      .filter((storage) => {
        // Descartar entradas que não são discos (como ram, swap, etc)
        const desc = (storage.description || "").toLowerCase();
        return (
          desc.includes("disk") ||
          desc.includes("partition") ||
          desc.includes("mount")
        );
      })
      .map((storage) => {
        const allocationUnits = storage.allocationUnits || 1;
        const totalBytes = (storage.size || 0) * allocationUnits;
        const usedBytes = (storage.used || 0) * allocationUnits;
        const totalMB = totalBytes / (1024 * 1024);
        const usedMB = usedBytes / (1024 * 1024);

        return {
          name: storage.description || `Disk ${storage.index}`,
          mountPoint: storage.description || "/",
          total: totalMB,
          used: usedMB,
          free: totalMB - usedMB,
          usagePercent:
            totalMB > 0 ? (usedMB / totalMB) * 100 : 0,
        };
      });

    return disks;
  } catch (error) {
    console.error(`SNMP error getting storage metrics from ${ip}:`, error);
    return [];
  }
}

export async function getServerNetworkInterfaces(
  ip: string,
  osType: ServerOSType
): Promise<any[]> {
  const session = createSession(ip);

  try {
    const varbinds = await snmpWalk(session, IF_DESCR_OID);

    if (varbinds.length === 0) {
      return [];
    }

    const interfaceMap: Record<string, Record<string, any>> = {};

    varbinds.forEach((vb) => {
      const oidParts = vb.oid.split(".");
      const ifIndex = oidParts[oidParts.length - 1];

      if (!interfaceMap[ifIndex]) {
        interfaceMap[ifIndex] = { index: ifIndex };
      }

      interfaceMap[ifIndex].description = vb.value;
    });

    // Get additional info for each interface
    const interfaces = Object.values(interfaceMap).map((iface) => ({
      name: iface.description || `Interface ${iface.index}`,
      status: "UP", // Será refinado com mais OID queries
      bytesIn: 0,
      bytesOut: 0,
      packetsIn: 0,
      packetsOut: 0,
    }));

    return interfaces;
  } catch (error) {
    console.error(
      `SNMP error getting network interfaces from ${ip}:`,
      error
    );
    return [];
  }
}

export async function getServerMetrics(
  ip: string,
  osType: ServerOSType
): Promise<ServerMetrics> {
  try {
    // Executar todas as chamadas em paralelo
    const [systemInfo, cpu, memory, storage, interfaces] = await Promise.all([
      getServerSystemInfo(ip, osType),
      getServerCPUMetrics(ip, osType),
      getServerMemoryMetrics(ip, osType),
      getServerStorageMetrics(ip, osType),
      getServerNetworkInterfaces(ip, osType),
    ]);

    return {
      online: true,
      hostname: systemInfo.hostname,
      osVersion: systemInfo.osVersion,
      uptime: systemInfo.uptime,
      cpu,
      memory,
      disks: storage,
      interfaces,
    };
  } catch (error) {
    console.error(`Error getting server metrics for ${ip}:`, error);
    return {
      online: false,
      hostname: undefined,
      osVersion: undefined,
      uptime: undefined,
      cpu: { usage: 0, cores: 0 },
      memory: { total: 0, used: 0, free: 0, usagePercent: 0 },
      disks: [],
      interfaces: [],
    };
  }
}
