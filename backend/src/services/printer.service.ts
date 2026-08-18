import { prisma } from "../database";
import { PrinterModel } from "../models/printer.models";
import { isValidNumber, isValidBrand } from "../utils/validators";
import { isValidIP } from "../utils/ip";
import { PrinterInput } from "../types/printer";
import { getPrinterSerialNumber } from "../snmp/printer.identity.service";
import { PrintersInclude } from "../../generated/prisma/models";
import { getPrinterStatus } from "../snmp/printer.service";

function cleanString(value?: string | null) {
  if (!value) return null;

  const cleaned = value.replace(/\u0000/g, "").replace(/\0/g, "").trim();

  return cleaned.length > 0 ? cleaned : null;
}

export class PrinterService {
  async create(data: PrinterInput) {
    const { name, ip, serialNumber, groupId, brand, model } = data;

    if (!name) throw new Error("name is required");
    if (!isValidNumber(groupId)) throw new Error("groupId must be a valid number");
    if (!isValidIP(ip)) throw new Error("Invalid IP");
    if (!isValidBrand(brand)) throw new Error("Invalid brand");
    if (!model) throw new Error("model is required");

    const cleanedIp = cleanString(ip) ?? "";
    const detectedSerial =
      cleanString(serialNumber) ?? cleanString(await getPrinterSerialNumber(cleanedIp));

    const printer = new PrinterModel(
      cleanString(name) ?? "",
      cleanedIp,
      detectedSerial ?? "",
      Number(groupId),
      brand,
      model,
      new Date()
    );

    return await prisma.printers.create({
      data: {
        name: printer.name,
        ip: printer.ip,
        serialNumber: detectedSerial,
        groupId: printer.groupId,
        brand: printer.brand,
        model: printer.model,
      },
    });
  }

  async findAll(include?: PrintersInclude) {
    return await prisma.printers.findMany({ 
      include
    });
  }

  async findById(id: number) {
    return prisma.printers.findUnique({
      where: { id },
      include: { group: true },
    });
  }

  async update(id: number, data: Partial<PrinterInput>) {
    if (data.ip && !isValidIP(data.ip)) {
      throw new Error("Invalid IP");
    }

    if (data.groupId !== undefined && !isValidNumber(data.groupId)) {
      throw new Error("groupId must be a valid number");
    }

    if (data.brand && !isValidBrand(data.brand)) {
      throw new Error("Invalid brand");
    }

    let detectedSerial: string | null | undefined = undefined;

    if (data.serialNumber !== undefined) {
      detectedSerial = cleanString(data.serialNumber);
    } else if (data.ip !== undefined) {
      detectedSerial = cleanString(await getPrinterSerialNumber(data.ip));
    }

    return prisma.printers.update({
      where: { id },
      data: {
        name: data.name !== undefined ? cleanString(data.name) ?? "" : undefined,
        ip: data.ip !== undefined ? cleanString(data.ip) ?? "" : undefined,
        serialNumber: detectedSerial,
        groupId: data.groupId !== undefined ? Number(data.groupId) : undefined,
        brand: data.brand !== undefined ? cleanString(data.brand) ?? "" : undefined,
        model: data.model !== undefined ? cleanString(data.model) ?? "" : undefined,
      },
    });
  }

  async delete(id: number) {
    const printerExists = await prisma.printers.findUnique({
      where: { id },
    });

    if (!printerExists) {
      throw new Error("Printer not found");
    }

    await prisma.$transaction([
      prisma.printerAlertState.deleteMany({
        where: { printerId: id },
      }),
      prisma.printerStatusSnapshot.deleteMany({
        where: { printerId: id },
      }),
      prisma.printers.delete({
        where: { id },
      }),
    ]);

    return { message: "Deleted" };
  }

  async getPrintersStatus() {
    const printers = await prisma.printers.findMany();

    //! IMPORTATE: Muitas resposabilidades atribuída a apenas uma função, no caso o .map
    // Todo: importante deixar só a parte sincrona aqui e trabalhar o restante fora da função
    // Todo: Extrair a parte da promise para uma função externa
    // Todo: Mapeamento de JSON e busca de status juntos, separar mapeamento
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

    return result;
  }
}