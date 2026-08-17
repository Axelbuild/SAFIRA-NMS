import { FastifyInstance } from "fastify";
import { postCreatePrinterController, runPrinterRecoveryController, cancelPrinterRecoveryController,getPrinterStatusController, getLastPrinterStatusController, getPrinterController, getPrinterByIdController, updatePrinterController, deletePrinterController} from "../controllers/printer.controllers"

export async function printerRoutes(app: FastifyInstance){
    app.post("/printer", postCreatePrinterController);
    app.post("/printer/recovery/run", runPrinterRecoveryController);
    app.post("/printer/recovery/cancel", cancelPrinterRecoveryController);
    app.get("/printer/status", getPrinterStatusController)
    app.get("/printer/status-last", getLastPrinterStatusController);
    app.get("/printer", getPrinterController);
    app.get("/printer/:id", getPrinterByIdController);
    app.put("/printer/:id", updatePrinterController)
    app.delete("/printer/:id", deletePrinterController)
}

