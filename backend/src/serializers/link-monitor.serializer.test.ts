import assert from "node:assert/strict";
import test from "node:test";
import { mapLinkMonitorResponse, mapLinkMonitorsResponse } from "./link-monitor.serializer.js";

const monitor = {
  id: 10, linkId: 2, monitorType: "ICMP", enabled: true,
  config: '{"target":"179.191.106.98","count":4,"timeout":3000}',
  lastCheck: null, nextCheck: null, createdAt: new Date(), updatedAt: new Date(),
};

test("desserializa config sem alterar o objeto Prisma original", () => {
  const result = mapLinkMonitorResponse(monitor);
  assert.deepEqual(result.config, { target: "179.191.106.98", count: 4, timeout: 3000 });
  assert.equal(monitor.config, '{"target":"179.191.106.98","count":4,"timeout":3000}');
});

test("mapeia todos os monitores aninhados e preserva array vazio", () => {
  const link = { id: 2, monitors: [monitor, { ...monitor, id: 11, monitorType: "TCP", config: '{"host":"127.0.0.1","port":443}' }] };
  const mapped = mapLinkMonitorsResponse(link);
  assert.equal(mapped.monitors.length, 2);
  assert.deepEqual(mapped.monitors[1].config, { host: "127.0.0.1", port: 443 });
  assert.deepEqual(mapLinkMonitorsResponse({ id: 3, monitors: [] }).monitors, []);
});

test("JSON legado inválido retorna null e log sanitizado", () => {
  const originalError = console.error;
  const logs: unknown[][] = [];
  console.error = (...args: unknown[]) => logs.push(args);
  try {
    const result = mapLinkMonitorResponse({ ...monitor, id: 99, config: '{"secret":"do-not-log"' });
    assert.equal(result.config, null);
    assert.equal(logs.length, 1);
    assert.equal(String(logs[0][0]), "[LinkMonitorSerializer] Invalid config for monitor 99");
    assert.equal(String(logs[0][0]).includes("do-not-log"), false);
  } finally { console.error = originalError; }
});
