# ⚽ FutsalMoz 258

Plataforma completa de gestão de campeonato de futsal para Moçambique (+258)

## Funcionalidades

### Para visitantes / utilizadores simples (sem conta, acessível pelo telemóvel)
| Janela | Descrição |
|---|---|
| **Classificação** | Tabela de pontos com desempates (DG → GM → V) e destaque das posições de apuramento |
| **Calendário** | Datas, horários (hora de Maputo, CAT) e locais de cada partida, agrupados por jornada/ronda |
| **Resultados** | Placares por jornada com golos (autor + minuto + GP), cartões e marcador da grande penalidade |
| **Estatísticas** | Melhor marcador, guarda-redes menos batidos (com clean sheets), cartões por jogador, faltas por equipa |
| **Eliminatória** | Árvore da fase a eliminar com avançamentos automáticos e campeão |

### Para administradores (login obrigatório)
- **Gestão total do formato do campeonato**: liga 1 volta, liga 2 voltas, eliminatória direta, ou liga + fase eliminatória final; define o **número de equipas** (2–32), época, local principal, data de início, hora padrão e pontos por vitória/empate.
- **Inscrição de equipas** (nome, sigla, cidade, treinador) e **jogadores** (dorsal, posição campo/guarda-redes).
- **Geração automática do calendário** (round-robin equilibrado com datas semanais; sorteo de eliminatória com folgas para as melhores posições de seed) e ajuste livre de **data, hora e local** de cada partida.
- **Janela de registo de partida**: golo a golo (autor, minuto, grande penalidade), **cartões** (amarelo/vermelho por minuto), **faltas acumuladas por tempo** (aviso na 5.ª falta de cada tempo = lançamento de 10m), guarda-redes em campo e, em eliminatórias, desempate por grande penalidade.
- **Suspensões automáticas** (regras de futsal):
  - 2.º cartão amarelo na mesma partida = vermelho (expulsão) → suspensão na próxima partida;
  - Cartão vermelho direto → suspensão na próxima partida;
  - 3.º cartão amarelo acumulado → suspensão na próxima partida (contador reinicia após cumprir).
  A janela **Suspensões** mostra quem fica suspenso em cada partida e a acumulação de cartões por jogador.
- **Gestão de utilizadores (exclusiva do Administrador Sénior)**: aprovar/recusar pedidos de conta, criar administradores diretamente e remover contas.
- **Reiniciar campeonato** (zona de perigo) e marcar o campeonato como ativo/concluído.

### Controlo de acesso
1. **Primeiro acesso**: a página de login mostra o formulário "Criar Administrador Sénior" 
2. O **Administrador Sénior** aprova os demais administradores; contas pendentes não conseguem entrar.
3. Todos os **visitantes** (usuário simples) veem o site público sem login.

---

## Como o sistema funciona

1. Criar a conta do **Administrador Sénior** em `/login`.
2. **Configuração**: nome, época, formato, número de equipas, local, data de início.
3. **Equipas**: inscrever as equipas e os jogadores (incluindo os guarda-redes).
4. **Configuração → Gerar calendário**: o sistema cria as jornadas (ou o sorteo da eliminatória) com datas automáticas.
5. **Calendário**: ajustar datas, horários e locais de cada partida.
6. **Resultados**: após cada jornada, registar placares, golos, cartões, faltas e guarda-redes → a classificação, as estatísticas e as suspensões atualizam-se automaticamente.
7. No formato "Liga + Fase eliminatória": após terminar a fase regular, **Gerar eliminatória final** (top 4, ou top 8 com 8+ equipas) — os vencedores avançam automaticamente até ao campeão.

---

o-end (62 verificações)
```
