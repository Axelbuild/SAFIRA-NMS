export type ServerOSType = "LINUX" | "WINDOWS";

export type ServerCPUMetrics = {
  usage: number; // Porcentagem (0-100)
  cores: number;
};

export type ServerMemoryMetrics = {
  total: number; // em MB
  used: number;  // em MB
  free: number;  // em MB
  usagePercent: number; // Porcentagem (0-100)
};

export type ServerDiskMetric = {
  name: string;
  mountPoint: string;
  total: number; // em MB
  used: number;  // em MB
  free: number;  // em MB
  usagePercent: number;
};

export type ServerNetworkInterface = {
  name: string;
  ipAddress?: string;
  macAddress?: string;
  status: "UP" | "DOWN";
  bytesIn: number;
  bytesOut: number;
  packetsIn: number;
  packetsOut: number;
};

export type ServerMetrics = {
  online: boolean;
  hostname?: string;
  osVersion?: string;
  uptime?: number; // em segundos
  cpu?: ServerCPUMetrics;
  memory?: ServerMemoryMetrics;
  disks?: ServerDiskMetric[];
  interfaces?: ServerNetworkInterface[];
};

export type ServerStatus = {
  ip: string;
  online: boolean;
  metrics: ServerMetrics;
};

export type ServerInput = {
  name: string;
  ip: string;
  osType: ServerOSType;
  hostname?: string;
  groupId: number;
};

export type ServerSNMPTarget = {
  ip: string;
  osType: ServerOSType;
  community?: string; // SNMP community, default: "public"
};
