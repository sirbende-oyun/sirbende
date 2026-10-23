// Sır Bende: soru denetleyici ve birleştirici (yalnızca Node, ek paket yok).
//
// Kullanım:
//   node birlestir.mjs yeni.json   yeni.json içindeki soruları denetler, geçenleri sorular.json dosyasına ekler
//   node birlestir.mjs --son 80    sorular.json içindeki son 80 sorunun yalnızca metnini yazar (tekrar yazmamak için)
//   node birlestir.mjs --mevcut    uygulamanın içindeki hazır soruları ve cevaplarını yazar (mevcut.json)
//   node birlestir.mjs --say       sorular.json içinde kaç soru olduğunu kategorilere göre yazar
//
// yeni.json biçimi: [{"k":0,"q":"Soru metni?","o":["A","B","C","D"],"a":2}, ...]
//   k: kategori numarası (0 Tarih, 1 Coğrafya, 2 Bilim, 3 Kültür ve Sanat, 4 Spor, 5 Doğa)
//   a: doğru şıkkın sırası (0-3). Şıkların sırası eklenirken karıştırılır, bu yüzden a değerini ham haliyle yazın.
import fs from "node:fs";
import crypto from "node:crypto";

const CATS = ["Tarih", "Coğrafya", "Bilim", "Kültür ve Sanat", "Spor", "Doğa"];
const FILE = process.env.OUT_FILE || "sorular.json";
const MAX_ITEMS = Math.max(50, Number(process.env.MAX_ITEMS || 800));

const lower = (s) => String(s).toLocaleLowerCase("tr");
const BAD_OPT = ["yukarıdaki", "hepsi", "hiçbiri", "hiçbir ", "her ikisi", "ikisi de", "a ve b", "b ve c", "c ve d", "a ile b", "tümü", "yukarıdakilerin"];
const TIMELY = ["şu an", "şu anda", "günümüzde", "güncel", "en son", "halen", "hâlâ", "bugün", "şimdiki", "geçen yıl", "bu yıl", "2024", "2025", "2026", "2027"];

function norm(s) {
  return lower(s).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function words(s) {
  return new Set(norm(s).split(" ").filter((w) => w.length > 2));
}
function similarW(a, b, limit) {
  if (!a.size || !b.size) return false;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / (a.size + b.size - n) >= limit;
}

// Geçerliyse { ok: temiz soru }, değilse { why: neden } döner.
function check(it) {
  if (!it || typeof it !== "object") return { why: "soru nesnesi değil" };
  const k = Number(it.k), a = Number(it.a);
  if (!Number.isInteger(k) || k < 0 || k >= CATS.length) return { why: "kategori numarası 0-5 olmalı" };
  if (!Number.isInteger(a) || a < 0 || a > 3) return { why: "doğru şık sırası 0-3 olmalı" };
  if (typeof it.q !== "string" || !Array.isArray(it.o) || it.o.length !== 4) return { why: "q metin, o tam 4 şık olmalı" };
  const fix = (x) => String(x == null ? "" : x).replace(/\s+/g, " ").replace(/'/g, "\u2019").trim();
  const q = fix(it.q);
  const o = it.o.map(fix);
  if (q.length < 15 || q.length > 160) return { why: "soru 15-160 karakter olmalı (şu an " + q.length + ")" };
  if (!q.endsWith("?")) return { why: "soru ? ile bitmeli" };
  const seen = new Set();
  for (const x of o) {
    const lx = lower(x);
    if (!x) return { why: "boş şık var" };
    if (x.length > 50) return { why: "şık 50 karakteri aşıyor: " + x.slice(0, 30) };
    if (seen.has(lx)) return { why: "aynı şık iki kez yazılmış: " + x };
    const bad = BAD_OPT.find((b) => lx.includes(b));
    if (bad) return { why: "yasak şık ifadesi (" + bad.trim() + "): " + x };
    seen.add(lx);
  }
  const lq = lower(q);
  const t = TIMELY.find((w) => lq.includes(w));
  if (t) return { why: "zamanla değişebilecek ifade (" + t + ")" };
  const right = lower(o[a]);
  if (right.length >= 4 && lq.includes(right)) return { why: "soru metni cevabı ele veriyor" };
  return { ok: { k, q, o, a } };
}

function shuffleOpts(it) {
  const idx = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { k: it.k, q: it.q, o: idx.map((i) => it.o[i]), a: idx.indexOf(it.a) };
}

function readItems() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const arr = Array.isArray(j) ? j : j && Array.isArray(j.items) ? j.items : [];
    return arr.map((x) => check(x).ok).filter(Boolean);
  } catch (e) {
    return [];
  }
}
function writeItems(items) {
  const body = '{"v":1,"u":"' + new Date().toISOString().slice(0, 19) + 'Z","items":[\n' + items.map((x) => JSON.stringify(x)).join(",\n") + "\n]}\n";
  JSON.parse(body);
  fs.writeFileSync(FILE + ".tmp", body);
  fs.renameSync(FILE + ".tmp", FILE);
}

