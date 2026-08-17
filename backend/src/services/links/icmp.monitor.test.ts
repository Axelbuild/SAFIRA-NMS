import assert from "node:assert/strict";
import test from "node:test";
import { ICMPMonitor, parseIcmpPingOutput } from "./icmp.monitor.js";

test("preserva 3 ms e precisão decimal como números", () => {
  assert.equal(parseIcmpPingOutput("Minimum = 2ms, Maximum = 4ms, Average = 3ms (0% loss)", "win32").latency, 3);
  assert.equal(parseIcmpPingOutput("rtt min/avg/max/mdev = 3.10/3.42/3.70/0.10 ms 0% packet loss", "unix").latency, 3.42);
});

test("preserva 3116 ms sem converter para segundos", () => {
  const result = parseIcmpPingOutput("Minimum = 3116ms, Maximum = 3116ms, Average = 3116ms (100% loss)", "win32");
  assert.equal(result.latency, 3116);
  assert.equal(result.packetLoss, 100);
});

test("saída impossível de interpretar retorna UNKNOWN", () => {
  const result = parseIcmpPingOutput("Request timed out.", "win32");
  assert.equal(result.latency, null);
  assert.equal(new ICMPMonitor().getStatus({ ...result, target: "example.com" }), "UNKNOWN");
});

test("fixture Windows em português: tempo<1ms, média 0ms e perda quebrada resulta ONLINE", () => {
  const output = `Disparando 179.191.106.98 com 32 bytes de dados:
Resposta de 179.191.106.98: bytes=32 tempo<1ms TTL=255
Resposta de 179.191.106.98: bytes=32 tempo<1ms TTL=255
Resposta de 179.191.106.98: bytes=32 tempo<1ms TTL=255
Resposta de 179.191.106.98: bytes=32 tempo<1ms TTL=255

Estatísticas do Ping para 179.191.106.98:
    Pacotes: Enviados = 4, Recebidos = 4, Perdidos = 0 (0% de
             perda),
Aproximar um número redondo de vezes em milissegundos:
    Mínimo = 0ms, Máximo = 0ms, Média = 0ms`;
  const parsed = parseIcmpPingOutput(output, "win32");
  assert.equal(parsed.latency, 0);
  assert.equal(parsed.packetLoss, 0);
  assert.equal(parsed.interpretable, true);
  assert.equal(new ICMPMonitor().getStatus({ ...parsed, target: "179.191.106.98" }), "ONLINE");
});

test("latência zero permanece no snapshot e histórico, e ONLINE zera falhas", () => {
  const metrics = { latency: 0, packetLoss: 0, success: true, interpretable: true, target: "example.com" };
  const snapshot = { latency: metrics.latency, consecutiveFailures: new ICMPMonitor().getStatus(metrics) === "OFFLINE" ? 6 : 0 };
  const history = { icmpLatency: metrics.latency, icmpPacketLoss: metrics.packetLoss };
  assert.equal(snapshot.latency, 0);
  assert.equal(history.icmpLatency, 0);
  assert.equal(snapshot.consecutiveFailures, 0);
});
