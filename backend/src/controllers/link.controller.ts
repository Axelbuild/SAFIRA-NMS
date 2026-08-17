import { FastifyRequest, FastifyReply } from "fastify";
import { LinkService } from "../services/link.service";
import { LinkInput, LinkMonitorInput, LinkTestRequest, LinkTestResult, LinkMonitorOutput } from "../types/link";
import { ICMPMonitor } from "../services/links/icmp.monitor";

const linkService = new LinkService();
const icmpMonitor = new ICMPMonitor();

export class LinkController {
  /**
   * GET /links - Listar todos os links
   */
  static async listLinks(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { enabled } = request.query as { enabled?: string };
      const links = await linkService.findAll(enabled === "true" ? true : enabled === "false" ? false : undefined);

      return reply.code(200).send({
        success: true,
        data: links,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /links/:id - Obter link específico
   */
  static async getLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const link = await linkService.findById(linkId);

      if (!link) {
        return reply.code(404).send({
          success: false,
          error: "Link not found",
        });
      }

      return reply.code(200).send({
        success: true,
        data: link,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /links/group/:groupId - Listar links de um grupo
   */
  static async getLinksByGroup(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { groupId } = request.params as { groupId: string };
      const gId = parseInt(groupId, 10);

      if (isNaN(gId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid group ID",
        });
      }

      const links = await linkService.findByGroupId(gId);

      return reply.code(200).send({
        success: true,
        data: links,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * POST /links - Criar novo link
   */
  static async createLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data: LinkInput = request.body as LinkInput;
      const link = await linkService.create(data);

      return reply.code(201).send({
        success: true,
        data: link,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * PATCH /links/:id - Atualizar link
   */
  static async updateLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const data: Partial<LinkInput> = request.body as Partial<LinkInput>;
      const link = await linkService.update(linkId, data);

      return reply.code(200).send({
        success: true,
        data: link,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /links/:id - Deletar link
   */
  static async deleteLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      await linkService.delete(linkId);

      return reply.code(204).send();
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  }

  // ===== MONITOR OPERATIONS =====

  /**
   * POST /links/:id/monitors - Criar novo monitor
   */
  static async createMonitor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const data: LinkMonitorInput = request.body as LinkMonitorInput;
      data.linkId = linkId;

      const monitor = await linkService.createMonitor(data);

      return reply.code(201).send({
        success: true,
        data: monitor,
      });
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /links/:id/monitors - Listar monitores de um link
   */
  static async getMonitors(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const monitors = await linkService.getMonitors(linkId);

      return reply.code(200).send({
        success: true,
        data: monitors,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * DELETE /links/monitors/:monitorId - Deletar monitor
   */
  static async deleteMonitor(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { monitorId } = request.params as { monitorId: string };
      const mId = parseInt(monitorId, 10);

      if (isNaN(mId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid monitor ID",
        });
      }

      await linkService.deleteMonitor(mId);

      return reply.code(204).send();
    } catch (error: any) {
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  }

  // ===== STATUS & METRICS =====

  /**
   * GET /links/:id/status - Obter status atual do link
   */
  static async getLinkStatus(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const status = await linkService.getLatestStatus(linkId);

      if (!status) {
        return reply.code(404).send({
          success: false,
          error: "No status available for this link",
        });
      }

      return reply.code(200).send({
        success: true,
        data: status,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }

  /**
   * GET /links/:id/metrics - Obter histórico de métricas
   */
  static async getMetrics(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const { limit } = request.query as { limit?: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const limitNum = limit ? parseInt(limit, 10) : 100;

      if (isNaN(limitNum) || limitNum < 1) {
        return reply.code(400).send({
          success: false,
          error: "limit must be a positive number",
        });
      }

      const metrics = await linkService.getMetricsHistory(linkId, limitNum);

      return reply.code(200).send({
        success: true,
        data: metrics,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }

  // ===== TEST ENDPOINTS =====

  /**
   * POST /links/:id/test - Testar monitores de um link
   */
  static async testLink(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = request.params as { id: string };
      const linkId = parseInt(id, 10);

      if (isNaN(linkId)) {
        return reply.code(400).send({
          success: false,
          error: "Invalid link ID",
        });
      }

      const data: LinkTestRequest = (request.body as LinkTestRequest) || {};

      // Obter link e seus monitores
      const link = await linkService.findById(linkId);

      if (!link) {
        return reply.code(404).send({
          success: false,
          error: "Link not found",
        });
      }

      const monitors = await linkService.getMonitors(linkId);
      const results: LinkTestResult[] = [];

      // Filtrar monitores se monitorType foi especificado
      const monitorsToTest = data.monitorType
        ? monitors.filter((m: LinkMonitorOutput) => m.monitorType === data.monitorType)
        : monitors;

      // Testar cada monitor
      for (const monitor of monitorsToTest) {
        const testResult: LinkTestResult = {
          monitorType: monitor.monitorType,
          status: "ERROR",
          timestamp: new Date(),
          error: "Monitor not yet implemented",
        };

        // Por enquanto, só implementamos ICMP
        if (monitor.monitorType === "ICMP") {
          try {
            const config = monitor.config;
            const target = config.target || "8.8.8.8"; // Default para teste
            const metrics = await icmpMonitor.monitor(target, config.count || 4, config.timeout || 3000);

            testResult.status = metrics.success ? "SUCCESS" : "ERROR";
            testResult.latency = metrics.latency;
            testResult.metrics = metrics;
          } catch (err: any) {
            testResult.error = err.message;
          }
        }

        results.push(testResult);
      }

      return reply.code(200).send({
        success: true,
        linkId,
        results,
      });
    } catch (error: any) {
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  }
}
