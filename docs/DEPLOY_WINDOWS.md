# Deploy no Windows

Esta instalação fica isolada de qualquer outro Bússola no mesmo servidor.

## Conferido nesta máquina

- PostgreSQL já existente na porta 5432 não foi alterado.
- O processo que escutava a porta 3010 não foi interrompido.
- O Bússola 300 usa outro cluster em `E:\Bussola300\data`, porta **5433**.
- Banco `bussola300_prod`, usuário `bussola300_app`, senha só no `.env` e em `E:\Bussola300\app-password.txt`.
- Aplicação na porta **3040**. Código em `E:\Lanza\Projetos\300 bussola`.
- Uploads em `E:\Bussola300\uploads`. Log do Postgres em `E:\Bussola300\logs\postgres.log`.

Não foi encontrado um domínio próprio. A aplicação responde em `http://127.0.0.1:3040/`. Falta apenas publicar um DNS e um certificado se o acesso externo precisar de HTTPS. Não foi criado proxy para não substituir configuração de outro site.

## Subir o banco

```powershell
& "C:\Program Files\PostgreSQL\16\bin\pg_ctl.exe" -D E:\Bussola300\data -o "-p 5433" -l E:\Bussola300\logs\postgres.log start
```

## Subir a aplicação

```powershell
cd "E:\Lanza\Projetos\300 bussola"
npm start
```

O script `scripts\start-bussola300.ps1` faz as duas etapas. Nesta máquina não havia NSSM nem um serviço Node já padronizado para copiar. O serviço Windows `Bussola300` não foi registrado porque criar serviço exige privilégio de administrador e o processo atual já atende ao uso local. Para sobreviver a reboot com nome exclusivo:

```powershell
sc.exe create Bussola300 binPath= "node \"E:\Lanza\Projetos\300 bussola\src\index.js\"" start= auto
```

Execute isso só em um prompt de administrador e confira antes que o nome `Bussola300` não existe. Não reutilize o nome de serviço de outro sistema.

## Rollback

Pare só o processo na porta 3040. Restaure a pasta do código e, se precisar, o dump de `bussola300_prod`. Não pare o PostgreSQL da porta 5432 e não restaure dump nesse outro cluster.
