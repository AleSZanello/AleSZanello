// Builds the profile README assets from live azanello.com + GitHub data.
// Every SVG embeds its own Inter Tight / JetBrains Mono subsets, because
// GitHub serves README images through camo as <img>, where web fonts and
// external CSS never load.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'assets')
const SITE = 'https://azanello.com'
const LOGIN = 'AleSZanello'
mkdirSync(OUT, { recursive: true })

// ---------- tokens (mirror src/app/globals.css on the site) ----------
const T = {
  bg: '#08090c', s1: '#0e1015', s2: '#14171e', s3: '#1b1f28', line: '#232834',
  signal: '#5eead4', gold: '#d4a853', ok: '#4ade80',
  t1: '#e6e8ec', t2: '#a3a9b6', t3: '#8b919d',
}
const W = 880

// ---------- fonts ----------
const font = (pkg, file) =>
  readFileSync(join(ROOT, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64')
const FONTS = {
  sans400: ['Inter Tight', 400, font('inter-tight', 'inter-tight-latin-400-normal.woff2')],
  sans600: ['Inter Tight', 600, font('inter-tight', 'inter-tight-latin-600-normal.woff2')],
  sans700: ['Inter Tight', 700, font('inter-tight', 'inter-tight-latin-700-normal.woff2')],
  mono400: ['JetBrains Mono', 400, font('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff2')],
  mono500: ['JetBrains Mono', 500, font('jetbrains-mono', 'jetbrains-mono-latin-500-normal.woff2')],
}
const fontFace = (keys) =>
  keys.map((k) => {
    const [family, weight, b64] = FONTS[k]
    return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2');}`
  }).join('')

// ---------- helpers ----------
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const SANS = `'Inter Tight',-apple-system,'Segoe UI',Helvetica,Arial,sans-serif`
const MONO = `'JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace`
// Width estimates: no text measurement in SVG, so layouts keep slack.
const monoW = (s, size, ls = 0) => s.length * size * (0.6 + ls)

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

const BASE_CSS = `
.sans{font-family:${SANS}}.mono{font-family:${MONO}}
.pid{font:500 10.5px ${MONO};letter-spacing:.08em;text-transform:uppercase;fill:${T.t2}}
.lbl{font:500 10.5px ${MONO};letter-spacing:.08em;text-transform:uppercase;fill:${T.t3}}
.draw{stroke-dasharray:1;stroke-dashoffset:1;animation:draw .9s cubic-bezier(.2,.7,.2,1) forwards;animation-delay:var(--d,0s)}
@keyframes draw{to{stroke-dashoffset:0}}
@keyframes breathe{from{transform:scale(1);opacity:.7}to{transform:scale(2.6);opacity:0}}
.breathe{transform-box:fill-box;transform-origin:center;animation:breathe 2.4s ease-out infinite}
@media (prefers-reduced-motion:reduce){*{animation:none!important}.draw{stroke-dashoffset:0}}
`

function svg(w, h, body, { fonts, css = '', title }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<style>${fontFace(fonts)}${BASE_CSS}${css}</style>
${body}
</svg>
`
}

// The site's panel: s1 surface, 1px line border that draws itself, corner ticks
// (gold on authored work), and an optional rail with "<em>NN</em> TITLE".
function panel({ x = 0.5, y = 0.5, w, h, owned = false, rail, meta = '', delay = 0 }) {
  const tick = owned ? T.gold : T.t3
  const t = 7
  const ticks = [
    `M${x} ${y + t}V${y}H${x + t}`,
    `M${x + w - t} ${y}H${x + w}V${y + t}`,
    `M${x} ${y + h - t}V${y + h}H${x + t}`,
    `M${x + w - t} ${y + h}H${x + w}V${y + h - t}`,
  ].map((d) => `<path d="${d}" fill="none" stroke="${tick}" stroke-width="1"/>`).join('')
  const railSvg = rail
    ? `<line x1="${x}" y1="${y + 30}" x2="${x + w}" y2="${y + 30}" stroke="${T.line}"/>
<text x="${x + 14}" y="${y + 19}" class="pid"><tspan fill="${owned ? T.gold : T.signal}">${esc(rail[0])}</tspan>  ${esc(rail[1])}</text>
${meta}`
    : ''
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${T.s1}"/>
<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="none" stroke="${owned ? '#d4a85355' : T.line}" pathLength="1" class="draw" style="--d:${delay}s"/>
${ticks}${railSvg}`
}

function chip(x, y, label, { color = T.t2, border = T.line, size = 11, fill = T.s2 } = {}) {
  const w = Math.round(monoW(label, size, 0.04) + 16)
  return {
    w,
    svg: `<rect x="${x}" y="${y}" width="${w}" height="22" rx="3" fill="${fill}" stroke="${border}"/>
<text x="${x + 8}" y="${y + 15}" font-family="${MONO}" font-size="${size}" letter-spacing=".04em" fill="${color}">${esc(label)}</text>`,
  }
}

function chipRow(x, y, labels, maxX, opts) {
  let cx = x
  let out = ''
  for (const l of labels) {
    const c = chip(cx, y, l, opts)
    if (cx + c.w > maxX) break
    out += c.svg
    cx += c.w + 6
  }
  return out
}

// ---------- data ----------
async function getText(url) {
  const r = await fetch(url, { headers: { 'user-agent': 'aleszanello-profile-build' } })
  if (!r.ok) throw new Error(`${url} → ${r.status}`)
  return r.text()
}

async function siteData() {
  const [home, resume, feed] = await Promise.all([
    getText(SITE + '/'),
    getText(SITE + '/resume.json').then(JSON.parse),
    getText(SITE + '/feed.xml'),
  ])
  // Proof strip: the home's server HTML always carries the real values.
  const metrics = [...home.matchAll(/<div class="metric( owned)?"><dt>([^<]+)<\/dt><dd><span>([^<]+)<\/span>([^<]*)<\/dd>/g)]
    .map(([, owned, label, value, suffix]) => ({ owned: !!owned, label: decode(label), value, suffix }))
  const posts = [...feed.matchAll(/<item>[\s\S]*?<title>([^<]+)<\/title>[\s\S]*?<link>([^<]+)<\/link>[\s\S]*?<\/item>/g)]
    .map(([, title, link]) => ({ title: decode(title), link }))
  return { metrics, posts, resume }
}

const decode = (s) => s.replace(/&amp;/g, '&').replace(/&apos;|&#39;|&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')

async function github(query, variables = {}) {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) return null
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
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

const AKASHI = {
  repo: 'akashi_agents',
  name: 'Akashi',
  blurb: 'Provider-neutral agent framework for Dart & Flutter. A 14-package monorepo bringing the agent runtime primitives Python and TypeScript take for granted to the Dart ecosystem: subagent-as-tool orchestration, control handoffs, per-step model escalation.',
  metrics: ['13 packages on pub.dev', '160/160 pub points (core)', '4 provider adapters'],
  stack: ['Dart', 'Flutter', 'Multi-Agent', 'MCP'],
}

// owned = authored by me (gold); otherwise a contribution (neutral).
const CARDS = [
  { repo: 'mcp-deep-dive', kind: 'Protocol reference', owned: true, blurb: 'Protocol-first MCP in TypeScript: custom server + client, tools, resources and prompts over stdio and HTTP, with wire-level JSON-RPC logging.', stack: ['TypeScript', 'MCP'] },
  { repo: 'langgraph-ts-agents', kind: 'Agent patterns', owned: true, blurb: 'Supervisor/worker LangGraph patterns in TypeScript: streaming-first, typed with Annotation.Root + Zod, human-in-the-loop approval.', stack: ['LangGraph', 'TypeScript', 'Zod'] },
  { repo: 'langgraph-langserve-starter', kind: 'API template', owned: true, blurb: 'Production REST template exposing a LangGraph research agent via LangServe: thread resume, streaming, Langfuse tracing, zero-key fake-LLM mode.', stack: ['LangGraph', 'FastAPI', 'Python'] },
  { repo: 'local-rag-chatbot', kind: 'Local RAG', owned: true, blurb: 'Fully local RAG chatbot on LangGraph + Chroma + Ollama: multi-query fusion with RRF retrieval, persistent chat history, no API keys.', stack: ['RAG', 'Chroma', 'Ollama'] },
  { repo: 'stores-helper', kind: 'Agent tooling', owned: true, blurb: 'CLI that exposes Play Store and App Store management as tools for coding agents: products, forms and subscriptions from the repo.', stack: ['MCP', 'CLI', 'Python'] },
  { owner: 'somnio-software', repo: 'somnio-ai-tools', kind: 'Core contributor', owned: false, blurb: 'Open-source CLI that installs agent skills, health checks and security audits for Flutter and NestJS across Claude Code, Cursor and Gemini.', stack: ['CLI', 'Python', 'Dart'] },
]

const STACK = [
  ['AI', ['LangGraph', 'LangChain', 'MCP', 'RAG', 'Multi-Agent', 'Vercel AI SDK', 'OpenAI', 'Claude', 'Gemini', 'Vertex AI', 'pgvector', 'OpenTelemetry']],
  ['Engineering', ['TypeScript', 'Python', 'Rust', 'Dart', 'Next.js', 'NestJS', 'FastAPI', 'Flutter', 'Supabase', 'PostgreSQL', 'Firebase', 'AWS']],
]

const LINKS = [
  { id: 'hire', label: 'Hiring? Read the brief', href: SITE + '/hire', primary: true },
  { id: 'site', label: 'azanello.com', href: SITE },
  { id: 'cv', label: 'CV · PDF', href: SITE + '/Alejandro_Zanello_Resume.pdf' },
  { id: 'graph', label: 'Knowledge graph', href: SITE + '/graph' },
  { id: 'linkedin', label: 'LinkedIn', href: 'https://www.linkedin.com/in/alejandrozanello/' },
  { id: 'upwork', label: 'Upwork', href: 'https://www.upwork.com/freelancers/~01851ff7d016140d3d' },
]

// ---------- assets ----------
function header() {
  const H = 236
  // Mini capability map (same grammar as the home: teal circles = skills,
  // gold squares = authored projects, edges in percent of one box).
  const box = { x: 588, y: 52, w: 268, h: 164 }
  const P = (px, py) => [box.x + (px / 100) * box.w, box.y + (py / 100) * box.h]
  const nodes = {
    mcp: { at: P(22, 30), label: 'MCP', kind: 'skill' },
    lg: { at: P(50, 14), label: 'LangGraph', kind: 'skill' },
    rag: { at: P(82, 32), label: 'RAG', kind: 'skill' },
    dart: { at: P(14, 90), label: 'Dart', kind: 'skill' },
    ts: { at: P(88, 92), label: 'TypeScript', kind: 'skill' },
    akashi: { at: P(34, 58), label: 'Akashi', kind: 'project' },
    deep: { at: P(64, 62), label: 'mcp-deep-dive', kind: 'project' },
  }
  const edges = [['akashi', 'mcp'], ['akashi', 'dart'], ['akashi', 'lg'], ['deep', 'mcp'], ['deep', 'ts'], ['deep', 'rag'], ['lg', 'rag'], ['mcp', 'lg']]
  const edgeSvg = edges.map(([a, b], i) => {
    const [x1, y1] = nodes[a].at
    const [x2, y2] = nodes[b].at
    const gold = nodes[a].kind === 'project'
    return `<path id="e${i}" d="M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}" stroke="${gold ? '#d4a85366' : '#5eead44d'}" stroke-width="1" fill="none" pathLength="1" class="draw" style="--d:${(0.35 + i * 0.07).toFixed(2)}s"/>`
  }).join('\n')
  const nodeSvg = Object.values(nodes).map(({ at: [x, y], label, kind }) => {
    const mark = kind === 'skill'
      ? `<circle cx="${x}" cy="${y}" r="5" fill="#5eead422" stroke="${T.signal}" stroke-width="1.5"/>`
      : `<rect x="${x - 5}" y="${y - 5}" width="10" height="10" rx="1" fill="#d4a85333" stroke="${T.gold}" stroke-width="1.5"/>`
    const right = x < box.x + box.w * 0.6
    if (kind === 'project') return `${mark}<text x="${x}" y="${y + 19}" text-anchor="middle" font-family="${MONO}" font-size="10.5" fill="${T.gold}">${esc(label)}</text>`
    return `${mark}<text x="${right ? x + 10 : x - 10}" y="${y + 4}" text-anchor="${right ? 'start' : 'end'}" font-family="${MONO}" font-size="10.5" fill="${kind === 'project' ? T.gold : T.t2}">${esc(label)}</text>`
  }).join('\n')
  // One signal pulse travelling the authored edge, like the home's live map.
  const pulse = `<circle r="2.5" fill="${T.signal}"><animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="linear"><mpath href="#e0"/></animateMotion></circle>
<circle r="2.5" fill="${T.gold}"><animateMotion dur="4.1s" begin="1.4s" repeatCount="indefinite"><mpath href="#e4"/></animateMotion></circle>`

  const status = `<g transform="translate(${W - 104} 15)">
<circle cx="4" cy="4" r="4" fill="${T.ok}"/><circle cx="4" cy="4" r="4" fill="${T.ok}" class="breathe"/>
<text x="16" y="8" class="lbl" fill="${T.t2}">available</text></g>`

  const body = `${panel({ w: W - 1, h: H - 1, rail: ['', ''], meta: status })}
<text x="14" y="20" font-family="${MONO}" font-size="13" font-weight="500" fill="${T.t1}" letter-spacing="-.02em">azanello<tspan fill="${T.signal}">.</tspan>com <tspan fill="${T.t3}" font-size="11">/ github</tspan></text>
<line x1="568" y1="31" x2="568" y2="${H - 1}" stroke="${T.line}"/>
<text x="${box.x}" y="${box.y - 4}" class="lbl">capability map</text>
${edgeSvg}
${nodeSvg}
${pulse}
<text x="27" y="96" font-family="${SANS}" font-weight="700" font-size="40" letter-spacing="-.025em" fill="${T.t1}">${esc(IDENTITY.name)}</text>
<text x="29" y="122" font-family="${MONO}" font-weight="500" font-size="11.5" letter-spacing=".08em" fill="${T.signal}">${esc(IDENTITY.role.toUpperCase())}</text>
<text x="28" y="164" font-family="${SANS}" font-size="18" fill="${T.t1}">${'{{YEARS}}'}+ years shipping software.</text>
<text x="28" y="188" font-family="${SANS}" font-size="18" fill="${T.t2}">Now: production multi-agent systems.</text>
<circle cx="32" cy="211" r="3" fill="${T.ok}"/>
<text x="42" y="215" font-family="${MONO}" font-size="11.5" fill="${T.t3}"><tspan fill="${T.t2}">Available for freelance</tspan> · ${esc(IDENTITY.location)}</text>`
  return { body, H }
}

function proof(metrics) {
  const H = 124
  const colW = (W - 28) / metrics.length
  const maxChars = Math.floor((colW - 26) / (9.5 * 0.65))
  const cols = metrics.map((m, i) => {
    const x = 14 + i * colW + 14
    const label = wrap(m.label, maxChars, 2)
    return `${i ? `<line x1="${14 + i * colW}" y1="46" x2="${14 + i * colW}" y2="${H - 14}" stroke="${T.line}"/>` : ''}
<text x="${x}" y="78" font-family="${SANS}" font-weight="700" font-size="30" letter-spacing="-.02em" fill="${m.owned ? T.gold : T.t1}">${esc(m.value)}<tspan fill="${T.signal}">${esc(m.suffix)}</tspan></text>
${label.map((l, j) => `<text x="${x}" y="${96 + j * 13}" class="lbl" font-size="9.5" letter-spacing=".05em">${esc(l)}</text>`).join('')}`
  }).join('\n')
  const meta = `<text x="${W - 14}" y="19" text-anchor="end" class="lbl">live · azanello.com</text>`
  return svg(W, H, `${panel({ w: W - 1, h: H - 1, rail: ['03', 'proof'], meta, delay: 0.1 })}\n${cols}`, {
    fonts: ['sans700', 'mono500'],
    title: 'Proof: ' + metrics.map((m) => `${m.value}${m.suffix} ${m.label}`).join(', '),
  })
}

function spotlight(stars) {
  const H = 196
  const lines = wrap(AKASHI.blurb, 112, 3)
  const meta = `<text x="${W - 14}" y="19" text-anchor="end" class="lbl">author &amp; maintainer${stars ? ` · ★ ${stars}` : ''}</text>`
  const body = `${panel({ w: W - 1, h: H - 1, owned: true, rail: ['04', 'spotlight'], meta, delay: 0.15 })}
<text x="22" y="66" font-family="${SANS}" font-weight="700" font-size="24" letter-spacing="-.01em" fill="${T.gold}">${AKASHI.name}</text>
<text x="${22 + 98}" y="66" font-family="${MONO}" font-size="11.5" fill="${T.t3}">github.com/${LOGIN}/${AKASHI.repo}  ·  pub.dev/packages/akashi</text>
${lines.map((l, i) => `<text x="22" y="${94 + i * 20}" font-family="${SANS}" font-size="14.5" fill="${T.t2}">${esc(l)}</text>`).join('\n')}
${chipRow(22, 154, AKASHI.metrics, 560, { color: T.gold, border: '#d4a85355' })}
${chipRow(W - 22 - AKASHI.stack.reduce((a, s) => a + chip(0, 0, s).w + 6, -6), 154, AKASHI.stack, W, {})}`
  return svg(W, H, body, { fonts: ['sans400', 'sans700', 'mono400', 'mono500'], title: `Akashi — ${AKASHI.blurb}` })
}

function card(c, stars, i) {
  const CW = 432
  const H = 164
  const lines = wrap(c.blurb, 58, 3)
  const marker = c.owned
    ? `<rect x="14.5" y="14.5" width="8" height="8" rx="1" fill="#d4a85333" stroke="${T.gold}"/>`
    : `<circle cx="18.5" cy="18.5" r="4" fill="#5eead422" stroke="${T.signal}"/>`
  const meta = stars ? `<text x="${CW - 14}" y="23" text-anchor="end" font-family="${MONO}" font-size="11" fill="${T.t3}">★ ${stars}</text>` : ''
  const body = `${panel({ w: CW - 1, h: H - 1, owned: c.owned, delay: 0.2 + i * 0.05 })}
${marker}
<text x="30" y="23" class="lbl">${esc(c.kind)}</text>${meta}
<text x="14" y="52" font-family="${SANS}" font-weight="600" font-size="17" letter-spacing="-.01em" fill="${c.owned ? T.gold : T.t1}">${esc(c.repo)}</text>
${lines.map((l, j) => `<text x="14" y="${76 + j * 18}" font-family="${SANS}" font-size="13" fill="${T.t2}">${esc(l)}</text>`).join('\n')}
${chipRow(14, H - 36, c.stack, CW - 14, {})}`
  return svg(CW, H, body, { fonts: ['sans400', 'sans600', 'mono400', 'mono500'], title: `${c.repo} — ${c.blurb}` })
}

function stack() {
  const rowH = 34
  const H = 46 + STACK.length * rowH + 8
  const rows = STACK.map(([label, items], i) => {
    const y = 46 + i * rowH
    return `<text x="22" y="${y + 15}" class="lbl">${esc(label)}</text>
${chipRow(130, y, items, W - 14, { color: T.t1 })}`
  }).join('\n')
  return svg(W, H, `${panel({ w: W - 1, h: H - 1, rail: ['05', 'stack'] })}\n${rows}`, {
    fonts: ['mono400', 'mono500'],
    title: 'Stack — ' + STACK.map(([l, i]) => `${l}: ${i.join(', ')}`).join('. '),
  })
}


function button(l) {
  const size = 12
  const w = Math.round(monoW(l.label, size, 0.02) + 28 + (l.primary ? 14 : 0))
  const H = 34
  const arrow = l.primary ? `<text x="${w - 18}" y="21.5" font-family="${MONO}" font-size="${size}" fill="${T.bg}">→</text>` : ''
  const body = `<rect x=".5" y=".5" width="${w - 1}" height="${H - 1}" rx="6" fill="${l.primary ? T.signal : T.s2}" stroke="${l.primary ? T.signal : T.line}"/>
<text x="14" y="21.5" font-family="${MONO}" font-weight="500" font-size="${size}" letter-spacing=".02em" fill="${l.primary ? T.bg : T.t1}">${esc(l.label)}</text>${arrow}`
  return svg(w, H, body, { fonts: ['mono500'], title: l.label })
}

function section(n, title) {
  const H = 34
  const body = `<text x="0" y="22" class="pid" font-size="11"><tspan fill="${T.signal}">${n}</tspan>  ${esc(title)}</text>
<line x1="${monoW(`${n}  ${title}`, 11, 0.08) + 14}" y1="18.5" x2="${W}" y2="18.5" stroke="${T.line}" pathLength="1" class="draw"/>`
  return svg(W, H, body, { fonts: ['mono500'], title })
}

// ---------- main ----------
const { metrics, posts, resume } = await siteData()
const years = metrics.find((m) => /yrs/.test(m.label))?.value ?? '6'

let stars = {}
try {
  const repoFields = CARDS.concat([{ repo: AKASHI.repo }]).map((c, i) =>
    `r${i}: repository(owner: "${c.owner ?? LOGIN}", name: "${c.repo}") { stargazerCount }`).join('\n')
  const data = await github(`query {
    ${repoFields}
  }`)
  if (data) {
    CARDS.concat([{ repo: AKASHI.repo }]).forEach((c, i) => { stars[c.repo] = data[`r${i}`]?.stargazerCount ?? 0 })
  }
} catch (e) {
  console.warn('GitHub API skipped:', e.message)
}

const h = header()
writeFileSync(join(OUT, 'header.svg'), svg(W, h.H, h.body.replace('{{YEARS}}', years), {
  fonts: ['sans400', 'sans700', 'mono400', 'mono500'],
  title: `${IDENTITY.name} — ${IDENTITY.role}. ${years}+ years shipping software. Now: production multi-agent systems.`,
}))
writeFileSync(join(OUT, 'proof.svg'), proof(metrics))
writeFileSync(join(OUT, 'spotlight-akashi.svg'), spotlight(stars[AKASHI.repo]))
CARDS.forEach((c, i) => writeFileSync(join(OUT, `card-${c.repo}.svg`), card(c, stars[c.repo], i)))
writeFileSync(join(OUT, 'stack.svg'), stack())
LINKS.forEach((l) => writeFileSync(join(OUT, `btn-${l.id}.svg`), button(l)))
const SECTIONS = [['02', 'featured work'], ['06', 'writing']]
SECTIONS.forEach(([n, t]) => writeFileSync(join(OUT, `section-${n}.svg`), section(n, t)))

// ---------- README ----------
const img = (src, alt, extra = '') => `<img src="assets/${src}" alt="${esc(alt)}"${extra}>`
const repoUrl = (c) => `https://github.com/${c.owner ?? LOGIN}/${c.repo}`
const pairs = []
for (let i = 0; i < CARDS.length; i += 2) pairs.push(CARDS.slice(i, i + 2))

const readme = `<!-- Generated by scripts/build.mjs from azanello.com — edit the script, not this file. -->
<a href="${SITE}">${img('header.svg', `${IDENTITY.name} — ${IDENTITY.role}. ${years}+ years shipping software. Now: production multi-agent systems.`, ' width="100%"')}</a>

<p>
${LINKS.map((l) => `<a href="${l.href}">${img(`btn-${l.id}.svg`, l.label, ' height="34"')}</a>`).join('\n')}
</p>

<a href="${SITE}/#proof">${img('proof.svg', 'Proof: ' + metrics.map((m) => `${m.value}${m.suffix} ${m.label}`).join(', '), ' width="100%"')}</a>

${img('section-02.svg', 'Featured work', ' width="100%"')}

<a href="https://github.com/${LOGIN}/${AKASHI.repo}">${img('spotlight-akashi.svg', `Akashi — ${AKASHI.blurb}`, ' width="100%"')}</a>

${pairs.map((p) => `<p>\n${p.map((c) => `<a href="${repoUrl(c)}">${img(`card-${c.repo}.svg`, `${c.repo} — ${c.blurb}`, ' width="49%"')}</a>`).join('\n')}\n</p>`).join('\n\n')}

${img('stack.svg', 'Stack — ' + STACK.map(([l, i]) => `${l}: ${i.join(', ')}`).join('. '), ' width="100%"')}

${img('section-06.svg', 'Writing', ' width="100%"')}

<!-- posts:start -->
${posts.slice(0, 5).map((p) => `- [${p.title}](${p.link})`).join('\n')}
- [All ${posts.length} posts →](${SITE}/blog)
<!-- posts:end -->

<sub>Built from live data on <a href="${SITE}">azanello.com</a> · refreshed daily · ${resume.certificates?.length ?? 0} certifications on <a href="https://www.credly.com/users/azanello">Credly</a></sub>
`
writeFileSync(join(ROOT, 'README.md'), readme)
console.log(`built ${metrics.length} metrics, ${posts.length} posts, stars: ${Object.keys(stars).length}`)
