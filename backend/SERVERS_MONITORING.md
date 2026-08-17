# Monitoramento de Servidores Linux e Windows via SNMP

## 📋 Visão Geral da Arquitetura

Este projeto foi expandido para monitorar **Servidores Linux** (e posteriormente **Windows**) mantendo a mesma estrutura e padrões do monitoramento de impressoras.

### Estrutura Hierárquica

```
checkDevices()
   │
   ├── Printers (Existente)
   │    ├── ping/SNMP
   │    └── toner
   │
   └── Servers (Novo)
        ├── Linux
        │    ├── ping
        │    ├── SNMP
        │    ├── CPU
        │    ├── RAM
        │    ├── DISK
        │    └── interfaces
        │
        └── Windows
             ├── ping
             ├── SNMP
             ├── CPU
             ├── RAM
             ├── DISK
             └── interfaces
```

---

## 📁 Estrutura de Diretórios

```
backend/src/
├── types/
│   ├── printer.ts          # Types existentes de impressoras
│   └── server.ts           # 🆕 Types para servidores
│
├── snmp/
│   ├── printer.service.ts  # Serviço SNMP existente
│   ├── server.oids.ts      # 🆕 OIDs SNMP para servidores
│   └── server.service.ts   # 🆕 Serviço SNMP para servidores
│
├── services/
│   ├── printer.service.ts  # Service existente
│   ├── server.service.ts   # 🆕 Service principal de servidores
│   ├── server.alert.service.ts  # 🆕 Processamento de alertas
│   └── servers/            # 🆕 Serviços específicos
│       ├── index.ts
│       ├── ping.service.ts # Serviço de ping
│       └── linux/          # Serviços específicos de Linux
│           ├── index.ts
│           ├── cpu.service.ts
│           ├── memory.service.ts
│           ├── disk.service.ts
│           └── interfaces.service.ts
│
├── models/
│   ├── printer.models.ts   # Model existente
│   └── server.models.ts    # 🆕 Model para servidores
│
├── controllers/
│   ├── printer.controllers.ts  # Controller existente
│   └── server.controller.ts    # 🆕 Controller para servidores
│
├── routes/
│   ├── printer.routes.ts   # Routes existentes
│   └── server.routes.ts    # 🆕 Routes para servidores
│
├── jobs/
│   ├── printer.job.ts      # Job existente
│   └── server.job.ts       # 🆕 Job agendado para servidores
│
└── app.ts                  # 🔄 Atualizado com suporte a servidores
```

---

## 🗄️ Modelos do Banco de Dados

### Novo Model: `Servers`
```prisma
model Servers {
  id                    Int      @id @default(autoincrement())
  name                  String
  ip                    String   @unique
  osType                String   // "LINUX" | "WINDOWS"
  hostname              String?
  lastRecoveryAttemptAt DateTime?
  recoveryAttempts      Int      @default(0)
  groupId               Int
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  group       Group                      @relation(fields: [groupId], references: [id])
  ipHistory   ServerIpHistory[]
  alerts      ServerAlertState[]
  snapshots   ServerMetricsSnapshot[]
}
```

### Novo Model: `ServerMetricsSnapshot`
Armazena snapshots de métricas com suporte para:
- **CPU**: uso (%), número de cores
- **Memória**: total, usado, livre (em MB), porcentagem
- **Disco**: múltiplos discos em JSON
- **Interfaces**: múltiplas interfaces em JSON

### Novo Model: `ServerAlertState`
Gerencia alertas por métrica:
- Tipo de alerta: `CPU` | `MEMORY` | `DISK` | `NETWORK`
- Limites configuráveis por tipo

---

## 🔌 Endpoints API

### Operações CRUD

```bash
# Criar servidor
POST /servers
Content-Type: application/json
{
  "name": "Web Server 01",
  "ip": "192.168.1.100",
  "osType": "LINUX",
  "hostname": "web01.example.com",
  "groupId": 1
}

# Listar todos os servidores
GET /servers

# Buscar servidor por ID
GET /servers/:id

# Buscar servidores de um grupo
GET /servers/group/:groupId

# Atualizar servidor
PUT /servers/:id
Content-Type: application/json
{
  "hostname": "novo-hostname"
}

# Deletar servidor
DELETE /servers/:id
```

---

## 🔄 Fluxo de Monitoramento

### checkServers() - Job Agendado (a cada 5 minutos)

```
Para cada servidor em batches de 5:
  1. Fazer PING → Se offline, marcar como OFFLINE
  2. Se online → Coletar métricas via SNMP:
     - Informações do sistema (hostname, uptime)
     - CPU (load average)
     - Memória (total, usado, livre)
     - Disco (todos os volumes montados)
     - Interfaces de rede
  3. Armazenar snapshot em ServerMetricsSnapshot
  4. Processar alertas baseado em thresholds
  5. Logar status
```

