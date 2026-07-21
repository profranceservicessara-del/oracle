# ProFrance — Tarefas e Prompts Recorrentes (recurring-tasks)

> Fluxos que se repetem. Estes são candidatos naturais a virar skills
> (ver profrance-skill-candidates.md), mas aqui ficam só listados.

---

## 1. Atendimento a cliente (casework recorrente)

Do core e checklists. `[CONFIRMED]`

- Preencher/organizar dossier de **Titre de Séjour** (1ª demanda, renouvellement, changement de statut).
- Abrir direitos de **Assurance Maladie** / obter número de Sécurité Sociale / **Carte Vitale**.
- Abrir **AME** para situação irregular.
- Orientar troca de **CNH → Permis** (sem acordo bilateral).
- **Carte Grise**: transferência, mudança de endereço, duplicata.
- **Déclaration de revenus** e criação de numéro fiscal.
- **Attestation d'accueil** (carta-convite).
- **Currículo Europass**.
- **Tradução fiel** de carta oficial francesa.
- (Memória) titre de séjour, navegação ANEF, abertura de cobertura de saúde, transferência de título de veículo, processo de permis — casework recorrente. `[CONFIRMED]`

## 2. Produção de conteúdo (recorrente)

- Cards da **Central Viva** em JSON, com múltiplas `variations` por card. `[CONFIRMED]`
- Categorias de conteúdo já existentes: advertências, alertas de golpe, mensagens difíceis, apresentação de serviços, dicas, alertas de prazo. `[CONFIRMED]`
- (Memória) Biblioteca copy-paste de posts com troca de tom (Acolhedora, Formal, Firme, Cortante). `[UNKNOWN neste Project]`
- (Memória) Extração de "voz-bruna.md" de transcrição. `[UNKNOWN neste Project]`

## 3. Prompts recorrentes de estrutura

- Validar JSON de card em Python e Node antes de entregar. `[USER-DEFINED RULE]` (citado em memória; boa prática) → `[INFERRED]`
- Sempre fechar orientação com nota de fonte oficial. `[USER-DEFINED RULE]`
- Sempre traduzir termo francês na 1ª aparição. `[USER-DEFINED RULE]`

## 4. Tarefas de infraestrutura (pendentes e recorrentes na pauta)

Só em memória, não verificável aqui:
- Finalizar nome do negócio → depois domínio → depois e-mail/infra (sequência obrigatória). `[UNKNOWN neste Project]`
- Verificação INPI classe 35. `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`

## 5. Controle recorrente de validade / prazos

Ver `profrance-administrative-knowledge.md` seção de prazos. Recorrência típica:
- Renovação de titre: abrir 2 meses antes (checklist) / 4 meses antes (Central Viva). **Divergência interna — ver conflicts.** `[CONFLICTING]`
- Declaração fiscal: abril–junho, anual. `[CONFIRMED]` / `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
- Validação VLS-TS no OFII: até 3 meses da entrada. `[CONFIRMED]` / `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
- Troca CNH: até 1 ano da entrada. `[CONFIRMED]` / `[OFFICIAL-SOURCE VERIFICATION REQUIRED]`
