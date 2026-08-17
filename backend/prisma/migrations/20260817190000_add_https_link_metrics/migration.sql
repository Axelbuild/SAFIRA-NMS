ALTER TABLE "LinkStatusSnapshot" ADD COLUMN "httpsStatus" TEXT;
ALTER TABLE "LinkMetricHistory" ADD COLUMN "httpsStatusCode" INTEGER;
ALTER TABLE "LinkMetricHistory" ADD COLUMN "httpsResponseTime" DOUBLE PRECISION;
ALTER TABLE "LinkMetricHistory" ADD COLUMN "httpsSuccess" BOOLEAN;
