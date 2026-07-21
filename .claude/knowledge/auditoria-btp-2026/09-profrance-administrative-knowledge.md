# ProFrance — Administrative Knowledge (BTP + criação de empresa)

Conhecimento administrativo francês do foco da usuária. Base do **Agent: BTP Compliance** e do **Agent: Criação & Administração de Empresa**. Verificações oficiais feitas nesta auditoria (21/07/2026).

Separação: **regra legal nacional** vs **prática operacional**. Não há nada específico de préfecture aqui.

## Carte BTP — VERIFICADO NESTA AUDITORIA

Fonte: CIBTP / cartebtp.fr e fontes profissionais recentes (2026).

- É a **carte d'identification professionnelle du BTP**, dispositivo nacional contra trabalho ilegal em canteiro. — `CONFIRMED`
- Emitida pela **CIBTP France** (Union des caisses de France Congés Intempéries BTP). Pedido pelo **empregador** (ou agência de intérim / empresa usuária de détaché) no portal **cartebtp.fr**. — `CONFIRMED`
- **Nominativa.** Empréstimo de carte = fraude. Cada interveniente tem a sua, mesmo em missão curta. — `CONFIRMED`
- **Quem é isento:** trabalhador **independente / auto-entrepreneur / gérant não-salarié / artisan** trabalhando sozinho não precisa. A obrigação recai sobre **salariés**. Independente deve poder justificar status no canteiro (Kbis, attestation URSSAF). — `CONFIRMED`
- **Validade: 5 anos** a partir da emissão. Renovação pedida pelo empregador 2 a 3 meses antes de expirar. — `CONFIRMED` (fonte ProxiBTP). Nota: decreto de 15/02/2024 alterou a validade para détachés e intérimaires. `OFFICIAL-SOURCE VERIFICATION REQUIRED` (regra específica de détaché/intérim)
- **Custo:** há **CONFLITO** entre fontes: **9,80 €** vs **10,80 €** por carte, a cargo do empregador. — `CONFLICTING` (ver doc 11)
- **Atestado provisório** é emitido de imediato para trabalhar sem bloqueio; empregador tem **72h** após receber a carte física para entregá-la ao salarié. — `CONFIRMED`
- **Sanção por não declarar:** até **4.000 € por salarié** (8.000 € em reincidência em 2 anos), teto 500.000 € (art. L8291-2 do Code du travail). — `CONFIRMED`
- Documentos típicos: cópia de identidade do salarié, foto conforme, contrato de trabalho, attestation URSSAF da empresa, Kbis recente. Delai 7 a 15 dias úteis. — `CONFIRMED` (fonte ProxiBTP)

## Détachement + A1 + SIPSI — VERIFICADO NESTA AUDITORIA

Fonte: `sipsi.travail.gouv.fr`, Code du travail, DREETS, fontes profissionais 2026.

