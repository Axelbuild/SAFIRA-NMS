import { Resolver } from "node:dns/promises";
import type { DNSMonitorConfig } from "../../types/link";

type DnsRecordType = NonNullable<DNSMonitorConfig["recordType"]>;

export type DnsResolver = {
  setServers(servers: string[]): void;
  resolve(hostname: string, recordType: DnsRecordType): Promise<unknown>;
  cancel(): void;
};

export type DnsQueryDependencies = {
  createResolver?: () => DnsResolver;
  setTimer?: (callback: () => void, timeoutMs: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
};

function createResolver(): DnsResolver {
  const resolver = new Resolver();
  return {
    setServers: (servers) => resolver.setServers(servers),
    resolve: (hostname, recordType) => resolver.resolve(hostname, recordType),
    cancel: () => resolver.cancel(),
  };
}

export function resolveDnsWithTimeout(
  config: DNSMonitorConfig,
  timeoutMs: number,
  dependencies: DnsQueryDependencies = {}
): Promise<unknown> {
  const resolver = (dependencies.createResolver ?? createResolver)();
  const setTimer: NonNullable<DnsQueryDependencies["setTimer"]> =
    dependencies.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
  const clearTimer: NonNullable<DnsQueryDependencies["clearTimer"]> =
    dependencies.clearTimer ?? ((timer) => clearTimeout(timer));
  resolver.setServers([config.dnsServer]);

  return new Promise((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const clearPendingTimer = () => {
      if (timer === undefined) return;
      clearTimer(timer);
      timer = undefined;
    };

    const settle = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearPendingTimer();
      callback();
    };

    let query: Promise<unknown>;
    try {
      query = resolver.resolve(config.query, config.recordType ?? "A");
    } catch (error) {
      settle(() => reject(error));
      return;
    }

    query.then(
      (records) => settle(() => resolve(records)),
      (error) => settle(() => reject(error))
    );

    timer = setTimer(() => {
      if (settled) return;
      settled = true;
      clearPendingTimer();
      resolver.cancel();
      reject(new Error("DNS timeout"));
    }, timeoutMs);
  });
}
