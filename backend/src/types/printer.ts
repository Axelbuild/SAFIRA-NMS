export type PrinterInkLevels = {
  black?: number;
  cyan?: number;
  magenta?: number;
  yellow?: number;
};

export type PrinterStatus = {
  ip: string;
  online: boolean;
  serialNumber?: string | null;
  ink: PrinterInkLevels;
};

export type PrinterBrand = "HP" | "Samsung";

export type PrinterInput = {
  name: string;
  ip: string;
  serialNumber?: string;
  groupId: number;
  brand: PrinterBrand;
  model: string;
};

export type PrinterSNMPTarget = {
  ip: string;
  brand: PrinterBrand;
  model: string;
};