- **A1** é emitido pelo **país de afiliação à seguridade social**, não pelo país de prestação. — `CONFIRMED`
  - Trabalhador com **recibos verdes em Portugal** = afiliação portuguesa = A1 pedido à **Segurança Social** portuguesa. — `CONFIRMED`
  - A França só emite A1 para quem já está no sistema francês (ex: micro-entrepreneur registrado na França, que pode se "auto-détacher" e pedir A1 à **UCN / Urssaf** (via Urssaf Nord Pas de Calais). — `CONFIRMED`
  - **Risco de compliance:** trabalhador português em canteiro na França com A1 "que não bate" com a afiliação real é red flag clássico de inspeção de fraude ao détachement. Documento certo protege o trabalhador e a empresa contratante. — `CONFIRMED`
- **SIPSI** (Système d'Information sur les Prestations de Services Internationales), portal `sipsi.travail.gouv.fr`: — `CONFIRMED`
  - Declaração prévia obrigatória de **cada missão de détachement antes do início**, feita pela **empresa estrangeira prestadora** (ou seu representante na França). Base: art. L.1262-2-1 do Code du travail. — `CONFIRMED`
  - Empresa estrangeira deve **designar um representante na França** (interlocutor da inspeção/URSSAF, guarda os documentos). — `CONFIRMED`
  - **Donneur d'ordre / maître d'ouvrage francês** tem obrigação de vigilância: exigir cópia do accusé de réception da declaração SIPSI; se o prestador não fizer, deve declarar ele mesmo em até **48h** do início. Pode haver responsabilidade solidária. — `CONFIRMED`
  - **Sanção:** amende administrativa de **4.000 € por trabalhador** não declarado (8.000 € em reincidência). — `CONFIRMED`
  - Documentos do détachement guardados por **6 anos**; controle URSSAF pode vir até 3 anos depois (5 em caso de fraude). — `CONFIRMED` / `OFFICIAL-SOURCE VERIFICATION REQUIRED` (prazos de guarda)
  - Simplificação pelo **décret n°2023-185 de 17/03/2023**. — `CONFIRMED`

## DPAE e CIBTP (mencionados como itens do retainer)

- **DPAE** (Déclaration Préalable À l'Embauche): citada como tarefa recorrente do pacote BTP. Detalhe procedimental completo não capturado. — `CONFIRMED` (menção) / `OFFICIAL-SOURCE VERIFICATION REQUIRED`
- **CIBTP** (caisse de congés intempéries BTP): registro/gestão citados como item do retainer. — `CONFIRMED` (menção)

## Criação de micro-entreprise (operacional)

- Registro via **INPI Guichet unique** (`guichet unique de l'INPI`). — `CONFIRMED`
- Conta URSSAF em `autoentrepreneur.urssaf.fr`. — `CONFIRMED`
- Recomendar fazer o pedido de ACRE logo após a criação. — `CONFIRMED`

## Domiciliation (endereço da empresa)

- Não existe "base gratuita de endereços" legal. Opções reais: — `CONFIRMED`
  - **Société de domiciliation** (~10 a 50 €/mês; ex: Digidom, SeDomicilier, Les Tricolores, Kandbaz), gera contrat de domiciliation aceito por INSEE/URSSAF. — `CONFIRMED` / `POSSIBLY OUTDATED` (preços/fornecedores)
  - **Endereço de familiar/amigo** com attestation d'hébergement + comprovante (grátis, mas expõe o terceiro). — `CONFIRMED`
  - **Coworking** com pacote de domiciliation. — `CONFIRMED`
- Num **devis**, a lei obriga: nome/razão social, **SIRET**, endereço da empresa, descrição e preço, menção de isenção de TVA, condições de pagamento. — `CONFIRMED` / `OFFICIAL-SOURCE VERIFICATION REQUIRED` (lista completa por ano)
- O SIRET no devis permite qualquer um achar o endereço no registro público **annuaire-entreprises.data.gouv.fr** (base SIRENE). Esconder no documento não basta; só a mudança oficial do endereço registrado protege de fato. — `CONFIRMED`
- Desde 2023, endereço pessoal de dirigente pode ser ocultado da divulgação pública, mas o **endereço de exercício** continua aparecendo. — `CONFIRMED` / `OFFICIAL-SOURCE VERIFICATION REQUIRED`

## SAS de manutenção de elevadores (ascensoriste)

- Atividade **regulamentada**, exige qualificação de **ascensoriste**. — `INFERRED` / `OFFICIAL-SOURCE VERIFICATION REQUIRED` (pesquisa foi iniciada e não concluída)
- Documentos de abertura de SAS não foram entregues. — `UNKNOWN`

## Alertas de fraude (onboarding de cliente)

- Critérios oficiais de fraude citados vieram de **URSSAF** e **Service-Public.fr**. — `CONFIRMED` (fonte citada) / `OFFICIAL-SOURCE VERIFICATION REQUIRED` (redação exata)
- Boa prática de segurança: não enviar senha em texto puro junto com o login; mandar credenciais separadas por WhatsApp. — `CONFIRMED` (correção aprovada)
