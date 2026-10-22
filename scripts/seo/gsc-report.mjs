#!/usr/bin/env node
/**
 * Search Console report for the blog-growth loop
 * (.claude/skills/blog-growth-loop/SKILL.md).
 *
 * Pulls the last 28 days and the 28 days before from the Search Console API,
 * per page and per page+query, and writes:
 *   docs/seo/reports/<date>.md       what to do this week, by rule
 *   docs/seo/snapshots/<date>.json   raw numbers, so later runs can compare
 *
 * Auth: a Google Cloud service account added as a user (Restricted is enough)
 * on the Search Console property sc-domain:bitwavetechnologies.com, with the
 * Search Console API enabled on its project. Point GSC_SERVICE_ACCOUNT_JSON at
 * the key file. No npm dependencies: the JWT is signed with node:crypto.
 *
 *   GSC_SERVICE_ACCOUNT_JSON=~/.secrets/bitwave-gsc.json node scripts/seo/gsc-report.mjs
 *   node scripts/seo/gsc-report.mjs --from-snapshot docs/seo/snapshots/2026-10-22.json
 *
 * --from-snapshot re-runs the rules on a saved snapshot (for testing the rules,
 * or after filling a snapshot by hand from the Search Console UI).
 */
import { createSign } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'sc-domain:bitwavetechnologies.com';
const ORIGIN = 'https://bitwavetechnologies.com';
const BRAND = /bit\s?wave|bitwae|bitswave/i;
// Search Console data lags about two days; end the window where it is complete.
const LAG_DAYS = 2;
const WINDOW_DAYS = 28;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

function daysAgo(n, from = new Date()) {
  const d = new Date(from);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

async function accessToken(keyFile) {
  const key = JSON.parse(fs.readFileSync(keyFile, 'utf8'));
  const now = Math.floor(Date.now() / 1000);
  const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: key.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(key.private_key).toString('base64url');
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) throw new Error(`token exchange failed: ${res.status} ${await res.text()}`);
  return (await res.json()).access_token;
}

