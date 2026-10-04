# Chamados

O catálogo inicial vem de `catalogo_chamados_300.xlsx`, abas `Validação`, `Escala SLA` e `Regras de uso`.

A célula `Total de motivos` da planilha declara 48. A grade principal tem 43 motivos e a seção Comercial, com colunas deslocadas, tem mais 7 tipos. O cabeçalho `Tipo de chamado` não é motivo. O parser importa os 50 títulos e registra a diferença; não cria nem apaga linhas para forçar 48.

Motivo sem código, tipo, SLA ou dono é importado com UUID, `catalog_code` nulo e `config_pending`. A administração mostra `Configuração pendente` e os campos faltantes. O sistema não completa códigos. Linha incompleta não é descartada por falta de código, dono ou SLA.

A prioridade final é a mais crítica entre o SLA padrão do motivo e a matriz impacto × urgência. A matriz não reduz uma prioridade padrão mais crítica.

O SLA é calculado no servidor, em horário útil configurável, fuso `America/Sao_Paulo`. `AGUARDANDO_SOLICITANTE` pausa o relógio e cada intervalo fica gravado.

Há um único responsável operacional. Sem responsável padrão, o chamado nasce como `Aguardando atribuição`. A vice-presidência acompanha prazos e gargalos no relatório gerencial e não vira dona do chamado.

Temas de desligamento, ética, LGPD ou solicitação restrita ficam com `is_restricted`. Listagens de quem não participa do chamado não recebem esses registros.

Encerrar exige texto de solução ou decisão. Reabrir exige motivo e incrementa o contador.