const arg = process.argv[2];
if (arg === "--son") {
  const n = Math.max(1, Number(process.argv[3] || 80));
  for (const x of readItems().slice(-n)) console.log("- " + x.q);
  process.exit(0);
}
if (arg === "--mevcut") {
  try { for (const x of JSON.parse(fs.readFileSync("mevcut.json", "utf8"))) console.log("- " + x.q + " → " + x.r); } catch (e) { console.log("mevcut.json yok"); }
  process.exit(0);
}
if (arg === "--say") {
  const all = readItems();
  const c = CATS.map((name, i) => name + ": " + all.filter((x) => x.k === i).length);
  console.log("Toplam " + all.length + " soru. " + c.join(" · "));
  process.exit(0);
}
if (!arg) {
  console.log("Kullanım: node birlestir.mjs yeni.json | --son 80 | --say");
  process.exit(1);
}

let incoming;
try {
  const j = JSON.parse(fs.readFileSync(arg, "utf8"));
  incoming = Array.isArray(j) ? j : j && Array.isArray(j.sorular) ? j.sorular : j && Array.isArray(j.items) ? j.items : null;
  if (!incoming) throw new Error("dizi bulunamadı");
} catch (e) {
  console.log("HATA: " + arg + " okunamadı: " + e.message);
  process.exit(1);
}

const existing = readItems();
// Uygulamanın kendi içindeki hazır sorular (mevcut.json: [{"q":"...","r":"doğru cevap"}]) ile de çakışmasın.
let builtin = [];
try { builtin = JSON.parse(fs.readFileSync("mevcut.json", "utf8")); } catch (e) {}
const have = existing.map((x) => ({ n: norm(x.q), w: words(x.q), r: norm(x.o[x.a]) }))
  .concat(builtin.filter((x) => x && x.q).map((x) => ({ n: norm(x.q), w: words(x.q), r: norm(x.r || "") })));
const isDup = (n, w, r) => have.some((h) => h.n === n || similarW(h.w, w, 0.7) || (r && h.r === r && similarW(h.w, w, 0.35)));
const added = [];
const rejected = [];
incoming.forEach((it, i) => {
  const r = check(it);
  let why = r.why;
  if (!why) {
    const n = norm(r.ok.q), w = words(r.ok.q), ans = norm(r.ok.o[r.ok.a]);
    if (isDup(n, w, ans)) why = "daha önce var ya da çok benzer (aynı bilgi başka sözcüklerle sorulmuş olabilir)";
    else {
      have.push({ n, w, r: ans });
      added.push(shuffleOpts(r.ok));
    }
  }
  if (why) rejected.push("#" + (i + 1) + " " + String((it && it.q) || "").slice(0, 60) + " → " + why);
});

if (added.length) writeItems(existing.concat(added).slice(-MAX_ITEMS));
console.log("Eklenen: " + added.length + " · reddedilen: " + rejected.length + " · dosyadaki toplam: " + Math.min(MAX_ITEMS, existing.length + added.length));
for (const r of rejected) console.log("RED " + r);
