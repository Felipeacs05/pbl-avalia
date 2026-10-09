# Plano de Validação: US12, US13 e US14 (Sistema Avalia)

## 1. Mapeamento das Histórias e Regras
- **US12 (Tutor - Toggle de Autoavaliação):** O Tutor alterna o estado (aberto/fechado) da autoavaliação de um problema. O Front deve refletir a mudança visual de imediato.
- **US13 (Aluno - Submissão de Autoavaliação):** O Aluno envia sua autoavaliação (nota 0 a 10 e texto). A API rejeita a submissão (HTTP 403) se o Tutor não tiver liberado.
- **US14 (Aluno - Avaliação de Colegas):** O Aluno avalia seus pares de grupo (nota e texto). Bloqueios: flag de avaliação de pares deve estar ativa e o alvo deve pertencer à mesma subdivisão (Grupo) do autor.

## 2. Contratos e Nomenclaturas
**Seletores POM (Frontend):**
- **US12:** `toggleSelfAssessment_{id}`, `statusAssessmentLabel`, `toastNotification`.
- **US13:** `formSelfAssessment`, `inputSelfScore`, `inputSelfComment`, `btnSubmitSelfAssessment`.
- **US14:** `listPeerStudents`, `inputPeerScore_{id}`, `inputPeerComment_{id}`, `btnSubmitPeerAssessment`.

**Assinaturas REST Sugeridas:**
- `PATCH /api/v1/problems/{id}/self-assessment-release`
- `PATCH /api/v1/problems/{id}/peer-assessment-release`
- `POST /api/v1/problems/{id}/self-assessments`
- `POST /api/v1/problems/{id}/peer-assessments`

## 3. Especificações BDD (Gherkin)

**Cenários Frontend (SPA)**
- **CT-FE-US12-01 (Sucesso Visual):**
  Dado o acesso do Tutor ao painel do problema
  Quando o `toggleSelfAssessment_1` é acionado
  Então o DOM atualiza o `statusAssessmentLabel` para "Avaliações Abertas"

**Cenários Backend (API)**
- **CT-BE-US13-01 (Submissão Aceita):**
  Dado um aluno autenticado num problema liberado
  Quando envia nota 9.5 com justificativa
  Então o sistema retorna HTTP 201
- **CT-BE-US14-01 (Isolamento de Grupo):**
  Dado um aluno do "Grupo 1"
  Quando ele tenta registrar nota via POST para um aluno do "Grupo 2"
  Então a API recusa com HTTP 403 Forbidden

## 4. Matriz de Limites (Boundary Values)

| Cenário de Teste | Input Simulado | Retorno da API | Motivo |
|---|---|---|---|
| Limites Inferiores | `-0.01`, `-5` | `400 Bad Request` | Nota mínima é zero. |
| Limites Superiores | `10.01`, `11` | `400 Bad Request` | Nota máxima é dez. |
| Ausência de Texto | `null`, `""` | `400 Bad Request` | Comentário é obrigatório (Bean Validation). |
| Race Condition | 3 clicks no toggle em 1s | Mantém último estado | A rota PATCH deve ser idempotente. |
| Auto-avaliação na US14 | Alvo = ID do próprio usuário | `400/403` | Rota de pares rejeita a própria identidade. |

## 5. Premissas e Pendências (Para o Desenvolvedor)
1. **Entidade de Avaliação:** Fazer a modelagem de `Assessment` (ou subclasses `SelfAssessment`/`PeerAssessment`).
2. **Isolamento em Grupos:** Implementar entidade `Group` mapeada ao `RoomMember`, já que o PBL divide a sala em equipes.
3. **Flags no Problem:** Adicionar `Boolean peerAssessmentReleased` na entidade `Problem` e no script `schema.sql`.
4. **Tratamento Global:** Assegurar que `AccessDeniedException` converta para 403 sem vazar StackTrace.
