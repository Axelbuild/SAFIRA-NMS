-- CreateTable
CREATE TABLE "Printers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "serialNumber" TEXT,
    "serialAlertSent" BOOLEAN NOT NULL DEFAULT false,
    "lastRecoveryAttemptAt" TIMESTAMP(3),
    "recoveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Printers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterIpHistory" (
    "id" SERIAL NOT NULL,
    "printerId" INTEGER NOT NULL,
    "oldIp" TEXT NOT NULL,
    "newIp" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrinterIpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterAlertState" (
    "id" SERIAL NOT NULL,
    "printerId" INTEGER NOT NULL,
    "color" TEXT NOT NULL,
    "warnedAt10" BOOLEAN NOT NULL DEFAULT false,
    "lastCriticalLevel" INTEGER,
    "currentLevel" INTEGER,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterAlertState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrinterStatusSnapshot" (
    "id" SERIAL NOT NULL,
    "printerId" INTEGER NOT NULL,
    "online" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastSeenOnlineAt" TIMESTAMP(3),
    "black" INTEGER,
    "cyan" INTEGER,
    "magenta" INTEGER,
    "yellow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrinterStatusSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Servers" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "osType" TEXT NOT NULL,
    "hostname" TEXT,
    "lastRecoveryAttemptAt" TIMESTAMP(3),
    "recoveryAttempts" INTEGER NOT NULL DEFAULT 0,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Servers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerIpHistory" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "oldIp" TEXT NOT NULL,
    "newIp" TEXT NOT NULL,
    "hostname" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServerIpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerAlertState" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "warnedAtThreshold" BOOLEAN NOT NULL DEFAULT false,
    "lastCriticalLevel" DOUBLE PRECISION,
    "currentLevel" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerAlertState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServerMetricsSnapshot" (
    "id" SERIAL NOT NULL,
    "serverId" INTEGER NOT NULL,
    "online" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastSeenOnlineAt" TIMESTAMP(3),
    "cpuUsage" DOUBLE PRECISION,
    "cpuCores" INTEGER,
    "memoryTotal" DOUBLE PRECISION,
    "memoryUsed" DOUBLE PRECISION,
    "memoryFree" DOUBLE PRECISION,
    "memoryUsagePercent" DOUBLE PRECISION,
    "diskMetrics" TEXT,
    "networkInterfaces" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServerMetricsSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Links" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "capacity" DOUBLE PRECISION NOT NULL,
    "groupId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkMonitor" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "monitorType" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" TEXT NOT NULL,
    "lastCheck" TIMESTAMP(3),
    "nextCheck" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkMonitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkStatusSnapshot" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "online" BOOLEAN NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "overallStatus" TEXT NOT NULL DEFAULT 'UNKNOWN',
    "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
    "lastSeenOnlineAt" TIMESTAMP(3),
    "snmpStatus" TEXT,
    "icmpStatus" TEXT,
    "httpStatus" TEXT,
    "tcpStatus" TEXT,
    "dnsStatus" TEXT,
    "latency" DOUBLE PRECISION,
    "packetLoss" DOUBLE PRECISION,
    "downloadMbps" DOUBLE PRECISION,
    "uploadMbps" DOUBLE PRECISION,
    "downloadPercent" DOUBLE PRECISION,
    "uploadPercent" DOUBLE PRECISION,
    "interfaceOperStatus" TEXT,
    "interfaceSpeed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkStatusSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkAlertState" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "alertType" TEXT NOT NULL,
    "monitorType" TEXT NOT NULL,
    "warnedAtThreshold" BOOLEAN NOT NULL DEFAULT false,
    "lastCriticalLevel" DOUBLE PRECISION,
    "currentLevel" DOUBLE PRECISION,
    "threshold" DOUBLE PRECISION,
    "lastNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LinkAlertState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LinkMetricHistory" (
    "id" SERIAL NOT NULL,
    "linkId" INTEGER NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snmpMetrics" TEXT,
    "icmpLatency" DOUBLE PRECISION,
    "icmpPacketLoss" DOUBLE PRECISION,
    "icmpSuccess" BOOLEAN,
    "httpStatusCode" INTEGER,
    "httpResponseTime" DOUBLE PRECISION,
    "httpSuccess" BOOLEAN,
    "tcpResponseTime" DOUBLE PRECISION,
    "tcpConnected" BOOLEAN,
    "dnsResponseTime" DOUBLE PRECISION,
    "dnsResult" TEXT,
    "dnsSuccess" BOOLEAN,
    "downloadMbps" DOUBLE PRECISION,
    "uploadMbps" DOUBLE PRECISION,
    "downloadPercent" DOUBLE PRECISION,
    "uploadPercent" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LinkMetricHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Printers_ip_key" ON "Printers"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterAlertState_printerId_color_key" ON "PrinterAlertState"("printerId", "color");

-- CreateIndex
CREATE UNIQUE INDEX "PrinterStatusSnapshot_printerId_key" ON "PrinterStatusSnapshot"("printerId");

-- CreateIndex
CREATE UNIQUE INDEX "Servers_ip_key" ON "Servers"("ip");

-- CreateIndex
CREATE UNIQUE INDEX "ServerAlertState_serverId_alertType_metric_key" ON "ServerAlertState"("serverId", "alertType", "metric");

-- CreateIndex
CREATE UNIQUE INDEX "ServerMetricsSnapshot_serverId_key" ON "ServerMetricsSnapshot"("serverId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkMonitor_linkId_monitorType_key" ON "LinkMonitor"("linkId", "monitorType");

-- CreateIndex
CREATE UNIQUE INDEX "LinkStatusSnapshot_linkId_key" ON "LinkStatusSnapshot"("linkId");

-- CreateIndex
CREATE UNIQUE INDEX "LinkAlertState_linkId_alertType_monitorType_key" ON "LinkAlertState"("linkId", "alertType", "monitorType");

-- CreateIndex
CREATE INDEX "LinkMetricHistory_linkId_timestamp_idx" ON "LinkMetricHistory"("linkId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Group_name_key" ON "Group"("name");

-- AddForeignKey
ALTER TABLE "Printers" ADD CONSTRAINT "Printers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterIpHistory" ADD CONSTRAINT "PrinterIpHistory_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterAlertState" ADD CONSTRAINT "PrinterAlertState_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrinterStatusSnapshot" ADD CONSTRAINT "PrinterStatusSnapshot_printerId_fkey" FOREIGN KEY ("printerId") REFERENCES "Printers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servers" ADD CONSTRAINT "Servers_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerIpHistory" ADD CONSTRAINT "ServerIpHistory_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerAlertState" ADD CONSTRAINT "ServerAlertState_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServerMetricsSnapshot" ADD CONSTRAINT "ServerMetricsSnapshot_serverId_fkey" FOREIGN KEY ("serverId") REFERENCES "Servers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Links" ADD CONSTRAINT "Links_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkMonitor" ADD CONSTRAINT "LinkMonitor_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkStatusSnapshot" ADD CONSTRAINT "LinkStatusSnapshot_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkAlertState" ADD CONSTRAINT "LinkAlertState_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LinkMetricHistory" ADD CONSTRAINT "LinkMetricHistory_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "Links"("id") ON DELETE CASCADE ON UPDATE CASCADE;
