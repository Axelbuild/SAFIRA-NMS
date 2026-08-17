// ===== ENUMS & TYPES =====

export type LinkMonitorType = "SNMP" | "ICMP" | "HTTP" | "HTTPS" | "TCP" | "DNS";

export type LinkStatus = "ONLINE" | "SUSPECT" | "OFFLINE" | "UNKNOWN";

export type LinkAlertType =
  | "AVAILABILITY"
  | "LATENCY"
  | "PACKETLOSS"
  | "UTILIZATION"
  | "INTERFACE"
  | "HTTP"
  | "DNS";

// ===== MONITOR CONFIGURATIONS =====

export type SNMPMonitorConfig = {
  ip: string;
  community?: string; // default: "public"
  interfaceIndex?: number; // ifIndex para a interface WAN
  interfaceOid?: string; // OID específico se preferir usar OID direto
  checkCounters64?: boolean; // usar ifHCInOctets/ifHCOutOctets
};

export type ICMPMonitorConfig = {
  target: string; // IP ou hostname
  count?: number; // número de pings (default: 4)
  timeout?: number; // timeout em ms (default: 3000)
  interval?: number; // intervalo entre pings em ms
};

export type HTTPMonitorConfig = {
  url: string;
  method?: "GET" | "POST"; // default: GET
  timeout?: number; // timeout em ms (default: 5000)
  expectedStatus?: number; // status esperado (default: 200)
  followRedirects?: boolean; // seguir redirects (default: false)
  headers?: Record<string, string>; // headers customizados
};

export type TCPMonitorConfig = {
  host: string; // hostname ou IP
  port: number;
  timeout?: number; // timeout em ms (default: 3000)
};

export type DNSMonitorConfig = {
  dnsServer: string; // IP do servidor DNS
  query: string; // domínio a consultar
  recordType?: "A" | "AAAA" | "MX" | "NS" | "CNAME"; // default: A
  timeout?: number; // timeout em ms (default: 5000)
};

export type LinkMonitorConfig =
  | SNMPMonitorConfig
  | ICMPMonitorConfig
  | HTTPMonitorConfig
  | TCPMonitorConfig
  | DNSMonitorConfig;

// ===== METRICS =====

export type SNMPMetrics = {
  ifOperStatus?: string; // UP | DOWN
  ifSpeed?: string; // Velocidade
  ifInOctets?: number;
  ifOutOctets?: number;
  ifInErrors?: number;
  ifOutErrors?: number;
  ifInDiscards?: number;
  ifOutDiscards?: number;
  ifHCInOctets?: number; // 64-bit counter
  ifHCOutOctets?: number; // 64-bit counter
  timestamp?: number; // para cálculo de delta
};

export type ICMPMetrics = {
  latency: number; // em ms
  packetLoss: number; // em percentual (0-100)
  success: boolean;
  target: string;
};

export type HTTPMetrics = {
  statusCode: number;
  responseTime: number; // em ms
  success: boolean;
  url: string;
  error?: string;
};

export type TCPMetrics = {
  responseTime: number; // em ms
  connected: boolean;
  host: string;
  port: number;
  error?: string;
};

export type DNSMetrics = {
  responseTime: number; // em ms
  result?: string; // IP resultante ou CNAME, etc
  success: boolean;
  query: string;
  dnsServer: string;
  error?: string;
};

export type LinkMetrics = {
  online: boolean;
  status: LinkStatus;
  overallStatus: LinkStatus;
  snmp?: SNMPMetrics;
  icmp?: ICMPMetrics;
  http?: HTTPMetrics;
  tcp?: TCPMetrics;
  dns?: DNSMetrics;
  // Consolidados
  latency?: number;
  packetLoss?: number;
  downloadMbps?: number;
  uploadMbps?: number;
  downloadPercent?: number;
  uploadPercent?: number;
};

// ===== INPUT TYPES =====

export type LinkInput = {
  name: string;
  description?: string;
  enabled?: boolean;
  capacity: number; // em Mbps
  groupId: number;
};

export type LinkMonitorInput = {
  linkId: number;
  monitorType: LinkMonitorType;
  enabled?: boolean;
  config: SNMPMonitorConfig | ICMPMonitorConfig | HTTPMonitorConfig | TCPMonitorConfig | DNSMonitorConfig;
};

export type LinkMonitorOutput = {
  id: number;
  linkId: number;
  monitorType: LinkMonitorType;
  enabled: boolean;
  config: Record<string, any>; // Parsed from JSON
  lastCheck: Date | null;
  nextCheck: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type LinkTestRequest = {
  monitorType?: LinkMonitorType; // se omitido, testa todos
};

export type LinkTestResult = {
  monitorType: LinkMonitorType;
  status: "SUCCESS" | "ERROR" | "TIMEOUT";
  latency?: number;
  error?: string;
  metrics?: any;
  timestamp: Date;
};
