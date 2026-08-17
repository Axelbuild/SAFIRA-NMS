import { execSync } from "child_process";
import { ICMPMetrics, LinkStatus } from "../../types/link";

export class ICMPMonitor {
  /**
   * Executa monitoramento ICMP (ping) para um alvo
   * @param target IP ou hostname
   * @param count número de pings
   * @param timeout timeout em ms
   * @returns Métricas ICMP
   */
  async monitor(
    target: string,
    count: number = 4,
    timeout: number = 3000
  ): Promise<ICMPMetrics> {
    try {
      // Validar target
      if (!target || typeof target !== "string") {
        throw new Error("target must be a non-empty string");
      }

      const startTime = Date.now();

      // Executar ping com timeout
      // Windows: ping -n <count> -w <timeout> <target>
      // Linux: ping -c <count> -W <timeout (ms)> <target>
      const isWindows = process.platform === "win32";
      const pingCmd = isWindows
        ? `ping -n ${count} -w ${timeout} ${target}`
        : `ping -c ${count} -W ${Math.ceil(timeout / 1000) * 1000} ${target}`;

      const output = execSync(pingCmd, {
        encoding: "utf-8",
        timeout: timeout * count + 1000, // Buffer extra para comando completar
        stdio: ["pipe", "pipe", "pipe"],
      });

      const responseTime = Date.now() - startTime;

      // Parse output para pegar latência e packet loss
      let latency = 0;
      let packetLoss = 0;

      if (isWindows) {
        // Windows output pattern: "Minimum = XXms, Maximum = XXms, Average = XXms"
        const avgMatch = output.match(/Average\s*=\s*(\d+)/);
        latency = avgMatch ? parseInt(avgMatch[1], 10) : responseTime;

        // Packet loss pattern: "(XX% loss)"
        const lossMatch = output.match(/\((\d+)%\s*loss\)/);
        packetLoss = lossMatch ? parseInt(lossMatch[1], 10) : 0;
      } else {
        // Linux output pattern: "avg = XXX/XXX/XXX/XXX ms"
        const avgMatch = output.match(/avg\s*=\s*[^/]+\/([^/]+)/);
        latency = avgMatch ? Math.round(parseFloat(avgMatch[1])) : responseTime;

        // Packet loss pattern: "X% packet loss"
        const lossMatch = output.match(/(\d+)%\s*packet loss/);
        packetLoss = lossMatch ? parseInt(lossMatch[1], 10) : 0;
      }

      return {
        latency: Math.max(latency, 1),
        packetLoss: Math.min(Math.max(packetLoss, 0), 100),
        success: packetLoss < 100, // Sucesso se não perdeu 100% dos pacotes
        target,
      };
    } catch (error: any) {
      // Ping falhou
      return {
        latency: 0,
        packetLoss: 100,
        success: false,
        target,
      };
    }
  }

  /**
   * Determina status baseado em métricas ICMP
   */
  getStatus(metrics: ICMPMetrics): LinkStatus {
    if (!metrics.success) return "OFFLINE";

    // SUSPECT: packetLoss > 10% ou latência > 300ms
    if (metrics.packetLoss > 10 || metrics.latency > 300) {
      return "SUSPECT";
    }

    return "ONLINE";
  }
}
