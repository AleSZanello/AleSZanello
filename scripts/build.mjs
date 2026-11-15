// Builds the profile README assets from live azanello.com + GitHub data, in the
// site's current look (CRM marketing language: warm paper + graphite ink + gold,
// thin Inter Tight headlines, 1px lines, pill buttons).
//
// Every asset is rendered twice — light and dark — and the README picks one with
// <picture> + prefers-color-scheme, like the site does. Each SVG embeds its own
// font subsets, because GitHub serves README images through camo as <img>, where
// web fonts and external CSS never load. CSS animations inside the SVG do run.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'assets')
const SITE = 'https://azanello.com'
const LOGIN = 'AleSZanello'
mkdirSync(OUT, { recursive: true })

// ---------- tokens (mirror src/app/globals.css on the site) ----------
const THEMES = {
  light: {
    paper: '#f9f8f5', surface: '#ffffff', sunken: '#f0eee9', line: '#e4e1da', lineStrong: '#cfcbc2',
    ink: '#14171e', ink2: '#4a505c', ink3: '#646a76',
    gold: '#d4a853', goldInk: '#7f6229', goldWash: '#f6efdf',
    ok: '#2e6a4c', okWash: '#e8f1ec', signal: '#0f766e', signalWash: '#e3f3f0',
    action: '#14171e', actionInk: '#ffffff',
  },
  dark: {
    paper: '#08090c', surface: '#0e1015', sunken: '#14171e', line: '#232834', lineStrong: '#2f3542',
    ink: '#e6e8ec', ink2: '#a3a9b6', ink3: '#8b919d',
    gold: '#d4a853', goldInk: '#d4a853', goldWash: '#241e12',
    ok: '#4ade80', okWash: '#12261a', signal: '#5eead4', signalWash: '#0f2622',
    action: '#e6e8ec', actionInk: '#08090c',
  },
}
const W = 880

// ---------- fonts ----------
const font = (pkg, file) =>
  readFileSync(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')
const FONTS = {
  s300: ['Inter Tight', 300, font('inter-tight', 'inter-tight-latin-300-normal.woff2')],
  s400: ['Inter Tight', 400, font('inter-tight', 'inter-tight-latin-400-normal.woff2')],
  s500: ['Inter Tight', 500, font('inter-tight', 'inter-tight-latin-500-normal.woff2')],
  s600: ['Inter Tight', 600, font('inter-tight', 'inter-tight-latin-600-normal.woff2')],
}
const fontFace = (keys) =>
  keys.map((k) => {
    const [family, weight, b64] = FONTS[k]
    return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`
  }).join('')

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SANS = `'Inter Tight',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`
// No text measurement in SVG: Inter Tight averages ~0.53em per character; layouts keep slack.
const textW = (s, size, k = 0.53) => s.length * size * k

function wrap(text, maxChars, maxLines) {
  const words = text.split(/\s+/)
  const lines = ['']
  for (const w of words) {
    const cur = lines[lines.length - 1]
    if ((cur + ' ' + w).trim().length > maxChars) lines.push(w)
    else lines[lines.length - 1] = (cur + ' ' + w).trim()
  }
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines)
    kept[maxLines - 1] = kept[maxLines - 1].replace(/[\s,.;:—-]*\S*$/, '') + '…'
    return kept
  }
  return lines
}

const BASE_CSS = (t) => `
text{font-family:${SANS}}
.eyebrow{font-weight:500;font-size:11.5px;letter-spacing:.18em;fill:${t.ink2}}
.grow{transform-box:fill-box;transform-origin:left;animation:grow 1.1s cubic-bezier(.2,.7,.2,1) backwards;animation-delay:var(--d,0s)}
@keyframes grow{from{transform:scaleX(0)}}
.breathe{transform-box:fill-box;transform-origin:center;animation:breathe 2.4s ease-out infinite}
@keyframes breathe{from{transform:scale(1);opacity:.7}to{transform:scale(2.6);opacity:0}}
.orb{transform-box:fill-box;transform-origin:center;animation:orb 1.8s ease-in-out infinite}
@keyframes orb{0%,100%{transform:scale(.85)}60%{transform:scale(1.1)}}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}
`

function svg(w, h, t, body, { fonts, css = '', title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${fontFace(fonts)}${BASE_CSS(t)}${css}</style>
${body}
</svg>
`
}

/** CRM card: surface, 1px line, radius; `top` adds the 2px gold rule of authored work. */
function card(t, { x = 0.5, y = 0.5, w, h, r = 16, top = false, id = 'c' }) {
  const rule = top
    ? `<clipPath id="${id}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
<rect x="${x}" y="${y}" width="${w}" height="2.5" fill="${t.gold}" clip-path="url(#${id})" class="grow"/>`
    : ''
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${t.surface}" stroke="${t.line}"/>${rule}`
}

function eyebrow(t, x, y, label) {
  return `<line x1="${x}" y1="${y - 4}" x2="${x + 18}" y2="${y - 4}" stroke="${t.gold}"/>
<text x="${x + 28}" y="${y}" class="eyebrow">${esc(label.toUpperCase())}</text>`
}

function pill(t, x, y, label, { tone = 'plain', size = 12, h = 24 } = {}) {
  const w = Math.round(textW(label, size, 0.56) + 22)
  const fill = { plain: t.paper, gold: t.goldWash, signal: t.signalWash, ok: t.okWash }[tone]
  const stroke = { plain: t.line, gold: t.gold + '88', signal: t.signal + '55', ok: t.ok + '55' }[tone]
  const color = { plain: t.ink2, gold: t.goldInk, signal: t.ink, ok: t.ok }[tone]
  const weight = tone === 'plain' ? 500 : 600
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${fill}" stroke="${stroke}"/>
<text x="${x + 11}" y="${y + h / 2 + size * 0.36}" font-size="${size}" font-weight="${weight}" fill="${color}">${esc(label)}</text>`,
  }
}

function pillRow(t, x, y, labels, maxX, opts) {
  let cx = x
  let out = ''
  for (const l of labels) {
    const p = pill(t, cx, y, l, opts)
    if (cx + p.w > maxX) break
    out += p.svg
    cx += p.w + 6
  }
  return out
}

const check = (t, x, y) => `<path d="M${x} ${y + 5}l3.6 3.6L${x + 11} ${y}" fill="none" stroke="${t.ok}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`

// ---------- data ----------
async function getText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'aleszanello-profile-build' } })
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.text()
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&apos;|&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

