import assert from "node:assert/strict";
import { createServer } from "node:net";
import test from "node:test";
import { monitorDns, monitorHttp, monitorSnmp, monitorTcp, runProtocolMonitor } from "./protocol.monitors.js";

test("HTTP mede responseTime como número em ms", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("ok", { status: 200 });
  try {
    const result = await monitorHttp({ url: "http://monitor.local", responseTimeThresholdMs: 1000 });
    assert.equal(result.status, "ONLINE");
    assert.equal(typeof result.metrics.responseTime, "number");
  } finally { globalThis.fetch = originalFetch; }
});

test("HTTPS usa o mesmo monitor e mantém responseTime em ms", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response("ok", { status: 200 });
  try {
    const result = await runProtocolMonitor("HTTPS", { url: "https://monitor.local", responseTimeThresholdMs: 1000 });
    assert.equal(result.status, "ONLINE");
    assert.equal(typeof result.metrics.responseTime, "number");
  } finally { globalThis.fetch = originalFetch; }
});

test("TCP conecta a serviço local e mede em ms", async () => {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const result = await monitorTcp({ host: "127.0.0.1", port: address.port, timeout: 1000 });
    assert.equal(result.status, "ONLINE");
    assert.equal(typeof result.metrics.responseTime, "number");
  } finally { await new Promise<void>((resolve) => server.close(() => resolve())); }
});

test("DNS executa a consulta e retorna tempo numérico em ms mesmo na falha", async () => {
  const result = await monitorDns({ dnsServer: "127.0.0.1", query: "example.invalid", timeout: 25 });
  assert.equal(result.status, "OFFLINE");
  assert.equal(typeof result.metrics.responseTime, "number");
});

test("SNMP executa a consulta e retorna OFFLINE sem agente", async () => {
  const result = await monitorSnmp({ ip: "127.0.0.1", interfaceIndex: 1, timeout: 25, retries: 0 });
  assert.equal(result.status, "OFFLINE");
});
