import { prisma } from "../database";
import { sendMail } from "../mail/mail.service";
import {
  buildCriticalTonerEmail,
  buildLowToner10Email,
} from "../mail/mail.templates";

type PrinterForAlert = {
  id: number;
  name: string;
  ip: string;
  brand: string;
  model: string;
};

type TonerColor = "black" | "cyan" | "magenta" | "yellow";

export async function processPrinterAlerts(
  printer: PrinterForAlert,
  ink: Partial<Record<TonerColor, number | undefined>>
) {
  const entries = Object.entries(ink) as [TonerColor, number | undefined][];

  for (const [color, level] of entries) {
    if (typeof level !== "number") continue;

    let alertState = await prisma.printerAlertState.findUnique({
      where: {
        printerId_color: {
          printerId: printer.id,
          color,
        },
      },
    });

    if (!alertState) {
      alertState = await prisma.printerAlertState.create({
        data: {
          printerId: printer.id,
          color,
          warnedAt10: false,
          lastCriticalLevel: null,
          currentLevel: level,
          lastNotifiedAt: null,
        },
      });
    }

    if (level === 100) {
      await prisma.printerAlertState.update({
        where: { id: alertState.id },
        data: {
          warnedAt10: false,
          lastCriticalLevel: null,
          currentLevel: level,
          lastNotifiedAt: null,
        },
      });

      continue;
    }

    if (level <= 5) {
      const shouldSendCritical =
        alertState.lastCriticalLevel === null ||
        level < alertState.lastCriticalLevel;

      if (shouldSendCritical) {
        const mail = buildCriticalTonerEmail({
          printerName: printer.name,
          ip: printer.ip,
          brand: printer.brand,
          model: printer.model,
          color,
          level,
        });

        await sendMail(mail);

        await prisma.printerAlertState.update({
          where: { id: alertState.id },
          data: {
            lastCriticalLevel: level,
            currentLevel: level,
            lastNotifiedAt: new Date(),
          },
        });
      } else {
        await prisma.printerAlertState.update({
          where: { id: alertState.id },
          data: {
            currentLevel: level,
          },
        });
      }

      continue;
    }

    if (level <= 10 && level > 5) {
      if (!alertState.warnedAt10) {
        const mail = buildLowToner10Email({
          printerName: printer.name,
          ip: printer.ip,
          brand: printer.brand,
          model: printer.model,
          color,
          level,
        });

        await sendMail(mail);

        await prisma.printerAlertState.update({
          where: { id: alertState.id },
          data: {
            warnedAt10: true,
            currentLevel: level,
            lastNotifiedAt: new Date(),
          },
        });
      } else {
        await prisma.printerAlertState.update({
          where: { id: alertState.id },
          data: {
            currentLevel: level,
          },
        });
      }

      continue;
    }

    await prisma.printerAlertState.update({
      where: { id: alertState.id },
      data: {
        currentLevel: level,
      },
    });
  }
}