export type AlertEmailParams = {
  printerName: string;
  ip: string;
  brand: string;
  model: string;
  color: string;
  level: number;
};

export type PrinterIpChangedEmailParams = {
  printerName: string;
  brand: string;
  model: string;
  serialNumber: string;
  oldIp: string;
  newIp: string;
};

export type SendMailParams = {
  subject: string;
  text: string;
};