// ===== ENUMS & TYPES =====

export type LinkMonitorType = "SNMP" | "ICMP" | "HTTP" | "HTTPS" | "TCP" | "DNS";

export type LinkStatus = "ONLINE" | "SUSPECT" | "OFFLINE" | "UNKNOWN";

/** Numeric duration or latency. The unit is always milliseconds (ms). */
export type Milliseconds = number;

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
  port?: number;
  timeout?: Milliseconds;
  retries?: number;
  interfaceIndex?: number; // ifIndex para a interface WAN
  interfaceOid?: string; // OID específico se preferir usar OID direto
  checkCounters64?: boolean; // usar ifHCInOctets/ifHCOutOctets
};

export type ICMPMonitorConfig = {
  target: string; // IP ou hostname
  count?: number; // número de pings (default: 4)
  timeout?: Milliseconds; // timeout em ms (default: 3000)
  interval?: Milliseconds; // intervalo entre pings em ms
  latencyThresholdMs?: Milliseconds; // threshold de latência, sempre em ms
};

export type HTTPMonitorConfig = {
  url: string;
  method?: "GET" | "POST"; // default: GET
  timeout?: Milliseconds; // timeout em ms (default: 5000)
  responseTimeThresholdMs?: Milliseconds; // threshold, sempre em ms
  expectedStatus?: number; // status esperado (default: 200)
  followRedirects?: boolean; // seguir redirects (default: false)
  headers?: Record<string, string>; // headers customizados
};

export type TCPMonitorConfig = {
  host: string; // hostname ou IP
  port: number;
  timeout?: Milliseconds; // timeout em ms (default: 3000)
  responseTimeThresholdMs?: Milliseconds; // threshold, sempre em ms
};

export type DNSMonitorConfig = {
  dnsServer: string; // IP do servidor DNS
  query: string; // domínio a consultar
  recordType?: "A" | "AAAA" | "MX" | "NS" | "CNAME"; // default: A
  timeout?: Milliseconds; // timeout em ms (default: 5000)
  responseTimeThresholdMs?: Milliseconds; // threshold, sempre em ms
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
  latency: Milliseconds | null; // sempre em ms; null somente se não interpretável
  packetLoss: number; // em percentual (0-100)
  success: boolean;
  interpretable?: boolean;
  target: string;
};

export type HTTPMetrics = {
  statusCode: number;
  responseTime: Milliseconds; // sempre em ms
  success: boolean;
  url: string;
  error?: string;
};

export type TCPMetrics = {
  responseTime: Milliseconds; // sempre em ms
  connected: boolean;
  host: string;
  port: number;
  error?: string;
};

export type DNSMetrics = {
  responseTime: Milliseconds; // sempre em ms
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
  https?: HTTPMetrics;
  tcp?: TCPMetrics;
  dns?: DNSMetrics;
  // Consolidados
  latency?: Milliseconds; // sempre em ms
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
  config: LinkMonitorConfig | null; // JSON público desserializado; null se legado inválido
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
  latency?: Milliseconds; // sempre em ms
  responseTime?: Milliseconds; // sempre em ms
  error?: string;
  metrics?: any;
  timestamp: Date;
};