async function query(token, body) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(SITE)}/searchAnalytics/query`;
  const rows = [];
  for (let startRow = 0; ; startRow += 25000) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ ...body, rowLimit: 25000, startRow }),
    });
    if (!res.ok) throw new Error(`searchAnalytics failed: ${res.status} ${await res.text()}`);
    const page = (await res.json()).rows ?? [];
    rows.push(...page);
    if (page.length < 25000) return rows;
  }
}

async function fetchSnapshot(keyFile) {
  const token = await accessToken(keyFile);
  const end = daysAgo(LAG_DAYS);
  const windows = {
    current: { startDate: isoDay(daysAgo(WINDOW_DAYS - 1, end)), endDate: isoDay(end) },
    previous: {
      startDate: isoDay(daysAgo(2 * WINDOW_DAYS - 1, end)),
      endDate: isoDay(daysAgo(WINDOW_DAYS, end)),
    },
  };
  const snapshot = { site: SITE, generatedAt: new Date().toISOString(), windows };
  for (const [name, range] of Object.entries(windows)) {
    snapshot[name] = {
      totals: (await query(token, { ...range, type: 'web' }))[0] ?? null,
      pages: await query(token, { ...range, type: 'web', dimensions: ['page'] }),
      pageQueries: await query(token, { ...range, type: 'web', dimensions: ['page', 'query'] }),
      queries: await query(token, { ...range, type: 'web', dimensions: ['query'] }),
    };
  }
  return snapshot;
}

/** Publish dates of every post on disk, live or scheduled, from frontmatter. */
function postDates() {
  const dir = path.join(ROOT, 'content', 'blog');
  const dates = {};
  for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const date = raw.match(/^date:\s*(\d{4}-\d{2}-\d{2})/m)?.[1];
    const title = raw.match(/^title:\s*(.+)$/m)?.[1]?.trim();
    if (date) dates[`/blog/${file.replace(/\.md$/, '')}`] = { date, title };
  }
  return dates;
}

const pathOf = (url) => url.replace(ORIGIN, '').replace('https://www.bitwavetechnologies.com', '') || '/';
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const num = (x) => Math.round(x).toLocaleString('en-US');

function analyse(snapshot) {
  const today = new Date(snapshot.generatedAt);
  const posts = postDates();
  const prevByPath = new Map(snapshot.previous.pages.map((r) => [pathOf(r.keys[0]), r]));
  const tracked = (p) => p.startsWith('/blog/') && !p.startsWith('/blog/category/');

  const pages = snapshot.current.pages
    .map((r) => {
      const p = pathOf(r.keys[0]);
      const prev = prevByPath.get(p);
      return { path: p, ...r, prevClicks: prev?.clicks ?? 0, prevImpressions: prev?.impressions ?? 0 };
    })
    .sort((a, b) => b.impressions - a.impressions);

  const topQueries = (p, n = 3) =>
    snapshot.current.pageQueries
      .filter((r) => pathOf(r.keys[0]) === p)
      .sort((a, b) => b.impressions - a.impressions)
      .slice(0, n)
      .map((r) => `"${r.keys[1]}" (${num(r.impressions)} impr, pos ${r.position.toFixed(1)})`)
      .concat(['(the rest hidden by Google)'])
      .slice(0, n + 1);

  const rules = { titleRewrite: [], strikingDistance: [], noTraction: [], newTopics: [] };

  for (const page of pages) {
    if (!tracked(page.path) && !page.path.endsWith('-kenya')) continue;
    if (page.impressions >= 100 && page.position <= 10 && page.ctr < 0.02) {
      rules.titleRewrite.push({ ...page, queries: topQueries(page.path) });
    } else if (page.position > 8 && page.position <= 20 && page.impressions >= 30) {
      rules.strikingDistance.push({ ...page, queries: topQueries(page.path) });
    }
  }

  const seen = new Set(pages.map((p) => p.path));
  for (const [p, meta] of Object.entries(posts)) {
    const ageDays = (today - new Date(meta.date)) / 86400000;
    if (ageDays < 45) continue; // too young to judge, or still scheduled
    const page = pages.find((x) => x.path === p);
    if (!seen.has(p) || page.impressions < 20) {
      rules.noTraction.push({ path: p, title: meta.title, ageDays: Math.floor(ageDays), impressions: page?.impressions ?? 0 });
    }
  }

  // Non-brand queries we already show up for but rank poorly on: the market
  // telling us what to write next.
  const bestPositionByQuery = new Map();
  for (const r of snapshot.current.pageQueries) {
    const q = r.keys[1];
    const best = bestPositionByQuery.get(q);
    if (!best || r.position < best.position) bestPositionByQuery.set(q, { position: r.position, page: pathOf(r.keys[0]) });
  }
  for (const r of snapshot.current.queries) {
    const q = r.keys[0];
    if (BRAND.test(q) || r.impressions < 5) continue;
    const best = bestPositionByQuery.get(q);
    if (r.position > 15) rules.newTopics.push({ query: q, impressions: r.impressions, position: r.position, page: best?.page });
  }
  rules.newTopics.sort((a, b) => b.impressions - a.impressions);

  const split = { brand: { clicks: 0, impressions: 0 }, nonBrand: { clicks: 0, impressions: 0 } };
  for (const r of snapshot.current.queries) {
    const bucket = BRAND.test(r.keys[0]) ? split.brand : split.nonBrand;
    bucket.clicks += r.clicks;
    bucket.impressions += r.impressions;
  }

  return { pages, rules, split, posts };
}

function report(snapshot, { pages, rules, split, posts }) {
  const { current, previous } = snapshot.windows;
  const t = snapshot.current.totals ?? { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const pt = snapshot.previous.totals ?? { clicks: 0, impressions: 0 };
  const delta = (a, b) => (b ? `${a >= b ? '+' : ''}${Math.round(((a - b) / b) * 100)}%` : 'new');
  const lines = [];
  lines.push(`# Search Console report — ${snapshot.generatedAt.slice(0, 10)}`, '');
  lines.push(`Window ${current.startDate} → ${current.endDate}, compared with ${previous.startDate} → ${previous.endDate}.`, '');
  lines.push('| | Clicks | Impressions | CTR | Avg position |', '|---|---|---|---|---|');
  lines.push(`| Whole site | ${num(t.clicks)} (${delta(t.clicks, pt.clicks)}) | ${num(t.impressions)} (${delta(t.impressions, pt.impressions)}) | ${pct(t.ctr)} | ${t.position.toFixed(1)} |`);
  lines.push(`| Brand queries | ${num(split.brand.clicks)} | ${num(split.brand.impressions)} | | |`);
  lines.push(`| Non-brand queries | ${num(split.nonBrand.clicks)} | ${num(split.nonBrand.impressions)} | | |`, '');
  lines.push('Non-brand is the number the blog and the solution pages exist to grow. Queries Google anonymises are in neither row.', '');

  lines.push('## Pages', '', '| Page | Clicks | Impr. | CTR | Pos. | Clicks prev. |', '|---|---|---|---|---|---|');
  for (const p of pages.filter((x) => x.path.startsWith('/blog/') || x.path.endsWith('-kenya') || x.path === '/')) {
    lines.push(`| ${p.path} | ${num(p.clicks)} | ${num(p.impressions)} | ${pct(p.ctr)} | ${p.position.toFixed(1)} | ${num(p.prevClicks)} |`);
  }
  lines.push('');

  const section = (title, why, items, fmt) => {
    lines.push(`## ${title}`, '', why, '');
    if (!items.length) lines.push('_None this week._');
    for (const item of items) lines.push(`- ${fmt(item)}`);
    lines.push('');
  };
  section(
    'Rewrite the title and description',
    'Seen often, ranked on page one, rarely clicked. The snippet is losing to the results around it: match the wording of the top query, put the answer or the number in the title.',
    rules.titleRewrite,
    (p) => `**${p.path}** — ${num(p.impressions)} impressions, pos ${p.position.toFixed(1)}, CTR ${pct(p.ctr)}. Top queries: ${p.queries.join('; ')}`,
  );
  section(
    'Striking distance: strengthen the page',
    'Positions 8–20 move with effort: answer the top query higher up, add the missing subtopic, link to the page from two related posts and its solution page.',
    rules.strikingDistance,
    (p) => `**${p.path}** — pos ${p.position.toFixed(1)}, ${num(p.impressions)} impressions. Top queries: ${p.queries.join('; ')}`,
  );
  section(
    'No traction after 45 days',
    'Google is not showing these. Usually the keyword has no searches or the page targets the wrong phrasing: retarget the title/H1/slug-free parts to a query with demand, or merge into a stronger post.',
    rules.noTraction,
    (p) => `**${p.path}** (${p.title ?? ''}) — ${p.ageDays} days live, ${num(p.impressions)} impressions`,
  );
  section(
    'Topics the market is asking for',
    'Non-brand queries we already appear for, at position 15 or worse. Each is a candidate for a new post, or a section in the page listed.',
    rules.newTopics.slice(0, 20),
    (q) => `"${q.query}" — ${num(q.impressions)} impressions, pos ${q.position.toFixed(1)}${q.page ? ` (now served by ${q.page})` : ''}`,
  );

  const scheduled = Object.entries(posts).filter(([, m]) => m.date > snapshot.generatedAt.slice(0, 10));
  lines.push('## Publishing queue', '', `${scheduled.length} post(s) scheduled.`, '');
  for (const [p, m] of scheduled.sort((a, b) => (a[1].date < b[1].date ? -1 : 1))) lines.push(`- ${m.date} ${p}`);
  lines.push('');
  return lines.join('\n');
}