async function siteData() {
  const [home, resume, feed] = await Promise.all([
    getText(SITE + '/'),
    getText(SITE + '/resume.json').then(JSON.parse),
    getText(SITE + '/feed.xml'),
  ])
  // Results row: the home's server HTML always carries the real values.
  // Accepts the current markup (class="owned" | "") and the previous one (class="metric owned").
  const metrics = [...home.matchAll(/<div class="(?:metric ?)?(owned)?"><dt>([^<]+)<\/dt><dd><span>([^<]+)<\/span>([^<]*)<\/dd>/g)]
    .map(([, owned, label, value, suffix]) => ({ owned: !!owned, label: decode(label), value, suffix }))
  // Capability board ("What I can do"): label, blurb and project count per area.
  const capabilities = [...home.matchAll(/<span class="board-row"><b>([^<]+)<\/b><span class="board-blurb">([^<]+)<\/span>[\s\S]*?<span class="board-n"><b>(\d+)<\/b>/g)]
    .map(([, label, blurb, n]) => ({ label: decode(label), blurb: decode(blurb), projects: Number(n) }))
  const posts = [...feed.matchAll(/<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/g)]
    .map(([, title, link]) => ({ title: decode(title), link }))
  return { metrics, capabilities, posts, resume }
}

async function github(query) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) return null
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  const j = await r.json()
  if (j.errors) throw new Error(JSON.stringify(j.errors))
  return j.data
}

// ---------- content (prose that isn't on the site's data endpoints) ----------
const IDENTITY = {
  name: 'Ale Zanello',
  role: 'Agentic AI & GenAI Engineer',
  location: 'Córdoba, Argentina · Remote',
}

// Same problem → result lines as the site's Explorer (src/data/outcomes.ts).
const AKASHI = {
  repo: 'akashi_agents',
  name: 'Akashi',
  problem: 'Dart had none of the agent runtime Python and TypeScript take for granted',
  result: 'A multi-agent framework for Dart & Flutter',
  metrics: ['13 packages on pub.dev', '160/160 pub points (core)', '4 provider adapters'],
  stack: ['Dart', 'Flutter', 'Multi-Agent', 'MCP'],
}

