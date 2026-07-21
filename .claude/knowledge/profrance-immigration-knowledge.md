# ProFrance / CentralViva - Conhecimento de Imigracao (completo, para agentes)

> **Este documento substitui a versao anterior.** Destino: alimentar agentes e subagentes especializados.
>
> **Duas origens, marcadas em cada bloco:**
> - `[CONVERSA]` = ja existia nas conversas do CentralViva (inventario do que foi inserido).
> - `[WEB-2026]` = verificado por busca na web nesta sessao (julho/2026). Fonte oficial confirmada.
>
> **Regra de ouro para qualquer agente construido a partir daqui:** nenhum agente deve afirmar valores, prazos ou procedimentos como definitivos. Todos apontam para a fonte oficial e recomendam checar a data. Regras de imigracao francesas mudaram varias vezes so em 2026. Ver secao final "Regras obrigatorias para agentes".

---

## 1. Sites oficiais (verificados em julho/2026)

### Nucleo imigracao / sejour

| Orgao | URL oficial atual | O que faz | Origem |
|---|---|---|---|
| **ANEF** (Administration Numerique des Etrangers en France) | `administration-etrangers-en-france.interieur.gouv.fr` | Portal do Ministere de l'Interieur para demarches de sejour online: renovacao de titre de sejour, validacao de VLS-TS, duplicata, mudanca de endereco, e naturalisation em prefectures piloto. Autenticacao via **FranceConnect**. | `[CONVERSA]` (citado como `anef.interieur.gouv.fr`) + `[WEB-2026]` (dominio completo confirmado) |
| **Service-Public** | `service-public.gouv.fr` (migrou de `service-public.fr`, que redireciona) | Direitos e demarches oficiais, secao etrangers. Fonte de referencia legal. | `[CONVERSA]` + `[WEB-2026]` (dominio .gouv.fr confirmado como atual) |
| **OFII** (Office Francais de l'Immigration et de l'Integration) | `ofii.fr` | Validacao de VLS-TS, contrat d'integration republicaine (CIR), integracao, regularizacao. | `[CONVERSA]` (citado como orgao) + `[WEB-2026]` (papel confirmado) |
| **CESEDA / Legifrance** | `legifrance.gouv.fr` | Codigo de entrada e sejour dos estrangeiros. Base juridica. | `[WEB-2026]` |
| **Prefecture** (competente por departamento) | portal do departamento (ex: prefecture 94 para Val-de-Marne) | RDV fisico para remise do titre, primeira delivranca de certos titulos, naturalisation (maioria), casos complexos. | `[CONVERSA]` (generico) + `[WEB-2026]` |

### Permis de conduire (troca de CNH)

| Orgao | URL oficial | O que faz | Origem |
|---|---|---|---|
| **ANTS / France Titres** | `permisdeconduire.ants.gouv.fr` (portal geral `ants.gouv.fr`) | **Aqui** se faz a troca de permis estrangeiro, nao na ANEF. Emite a ADS (Attestation de Depot Securise), valida 4 meses, para dirigir enquanto espera. | `[WEB-2026]` (corrige suposicao comum de que seria ANEF) |

### Saude / prestacoes sociais

