# Cloudflare Metrics — Documentação do Dashboard

## Como funciona

O dashboard busca dados de duas fontes:

1. **Cloudflare Analytics API (GraphQL)** — tráfego do site (visitas, pageviews, dispositivos)
2. **Cloudflare Workers KV** — eventos customizados gravados pelo próprio site (WhatsApp, tempo na página, fotos)

O Worker (`analytics.evergreenhidrossemeadura.com.br`) é o intermediário: recebe eventos POST do site e os armazena no KV, e responde ao dashboard com GET agregando tudo numa única resposta JSON.

---

## Cards do Dashboard

### 1. TOTAL VISITAS
**O que mostra:** Número de visitantes únicos no período selecionado, com variação percentual em relação ao período anterior (ex: +8% se esta semana teve mais visitas que a semana passada).

**Como foi construído:** Lê `uniq.uniques` dos dados diários da Cloudflare GraphQL API. O mini-gráfico de área é gerado em SVG puro no browser.

**Dados necessários do Cloudflare:**
- Zone ID (`CF_ZONE_ID`) — variável de ambiente no Worker
- API Token com permissão `Zone Analytics: Read` (`CF_API_TOKEN`)

---

### 2. PAGE VIEWS
**O que mostra:** Total de páginas carregadas no período, com variação percentual. Conta cada vez que um utilizador carrega uma página (uma visita pode gerar vários pageviews).

**Como foi construído:** Lê `sum.pageViews` da mesma query GraphQL. Gráfico azul de área gerado em SVG.

**Dados necessários:** Mesmos do card TOTAL VISITAS (Zone ID + API Token).

---

### 3. VISITAS POR DIA
**O que mostra:** Gráfico de barras diário comparando Visitas Únicas (amarelo) vs Page Views (azul) dia a dia. Permite ver picos e padrões de tráfego.

**Como foi construído:** Usa `httpRequests1dGroups` da GraphQL API com filtro de datas. Cada barra é renderizada em SVG proporcional ao valor máximo do período.

**Dados necessários:** Mesmos do card TOTAL VISITAS.

---

### 4. CLIQUES WHATSAPP POR DIA
**O que mostra:** Gráfico de barras + linha mostrando quantos visitantes clicaram no botão de WhatsApp por dia.

**Como foi construído:**
- O site (`js/content.js`) detecta cliques em links `wa.me/` e envia `POST { event: 'wa' }` ao Worker
- O Worker guarda `event:wa:{timestamp}` no KV com valor `1`
- No GET, o Worker agrupa por dia e retorna `waDaily[]` e `waDates[]`

**Dados necessários do Cloudflare:**
- KV Namespace `kvevergreenhidrossemeadura` vinculado ao Worker como `analytics`
- O `worker_url` publicado em `content.json` → campo **URL do Worker** em Integrações no admin

**Para verificar:** No KV Pairs, pesquise `event:wa` — devem aparecer entradas com valor `1`.

---

### 5. TEMPO NA PÁGINA
**O que mostra:** Tempo médio que os visitantes passam no site, com mini-gráfico sparkline em amarelo mostrando a média por dia nos últimos dias.

**Como foi construído:**
- O site pinga o Worker a cada **30 segundos** enquanto o utilizador está na página: `POST { event: 'time', value: <segundos> }`
- Também envia um ping final quando o utilizador sai da página (`visibilitychange` / `pagehide`)
- O Worker guarda `event:time:{timestamp}` com o valor em segundos
- No GET, calcula a média geral (`time_avg`) e a média por dia (`timeDaily[]`)

**Dados necessários:** Mesmo KV + `worker_url` em `content.json`.

**Para verificar:** No KV Pairs, pesquise `event:time` — devem aparecer entradas com valores numéricos (segundos).

---

### 6. DISPOSITIVOS
**O que mostra:** Gráfico de rosca (donut chart) com a proporção de visitas por tipo de dispositivo: Desktop vs Mobile, com legenda e contagem.

**Como foi construído:** Usa `httpRequestsAdaptiveGroups` da GraphQL API com dimensão `clientDeviceType`. O canvas donut é desenhado com a API `Canvas 2D` do browser.

**Dados necessários:** Zone ID + API Token com `Zone Analytics: Read`.

**Nota:** Este card mostra dados apenas do **dia atual** (hoje), não do período selecionado — limitação da query disponível na API gratuita do Cloudflare.

---

### 7. FOTOS MAIS CLICADAS
**O que mostra:** Ranking das imagens mais clicadas do site, com thumbnail, nome da foto e barra proporcional de cliques. Clicar no thumbnail abre um overlay ampliado.

**Como foi construído:**
- O site detecta cliques em elementos com `data-photo` (imagens estáticas) e em `.gallery-item` (galeria dinâmica) via event delegation no `document`
- Envia `POST { event: 'photo', value: "Nome da foto|/img/caminho.jpg" }` ao Worker
- O Worker guarda `event:photo:{timestamp}` com o valor como string
- No GET, agrupa por nome, ordena por cliques e retorna `photoTop[]` (top 10)
- O dashboard carrega também `gallery.json` para mapear labels → imagens dos registos antigos (antes do caminho ser incluído)

**Dados necessários:** Mesmo KV + `worker_url` em `content.json`.

**Para verificar:** No KV Pairs, pesquise `event:photo` — devem aparecer entradas com o nome da foto como valor.

---

## Configuração necessária no Cloudflare

| Item | Onde configurar | Valor esperado |
|------|----------------|----------------|
| **Zone ID** | Worker → Settings → Variables | ID da zona do domínio |
| **CF_API_TOKEN** | Worker → Settings → Variables | Token com `Zone Analytics: Read` |
| **KV Namespace** | Worker → Settings → KV Bindings | Nome do binding: `analytics` |
| **Worker URL** | Admin → Integrações → URL do Worker | `https://analytics.evergreenhidrossemeadura.com.br/` |

---

## Como obter cada informação do Cloudflare

### Zone ID
1. Acesse [dash.cloudflare.com](https://dash.cloudflare.com)
2. Clique no domínio `evergreenhidrossemeadura.com.br`
3. No painel direito, copie o **Zone ID**

### API Token
1. Vá em **My Profile → API Tokens → Create Token**
2. Use o template **Edit zone** ou crie um custom com:
   - Permission: `Zone → Analytics → Read`
   - Zone Resources: `Include → Specific zone → evergreenhidrossemeadura.com.br`

### KV Namespace ID
1. Vá em **Workers & Pages → KV**
2. Clique no namespace `kvevergreenhidrossemeadura`
3. Copie o **Namespace ID** da URL ou das configurações

---

## Período dos dados

O dashboard suporta **7, 30 ou 90 dias**. Os eventos no KV têm TTL de **90 dias** (após isso são apagados automaticamente pelo Cloudflare). Os dados da Cloudflare Analytics API ficam disponíveis por até 1 ano no plano gratuito.