// owned = authored by me (gold rule); otherwise a contribution.
const CARDS = [
  { repo: 'avatar_lipsync', kind: 'Author', owned: true, blurb: 'Real-time lip sync from a single photo or a drawn face, in sync with streamed speech. Built for voice bots on OpenAI Realtime and Gemini Live.', stack: ['Flutter', 'Dart', 'pub.dev'] },
  { owner: 'somnio-software', repo: 'somnio-ai-tools', kind: 'Core contributor', owned: false, blurb: 'Open-source CLI that installs agent skills, health checks and security audits for Flutter and NestJS across Claude Code, Cursor and Gemini.', stack: ['CLI', 'Python', 'Dart'] },
  { repo: 'mcp-deep-dive', kind: 'Protocol reference', owned: true, blurb: 'Protocol-first MCP in TypeScript: custom server + client, tools, resources and prompts over stdio and HTTP, with wire-level JSON-RPC logging.', stack: ['TypeScript', 'MCP'] },
  { repo: 'langgraph-ts-agents', kind: 'Agent patterns', owned: true, blurb: 'Supervisor/worker LangGraph patterns in TypeScript: streaming-first, typed with Annotation.Root + Zod, human-in-the-loop approval.', stack: ['LangGraph', 'TypeScript', 'Zod'] },
  { repo: 'langgraph-langserve-starter', kind: 'API template', owned: true, blurb: 'Production REST template exposing a LangGraph research agent via LangServe: thread resume, streaming, Langfuse tracing, zero-key fake-LLM mode.', stack: ['LangGraph', 'FastAPI', 'Python'] },
  { repo: 'local-rag-chatbot', kind: 'Local RAG', owned: true, blurb: 'Fully local RAG chatbot on LangGraph + Chroma + Ollama: multi-query fusion with RRF retrieval, persistent chat history, no API keys.', stack: ['RAG', 'Chroma', 'Ollama'] },
]

const STACK = [
  ['AI', ['LangGraph', 'LangChain', 'MCP', 'RAG', 'Multi-Agent', 'Vercel AI SDK', 'OpenAI', 'Claude', 'Gemini', 'Vertex AI', 'pgvector']],
  ['Engineering', ['TypeScript', 'Python', 'Rust', 'Dart', 'Next.js', 'NestJS', 'FastAPI', 'Flutter', 'Supabase', 'PostgreSQL', 'AWS']],
]

