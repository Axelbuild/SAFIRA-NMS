import snmp from "net-snmp";
import { createSession } from "./client";
import { printerConfigs } from "../config/printers";
import { PrinterStatus, PrinterSNMPTarget } from "../types/printer";

type TonerColor = "black" | "cyan" | "magenta" | "yellow";

const UNIVERSAL_SERIAL_NUMBER_OID = "1.3.6.1.2.1.43.5.1.1.17.1";

function getNumberValue(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && !isNaN(Number(value))) return Number(value);
  return undefined;
}

function getStringValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;

  const text = String(value)
    .replace(/\u0000/g, "")
    .replace(/\0/g, "")
    .replace(/\r/g, "")
    .replace(/\n/g, "")
    .trim()
    .toUpperCase();

  return text.length > 0 ? text : null;
}

function calculatePercentage(current?: number, max?: number): number | undefined {
  if (current === undefined || max === undefined || max <= 0) return undefined;

  const percentage = Math.round((current / max) * 100);

  if (percentage < 0) return 0;
  if (percentage > 100) return 100;

  return percentage;
}

function snmpGetNumber(session: snmp.Session, oid: string): Promise<number | undefined> {
  return new Promise((resolve) => {
    session.get([oid], (error, varbinds) => {
      if (error || !varbinds?.length) {
        return resolve(undefined);
      }

      const value = varbinds[0]?.value;
      resolve(getNumberValue(value));
    });
  });
}

function snmpGetString(session: snmp.Session, oid: string): Promise<string | null> {
  return new Promise((resolve) => {
    session.get([oid], (error, varbinds) => {
      if (error || !varbinds?.length) {
        return resolve(null);
      }

      const value = varbinds[0]?.value;
      resolve(getStringValue(value));
    });
  });
}

export const getPrinterStatus = async (
  printer: PrinterSNMPTarget
): Promise<PrinterStatus> => {
  const { ip, brand, model } = printer;

  const brandConfig = printerConfigs[brand];
  const modelConfig = brandConfig?.models?.[model];

  if (!brandConfig || !modelConfig) {
    return {
      ip,
      online: false,
      serialNumber: null,
      ink: {},
    };
  }

  const session = createSession(ip);
  const ink: PrinterStatus["ink"] = {};

  try {
    const serialNumber = await snmpGetString(
      session,
      UNIVERSAL_SERIAL_NUMBER_OID
    );

    const tonerEntries = Object.entries(modelConfig.toners) as [
      TonerColor,
      { index: number; max_oid: string; current_oid: string }
    ][];

    for (const [color, toner] of tonerEntries) {
      const maxOid = `${brandConfig.base_oid}${toner.max_oid}`;
      const currentOid = `${brandConfig.base_oid}${toner.current_oid}`;

      const [maxValue, currentValue] = await Promise.all([
        snmpGetNumber(session, maxOid),
        snmpGetNumber(session, currentOid),
      ]);

      ink[color] = calculatePercentage(currentValue, maxValue);
    }

    const hasAnyInkValue = Object.values(ink).some(
      (value) => typeof value === "number"
    );

    if (!hasAnyInkValue) {
      return {
        ip,
        online: false,
        serialNumber,
        ink: {},
      };
    }

    return {
      ip,
      online: true,
      serialNumber,
      ink,
    };
  } catch {
    return {
      ip,
      online: false,
      serialNumber: null,
      ink: {},
    };
  } finally {
    session.close();
  }
};