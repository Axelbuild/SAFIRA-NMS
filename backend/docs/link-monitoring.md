# Monitoramento de links: unidade de tempo

Todos os campos numéricos de latência, timeout, tempo de resposta e threshold usam
milissegundos (`ms`) tanto internamente como nas respostas da API. Os campos são
números, sem sufixo textual: `3` representa 3 ms e `3116` representa 3116 ms.

Isto se aplica a `latency`, `icmpLatency`, `responseTime`, `httpResponseTime`,
`httpsResponseTime`, `tcpResponseTime` e `dnsResponseTime`. Valores decimais, como
`3.42`, permanecem em ms. O tempo total de execução de um processo não é usado como
substituto da latência ICMP média reportada pelo comando `ping`.
