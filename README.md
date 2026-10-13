# Bússola 300

Aplicação da 300 Franchising para ADP comercial e chamados. É um sistema próprio, com banco, usuário, porta, uploads e logs separados de qualquer outro Bússola.

## Arquitetura

- Node.js e Express em `src/`
- PostgreSQL, com migrations em `migrations/`
- Planilhas lidas no backend com SheetJS
- Interface em `index.html`, preservando o visual do MVP, e `public/live.js` para ADP, chamados, relatórios e administração

O dashboard lê o banco. A planilha só entra de novo por uma importação.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 16
- As planilhas iniciais na raiz do projeto

## Instalação

```powershell
npm install
copy .env.example .env
npm run migrate
npm run seed
npm start
```

O seed importa `ADP BH SCALE_2026.xlsx` e `catalogo_chamados_300.xlsx` quando o banco ainda não tem carga. A senha do administrador inicial vem de `ADMIN_PASSWORD` no `.env`. Ela não é gravada no código.

## Dados reais de ROI, vendas e chamados

O comando abaixo não importa ADP. As planilhas ficam fora do Git, em `REAL_DATA_DIR`, em `imports/` ou na raiz do projeto.

```powershell
npm run import:real-data
```

Ele lê ROI, Equipe Comercial, Controle de Vendas e o catálogo de chamados. A base de colaboradores é a do ROI. Nomes da Equipe ou de Vendas sem correspondência no ROI viram pendência e não criam pessoa.

## Variáveis

Veja `.env.example`. O `.env` real fica fora do Git. Em especial: `PORT`, `DATABASE_URL`, `SESSION_SECRET`, `UPLOAD_DIR`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`.

## Banco

As migrations são aplicadas só no banco apontado por `DATABASE_URL`. Não use `DROP DATABASE`. O usuário da aplicação deve ser dono apenas do banco Bússola 300.

## Desenvolvimento e produção

`npm start` sobe a API e a interface. `GET /health` informa se a aplicação e o banco estão acessíveis, com versão e horário, sem dados sensíveis.

## Backup e rollback

Antes de atualizar uma instalação já em uso:

1. copie a pasta do código;
2. gere um dump só do banco Bússola 300;
3. anote o commit ou a pasta da versão anterior.

Para voltar: restaure o código, pare o processo na porta do Bússola 300 e restaure o dump nesse mesmo banco. Não restaure por cima de outro sistema.

## Troubleshooting

- Login recusado depois de várias tentativas: a conta fica bloqueada por 15 minutos.
- Importação do mesmo arquivo: a tela avisa que o hash já foi concluído. Um administrador pode marcar reprocessamento.
- Erros `#DIV/0!` e `#REF!` viram ausência de valor e entram no relatório de avisos. Zero continua sendo zero.
