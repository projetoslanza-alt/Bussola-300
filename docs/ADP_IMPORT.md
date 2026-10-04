# Importação do ADP

A planilha `.xlsx` é lida no backend. Não há conversão manual para CSV.

## Classificação das abas

O parser classifica cada aba pelo título:

- semana, no formato `DDMM A DDMM`;
- consolidado, quando o nome contém `GERAL`;
- acumulado, quando o nome indica resultado acumulado;
- equipe, quando o nome contém uma equipe conhecida, como MANÍACOS, NEGOCIADORES, ELITE, BOPE, MERCENÁRIOS ou VINGADORES;
- demais abas ficam como não classificadas e geram aviso se tiverem cabeçalho de métricas.

O ciclo comercial vai do dia 16 do mês anterior ao dia 15 do mês nomeado na aba. Outubro 2026, por exemplo, cobre 16/09/2026 a 15/10/2026. Uma semana entra no ciclo cujo intervalo contém a data inicial.

## O que é gravado

- ciclos, equipes e vínculo colaborador + equipe + ciclo;
- fatos de ligação, abertura, formulário, online, call agendada, call realizada, teste vocacional e venda;
- grãos de consolidado, total, equipe e dia;
- metas individuais de faturamento e venda, sem inverter meta e realizado;
- funil, referências mínimas e projeções;
- avisos de fórmula, com aba e célula.

Nomes são comparados sem diferença de caixa, espaço ou acento. `CAIO` e `CAIO MARTINS` se unem quando a correspondência é única. `DANIEL` diante de `DANIEL MARTINS` e `DANIEL SOARES` fica pendente de reconciliação.

Reimportar o mesmo SHA-256 concluído não duplica. O administrador pode forçar o reprocessamento. A chave dos fatos inclui ciclo, pessoa, equipe, métrica, grão e data.

## Conferência

O consolidado oficial do ciclo é a linha `TOTAL` do consolidado geral, grão `consolidado_total`. Outubro 2026 deve refletir os números que estiverem nessa linha da planilha, inclusive zero em teste vocacional.
