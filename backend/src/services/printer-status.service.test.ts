import assert from "node:assert/strict";
import test from "node:test";
import { Printers } from "../../generated/prisma/client.js";
import {
  getPrinterStatuses,
  mapPrinterStatus,
  PrinterStatusReader,
} from "./printer-status.service.js";

function printer(id: number, serialNumber: string | null = null): Printers {
  return {
    id,
    name: `Printer ${id}`,
    ip: `192.0.2.${id}`,
    serialNumber,
    serialAlertSent: false,
    lastRecoveryAttemptAt: null,
    recoveryAttempts: 0,
    brand: "HP",
    model: "M404",
    groupId: 1,
    createdAt: new Date(0),
  };
}

test("falha isolada recebe fallback e as demais consultas continuam", async () => {
  const logs: unknown[][] = [];
  const reader: PrinterStatusReader = async ({ ip }) => {
    if (ip.endsWith(".2")) throw new Error("SNMP indisponível");
    return { ip, online: true, serialNumber: `SN-${ip}`, ink: { black: 80 } };
  };

  const result = await getPrinterStatuses(
    [printer(1), printer(2), printer(3)],
    2,
    reader,
    { error: (...args: unknown[]) => logs.push(args) }
  );

  assert.equal(result.length, 3);
  assert.equal(result[0].online, true);
  assert.deepEqual(result[1], {
    id: 2,
    name: "Printer 2",
    ip: "192.0.2.2",
    serialNumber: null,
    groupId: 1,
    online: false,
    ink: {},
  });
  assert.equal(result[2].online, true);
  assert.equal(logs.length, 1);
  assert.match(String(logs[0][0]), /Printer 2.*192\.0\.2\.2/);
});

test("mantém a ordem mesmo quando as consultas terminam fora de ordem", async () => {
  const releases = new Map<string, () => void>();
  const reader: PrinterStatusReader = ({ ip }) =>
    new Promise((resolve) => {
      releases.set(ip, () =>
        resolve({ ip, online: true, serialNumber: null, ink: { black: 50 } })
      );
    });

  const pending = getPrinterStatuses([printer(1), printer(2), printer(3)], 3, reader);
  await new Promise<void>((resolve) => setImmediate(resolve));
  releases.get("192.0.2.3")?.();
  releases.get("192.0.2.1")?.();
  releases.get("192.0.2.2")?.();

  const result = await pending;
  assert.deepEqual(result.map(({ id }) => id), [1, 2, 3]);
});

test("serial salvo tem prioridade, depois usa o detectado e por fim null", () => {
  const status = { ip: "192.0.2.1", online: true, serialNumber: "DETECTED", ink: {} };
  assert.equal(mapPrinterStatus(printer(1, "SAVED"), status).serialNumber, "SAVED");
  assert.equal(mapPrinterStatus(printer(1), status).serialNumber, "DETECTED");
  assert.equal(
    mapPrinterStatus(printer(1), { ...status, serialNumber: null }).serialNumber,
    null
  );
});

test("retorno de sucesso preserva exatamente os campos públicos", async () => {
  const [result] = await getPrinterStatuses([printer(1)], 1, async ({ ip }) => ({
    ip,
    online: true,
    serialNumber: "SERIAL",
    ink: { black: 75 },
  }));

  assert.deepEqual(Object.keys(result), [
    "id",
    "name",
    "ip",
    "serialNumber",
    "groupId",
    "online",
    "ink",
  ]);
});
