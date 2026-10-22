// Sır Bende: soru üretici (GitHub Actions içinde çalışır; ücretsiz GitHub Models kullanır).
// Her çalışmada: 1) yeni sorular yazdırır  2) kurallara uymayanları ve tekrarları eler
// 3) başka bir yapay zekâya şıkları göstermeden cevaplatır, yalnız aynı cevabı verenleri tutar
// 4) sorular.json dosyasına ekler (en yeni MAX_ITEMS soru kalır).
import fs from "node:fs";
import crypto from "node:crypto";

const CATS = ["Tarih", "Coğrafya", "Bilim", "Kültür ve Sanat", "Spor", "Doğa"];
const TOPICS = [
  ["Selçuklular", "Osmanlı’nın kuruluş ve yükseliş dönemi", "Osmanlı’nın son dönemi", "Kurtuluş Savaşı", "Cumhuriyet’in ilk yılları", "Antik Yunan", "Roma İmparatorluğu", "Eski Mısır", "Mezopotamya ve Anadolu uygarlıkları", "Orta Çağ Avrupası", "Büyük keşifler", "Fransız Devrimi ve Napolyon", "Birinci Dünya Savaşı", "İkinci Dünya Savaşı", "Soğuk Savaş", "Çin ve Uzak Doğu tarihi", "Ünlü hükümdarlar ve komutanlar", "Eski Türk devletleri"],
  ["Türkiye’nin dağları ve nehirleri", "Türkiye’nin gölleri ve ovaları", "Türkiye’nin illeri ve bölgeleri", "Avrupa ülkeleri ve başkentleri", "Asya ülkeleri", "Afrika", "Amerika kıtaları", "Okyanuslar ve denizler", "Çöller ve ormanlar", "Adalar", "Dağlar ve volkanlar", "Nehirler ve şelaleler", "Sınırlar ve bayraklar", "İklim ve yer şekilleri", "Ünlü şehirler"],
  ["Gök bilimi ve uzay", "Fizik", "Kimya ve elementler", "İnsan vücudu", "Genetik", "İcatlar ve teknoloji", "Matematik", "Ünlü bilim insanları", "Enerji ve elektrik", "Tıp tarihi", "Jeoloji", "Bilgisayar ve internetin tarihi"],
  ["Türk edebiyatı", "Dünya edebiyatı", "Resim ve ressamlar", "Klasik müzik", "Türk halk müziği ve sanat müziği", "Sinema tarihi", "Tiyatro", "Mimari ve ünlü yapılar", "Mitoloji ve efsaneler", "Türk el sanatları ve gelenekleri", "Heykel", "Şairler ve şiir akımları", "Dünya mutfağı ve gelenekler"],
  ["Futbolun tarihi", "Olimpiyatlar", "Basketbol", "Voleybol", "Tenis", "Atletizm", "Güreş ve dövüş sporları", "Kış sporları", "Satranç", "Spor kuralları ve ekipmanlar", "Tarihe geçmiş ünlü sporcular", "Motor sporları"],
  ["Memeliler", "Kuşlar", "Deniz canlıları", "Böcekler", "Sürüngenler ve kurbağalar", "Bitkiler ve ağaçlar", "Türkiye’nin doğası ve hayvanları", "Ekosistemler ve ormanlar", "Nesli tehlike altındaki türler", "Hayvan davranışları ve göçler", "Dinozorlar ve fosiller", "Mantarlar ve mikroorganizmalar"]
];
const LEVELS = ["kolay", "orta", "orta", "zor"];

const API = process.env.MODELS_URL || "https://models.github.ai/inference/chat/completions";
const CATALOG = process.env.MODELS_CATALOG || "https://models.github.ai/catalog/models";
const TOKEN = process.env.GITHUB_TOKEN || "";
const FILE = process.env.OUT_FILE || "sorular.json";
const list = (s) => String(s).split(",").map((x) => x.trim()).filter(Boolean);
const GEN_MODELS = list(process.env.GEN_MODELS || "openai/gpt-4.1,openai/gpt-4o-mini");
const CHECK_MODELS = list(process.env.CHECK_MODELS || "openai/gpt-4o,openai/gpt-4.1-mini");
const BATCH = Math.max(4, Math.min(24, Number(process.env.BATCH || 16)));
const MAX_ITEMS = Math.max(50, Number(process.env.MAX_ITEMS || 600));
const WAIT_CAP_MS = Number(process.env.WAIT_CAP_MS || 60000);

