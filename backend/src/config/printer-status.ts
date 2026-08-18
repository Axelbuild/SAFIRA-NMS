export const DEFAULT_PRINTER_STATUS_CONCURRENCY = 5;
export const MAX_PRINTER_STATUS_CONCURRENCY = 50;

export function parsePrinterStatusConcurrency(value: string | undefined) {
  if (value === undefined || value.trim() === "") {
    return DEFAULT_PRINTER_STATUS_CONCURRENCY;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return DEFAULT_PRINTER_STATUS_CONCURRENCY;
  }

  return Math.min(parsed, MAX_PRINTER_STATUS_CONCURRENCY);
}

export function getPrinterStatusConcurrency() {
  return parsePrinterStatusConcurrency(process.env.PRINTER_STATUS_CONCURRENCY);
}
