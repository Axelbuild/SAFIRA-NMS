import type { Printers } from "../../generated/prisma/client.js";
import type {
  PrinterSNMPTarget,
  PrinterStatus,
} from "../types/printer.js";
import { mapWithConcurrency } from "../utils/map-with-concurrency.js";

export type PrinterStatusReader = (
  printer: PrinterSNMPTarget
) => Promise<PrinterStatus>;
export type PrinterStatusLogger = Pick<Console, "error">;

export type PrinterStatusResponse = {
  id: number;
  name: string;
  ip: string;
  serialNumber: string | null;
  groupId: number;
  online: boolean;
  ink: PrinterStatus["ink"];
};

export function mapPrinterStatus(
  printer: Printers,
  status: PrinterStatus
): PrinterStatusResponse {
  return {
    id: printer.id,
    name: printer.name,
    ip: printer.ip,
    serialNumber: printer.serialNumber ?? status.serialNumber ?? null,
    groupId: printer.groupId,
    online: status.online,
    ink: status.ink,
  };
}

export function mapPrinterStatusError(
  printer: Printers,
  error: unknown,
  logger: PrinterStatusLogger = console
): PrinterStatusResponse {
  logger.error(
    `Erro ao buscar status da impressora ${printer.name} (${printer.ip})`,
    error
  );

  return {
    id: printer.id,
    name: printer.name,
    ip: printer.ip,
    serialNumber: printer.serialNumber ?? null,
    groupId: printer.groupId,
    online: false,
    ink: {},
  };
}

export async function getSinglePrinterStatus(
  printer: Printers,
  statusReader: PrinterStatusReader,
  logger: PrinterStatusLogger = console
) {
  try {
    const status = await statusReader({
      ip: printer.ip,
      brand: printer.brand as "HP" | "Samsung",
      model: printer.model,
    });

    return mapPrinterStatus(printer, status);
  } catch (error) {
    return mapPrinterStatusError(printer, error, logger);
  }
}

export function getPrinterStatuses(
  printers: readonly Printers[],
  concurrency: number,
  statusReader: PrinterStatusReader,
  logger: PrinterStatusLogger = console
) {
  return mapWithConcurrency(printers, concurrency, (printer) =>
    getSinglePrinterStatus(printer, statusReader, logger)
  );
}
