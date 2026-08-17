import { AlertEmailParams, PrinterIpChangedEmailParams } from "./mail.types";

export function buildLowToner10Email(params: AlertEmailParams) {
  const subject = `Alerta de toner baixo (10%) - ${params.printerName} - ${params.color}`;

  const text = `
Atenção: toner baixo detectado.

Impressora: ${params.printerName}
IP: ${params.ip}
Marca: ${params.brand}
Modelo: ${params.model}
Cor: ${params.color}
Nível atual: ${params.level}%
`;

  return { subject, text };
}

export function buildCriticalTonerEmail(params: AlertEmailParams) {
  const subject = `Alerta crítico de toner (5% ou menos) - ${params.printerName} - ${params.color}`;

  const text = `
Alerta crítico: toner em nível muito baixo.

Impressora: ${params.printerName}
IP: ${params.ip}
Marca: ${params.brand}
Modelo: ${params.model}
Cor: ${params.color}
Nível atual: ${params.level}%
`;

  return { subject, text };
}

export function buildPrinterIpChangedEmail(params: PrinterIpChangedEmailParams) {
  const subject = `IP da impressora atualizado automaticamente - ${params.printerName}`;

  const text = `
A impressora abaixo foi localizada em um novo IP e o cadastro foi atualizado automaticamente.

Impressora: ${params.printerName}
Marca: ${params.brand}
Modelo: ${params.model}
Serial Number: ${params.serialNumber}

IP antigo: ${params.oldIp}
IP novo: ${params.newIp}

Regra aplicada:
A atualização foi feita porque o serial number encontrado no novo IP é igual ao serial number cadastrado no sistema.
`;

  return { subject, text };
}