import { getPrinterStatus } from "../snmp/printer.service";
import { prisma } from "../database";
import { processPrinterAlerts } from "../services/printer.alert.service";

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];

  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }

  return chunks;
}

function resolvePrinterHealthStatus(params: {
  isOnlineNow: boolean;
  currentFailures: number;
}) {
  if (params.isOnlineNow) {
    return {
      online: true,
      status: "ONLINE",
      consecutiveFailures: 0,
      lastSeenOnlineAt: new Date(),
    };
  }

  const failures = params.currentFailures + 1;

  if (failures >= 3) {
    return {
      online: false,
      status: "OFFLINE",
      consecutiveFailures: failures,
      lastSeenOnlineAt: undefined,
    };
  }

  return {
    online: true,
    status: "SUSPECT",
    consecutiveFailures: failures,
    lastSeenOnlineAt: undefined,
  };
}

export async function checkPrinters() {
  const printers = await prisma.printers.findMany();

  const batches = chunkArray(printers, 5);

  for (const batch of batches) {
    await Promise.all(
      batch.map(async (printer) => {
        try {
          const status = await getPrinterStatus({
            ip: printer.ip,
            brand: printer.brand as "HP" | "Samsung",
            model: printer.model,
          });

          const currentSerial = printer.serialNumber?.trim();
          const detectedSerial = status.serialNumber?.trim();

          if (detectedSerial && !currentSerial) {
            await prisma.printers.update({
              where: { id: printer.id },
              data: {
                serialNumber: detectedSerial,
              },
            });

            console.log("Serial number atualizado:", {
              printer: printer.name,
              ip: printer.ip,
              serialNumber: detectedSerial,
            });
          }

          console.log("Printer status:", {
            name: printer.name,
            ip: printer.ip,
            brand: printer.brand,
            model: printer.model,
            status,
          });

          const currentSnapshot = await prisma.printerStatusSnapshot.findUnique({
            where: {
              printerId: printer.id,
            },
          });

          const health = resolvePrinterHealthStatus({
            isOnlineNow: status.online,
            currentFailures: currentSnapshot?.consecutiveFailures ?? 0,
          });

          await prisma.printerStatusSnapshot.upsert({
            where: {
              printerId: printer.id,
            },
            update: {
              online: health.online,
              status: health.status,
              consecutiveFailures: health.consecutiveFailures,
              lastSeenOnlineAt:
                health.lastSeenOnlineAt ??
                currentSnapshot?.lastSeenOnlineAt ??
                null,
              black: status.online
                ? status.ink.black
                : currentSnapshot?.black ?? null,
              cyan: status.online
                ? status.ink.cyan
                : currentSnapshot?.cyan ?? null,
              magenta: status.online
                ? status.ink.magenta
                : currentSnapshot?.magenta ?? null,
              yellow: status.online
                ? status.ink.yellow
                : currentSnapshot?.yellow ?? null,
            },
            create: {
              printerId: printer.id,
              online: health.online,
              status: health.status,
              consecutiveFailures: health.consecutiveFailures,
              lastSeenOnlineAt: health.lastSeenOnlineAt ?? null,
              black: status.online ? status.ink.black : null,
              cyan: status.online ? status.ink.cyan : null,
              magenta: status.online ? status.ink.magenta : null,
              yellow: status.online ? status.ink.yellow : null,
            },
          });

          if (health.status !== "ONLINE") return;

          await processPrinterAlerts(
            {
              id: printer.id,
              name: printer.name,
              ip: printer.ip,
              brand: printer.brand,
              model: printer.model,
            },
            status.ink
          );
        } catch (error) {
          console.error(
            `Error checking printer ${printer.name} (${printer.ip})`,
            error
          );

          const currentSnapshot = await prisma.printerStatusSnapshot.findUnique({
            where: {
              printerId: printer.id,
            },
          });

          const health = resolvePrinterHealthStatus({
            isOnlineNow: false,
            currentFailures: currentSnapshot?.consecutiveFailures ?? 0,
          });

          await prisma.printerStatusSnapshot.upsert({
            where: {
              printerId: printer.id,
            },
            update: {
              online: health.online,
              status: health.status,
              consecutiveFailures: health.consecutiveFailures,
              lastSeenOnlineAt: currentSnapshot?.lastSeenOnlineAt ?? null,
              black: currentSnapshot?.black ?? null,
              cyan: currentSnapshot?.cyan ?? null,
              magenta: currentSnapshot?.magenta ?? null,
              yellow: currentSnapshot?.yellow ?? null,
            },
            create: {
              printerId: printer.id,
              online: health.online,
              status: health.status,
              consecutiveFailures: health.consecutiveFailures,
              lastSeenOnlineAt: null,
              black: null,
              cyan: null,
              magenta: null,
              yellow: null,
            },
          });
        }
      })
    );
  }
}