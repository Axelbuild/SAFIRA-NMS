import type { DNSMonitorConfig } from "../../types/link";

export const DNS_RECORD_TYPES = ["A", "AAAA", "MX", "NS", "CNAME"] as const;

export function assertValidDnsRecordType(
  value: unknown
): asserts value is DNSMonitorConfig["recordType"] {
  if (
    value !== undefined &&
    !DNS_RECORD_TYPES.includes(value as (typeof DNS_RECORD_TYPES)[number])
  ) {
    throw new Error(
      `DNS config.recordType must be one of: ${DNS_RECORD_TYPES.join(", ")}`
    );
  }
}