### Thresholds de Alerta (Padrão)

```typescript
{
  cpuThreshold: 80,      // %
  memoryThreshold: 85,   // %
  diskThreshold: 90      // %
}
```

---

## 🐧 OIDs SNMP Utilizados

### Universal (Linux & Windows)

```
System Information:
- 1.3.6.1.2.1.1.1.0 → sysDescr
- 1.3.6.1.2.1.1.3.0 → sysUpTime
- 1.3.6.1.2.1.1.5.0 → sysName (hostname)

Host Resources (RFC 2790):
- 1.3.6.1.2.1.25.3.2.1.3 → CPU Load
- 1.3.6.1.2.1.25.2.3.1 → Storage Table

Network Interfaces:
- 1.3.6.1.2.1.2.2.1 → ifTable
```

### Linux Específico (UCD-SNMP-MIB)

```
Memória:
- 1.3.6.1.4.1.2021.4.5.0 → memTotalReal
- 1.3.6.1.4.1.2021.4.6.0 → memAvailReal
- 1.3.6.1.4.1.2021.4.9.0 → memUsedReal

CPU:
- 1.3.6.1.4.1.2021.10.1.3.1 → laLoad.1 (1min)
- 1.3.6.1.4.1.2021.10.1.3.2 → laLoad.5 (5min)
- 1.3.6.1.4.1.2021.10.1.3.3 → laLoad.15 (15min)

Processes:
- 1.3.6.1.4.1.2021.2.1.25.0 → procs
```

---

## ⚙️ Configuração de SNMP no Linux

Para que o monitoramento funcione, o servidor Linux deve ter o SNMP habilitado:

```bash
# Instalar SNMP
sudo apt-get install snmp snmpd

# Editar configuração
sudo nano /etc/snmp/snmpd.conf

# Adicionar linhas:
rocommunity public  # Comunidade pública (leitura)
sysdescr "Linux Server"
sysLocation "Data Center"
sysContact "admin@example.com"

# Restart
sudo systemctl restart snmpd
```

---

## 🔌 Configuração de SNMP no Windows

Windows requer instalação de SNMP services:

```powershell
# Instalar SNMP Service
Add-WindowsFeature SNMP-Service

# Configurar via Group Policy ou Registry
# OIDs específicos do Windows serão implementados em próximas versões
```

---

## 🚀 Próximas Etapas

### 1. Implementar Monitoramento Windows
- [ ] Adicionar OIDs específicos do Windows
- [ ] Criar services em `services/servers/windows/`
- [ ] Testar coleta de CPU, memória, disco

### 2. Aprimoramentos do Linux
- [ ] Implementar coleta mais detalhada de interfaces
- [ ] Adicionar métricas de I/O
- [ ] Coletar estatísticas de processos

### 3. Alertas por Email
- Integrar com `mail.service.ts` existente
- Enviar notificações quando thresholds são ultrapassados

### 4. Histórico de Métricas
- Criar tabela `ServerMetricsHistory` para análise temporal
- Implementar dashboard com gráficos

### 5. Auto-Recovery
- Implementar `server.auto-recovery.service.ts`
- Executar scripts de recuperação automática

---

## 📝 Exemplo de Uso

### Criar grupo e adicionar servidores

```bash
# Criar grupo
curl -X POST http://localhost:3333/groups \
  -H "Content-Type: application/json" \
  -d '{"name":"Servidores Produção"}'

# Criar servidor Linux
curl -X POST http://localhost:3333/servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Web API 01",
    "ip": "192.168.1.100",
    "osType": "LINUX",
    "hostname": "api01.prod.local",
    "groupId": 1
  }'

# Listar todos os servidores
curl http://localhost:3333/servers

# Verificar status
curl http://localhost:3333/servers/1
```

---

## 🛠️ Desenvolvimento e Troubleshooting

### Testar conectividade SNMP

```bash
# Linux
snmpwalk -v 2c -c public 192.168.1.100 1.3.6.1.2.1.1

# Testar OID específico
snmpget -v 2c -c public 192.168.1.100 1.3.6.1.2.1.1.5.0
```

### Debug de métricas

Logs são impressos em console e podem ser monitorados via:

```bash
# Ver logs do serviço
docker logs -f container_name
```

---

## 📚 Referências

- [RFC 1213 - Management Information Base for Network Management](https://tools.ietf.org/html/rfc1213)
- [RFC 2790 - Host Resources MIB](https://tools.ietf.org/html/rfc2790)
- [net-snmp Documentation](http://net-snmp.sourceforge.net/)
- [UCD-SNMP-MIB](http://net-snmp.sourceforge.net/docs/mibs/UCD-SNMP-MIB.txt)
