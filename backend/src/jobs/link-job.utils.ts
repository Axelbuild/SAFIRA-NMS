import { LinkStatus, SNMPMetrics } from "../types/link";

export function consolidateStatus(statuses: Array<LinkStatus | undefined>): LinkStatus {
  const values = statuses.filter((value): value is LinkStatus => value !== undefined);
  if (!values.length || values.every((value) => value === "UNKNOWN")) return "UNKNOWN";
  if (values.includes("OFFLINE")) return "OFFLINE";
  if (values.includes("SUSPECT")) return "SUSPECT";
  if (values.includes("ONLINE")) return "ONLINE";
  return "UNKNOWN";
}

export function calculateSnmpTraffic(previous: SNMPMetrics | undefined, current: SNMPMetrics, previousAt: Date | undefined, capacity: number) {
  if (!previous || !previousAt || !current.timestamp) return {};
  const elapsedSeconds = (current.timestamp - previousAt.getTime()) / 1000;
  if (elapsedSeconds <= 0) return {};
  const inNow = current.ifHCInOctets ?? current.ifInOctets;
  const outNow = current.ifHCOutOctets ?? current.ifOutOctets;
  const inBefore = previous.ifHCInOctets ?? previous.ifInOctets;
  const outBefore = previous.ifHCOutOctets ?? previous.ifOutOctets;
  const toMbps = (now?: number, before?: number) => now === undefined || before === undefined || now < before ? undefined : ((now - before) * 8) / elapsedSeconds / 1_000_000;
  const downloadMbps = toMbps(inNow, inBefore);
  const uploadMbps = toMbps(outNow, outBefore);
  return { downloadMbps, uploadMbps, downloadPercent: downloadMbps === undefined ? undefined : (downloadMbps / capacity) * 100, uploadPercent: uploadMbps === undefined ? undefined : (uploadMbps / capacity) * 100 };
}
