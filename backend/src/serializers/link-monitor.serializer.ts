import { LinkMonitorConfig, LinkMonitorType } from "../types/link";

type LinkMonitorDatabaseRecord = { id: number; config: string };

export function mapLinkMonitorResponse<T extends LinkMonitorDatabaseRecord>(monitor: T): Omit<T, "config" | "monitorType"> & { monitorType: LinkMonitorType; config: LinkMonitorConfig | null } {
  try {
    return { ...monitor, monitorType: (monitor as T & { monitorType: LinkMonitorType }).monitorType, config: JSON.parse(monitor.config) as LinkMonitorConfig };
  } catch {
    console.error(`[LinkMonitorSerializer] Invalid config for monitor ${monitor.id}`);
    return { ...monitor, monitorType: (monitor as T & { monitorType: LinkMonitorType }).monitorType, config: null };
  }
}

export function mapLinkMonitorsResponse<T extends { monitors: LinkMonitorDatabaseRecord[] }>(link: T): Omit<T, "monitors"> & { monitors: Array<Omit<T["monitors"][number], "config" | "monitorType"> & { monitorType: LinkMonitorType; config: LinkMonitorConfig | null }> } {
  return { ...link, monitors: link.monitors.map(mapLinkMonitorResponse) };
}
