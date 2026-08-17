export type TonerColor = "black" | "cyan" | "magenta" | "yellow";

export type TonerOidConfig = {
  index: number;
  max_oid: string;
  current_oid: string;
};

export type PrinterModelConfig = {
  type: "mono" | "color";
  toners: Partial<Record<TonerColor, TonerOidConfig>>;
};

export type PrinterBrandConfig = {
  base_oid: string;
  models: Record<string, PrinterModelConfig>;
};