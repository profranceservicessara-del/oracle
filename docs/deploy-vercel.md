# Deploy pela Vercel CLI

Este projeto usa a Vercel CLI localmente. A chave deve ficar somente na sua maquina, fora do Git.

## 1. Criar o token

Crie um token em **Vercel > Account Settings > Tokens**.

## 2. Salvar o token localmente

Na raiz do projeto, crie o arquivo `.env.vercel.local`:

```env
VERCEL_TOKEN=cole_o_token_da_vercel_aqui
```

Por padrao, o script envia tudo para:

```env
VERCEL_PROJECT=oracle
VERCEL_TEAM=profranceservicessara-dels-projects
```

Voce so precisa adicionar essas duas linhas se quiser sobrescrever o destino.

Esse arquivo ja fica ignorado pelo Git pelo padrao `.env.*.local`.

## 3. Ligar este projeto ao projeto da Vercel

```bash
npm run vercel:link
```

## 4. Baixar configuracoes da Vercel

```bash
npm run vercel:pull
```

## 5. Enviar deploy

Preview:

```bash
npm run deploy:preview
```

Producao:

```bash
npm run deploy:prod
```

## Variaveis do projeto

Confirme na Vercel as variaveis listadas em `.env.example`, principalmente Supabase, Stripe, Resend, `CRON_SECRET` e `NEXT_PUBLIC_APP_URL`.
