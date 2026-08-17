import snmp from "net-snmp";
import { createSession } from "./client";

function snmpGetString(
  session: snmp.Session,
  oid: string
): Promise<string | undefined> {
  return new Promise((resolve) => {
    session.get([oid], (error, varbinds) => {
      if (error || !varbinds?.length) {
        return resolve(undefined);
      }

      const value = varbinds[0]?.value;

      if (typeof value === "string") {
        return resolve(value.trim());
      }

      if (Buffer.isBuffer(value)) {
        return resolve(value.toString().trim());
      }

      if (value !== undefined && value !== null) {
        return resolve(String(value).trim());
      }

      return resolve(undefined);
    });
  });
}

export async function getPrinterSerialNumber(
  ip: string
): Promise<string | undefined> {
  const session = createSession(ip);

  try {
    const candidateOids = [
      "1.3.6.1.2.1.43.5.1.1.17.1", // Printer-MIB serial
      "1.3.6.1.2.1.1.5.0",         // sysName
      "1.3.6.1.2.1.1.1.0",         // sysDescr
    ];

    for (const oid of candidateOids) {
      const value = await snmpGetString(session, oid);

      if (value && value.length > 2) {
        return value;
      }
    }

    return undefined;
  } catch {
    return undefined;
  } finally {
    session.close();
  }
}