import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

/**
 * Faz ping para um servidor
 * @param ip Endereço IP do servidor
 * @param timeout Timeout em milissegundos (default: 3000)
 * @returns true se o servidor responde ao ping, false caso contrário
 */
export async function pingServer(
  ip: string,
  timeout: number = 3000
): Promise<boolean> {
  try {
    // Determinar comando baseado no SO
    const isWindows = process.platform === "win32";
    
    let command: string;
    if (isWindows) {
      // Windows: ping -n 1 -w timeout
      command = `ping -n 1 -w ${timeout} ${ip}`;
    } else {
      // Linux/Mac: ping -c 1 -W timeout (em milissegundos / 1000 para segundos)
      const timeoutSeconds = Math.ceil(timeout / 1000);
      command = `ping -c 1 -W ${timeoutSeconds * 1000} ${ip}`;
    }

    await execAsync(command, { timeout: timeout + 1000 });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Faz ping para múltiplos servidores em paralelo
 * @param ips Array de IPs
 * @param timeout Timeout em milissegundos
 * @returns Mapa de IP -> resultado do ping
 */
export async function pingMultipleServers(
  ips: string[],
  timeout: number = 3000
): Promise<Record<string, boolean>> {
  const results = await Promise.all(
    ips.map(async (ip) => ({
      ip,
      online: await pingServer(ip, timeout),
    }))
  );

  return results.reduce(
    (acc, { ip, online }) => {
      acc[ip] = online;
      return acc;
    },
    {} as Record<string, boolean>
  );
}