| Orgao | URL oficial | O que faz | Origem |
|---|---|---|---|
| **Assurance Maladie** | `ameli.fr` | Carte vitale, reembolsos, situacao de segurado. | `[CONVERSA]` + `[WEB-2026]` |
| **CAF** | `caf.fr` | Allocations: aides au logement (APL), RSA, prime d'activite, allocations familiales. | `[CONVERSA]` + `[WEB-2026]` |
| **AME** (Aide Medicale d'Etat) | via `ameli.fr` / CPAM | Cobertura de saude para pessoas em situacao irregular sob condicoes. Elegibilidade muda; **verificar sempre**. | `[CONVERSA]` (posts de AME ja criados) |

### Empresa / negocios (lado SARA)

| Orgao | URL oficial | O que faz | Origem |
|---|---|---|---|
| **Auto-entrepreneur URSSAF** | `autoentrepreneur.urssaf.fr` | Criar e gerir auto-entreprise, declarar chiffre d'affaires, pagar cotisations. | `[CONVERSA]` (urssaf.fr) + `[WEB-2026]` (portal dedicado confirmado) |
| **URSSAF geral** | `urssaf.fr` | Cotisations sociais dos independentes. | `[CONVERSA]` + `[WEB-2026]` |
| **Impots** | `impots.gouv.fr` | Imposto de renda, numero fiscal, **TVA** (a TVA se declara aqui, nao na URSSAF). Tambem serve como login FranceConnect para a ANEF. | `[CONVERSA]` + `[WEB-2026]` |
| **Guichet unique INPI** | `formalites.entreprises.gouv.fr` | Formalidades de criacao/cessacao de empresa (substituiu os antigos CFE). | `[WEB-2026]` |
| **France Travail** (ex-Pole Emploi) | `francetravail.fr` | Emprego, vagas. Nome mudou de Pole Emploi. | `[CONVERSA]` (mudanca ja registrada) + `[WEB-2026]` |

### Detachement / BTP (lado SARA)

| Orgao | URL oficial | O que faz | Origem |
|---|---|---|---|
| **SIPSI** | `sipsi.travail.gouv.fr` | Declaration Prealable au Detachement (DPD) de trabalhadores destacados. FAQ em 5 idiomas. | `[CONVERSA]` (servico SARA) + `[WEB-2026]` (URL confirmada) |
| **Carte BTP** | `cartebtp.fr` (gestao pela **CIBTP**, `cibtp.fr`) | Carte d'identification professionnelle do BTP. Pedida **apos** a DPD no SIPSI, **antes** do inicio do detachement. Um terceiro habilitado (agente) pode criar a conta e pedir as cartas: e exatamente o servico que a SARA presta. | `[CONVERSA]` (servico SARA) + `[WEB-2026]` (fluxo confirmado) |
| **Tachygraphe** (transporte) | ministere charge des transports | Documentacao de tacografo para transporte. Servico SARA citado. | `[CONVERSA]` (so o nome) |

### Consulado / embaixada Brasil

| Orgao | URL | Nota | Origem |
|---|---|---|---|
| Embaixada/consulado do Brasil em Paris | citado nas conversas como `bresil.org` | **`[WEB-2026]` nao confirmou** este dominio como oficial atual. **Verificar** no portal do Itamaraty (gov.br/mre) antes de usar em post ou agente. | `[CONVERSA]` (possivel desatualizado) |

---

## 2. Procedimentos (verificados, com data)

> Cada procedimento abaixo tem uma etiqueta de confianca. Tudo aqui e sensivel a mudanca.

### 2.1 Titre de sejour - primeira demanda `[WEB-2026]`
- Desde 2021 a maioria das demandas passa pela **ANEF** online; ir a prefecture sem RDV e quase impossivel. `OFFICIAL-SOURCE VERIFICATION REQUIRED`
- Primeira demanda: deposito online possivel para **certas categorias** (estudante principalmente); para muitos motivos ainda ha **RDV fisico obrigatorio** para a remise do titulo. `POSSIBLY OUTDATED` (varia por prefecture e categoria)
- Exige **e-photo** (foto digital assinada com codigo para escanear), de cabine Photomaton ou fotografo agree ANTS, normas ICAO (fundo branco/cinza, expressao neutra). `[WEB-2026]`
- Documentos escaneados em PDF/imagem legiveis; numero AGDREF (10 digitos) se ja tiver; meio de pagamento das taxas. `[WEB-2026]`

### 2.2 Renovacao de titre de sejour `[WEB-2026]`
- Preparar **antes** do vencimento. Deposito online na ANEF para a maioria dos casos. `POSSIBLY OUTDATED`
- Conectar ao espaco ANEF **ao menos 1x por semana**: pedidos de complemento tem prazo (frequentemente 30 dias) e a ANEF nem sempre envia email. `[WEB-2026]`
- Recepisse pode demorar; ha regras proprias sobre recepisse e direito de permanecer/trabalhar. `OFFICIAL-SOURCE VERIFICATION REQUIRED`

### 2.3 Taxas (MUDARAM em 2026) `[WEB-2026]` `POSSIBLY OUTDATED`
- Lei de finances 2026 (art. 128), em vigor **desde 1 mai 2026**: primeira delivranca **350 EUR** (era 225), naturalisation **255 EUR** (era 55), renovacao **250 EUR**.
- Dossie depositado antes de 1 mai 2026: tarifa antiga (recepisse ANEF com horodatage prova a data).
- **Atencao agente:** valores mudam por lei de finances anual. Nunca fixar sem reconfirmar.

### 2.4 Contexto operacional critico da ANEF em 2026 `[WEB-2026]`
- Backlog reportado de ~930.000 dossies, prazo medio ~117 dias. Decisao do **Conseil d'Etat n 502860 de 5 mai 2026** obriga o Estado a corrigir falhas da plataforma; meta de reduzir para ~55 dias. Regra "um dossie, um agente" (proibe reatribuir dossie a outro agente no meio). `POSSIBLY OUTDATED`
- Impacto pratico: lentidao e bugs sao a norma. Dica recorrente: conectar em horarios alternados (6h, 13h, 21h). `[WEB-2026]`

### 2.5 Naturalisation `[WEB-2026]`
- Possivel apos ~5 anos de residencia (condicoes variam). `OFFICIAL-SOURCE VERIFICATION REQUIRED`
- Deposito geralmente por **RDV em prefecture** (salvo algumas prefectures piloto que usam ANEF). `POSSIBLY OUTDATED`
- Taxa 2026: 255 EUR (ver 2.3).

### 2.6 Changement de statut `[WEB-2026]`
- Existe como categoria (ex: passar de estudante a salarie). Procedimento pela ANEF/prefecture conforme o caso. **Nenhum passo a passo detalhado foi verificado nesta sessao.** `UNKNOWN` (procedimento detalhado) - nao deixar agente inventar.

### 2.7 Autorisation de travail `[CONVERSA]`
- Aparece como servico SARA. Procedimento detalhado nao verificado. `UNKNOWN`

### 2.8 Troca de permis (CNH) `[WEB-2026]`
- Permis nao-europeu valido no maximo **1 ano** apos instalacao na Franca.
- Troca obrigatoria **antes do fim do 1 ano** se o pais tem acordo bilateral com a Franca; caso contrario, e preciso passar no exame frances.
- Pedido **online na ANTS/France Titres**, nao na ANEF. Emite ADS valida 4 meses.
- **Verificar se Brasil tem acordo de troca aplicavel** ao caso concreto (varia por estado emissor e data de obtencao). `OFFICIAL-SOURCE VERIFICATION REQUIRED`

### 2.9 SIPSI + Carte BTP (detachement) `[WEB-2026]`
1. Empresa estrangeira faz a **DPD no SIPSI** (`sipsi.travail.gouv.fr`).
2. Depois pede a **Carte BTP no cartebtp.fr** (importa a DPD, envia foto de cada salarie, paga).
3. Carte BTP obrigatoria **antes** do inicio do detachement; nova carte a cada novo detachement (ou carte de ate 5 anos ativada so no periodo). Attestation provisoria dematerializada enquanto a carte nao sai.
4. Um **terceiro habilitado (agente)** pode fazer tudo isso pela empresa. E o servico SARA. `[WEB-2026]`

---

## 3. Documentos por servico (pratica operacional da Bruna) `[CONVERSA]`

> Isto e a **pratica de coleta** dela, nao a lista legal oficial. A lista legal depende do motivo do titulo e deve ser confirmada na ANEF/service-public para cada caso.

**Auto-entrepreneur (SARA):** nome completo, data e local de nascimento, endereco na Franca, telefone e email, copia de passaporte ou titre de sejour, atividade a exercer, RIB.

**Titre de sejour (FERNANDA):** passaporte (paginas usadas), comprovante de endereco (< 3 meses), foto padrao recente (na pratica, e-photo ANEF), documentos do caso, tempo na Franca.

**Generico bancario:** RIB (com IBAN) e nome na conta.

---

## 4. O que ja existe no CentralViva sobre imigracao (inventario) `[CONVERSA]`

- Posts/temas prontos: "Como tirar o titre de sejour pela primeira vez"; AME (solicitacao completa + dica de desconto no transporte); diferenca RSA/CSS/CMU; CAF para imigrantes; Visale (garant gratuito); trazer CNH brasileira; abrir conta sem CDI; onde estudar frances de graca; comida brasileira; igrejas/comunidades; associacoes humanitarias (lista de 15 com contatos).
- JSON de conteudo administrativo: `obrigacoes_contabeis` (autoentrepreneur), declaracao de imposto (sistema de 3 zonas, mantido atemporal), tradutores juramentados.
- Plano de agentes SCOUT que ja lista fontes oficiais a monitorar (ver `profrance-agent-candidates.md`).
- **Nao existe** base procedimental de dossie, controle de validade, ou fluxo por prefecture. Isso ainda seria construido.

---

## 5. Regras obrigatorias para agentes construidos a partir daqui

Estas regras protegem o servico da Bruna de dar informacao errada com cara de certeza.

1. **Nunca afirmar taxa, prazo ou patamar como fixo.** Sempre: "conforme a fonte oficial X, verificado em [data]; confirme antes de agir." As taxas mudaram em 1 mai 2026; vao mudar de novo.
2. **Separar regra nacional de procedimento de prefecture.** O que vale em Val-de-Marne pode nao valer em outra. Nenhum procedimento prefecture-especifico esta documentado aqui.
3. **Separar pratica operacional (coleta da Bruna) de lista legal oficial.** Marcar sempre qual e qual.
4. **Cada afirmacao sensivel linka a fonte oficial** da tabela da secao 1. Se nao ha fonte confirmada (ex: `bresil.org`), o agente sinaliza "verificar" em vez de afirmar.
5. **Distinguir onde cada demarche acontece:** sejour -> ANEF; permis -> ANTS; detachement -> SIPSI+cartebtp; empresa -> URSSAF/impots/INPI. Erro comum: mandar tudo para a ANEF.
6. **Datar o conhecimento.** Este documento reflete julho/2026. Um agente que rode meses depois deve reconfirmar na web antes de responder algo sensivel.
7. **Nunca inventar procedimento nao verificado** (changement de statut detalhado, autorisation de travail, tachygraphe): responder "procedimento nao documentado, consultar fonte oficial".

---

## 6. Lacunas para fechar (levam a subagentes especializados)

- Procedimento passo a passo de **changement de statut** e **autorisation de travail**: `UNKNOWN`, verificar.
- Acordo Brasil-Franca de **troca de CNH**: condicoes exatas por caso: `OFFICIAL-SOURCE VERIFICATION REQUIRED`.
- Dominio oficial atual do **consulado brasileiro**: `bresil.org` nao confirmado.
- Listas e prazos **por prefecture** (Ile-de-France, onde a Bruna atua): `UNKNOWN`.
- Regras atuais de **elegibilidade do AME** (mudam com frequencia politica): `OFFICIAL-SOURCE VERIFICATION REQUIRED`.