const LINKS = [
  { id: 'hire', label: 'Hiring? Read the brief', href: SITE + '/hire', kind: 'primary' },
  { id: 'project', label: 'Start a project', href: 'https://app.azanello.com/en/services', kind: 'gold' },
  { id: 'cv', label: 'CV · PDF', href: SITE + '/Alejandro_Zanello_Resume.pdf' },
  { id: 'graph', label: 'Knowledge graph', href: SITE + '/graph' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/alejandrozanello/' },
]

// ---------- assets (each is a function of the theme) ----------
function header(t, { years, capabilities }) {
  const H = 300
  const caps = capabilities.slice(0, 5)
  const max = Math.max(...caps.map((c) => c.projects), 1)
  const bx = 520
  const rowH = 44
  const rows = caps.map((c, i) => {
    const y = 96 + i * rowH
    const barW = 230
    return `<text x="${bx}" y="${y}" font-size="14" font-weight="600" fill="${t.ink}">${esc(c.label)}</text>
<rect x="${bx}" y="${y + 9}" width="${barW}" height="3" rx="1.5" fill="${t.sunken}"/>
<rect x="${bx}" y="${y + 9}" width="${Math.max(6, (c.projects / max) * barW).toFixed(1)}" height="3" rx="1.5" fill="url(#gold-${t === THEMES.dark ? 'd' : 'l'})" class="grow" style="--d:${(0.3 + i * 0.12).toFixed(2)}s"/>
<text x="${W - 30}" y="${y + 6}" text-anchor="end" font-size="24" font-weight="300" letter-spacing="-.02em" fill="${t.ink}">${c.projects}</text>
<text x="${W - 30}" y="${y + 20}" text-anchor="end" font-size="10.5" fill="${t.ink3}">projects</text>`
  }).join('\n')
  const g = t === THEMES.dark ? 'd' : 'l'
  const body = `<defs><linearGradient id="gold-${g}" x1="0" x2="1"><stop offset="0" stop-color="${t.gold}"/><stop offset="1" stop-color="${t.gold}" stop-opacity=".45"/></linearGradient></defs>
${card(t, { w: W - 1, h: H - 1, r: 20, id: 'hc' })}
<clipPath id="hs"><rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="20"/></clipPath>
<rect x=".5" y=".5" width="${W - 1}" height="3" fill="url(#gold-${g})" clip-path="url(#hs)" class="grow"/>
${eyebrow(t, 30, 50, `${IDENTITY.name} · ${IDENTITY.role}`)}
<text x="28" y="102" font-size="40" font-weight="300" letter-spacing="-.03em" fill="${t.ink}">Shipping AI agents</text>
<text x="28" y="148" font-size="40" font-weight="300" letter-spacing="-.03em" fill="${t.ink}">to production<tspan fill="${t.gold}">.</tspan></text>
<text x="30" y="190" font-size="15.5" font-weight="300" fill="${t.ink2}">${years}+ years shipping software across web, mobile and</text>
<text x="30" y="212" font-size="15.5" font-weight="300" fill="${t.ink2}">backend. Now building multi-agent systems in production.</text>
<circle cx="35" cy="252" r="4" fill="${t.ok}"/><circle cx="35" cy="252" r="4" fill="${t.ok}" class="breathe"/>
<text x="46" y="256.5" font-size="13" font-weight="600" fill="${t.ok}">Available for freelance</text>
<text x="${46 + textW('Available for freelance', 13, 0.49) + 5}" y="256.5" font-size="13" fill="${t.ink3}">· ${esc(IDENTITY.location)}</text>
<line x1="${bx - 24}" y1="34" x2="${bx - 24}" y2="${H - 34}" stroke="${t.line}"/>
<text x="${bx}" y="52" font-size="11.5" font-weight="500" letter-spacing=".14em" fill="${t.ink3}">WHAT I CAN DO</text>
${rows}`
  return svg(W, H, t, body, {
    fonts: ['s300', 's400', 's500', 's600'],
    title: `${IDENTITY.name} — ${IDENTITY.role}. ${years}+ years shipping software. Now building multi-agent systems in production. ${caps.map((c) => `${c.label}: ${c.projects} projects`).join(', ')}.`,
  })
}

function results(t, metrics) {
  const H = 146
  const pad = 24
  const colW = (W - pad * 2 - (metrics.length - 1) * 20) / metrics.length
  const maxChars = Math.floor(colW / (12.5 * 0.5))
  const cols = metrics.map((m, i) => {
    const x = pad + i * (colW + 20)
    const label = wrap(m.label, maxChars, 3)
    return `<rect x="${x}" y="24" width="${colW.toFixed(1)}" height="2" fill="${m.owned ? t.gold : t.lineStrong}" class="grow" style="--d:${(i * 0.08).toFixed(2)}s"/>
<text x="${x}" y="68" font-size="34" font-weight="300" letter-spacing="-.03em" fill="${m.owned ? t.goldInk : t.ink}">${esc(m.value)}${esc(m.suffix)}</text>
${label.map((l, j) => `<text x="${x}" y="${90 + j * 16}" font-size="12.5" fill="${t.ink3}">${esc(l)}</text>`).join('')}`
  }).join('\n')
  return svg(W, H, t, `${card(t, { w: W - 1, h: H - 1 })}\n${cols}`, {
    fonts: ['s300', 's400'],
    title: 'Results: ' + metrics.map((m) => `${m.value}${m.suffix} ${m.label}`).join(', '),
  })
}

function section(t, kicker, title) {
  const H = 76
  const body = `${eyebrow(t, 2, 26, kicker)}
<text x="0" y="62" font-size="28" font-weight="400" letter-spacing="-.02em" fill="${t.ink}">${esc(title)}</text>`
  return svg(W, H, t, body, { fonts: ['s400', 's500'], title })
}

function spotlight(t, stars) {
  const H = 210
  const chip = pill(t, 26, 26, 'Author & maintainer', { tone: 'gold' })
  const meta = `<text x="${W - 26}" y="43" text-anchor="end" font-size="12.5" fill="${t.ink3}">github.com/${LOGIN}/${AKASHI.repo} · pub.dev/packages/akashi${stars ? ` · ★ ${stars}` : ''}</text>`
  const body = `${card(t, { w: W - 1, h: H - 1, top: true, id: 'sp' })}
${chip.svg}${meta}
<text x="26" y="88" font-size="26" font-weight="600" letter-spacing="-.015em" fill="${t.ink}">${AKASHI.name}</text>
<text x="26" y="116" font-size="14.5" fill="${t.ink3}" text-decoration="line-through">${esc(AKASHI.problem)}</text>
${check(t, 27, 131)}
<text x="46" y="142" font-size="17" font-weight="600" letter-spacing="-.01em" fill="${t.ink}">${esc(AKASHI.result)}</text>
${pillRow(t, 26, 164, AKASHI.metrics, 600, { tone: 'gold', size: 12.5, h: 26 })}
${pillRow(t, W - 26 - AKASHI.stack.reduce((a, s) => a + pill(t, 0, 0, s).w + 6, -6), 165, AKASHI.stack, W, {})}`
  return svg(W, H, t, body, { fonts: ['s400', 's600'], title: `Akashi — ${AKASHI.problem} → ${AKASHI.result}. ${AKASHI.metrics.join(', ')}.` })
}

function repoCard(t, c, stars) {
  const CW = 432
  const H = 176
  const lines = wrap(c.blurb, 60, 3)
  const chip = pill(t, 18, 18, c.kind, { tone: c.owned ? 'gold' : 'signal', size: 11.5, h: 22 })
  const meta = stars ? `<text x="${CW - 18}" y="33" text-anchor="end" font-size="12" fill="${t.ink3}">★ ${stars}</text>` : ''
  const body = `${card(t, { w: CW - 1, h: H - 1, top: c.owned, id: 'rc' })}
${chip.svg}${meta}
<text x="18" y="70" font-size="17" font-weight="600" letter-spacing="-.01em" fill="${t.ink}">${esc(c.repo)}</text>
${lines.map((l, j) => `<text x="18" y="${94 + j * 18}" font-size="13" fill="${t.ink2}">${esc(l)}</text>`).join('\n')}
${pillRow(t, 18, H - 38, c.stack, CW - 18, { size: 11.5, h: 22 })}`
  return svg(CW, H, t, body, { fonts: ['s400', 's500', 's600'], title: `${c.repo} — ${c.blurb}` })
}

function stack(t) {
  const rowH = 40
  const H = 28 + STACK.length * rowH + 12
  const rows = STACK.map(([label, items], i) => {
    const y = 26 + i * rowH
    return `<text x="26" y="${y + 17}" font-size="11.5" font-weight="500" letter-spacing=".14em" fill="${t.ink3}">${esc(label.toUpperCase())}</text>
${pillRow(t, 140, y, items, W - 20, { tone: i === 0 ? 'signal' : 'plain', size: 12.5, h: 26 })}`
  }).join('\n')
  return svg(W, H, t, `${card(t, { w: W - 1, h: H - 1 })}\n${rows}`, {
    fonts: ['s500', 's600'],
    title: 'Stack — ' + STACK.map(([l, i]) => `${l}: ${i.join(', ')}`).join('. '),
  })
}

function button(t, l) {
  const size = 14
  const H = 40
  const orb = l.kind === 'gold'
  const w = Math.round(textW(l.label, size, 0.5) + 36 + (orb ? 16 : 0) + (l.kind === 'primary' ? 14 : 0))
  const fill = l.kind === 'primary' ? t.action : l.kind === 'gold' ? t.gold : t.surface
  const stroke = l.kind === 'primary' ? t.action : l.kind === 'gold' ? t.gold : t.lineStrong
  const color = l.kind === 'primary' ? t.actionInk : l.kind === 'gold' ? '#1a1306' : t.ink
  const tx = 18 + (orb ? 16 : 0)
  const body = `<rect x=".5" y=".5" width="${w - 1}" height="${H - 1}" rx="${H / 2}" fill="${fill}" stroke="${stroke}"/>
${orb ? `<circle cx="22" cy="${H / 2}" r="4.5" fill="#fff6dd" class="orb"/>` : ''}
<text x="${tx}" y="${H / 2 + 5}" font-size="${size}" font-weight="600" fill="${color}">${esc(l.label)}${l.kind === 'primary' ? ' →' : ''}</text>`
  return svg(w, H, t, body, { fonts: ['s600'], title: l.label })
}

// ---------- main ----------
const { metrics, capabilities, posts, resume } = await siteData()
// If the site's markup changes, fail the run so the last good README stays up
// instead of committing an empty results row, board or writing list.
if (metrics.length < 3 || capabilities.length < 3 || posts.length < 1) {
  throw new Error(`Site data looks wrong (${metrics.length} metrics, ${capabilities.length} capabilities, ${posts.length} posts) — keeping the current README`)
}
const years = metrics.find((m) => /years|yrs/.test(m.label))?.value ?? '6'

let stars = {}
try {
  const all = CARDS.concat([{ repo: AKASHI.repo }])
  const data = await github(`query {
    ${all.map((c, i) => `r${i}: repository(owner: "${c.owner ?? LOGIN}", name: "${c.repo}") { stargazerCount }`).join('\n')}
  }`)
  if (data) all.forEach((c, i) => { stars[c.repo] = data[`r${i}`]?.stargazerCount ?? 0 })
} catch (e) {
  console.warn('GitHub API skipped:', e.message)
}

// Start clean so retired assets don't linger.
for (const f of readdirSync(OUT)) if (f.endsWith('.svg')) unlinkSync(join(OUT, f))

const write = (name, render) => {
  writeFileSync(join(OUT, `${name}.svg`), render(THEMES.light))
  writeFileSync(join(OUT, `${name}-dark.svg`), render(THEMES.dark))
}
write('header', (t) => header(t, { years, capabilities }))
write('results', (t) => results(t, metrics))
write('spotlight-akashi', (t) => spotlight(t, stars[AKASHI.repo]))
CARDS.forEach((c) => write(`card-${c.repo}`, (t) => repoCard(t, c, stars[c.repo])))
write('stack', stack)
LINKS.forEach((l) => write(`btn-${l.id}`, (t) => button(t, l)))
const SECTIONS = [['work', 'Open source', 'What I shipped'], ['writing', 'Writing', 'Latest posts']]
SECTIONS.forEach(([id, k, title]) => write(`section-${id}`, (t) => section(t, k, title)))

// ---------- README ----------
/** Light/dark pair, chosen by the viewer's GitHub theme. */
const pic = (name, alt, attrs = '') =>
  `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${name}-dark.svg"><img src="assets/${name}.svg" alt="${esc(alt)}"${attrs}></picture>`
const repoUrl = (c) => `https://github.com/${c.owner ?? LOGIN}/${c.repo}`
const pairs = []
for (let i = 0; i < CARDS.length; i += 2) pairs.push(CARDS.slice(i, i + 2))
const headerAlt = `${IDENTITY.name} — ${IDENTITY.role}. ${years}+ years shipping software. Now building multi-agent systems in production.`

const readme = `<!-- Generated by scripts/build.mjs from azanello.com — edit the script, not this file. -->
<a href="${SITE}">${pic('header', headerAlt, ' width="100%"')}</a>

<p>
${LINKS.map((l) => `<a href="${l.href}">${pic(`btn-${l.id}`, l.label, ' height="40"')}</a>`).join('\n')}
</p>

<a href="${SITE}">${pic('results', 'Results: ' + metrics.map((m) => `${m.value}${m.suffix} ${m.label}`).join(', '), ' width="100%"')}</a>

${pic('section-work', 'Open source — What I shipped', ' width="100%"')}

<a href="https://github.com/${LOGIN}/${AKASHI.repo}">${pic('spotlight-akashi', `Akashi — ${AKASHI.result}. ${AKASHI.metrics.join(', ')}`, ' width="100%"')}</a>

${pairs.map((p) => `<p>\n${p.map((c) => `<a href="${repoUrl(c)}">${pic(`card-${c.repo}`, `${c.repo} — ${c.blurb}`, ' width="49%"')}</a>`).join('\n')}\n</p>`).join('\n\n')}

${pic('stack', 'Stack — ' + STACK.map(([l, i]) => `${l}: ${i.join(', ')}`).join('. '), ' width="100%"')}

${pic('section-writing', 'Writing — Latest posts', ' width="100%"')}

<!-- posts:start -->
${posts.slice(0, 5).map((p) => `- [${p.title}](${p.link})`).join('\n')}
- [All ${posts.length} posts →](${SITE}/blog)
<!-- posts:end -->

<sub>Built from live data on <a href="${SITE}">azanello.com</a> · refreshed daily · ${resume.certificates?.length ?? 0} certifications on <a href="https://www.credly.com/users/azanello">Credly</a> · <a href="${SITE}/graph">knowledge graph</a></sub>
`
writeFileSync(join(ROOT, 'README.md'), readme)
console.log(`built ${metrics.length} metrics, ${capabilities.length} capabilities, ${posts.length} posts, stars: ${Object.keys(stars).length}`)
