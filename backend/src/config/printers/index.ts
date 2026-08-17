import hp from "./hp.json";
import samsung from "./samsung.json";
import { PrinterBrandConfig } from "../../types/printer.config";

export const printerConfigs: Record<string, PrinterBrandConfig> = {
  HP: hp as PrinterBrandConfig,
  Samsung: samsung as PrinterBrandConfig,
};