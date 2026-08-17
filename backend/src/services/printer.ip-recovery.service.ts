import { prisma } from "../database";
import { sendMail } from "../mail/mail.service";
import { buildPrinterIpChangedEmail } from "../mail/mail.templates";

type RecoverPrinterIpParams = {
  printerId: number;
  foundIp: string;
  foundSerialNumber: string;
};

function normalizeSerial(value?: string | null) {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();

  return normalized.length > 0 ? normalized : null;
}

export async function recoverPrinterIpBySerial({
  printerId,
  foundIp,
  foundSerialNumber,
}: RecoverPrinterIpParams) {
  const printer = await prisma.printers.findUnique({
    where: { id: printerId },
  });

  if (!printer) {
    return {
      updated: false,
      reason: "PRINTER_NOT_FOUND",
    };
  }

  const currentSerial = normalizeSerial(printer.serialNumber);
  const detectedSerial = normalizeSerial(foundSerialNumber);

  if (!currentSerial) {
    return {
      updated: false,
      reason: "PRINTER_WITHOUT_SERIAL",
    };
  }

  if (!detectedSerial) {
    return {
      updated: false,
      reason: "FOUND_SERIAL_EMPTY",
    };
  }

  if (currentSerial !== detectedSerial) {
    return {
      updated: false,
      reason: "SERIAL_MISMATCH",
    };
  }

  if (printer.ip === foundIp) {
    return {
      updated: false,
      reason: "SAME_IP",
    };
  }

  const oldIp = printer.ip;

  await prisma.$transaction([
    prisma.printerIpHistory.create({
      data: {
        printerId: printer.id,
        oldIp,
        newIp: foundIp,
        serialNumber: currentSerial,
      },
    }),

    prisma.printers.update({
      where: { id: printer.id },
      data: {
        ip: foundIp,
      },
    }),
  ]);

  const email = buildPrinterIpChangedEmail({
    printerName: printer.name,
    brand: printer.brand,
    model: printer.model,
    serialNumber: currentSerial,
    oldIp,
    newIp: foundIp,
  });

  await sendMail(email);

  return {
    updated: true,
    reason: "UPDATED",
    oldIp,
    newIp: foundIp,
    serialNumber: currentSerial,
  };
}