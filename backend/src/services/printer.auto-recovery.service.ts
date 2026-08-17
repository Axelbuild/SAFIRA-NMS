import { prisma } from "../database";
import { scanSmartRecoveryForSerial } from "./printer.network-scan.service";
import { recoverPrinterIpBySerial } from "./printer.ip-recovery.service";
import {
  getRecoveryAbortRequested,
  getRecoveryRunning,
  resetRecoveryAbort,
  setRecoveryRunning,
} from "../state/recovery.state";

export async function runPrinterAutoRecovery() {
  if (getRecoveryRunning()) {
    throw new Error("Busca de impressoras perdidas já está em execução.");
  }

  setRecoveryRunning(true);
  resetRecoveryAbort();

  const summary = {
    checked: 0,
    skippedWithoutSerial: 0,
    skippedOnline: 0,
    found: 0,
    updated: 0,
    notFound: 0,
    errors: 0,
  };

  try {
    const printers = await prisma.printers.findMany({
      where: {
        serialNumber: {
          not: null,
        },
      },
    });

    for (const printer of printers) {
      if (getRecoveryAbortRequested()) {
        console.log("Busca de impressoras perdidas interrompida.");
        break;
      }

      try {
        if (!printer.serialNumber) {
          summary.skippedWithoutSerial++;
          continue;
        }

        const snapshot = await prisma.printerStatusSnapshot.findUnique({
          where: {
            printerId: printer.id,
          },
        });

        if (!snapshot || snapshot.online) {
          summary.skippedOnline++;
          continue;
        }

        summary.checked++;

        console.log("Tentando recuperar impressora:", {
          printer: printer.name,
          currentIp: printer.ip,
          serialNumber: printer.serialNumber,
        });

        const found = await scanSmartRecoveryForSerial({
          brand: printer.brand as "HP" | "Samsung",
          model: printer.model,
          targetSerialNumber: printer.serialNumber,
        });

        if (!found) {
          summary.notFound++;
          continue;
        }

        summary.found++;

        const recoveryResult = await recoverPrinterIpBySerial({
          printerId: printer.id,
          foundIp: found.ip,
          foundSerialNumber: found.serialNumber!,
        });

        if (recoveryResult.updated) {
          summary.updated++;
        }
      } catch (error) {
        summary.errors++;

        console.error("Erro no auto recovery da impressora:", {
          printer: printer.name,
          ip: printer.ip,
          error,
        });
      }
    }

    return summary;
  } finally {
    setRecoveryRunning(false);
    resetRecoveryAbort();
  }
}