import { FastifyRequest, FastifyReply } from "fastify";

import { PrinterService } from "../services/printer.service";
import { PrinterInput } from "../types/printer";
import { getPrinterStatus } from "../snmp/printer.service";
import { printerConfigs } from "../config/printers";
import { runPrinterAutoRecovery } from "../services/printer.auto-recovery.service";
import { requestRecoveryAbort } from "../state/recovery.state";
import { prisma } from "../database";

const service = new PrinterService();

export async function getPrinterController(
  _: FastifyRequest,
  reply: FastifyReply
) {
  const data = await service.findAll();
  return reply.status(200).send(data);
}

export async function postCreatePrinterController(
  req: FastifyRequest<{ Body: PrinterInput }>,
  reply: FastifyReply
) {
  try {
    await service.create(req.body);

    return reply.status(201).send({
      message: "created",
    });
  } catch (err: any) {
    return reply.status(400).send({
      message: err.message || "Erro ao criar impressora",
    });
  }
}

export async function runPrinterRecoveryController(
  _: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const result = await runPrinterAutoRecovery();

    return reply.send({
      message: "Recovery scan finalizado",
      result,
    });
  } catch (err: any) {
    console.error("Erro ao executar recovery scan:", err);

    return reply.status(500).send({
      message: err.message || "Erro ao executar recovery scan",
    });
  }
}

export async function cancelPrinterRecoveryController(
  _: FastifyRequest,
  reply: FastifyReply
) {
  requestRecoveryAbort();

  return reply.send({
    message: "Cancelamento solicitado.",
  });
}

export async function getPrinterByIdController(
  req: any,
  reply: FastifyReply
) {
  const data = await service.findById(Number(req.params.id));

  if (!data) {
    return reply.status(404).send({ message: "Not found" });
  }

  return reply.send(data);
}

export async function getPrinterStatusController(
  _: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const printers = await prisma.printers.findMany();

    const result = await Promise.all(
      printers.map(async (printer) => {
        try {
          const status = await getPrinterStatus({
            ip: printer.ip,
            brand: printer.brand as "HP" | "Samsung",
            model: printer.model,
          });

          const serialNumber = status.serialNumber ?? null;

          return {
            id: printer.id,
            name: printer.name,
            ip: printer.ip,
            serialNumber: printer.serialNumber ?? serialNumber,
            groupId: printer.groupId,
            online: status.online,
            ink: status.ink,
          };
        } catch (error) {
          console.error(
            `Erro ao buscar status da impressora ${printer.name}`,
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
      })
    );

    return reply.send(result);
  } catch (error) {
    console.error("Erro em /printer/status:", error);

    return reply.status(500).send({
      message: "Erro ao carregar status das impressoras",
    });
  }
}

export async function getLastPrinterStatusController(
  _: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const printers = await prisma.printers.findMany({
      include: {
        group: true,
        snapshots: true,
      },
    });

    const result = printers.map((printer) => {
      const snapshot = printer.snapshots[0];

      const brandConfig = printerConfigs[
        printer.brand as "HP" | "Samsung"
      ];

      const modelConfig = brandConfig?.models?.[printer.model];

      const availableColors = modelConfig
        ? Object.keys(modelConfig.toners)
        : ["black"];

      return {
        id: printer.id,
        name: printer.name,
        ip: printer.ip,
        serialNumber: printer.serialNumber ?? null,
        brand: printer.brand,
        model: printer.model,
        type: modelConfig?.type ?? "mono",
        availableColors,
        groupId: printer.groupId,
        groupName: printer.group?.name ?? null,

        online: snapshot?.online ?? false,

        status: snapshot?.status ?? "UNKNOWN",

        consecutiveFailures:
          snapshot?.consecutiveFailures ?? 0,

        lastSeenOnlineAt:
          snapshot?.lastSeenOnlineAt ?? null,

        ink: {
          black: snapshot?.black ?? undefined,
          cyan: snapshot?.cyan ?? undefined,
          magenta: snapshot?.magenta ?? undefined,
          yellow: snapshot?.yellow ?? undefined,
        },
      };
    });

    return reply.send(result);
  } catch (error) {
    console.error("Error loading last printer status:", error);

    return reply.status(500).send({
      message: "Error loading last printer status",
    });
  }
}

export async function updatePrinterController(
  req: any,
  reply: FastifyReply
) {
  try {
    const data = await service.update(
      Number(req.params.id),
      req.body
    );

    return reply.send(data);
  } catch (err: any) {
    console.error("Error updating printer:", err);

    return reply.status(400).send({
      message: err.message || "Error updating printer",
    });
  }
}

export async function deletePrinterController(
  req: any,
  reply: FastifyReply
) {
  try {
    const data = await service.delete(Number(req.params.id));

    return reply.send(data);
  } catch (err: any) {
    console.error("Error deleting printer:", err);

    return reply.status(400).send({
      message: err.message || "Error deleting printer",
    });
  }
}