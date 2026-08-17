import { recoveryNetworkConfig } from "../config/recovery.network";
import { getPrinterStatus } from "../snmp/printer.service";
import { PrinterBrand } from "../types/printer";
import { getRecoveryAbortRequested } from "../state/recovery.state";

type ScanIpParams = {
  ip: string;
  brand: PrinterBrand;
  model: string;
};

type ScanIpResult = {
  ip: string;
  online: boolean;
  serialNumber: string | null;
};

export async function scanPrinterIp({
  ip,
  brand,
  model,
}: ScanIpParams): Promise<ScanIpResult> {
  try {
    const status = await getPrinterStatus({ ip, brand, model });

    return {
      ip,
      online: status.online,
      serialNumber: status.serialNumber ?? null,
    };
  } catch {
    return {
      ip,
      online: false,
      serialNumber: null,
    };
  }
}

export function generateIpRange(
  subnetPrefix: string,
  start: number,
  end: number
) {
  const ips: string[] = [];

  for (let i = start; i <= end; i++) {
    ips.push(`${subnetPrefix}.${i}`);
  }

  return ips;
}

export function generateIpsFromLastOctets(
  subnetPrefix: string,
  octets: number[]
) {
  return octets.map((octet) => `${subnetPrefix}.${octet}`);
}

export async function scanIpsForSerial(params: {
  ips: string[];
  brand: PrinterBrand;
  model: string;
  targetSerialNumber: string;
  concurrency?: number;
}) {
  const { ips, brand, model, targetSerialNumber, concurrency = 5 } = params;
  const normalizedTargetSerial = targetSerialNumber.trim().toUpperCase();

  for (let i = 0; i < ips.length; i += concurrency) {
  if (getRecoveryAbortRequested()) {
    console.log("Busca de impressoras perdidas cancelada.");
    return null;
  }

  const batch = ips.slice(i, i + concurrency);

  const results = await Promise.all(
    batch.map((ip) => scanPrinterIp({ ip, brand, model }))
  );

  const match = results.find(
    (result) =>
      result.serialNumber?.trim().toUpperCase() === normalizedTargetSerial
  );

  if (match) return match;
}

  return null;
}

export async function scanPostSubnetForSerial(params: {
  subnetPrefix: string;
  brand: PrinterBrand;
  model: string;
  targetSerialNumber: string;
}) {
  const priorityIps = generateIpsFromLastOctets(
    params.subnetPrefix,
    recoveryNetworkConfig.posts.priorityOctets
  );

  const priorityResult = await scanIpsForSerial({
    ips: priorityIps,
    brand: params.brand,
    model: params.model,
    targetSerialNumber: params.targetSerialNumber,
    concurrency: 2,
  });

  if (priorityResult) return priorityResult;

  const fallbackIps = generateIpRange(
    params.subnetPrefix,
    recoveryNetworkConfig.posts.fallbackStartOctet,
    recoveryNetworkConfig.posts.fallbackEndOctet
  );

  return scanIpsForSerial({
    ips: fallbackIps,
    brand: params.brand,
    model: params.model,
    targetSerialNumber: params.targetSerialNumber,
    concurrency: 5,
  });
}

export function buildOfficePrinterIps() {
  const ips: string[] = [];

  for (const office of recoveryNetworkConfig.offices) {
    if (office.fixedOctets?.length) {
      ips.push(
        ...generateIpsFromLastOctets(office.subnetPrefix, office.fixedOctets)
      );
    }

    if (office.startOctet !== undefined && office.endOctet !== undefined) {
      ips.push(
        ...generateIpRange(
          office.subnetPrefix,
          office.startOctet,
          office.endOctet
        )
      );
    }
  }

  return ips;
}

export async function scanSmartRecoveryForSerial(params: {
  brand: PrinterBrand;
  model: string;
  targetSerialNumber: string;
}) {
  console.log("Escaneando escritórios...");

  const officeResult = await scanIpsForSerial({
    ips: buildOfficePrinterIps(),
    brand: params.brand,
    model: params.model,
    targetSerialNumber: params.targetSerialNumber,
    concurrency: 5,
  });

  if (officeResult) {
    return {
      ...officeResult,
      subnetPrefix: officeResult.ip.split(".").slice(0, 3).join("."),
    };
  }

  for (
    let range = recoveryNetworkConfig.posts.startRange;
    range <= recoveryNetworkConfig.posts.endRange;
    range++
  ) {
    if (getRecoveryAbortRequested()) {
      console.log("Scan de postos interrompido manualmente.");
      return null;
    }
    const subnetPrefix = `${recoveryNetworkConfig.posts.basePrefix}.${range}`;

    console.log("Escaneando posto:", subnetPrefix);

    const result = await scanPostSubnetForSerial({
      subnetPrefix,
      brand: params.brand,
      model: params.model,
      targetSerialNumber: params.targetSerialNumber,
    });

    if (result) {
      return {
        ...result,
        subnetPrefix,
      };
    }
  }

  return null;
}