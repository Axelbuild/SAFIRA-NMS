import { execFile } from "child_process";
import { promisify } from "util";
import { ICMPMetrics, LinkStatus } from "../../types/link";

const execFileAsync = promisify(execFile);
type PingPlatform = "win32" | "unix";

function parseMilliseconds(value: string): number {
  return Number.parseFloat(value.replace(",", "."));
}

/** Extracts ping's reported average. All returned values are milliseconds. */
export function parseIcmpPingOutput(output: string, platform: PingPlatform) {
  const normalized = output.replace(/\s+/g, " ").trim();
  const packetLossMatch = normalized.match(/(\d+(?:[.,]\d+)?)%\s*(?:(?:packet\s+)?loss|de\s+perda)/i);
  const packetLoss = packetLossMatch
    ? Math.min(Math.max(parseMilliseconds(packetLossMatch[1]), 0), 100)
    : null;
  const latencyMatch = platform === "win32"
    ? normalized.match(/(?:Average|M[^\s=]*dia)\s*=\s*(\d+(?:[.,]\d+)?)\s*ms/i)
    : normalized.match(/(?:rtt|round-trip)[^=]*=\s*\d+(?:[.,]\d+)?\s*\/\s*(\d+(?:[.,]\d+)?)/i);
  const parsedLatency = latencyMatch ? parseMilliseconds(latencyMatch[1]) : null;
  const latency = parsedLatency !== null && Number.isFinite(parsedLatency) && parsedLatency >= 0
    ? parsedLatency
    : null;
  const interpretable = latency !== null && packetLoss !== null;

  return {
    latency,
    packetLoss: packetLoss ?? 0,
    interpretable,
    success: interpretable && packetLoss < 100,
  };
}

export class ICMPMonitor {
  /** Executes ICMP monitoring. Inputs and returned latency are always ms. */
  async monitor(target: string, count: number = 4, timeout: number = 3000): Promise<ICMPMetrics> {
    if (!target || typeof target !== "string") throw new Error("target must be a non-empty string");
    const isWindows = process.platform === "win32";
    const safeCount = Number.isInteger(count) && count > 0 ? count : 4;
    const safeTimeout = Number.isFinite(timeout) && timeout > 0 ? timeout : 3000;
    const args = isWindows
      ? ["-n", String(safeCount), "-w", String(safeTimeout), target]
      : ["-c", String(safeCount), "-W", String(Math.ceil(safeTimeout / 1000)), target];
    let output = "";
    try {
      output = (await execFileAsync("ping", args, { encoding: "utf-8", timeout: safeTimeout * safeCount + 1000, maxBuffer: 1024 * 1024 })).stdout;
    } catch (error: unknown) {
      output = typeof error === "object" && error && "stdout" in error ? String((error as { stdout?: unknown }).stdout ?? "") : "";
    }
    return { ...parseIcmpPingOutput(output, isWindows ? "win32" : "unix"), target };
  }

  /** Determines status with a latency threshold expressed in ms. */
  getStatus(metrics: ICMPMetrics, latencyThresholdMs: number = 300): LinkStatus {
    if (metrics.interpretable === false || metrics.latency == null) return "UNKNOWN";
    if (metrics.packetLoss >= 100) return "OFFLINE";
    if (metrics.packetLoss > 0 || metrics.latency > latencyThresholdMs) return "SUSPECT";
    return "ONLINE";
  }
}
