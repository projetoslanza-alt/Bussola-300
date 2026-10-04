# Importação do ADP

A planilha `.xlsx` é lida no backend. Não há conversão manual para CSV.

## Classificação das abas

O parser classifica cada aba pelo título:

- semana, no formato `DDMM A DDMM`;
- consolidado, quando o nome contém `GERAL`;
- acumulado, quando o nome indica resultado acumulado;
- equipe, quando o nome contém uma equipe conhecida, como MANÍACOS, NEGOCIADORES, ELITE, BOPE, MERCENÁRIOS ou VINGADORES;
- demais abas ficam como não classificadas e geram aviso se tiverem cabeçalho de métricas.

O ciclo comercial vai do dia 16 do mês anterior ao dia 15 do mês nomeado na aba. Outubro 2026 cobre 16/09/2026 a 15/10/2026. Cada fato diário entra no ciclo que contém a própria data. Data fora de qualquer ciclo, linha sem data e aba de resultado acumulado não entram no indicador.

## Fonte oficial

Cada indicador tem uma fonte só. Fontes equivalentes não são somadas.

- Consolidado geral: linha `TOTAL` da aba `ADP GERAL` do ciclo, grão `consolidado_total`. Não é a soma das pessoas, nem a aba da equipe, nem a semana, nem o resultado acumulado.
- Resultado da equipe: linha `TOTAL <equipe>` da mesma aba `ADP GERAL`, grão `consolidado_equipe_total`. O nome da equipe vem do rótulo da linha e do cabeçalho da seção. A aba da equipe não repete esse volume; ela é a fonte de meta, funil e realizado individual.
- Pessoas do bloco superior: grão `consolidado`, sem equipe. A visão da pessoa usa esse grão e não soma o detalhe da seção.
- Pessoas dentro da seção: grão `consolidado_equipe`. É detalhe. Não entra de novo no total da equipe.
- Histórico diário: grão `diario` das abas semanais, só nas datas do ciclo. Não entra no KPI mensal.

Em Outubro 2026 a soma de MANÍACOS, ELITE, NEGOCIADORES e BOPE coincide com o consolidado geral porque cada linha de produção do bloco superior está dentro de uma dessas seções. MERCENÁRIOS e VINGADORES não têm linha `TOTAL` nesse ciclo. A ausência fica explícita; não vira zero.

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