async function main() {
  const args = process.argv.slice(2);
  const fromIdx = args.indexOf('--from-snapshot');
  let snapshot;
  if (fromIdx !== -1) {
    snapshot = JSON.parse(fs.readFileSync(args[fromIdx + 1], 'utf8'));
  } else {
    const keyFile = process.env.GSC_SERVICE_ACCOUNT_JSON;
    if (!keyFile) {
      console.error('Set GSC_SERVICE_ACCOUNT_JSON to the service-account key file (see header comment).');
      process.exit(2);
    }
    snapshot = await fetchSnapshot(keyFile);
    const snapDir = path.join(ROOT, 'docs', 'seo', 'snapshots');
    fs.mkdirSync(snapDir, { recursive: true });
    fs.writeFileSync(path.join(snapDir, `${snapshot.generatedAt.slice(0, 10)}.json`), JSON.stringify(snapshot, null, 2));
  }
  const md = report(snapshot, analyse(snapshot));
  const reportDir = path.join(ROOT, 'docs', 'seo', 'reports');
  fs.mkdirSync(reportDir, { recursive: true });
  const out = path.join(reportDir, `${snapshot.generatedAt.slice(0, 10)}.md`);
  fs.writeFileSync(out, md);
  console.log(md);
  console.error(`\nWrote ${path.relative(ROOT, out)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