const summary = [];
function say(s) {
  console.log(s);
  summary.push(s);
}
function finish(code) {
  try {
    if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary.join("\n\n") + "\n");
  } catch (e) {}
  process.exit(code);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const pick = (a) => a[crypto.randomInt(a.length)];
const lower = (s) => String(s).toLocaleLowerCase("tr");

const brief = (t) => String(t).slice(0, 400).replace(/\s+/g, " ");

// Yanıt metnini okur: düz JSON ya da akış (data: satırları) olabilir. { text, error } döner.
function readReply(raw) {
  const pick = (j) => {
    const ch = j && j.choices && j.choices[0];
    if (!ch) return "";
    let c = (ch.message && ch.message.content) != null ? ch.message.content : ch.delta && ch.delta.content;
    if (Array.isArray(c)) c = c.map((p) => (p && (p.text || p.content)) || "").join("");
    if (typeof c === "string") return c;
    return typeof ch.text === "string" ? ch.text : "";
  };
  let j = null;
  try { j = JSON.parse(raw); } catch (e) {}
  if (j) {
    if (j.error && !j.choices) return { text: "", error: typeof j.error === "object" ? j.error : { message: String(j.error) } };
    return { text: pick(j).trim(), error: null };
  }
  if (/^\s*data:/m.test(raw)) {
    let acc = "";
    for (const ln of raw.split("\n")) {
      const m = ln.match(/^data:\s*(.*)$/);
      if (!m || m[1].trim() === "[DONE]") continue;
      try { acc += pick(JSON.parse(m[1])); } catch (e) {}
    }
    return { text: acc.trim(), error: null };
  }
  return { text: "", error: null };
}

class ApiError extends Error {
  constructor(kind, status, msg) {
    super(msg);
    this.kind = kind; // auth | rate | model | other
    this.status = status;
  }
}

async function post(body) {
  let res;
  try {
    res = await fetch(API, {
      method: "POST",
      headers: {
        Authorization: "Bearer " + TOKEN,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000)
    });
  } catch (e) {
    throw new ApiError("other", 0, "ağ hatası: " + (e && e.message));
  }
  const text = await res.text();
  if (res.ok) {
    const out = readReply(text);
    if (out.error) {
      const code = lower(out.error.code || out.error.type || "");
      const kind = /rate|limit|quota/.test(code) ? "rate" : /unauthor|forbidden|no_access|permission/.test(code) ? "auth" : /model|not_found|unknown/.test(code) ? "model" : "other";
      throw new ApiError(kind, res.status, "hata gövdesi: " + brief(text));
    }
    if (!out.text) throw new ApiError("other", res.status, "beklenmeyen yanıt: " + brief(text));
    return out.text;
  }
  const brief_ = brief(text);
  if (res.status === 401 || res.status === 403) throw new ApiError("auth", res.status, brief_);
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after"));
    const e = new ApiError("rate", 429, brief_);
    e.wait = Number.isFinite(ra) && ra > 0 ? ra * 1000 : 0;
    throw e;
  }
  if (res.status === 400 || res.status === 404 || res.status === 422) throw new ApiError("model", res.status, brief_);
  throw new ApiError("other", res.status, brief_);
}

// Bir model için istek: bazı modeller bazı ayarları desteklemez, o yüzden sırayla sadeleştirerek dener.
async function chat(model, messages, opts) {
  const variants = [
    { response_format: { type: "json_object" }, max_tokens: opts.max, temperature: opts.temp },
    { max_tokens: opts.max, temperature: opts.temp },
    { max_completion_tokens: opts.max }
  ];
  let last;
  for (const v of variants) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await post({ model, messages, ...v });
      } catch (e) {
        last = e;
        if (e.kind === "rate" && attempt < 2) {
          const w = e.wait || 15000 * (attempt + 1);
          if (w > WAIT_CAP_MS) throw e;
          await sleep(w);
          continue;
        }
        if (e.kind === "model" || (e.kind === "other" && e.status === 200)) break; // sonraki (daha sade) değişkene geç
        throw e;
      }
    }
  }
  throw last;
}

