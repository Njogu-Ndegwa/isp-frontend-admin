#!/usr/bin/env node
// Tell Bing (and through IndexNow, Yandex, Seznam, Naver and Yep) that every
// URL in the live sitemap has changed, so new and edited pages are recrawled
// within hours instead of whenever Bing next gets round to us. ChatGPT search
// and Copilot answer from Bing's index, so this is how a new blog post reaches
// them.
//
// The key is public by design: IndexNow proves ownership by fetching
// https://bitwavetechnologies.com/<key>.txt and checking it holds the key.
//
//   node scripts/indexnow-ping.mjs            # ping everything in the sitemap
//   node scripts/indexnow-ping.mjs --dry-run  # list what would be sent

const HOST = 'bitwavetechnologies.com';
const KEY = 'fb5d8a61649e1dfd2d1e96a2f0593c28';
const dryRun = process.argv.includes('--dry-run');

const sitemap = await fetch(`https://${HOST}/sitemap.xml`).then((r) => {
  if (!r.ok) throw new Error(`sitemap.xml returned HTTP ${r.status}`);
  return r.text();
});
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
if (urlList.length === 0) throw new Error('sitemap.xml has no <loc> entries');

const keyCheck = await fetch(`https://${HOST}/${KEY}.txt`);
const keyBody = keyCheck.ok ? (await keyCheck.text()).trim() : '';
if (keyBody !== KEY) {
  throw new Error(`key file is not live yet (HTTP ${keyCheck.status}); IndexNow would reject the ping`);
}

console.log(`${urlList.length} URLs from the sitemap`);
if (dryRun) {
  urlList.forEach((u) => console.log(`  ${u}`));
  process.exit(0);
}

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: `https://${HOST}/${KEY}.txt`, urlList }),
});
// 200 = accepted, 202 = accepted and key validation pending. Anything else is a failure.
console.log(`IndexNow responded HTTP ${res.status}`);
if (res.status !== 200 && res.status !== 202) {
  console.error(await res.text());
  process.exit(1);
}
