# CONTEXT.md, Regras do projeto ProFacture

## O que é este produto
SaaS de faturação e gestão para auto-entrepreneurs (micro-entreprises) na França. Público: comunidade lusófona. Interface em português (pt-BR), documentos gerados (factures, devis, livre de recettes) em francês, pois são documentos legais franceses.

## Stack
- Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- Supabase (Postgres, Auth, Storage), região EU
- Vercel (deploy)
- Resend (emails transacionais)
- Geração de PDF: template HTML + chromium serverless (playwright-core + @sparticuz/chromium) em route handler

## Regras de negócio INEGOCIÁVEIS

### RN1. Numeração sequencial de documentos
- Formato: FAC-AAAA-NNNN para factures, DEV-AAAA-NNNN para devis, AVR-AAAA-NNNN para avoirs.
- Sequência por usuário, por tipo, por ano. Sem buracos, sem repetição, sem retrocesso.
- O número é gerado EXCLUSIVAMENTE por uma function Postgres com advisory lock, no momento da emissão (nunca no rascunho, nunca em JavaScript).

### RN2. Imutabilidade (lei anti-fraude TVA)
- Documento com status diferente de 'draft' é IMUTÁVEL: nenhum UPDATE em campos de conteúdo, nenhum DELETE, jamais.
- Garantido por trigger no Postgres, não apenas no frontend.
- Correção de facture emitida: criar um avoir (nota de crédito) referenciando a facture original, e se necessário emitir nova facture.
- Cancelamento de facture emitida: status 'cancelled' + avoir obrigatório. O registro nunca some.

### RN3. Livre de recettes baseado em ENCAIXES, não em faturas
- O CA declarável à URSSAF é o encaixado (data de recebimento do pagamento), nunca o faturado.
- Tabela payments separada de documents. Uma facture pode ter vários pagamentos parciais.
- O livre de recettes é gerado a partir de payments, ordenado por data de encaixe, com: data, referência da facture, cliente, natureza, montante, meio de pagamento.

### RN4. Categorias de atividade
- Cada linha de documento tem categoria: 'vente' (BIC vente), 'service_bic' (BIC prestação) ou 'service_bnc' (BNC).
- Atividade mista é suportada nativamente. Cotisations e seuils são calculados por categoria.

### RN5. Mentions obligatoires nas factures (todas, sempre)
1. Numéro de facture (sequencial)
2. Date d'émission
3. Identité du vendeur: nom/prénom, mention "EI" ou "Entrepreneur Individuel", adresse, SIRET, código APE
4. Identité du client: nom/raison sociale, adresse (+ SIREN se B2B)
5. Date de la vente ou de la prestation
6. Désignation détaillée de chaque ligne
7. Quantité e prix unitaire HT por linha
8. Montant total HT
9. Menção "TVA non applicable, art. 293 B du CGI" se em franchise de TVA; caso contrário, taxa e montante de TVA por linha + total TTC
10. Date d'échéance du paiement
11. Taux des pénalités de retard
12. Menção "Indemnité forfaitaire pour frais de recouvrement: 40 €" (B2B)
13. Conditions d'escompte (ou "Escompte pour paiement anticipé: néant")
14. Para devis: durée de validité
- O template de PDF tem essas menções fixas no layout. O sistema bloqueia emissão se algum campo obrigatório do profile estiver vazio (SIRET, endereço, etc.).

### RN6. Seuils e taxas em arquivo de configuração único
- Arquivo src/config/fiscal.ts, ÚNICO lugar do código com valores fiscais.
- Conteúdo inicial (VALORES A VERIFICAR ANTES DO LANÇAMENTO, mudam por lei de finanças):
  - Seuil micro vente: 188 700 € / Seuil micro service: 77 700 €
  - Franchise TVA vente: 85 000 € (majoré 93 500 €) / service: 37 500 € (majoré 41 250 €)
  - Taxas URSSAF 2026: vente 12,3 %, service BIC 21,2 %, BNC 26,1 %
  - Cada valor com comentário // VERIFIER {ano} e fonte oficial (urssaf.fr)
- Nenhum valor fiscal hardcoded fora deste arquivo.

### RN7. RGPD
- Dados pessoais apenas na região EU.
- Usuário pode exportar todos os seus dados (JSON + PDFs) e solicitar exclusão de conta.
- Exclusão: soft delete imediato + anonimização; documentos fiscais emitidos são conservados pelo prazo legal (10 anos) de forma desvinculada de dados de marketing.
- Nenhum dado de cliente final usado para outro fim.

### RN8. O software não dá conselho fiscal
- Textos de alerta sempre informativos ("Você está a X € do seuil de TVA"), nunca prescritivos personalizados ("você deve optar por X").
- Disclaimer fixo no rodapé das áreas de simulação.

## Regras de segurança INEGOCIÁVEIS

### RS1. RLS em TODAS as tabelas
- alter table ... enable row level security em toda tabela, sem exceção, na mesma migration que a cria.
- Policies sempre com using (auth.uid() = user_id) e with check (auth.uid() = user_id) (ou via join quando a tabela referencia documents).
- Proibido desabilitar RLS "temporariamente".

### RS2. Chaves
- anon key: browser. service_role key: APENAS em route handlers/server actions, via variável de ambiente sem prefixo NEXT_PUBLIC_.
- Proibido contornar RLS com service_role para "resolver" erro de permissão. Erro de permissão se resolve corrigindo a policy.

### RS3. Validação dupla
- Zod em todos os formulários e route handlers (UX e API).
- Constraints/checks no Postgres (verdade final): montantes >= 0, status em lista fechada, categoria em lista fechada, email com formato válido.

### RS4. Audit log
- Tabela audit_log preenchida por trigger em: emissão, cancelamento, criação de avoir, registro/remoção de pagamento, alteração de profile fiscal.
- Campos: user_id, action, entity, entity_id, payload (jsonb), created_at. Append-only (sem UPDATE/DELETE, garantido por policy e por ausência de grants).

### RS5. Rate limiting
- Endpoints de envio de email e de geração de PDF limitados por usuário (ex.: 30/hora) via Upstash Redis ou tabela de contagem no Postgres.

### RS6. Storage
- Bucket de PDFs privado. Acesso somente via signed URLs de curta duração geradas no servidor, com verificação de propriedade antes.

## Schema de referência (resumo)
profiles, clients, catalog_items, documents, document_lines, payments, purchases (registre des achats), sequences, audit_log. Detalhes nas migrations. Toda tabela de dados do usuário tem user_id uuid not null references auth.users.