async function ask(models, messages, opts) {
  let last;
  for (const m of models) {
    try {
      const text = await chat(m, messages, opts);
      return { model: m, text };
    } catch (e) {
      last = e;
      if (e.kind === "model" || e.kind === "other") { say("Uyarı: " + m + " kullanılamadı (" + e.status + "): " + String(e.message).slice(0, 400) + " — sıradaki model deneniyor."); continue; }
      throw e; // auth ve rate: tüm modeller için geçerli
    }
  }
  throw last || new ApiError("other", 0, "model yok");
}

function extractJSON(text) {
  let t = String(text).trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try { return JSON.parse(t); } catch (e) {}
  const a = t.search(/[\[{]/);
  const b = Math.max(t.lastIndexOf("}"), t.lastIndexOf("]"));
  if (a >= 0 && b > a) { try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {} }
  return null;
}

const BAD_OPT = ["yukarıdaki", "hepsi", "hiçbiri", "hiçbir ", "her ikisi", "ikisi de", "a ve b", "b ve c", "c ve d", "a ile b", "tümü", "yukarıdakilerin"];
const TIMELY = ["şu an", "şu anda", "günümüzde", "güncel", "en son", "halen", "hâlâ", "bugün", "şimdiki", "geçen yıl", "bu yıl", "2024", "2025", "2026", "2027"];

function norm(s) {
  return lower(s).replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();
}
function words(s) {
  return new Set(norm(s).split(" ").filter((w) => w.length > 2));
}
function similar(a, b) {
  if (!a.size || !b.size) return false;
  let n = 0;
  for (const w of a) if (b.has(w)) n++;
  return n / (a.size + b.size - n) >= 0.75;
}

// Bir soruyu denetler; geçerliyse temiz halini, değilse null döner.
function clean(it) {
  if (!it || typeof it !== "object") return null;
  const k = Number(it.k), a = Number(it.a);
  if (!Number.isInteger(k) || k < 0 || k >= CATS.length) return null;
  if (!Number.isInteger(a) || a < 0 || a > 3) return null;
  if (typeof it.q !== "string" || !Array.isArray(it.o) || it.o.length !== 4) return null;
  const q = it.q.replace(/\s+/g, " ").trim();
  const o = it.o.map((x) => String(x == null ? "" : x).replace(/\s+/g, " ").trim());
  if (q.length < 15 || q.length > 160 || !q.endsWith("?")) return null;
  const seen = new Set();
  for (const x of o) {
    const lx = lower(x);
    if (!x || x.length > 50 || seen.has(lx)) return null;
    if (BAD_OPT.some((b) => lx.includes(b))) return null;
    seen.add(lx);
  }
  const lq = lower(q);
  if (TIMELY.some((w) => lq.includes(w))) return null;
  const right = lower(o[a]);
  if (right.length >= 4 && lq.includes(right)) return null; // soru cevabı ele veriyor
  return { k, q, o, a };
}

function shuffleOpts(it) {
  const idx = [0, 1, 2, 3];
  for (let i = 3; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [idx[i], idx[j]] = [idx[j], idx[i]];
  }
  return { k: it.k, q: it.q, o: idx.map((i) => it.o[i]), a: idx.indexOf(it.a) };
}

function readFile() {
  try {
    const j = JSON.parse(fs.readFileSync(FILE, "utf8"));
    const arr = Array.isArray(j) ? j : j && Array.isArray(j.items) ? j.items : [];
    return arr.map(clean).filter(Boolean);
  } catch (e) {
    return [];
  }
}
function writeFile(items) {
  const body = '{"v":1,"u":"' + new Date().toISOString().slice(0, 19) + 'Z","items":[\n' + items.map((x) => JSON.stringify(x)).join(",\n") + "\n]}\n";
  JSON.parse(body); // yazmadan önce son kontrol
  fs.writeFileSync(FILE + ".tmp", body);
  fs.renameSync(FILE + ".tmp", FILE);
}

async function availableModels() {
  try {
    const r = await fetch(CATALOG, {
      headers: { Authorization: "Bearer " + TOKEN, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: AbortSignal.timeout(30000)
    });
    if (!r.ok) return null;
    const j = await r.json();
    const arr = Array.isArray(j) ? j : j && Array.isArray(j.models) ? j.models : null;
    if (!arr) return null;
    return new Set(arr.map((m) => m && m.id).filter(Boolean));
  } catch (e) {
    return null;
  }
}
function usable(models, cat) {
  if (!cat) return models;
  const ok = models.filter((m) => cat.has(m));
  return ok.length ? ok : models;
}

function genPrompt(existing) {
  const specs = [];
  for (let i = 0; i < BATCH; i++) {
    const c = crypto.randomInt(CATS.length);
    specs.push((i + 1) + ") k=" + c + " (" + CATS[c] + "), alt konu: " + pick(TOPICS[c]) + ", zorluk: " + pick(LEVELS));
  }
  const recent = existing.slice(-40).map((x) => "  * " + x.q);
  return [
    "Türkçe bir bilgi yarışması oyunu için tam olarak " + BATCH + " çoktan seçmeli soru yaz.",
    "",
    "Her soru için aşağıdaki kategoriyi, alt konuyu ve zorluğu kullan:",
    specs.join("\n"),
    "",
    "Kurallar:",
    "- Yalnızca güvenilir kaynaklarda kesin olarak doğrulanabilen bilgilere dayan. Emin olmadığın bir bilgiyi sorma.",
    "- Zamanla değişebilecek bilgileri sorma (güncel rekorlar, görevdeki kişiler, son turnuva sonuçları, nüfus sıralamaları).",
    "- Tartışmalı sorular ya da birden fazla doğru cevabı olabilecek sorular yazma.",
    "- Her sorunun 4 farklı ve makul şıkkı olsun, doğru şık tam olarak bir tane olsun. \"Hepsi\", \"Hiçbiri\", \"A ve B\" gibi şıklar yazma.",
    "- Soru en fazla 140, her şık en fazla 40 karakter olsun. Soru \"?\" ile bitsin. Soru metni cevabı ele vermesin.",
    "- Akıcı, doğru yazımlı Türkçe kullan, her yaştan oyuncuya uygun ol. Siyasi parti, din tartışması ve aşırı şiddet içeren sorular yazma.",
    "- Her seferinde farklı sorular üret. Tohum: " + crypto.randomBytes(3).toString("hex"),
    recent.length ? "- Şu sorulara benzer sorular yazma:\n" + recent.join("\n") : "",
    "",
    "Çıktı: yalnızca şu biçimde tek bir JSON nesnesi ver, başka hiçbir metin ekleme:",
    '{"sorular":[{"k":0,"q":"Soru metni?","o":["A şıkkı","B şıkkı","C şıkkı","D şıkkı"],"a":2}]}',
    "Burada k kategori numarası, a doğru şıkkın 0’dan başlayan sırasıdır."
  ].filter((x) => x !== "").join("\n");
}

function checkPrompt(items) {
  const rows = items.map((x, i) => JSON.stringify({ i, q: x.q, o: x.o }));
  return [
    "Aşağıda Türkçe bir bilgi yarışması için yazılmış çoktan seçmeli sorular var. Doğru şıkkı sen bul.",
    "Her soru için doğru şıkkın sırasını (0, 1, 2 veya 3) ver.",
    "Şu durumlarda -1 yaz: emin değilsen, birden fazla şık doğru sayılabiliyorsa, hiçbir şık doğru değilse, soru belirsizse, bilgi zamanla değişebiliyorsa ya da soruda hata varsa.",
    "",
    rows.join("\n"),
    "",
    "Çıktı: yalnızca şu biçimde tek bir JSON nesnesi ver, başka hiçbir metin ekleme:",
    '{"cevaplar":[{"i":0,"a":2},{"i":1,"a":-1}]}'
  ].join("\n");
}

async function main() {
  if (!TOKEN) { say("HATA: GITHUB_TOKEN yok."); finish(1); }
  const existing = readFile();
  const cat = await availableModels();
  const genModels = usable(GEN_MODELS, cat);
  const checkModels = usable(CHECK_MODELS, cat).concat(genModels).filter((m, i, a) => a.indexOf(m) === i);

  const g = await ask(genModels, [
    { role: "system", content: "Sen Türkçe bilgi yarışması oyunları için soru yazan titiz bir editörsün. Yalnızca doğrulanabilir, kesin bilgilere dayanırsın." },
    { role: "user", content: genPrompt(existing) }
  ], { max: 3500, temp: 0.9 });
  const gj = extractJSON(g.text);
  const raw = gj && (Array.isArray(gj) ? gj : Array.isArray(gj.sorular) ? gj.sorular : []);
  if (!raw || !raw.length) { say("Uyarı: " + g.model + " beklenen biçimde soru vermedi, bu tur atlandı."); finish(0); }

  // Süzgeç + tekrar kontrolü
  const have = existing.map((x) => ({ n: norm(x.q), w: words(x.q) }));
  const cands = [];
  for (const it of raw) {
    const c = clean(it);
    if (!c) continue;
    const n = norm(c.q), w = words(c.q);
    if (have.some((h) => h.n === n || similar(h.w, w))) continue;
    have.push({ n, w });
    cands.push(c);
  }
  say("Yazılan: " + raw.length + " · kurallardan geçen: " + cands.length + " (" + g.model + ")");
  if (!cands.length) { say("Bu tur eklenecek soru yok."); finish(0); }

  // Bağımsız doğrulama: başka model şıkların doğrusunu anahtarı görmeden bulur
  const v = await ask(checkModels, [
    { role: "system", content: "Sen genel kültür ve bilgi yarışması sorularını denetleyen titiz bir editörsün." },
    { role: "user", content: checkPrompt(cands) }
  ], { max: 1500, temp: 0 });
  const vj = extractJSON(v.text);
  const ans = vj && (Array.isArray(vj) ? vj : Array.isArray(vj.cevaplar) ? vj.cevaplar : null);
  if (!ans) { say("Uyarı: doğrulama yanıtı okunamadı, güvenlik için bu tur atlandı."); finish(0); }
  const map = new Map();
  for (const r of ans) if (r && Number.isInteger(Number(r.i))) map.set(Number(r.i), Number(r.a));
  if (map.size < Math.ceil(cands.length / 2)) { say("Uyarı: doğrulama eksik geldi, güvenlik için bu tur atlandı."); finish(0); }
  const ok = cands.filter((c, i) => map.get(i) === c.a).map(shuffleOpts);
  say("Doğrulayan: " + v.model + " · aynı cevabı veren: " + ok.length + " / " + cands.length);

  if (!ok.length) { say("Bu tur eklenecek soru yok."); finish(0); }
  const all = existing.concat(ok).slice(-MAX_ITEMS);
  writeFile(all);
  say("**Eklenen: " + ok.length + " · dosyadaki toplam: " + all.length + "**");
  finish(0);
}

main().catch((e) => {
  if (e instanceof ApiError && e.kind === "auth") {
    say("HATA (" + e.status + "): GitHub Models izni yok. İş akışında \"models: read\" izni olmalı ve hesabınızda GitHub Models açık olmalı. Ayrıntı: " + e.message);
    finish(1);
  }
  if (e instanceof ApiError && e.kind === "rate") {
    say("Günlük/dakikalık ücretsiz kota doldu, bu tur atlandı. Sonraki çalışmada devam eder.");
    finish(0);
  }
  say("Uyarı: bu tur tamamlanamadı: " + String(e && e.message).slice(0, 400));
  finish(0);
});
