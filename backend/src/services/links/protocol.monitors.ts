import { Resolver } from "node:dns/promises";
import { createConnection } from "node:net";
import { performance } from "node:perf_hooks";
import * as snmp from "net-snmp";
import {
  DNSMetrics,
  DNSMonitorConfig,
  HTTPMetrics,
  HTTPMonitorConfig,
  LinkMonitorConfig,
  LinkMonitorType,
  LinkStatus,
  SNMPMetrics,
  SNMPMonitorConfig,
  TCPMetrics,
  TCPMonitorConfig,
} from "../../types/link";
import { ICMPMonitor } from "./icmp.monitor.js";

export type ProtocolResult = {
  status: LinkStatus;
  metrics: Record<string, unknown>;
};

const icmpMonitor = new ICMPMonitor();

function statusFor(success: boolean, responseTime: number, thresholdMs: number): LinkStatus {
  if (!success) return "OFFLINE";
  return responseTime > thresholdMs ? "SUSPECT" : "ONLINE";
}

function positiveMs(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function snmpGet(session: snmp.Session, oids: string[]): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    session.get(oids, (error, varbinds) => {
      session.close();
      if (error) return reject(error);
      const result: Record<string, unknown> = {};
      for (const varbind of varbinds ?? []) {
        if (!snmp.isVarbindError(varbind)) result[varbind.oid] = varbind.value;
      }
      resolve(result);
    });
  });
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "bigint") return Number(value);
  if (Buffer.isBuffer(value)) {
    const parsed = Number(value.toString());
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

export async function monitorSnmp(config: SNMPMonitorConfig): Promise<ProtocolResult> {
  const index = config.interfaceIndex;
  if (!config.ip || !Number.isInteger(index) || index! < 1) throw new Error("SNMP requires ip and interfaceIndex");
  const base = `1.3.6.1.2.1.2.2.1`;
  const hcBase = `1.3.6.1.2.1.31.1.1.1`;
  const oids = [`${base}.8.${index}`, `${base}.5.${index}`, `${base}.10.${index}`, `${base}.16.${index}`, `${base}.14.${index}`, `${base}.20.${index}`, `${base}.13.${index}`, `${base}.19.${index}`, `${hcBase}.6.${index}`, `${hcBase}.10.${index}`];
  const started = performance.now();
  try {
    const session = snmp.createSession(config.ip, config.community ?? "public", {
      port: config.port ?? 161,
      timeout: positiveMs(config.timeout, 3000),
      retries: config.retries ?? 1,
    });
    const values = await snmpGet(session, oids);
    const metric: SNMPMetrics = {
      ifOperStatus: numberValue(values[oids[0]]) === 1 ? "UP" : "DOWN",
      ifSpeed: String(numberValue(values[oids[1]]) ?? ""),
      ifInOctets: numberValue(values[oids[2]]), ifOutOctets: numberValue(values[oids[3]]),
      ifInErrors: numberValue(values[oids[4]]), ifOutErrors: numberValue(values[oids[5]]),
      ifInDiscards: numberValue(values[oids[6]]), ifOutDiscards: numberValue(values[oids[7]]),
      ifHCInOctets: numberValue(values[oids[8]]), ifHCOutOctets: numberValue(values[oids[9]]), timestamp: Date.now(),
    };
    const success = metric.ifOperStatus === "UP";
    return { status: statusFor(success, performance.now() - started, positiveMs(config.timeout, 3000)), metrics: metric as Record<string, unknown> };
  } catch {
    return { status: "OFFLINE", metrics: { success: false, timestamp: Date.now() } };
  }
}

export async function monitorHttp(config: HTTPMonitorConfig): Promise<ProtocolResult> {
  const timeout = positiveMs(config.timeout, 5000);
  const started = performance.now();
  try {
    const response = await fetch(config.url, { method: config.method ?? "GET", headers: config.headers, redirect: config.followRedirects ? "follow" : "manual", signal: AbortSignal.timeout(timeout) });
    const responseTime = performance.now() - started;
    const metrics: HTTPMetrics = { statusCode: response.status, responseTime, success: response.status === (config.expectedStatus ?? 200), url: config.url };
    return { status: statusFor(metrics.success, responseTime, positiveMs(config.responseTimeThresholdMs, timeout)), metrics: metrics as Record<string, unknown> };
  } catch (error) {
    const responseTime = performance.now() - started;
    return { status: "OFFLINE", metrics: { statusCode: 0, responseTime, success: false, url: config.url, error: error instanceof Error ? error.message : "HTTP request failed" } };
  }
}

export async function monitorTcp(config: TCPMonitorConfig): Promise<ProtocolResult> {
  const timeout = positiveMs(config.timeout, 3000);
  const started = performance.now();
  return new Promise((resolve) => {
    const socket = createConnection({ host: config.host, port: config.port });
    let settled = false;
    const finish = (connected: boolean, error?: string) => {
      if (settled) return; settled = true; socket.destroy();
      const responseTime = performance.now() - started;
      const metrics: TCPMetrics = { responseTime, connected, host: config.host, port: config.port, error };
      resolve({ status: statusFor(connected, responseTime, positiveMs(config.responseTimeThresholdMs, timeout)), metrics: metrics as Record<string, unknown> });
    };
    socket.setTimeout(timeout, () => finish(false, "TCP timeout"));
    socket.once("connect", () => finish(true));
    socket.once("error", (error) => finish(false, error.message));
  });
}

export async function monitorDns(config: DNSMonitorConfig): Promise<ProtocolResult> {
  const timeout = positiveMs(config.timeout, 5000);
  const started = performance.now();
  try {
    const resolver = new Resolver(); resolver.setServers([config.dnsServer]);
    const records = await Promise.race([
      resolver.resolve(config.query, config.recordType ?? "A"),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("DNS timeout")), timeout)),
    ]);
    const responseTime = performance.now() - started;
    const metrics: DNSMetrics = { responseTime, result: JSON.stringify(records), success: true, query: config.query, dnsServer: config.dnsServer };
    return { status: statusFor(true, responseTime, positiveMs(config.responseTimeThresholdMs, timeout)), metrics: metrics as Record<string, unknown> };
  } catch (error) {
    const responseTime = performance.now() - started;
    return { status: "OFFLINE", metrics: { responseTime, success: false, query: config.query, dnsServer: config.dnsServer, error: error instanceof Error ? error.message : "DNS query failed" } };
  }
}

export async function runProtocolMonitor(type: LinkMonitorType, config: LinkMonitorConfig): Promise<ProtocolResult> {
  if (type === "ICMP") {
    const value = config as any; const metrics = await icmpMonitor.monitor(value.target, value.count ?? 4, value.timeout ?? 3000);
    return { status: icmpMonitor.getStatus(metrics, value.latencyThresholdMs ?? 300), metrics: metrics as Record<string, unknown> };
  }
  if (type === "SNMP") return monitorSnmp(config as SNMPMonitorConfig);
  if (type === "HTTP" || type === "HTTPS") return monitorHttp(config as HTTPMonitorConfig);
  if (type === "TCP") return monitorTcp(config as TCPMonitorConfig);
  return monitorDns(config as DNSMonitorConfig);
}
