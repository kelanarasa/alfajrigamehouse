/* =====================================================
   AL-FAJRI GAMEHOUSE
   Untuk menambah game, cukup tambahkan satu blok di daftar GAMES.
   - url   : link GitHub Pages atau Netlify game tersebut.
             Jika dikosongkan (""), kartu tampil sebagai "Segera hadir".
   - image : (opsional) gambar sampul, mis. "assets/sortir-sampah.png".
             Jika kosong atau file tidak ada, dipakai emoji.
   - color : warna aksen kartu.
   ===================================================== */

const OPEN_IN_NEW_TAB = false;  // false = game dibuka di tab yang sama (tombol Back kembali ke Gamehouse)

/* Musik latar:
   - Jika ada file di BGM_FILE, file itu yang diputar (disarankan, pakai musik
     bebas hak cipta / milik sendiri).
   - Jika file tidak ada, dibuat musik bernuansa Arab (maqam Hijaz) yang pelan
     dan menenang langsung di browser, jadi tetap ada suara tanpa file apa pun. */
const BGM_FILE = "assets/bgm.mp3";
const BGM_VOLUME = 0.55;        // 0 sampai 1

const GAMES = [
  {
    title: "Sortir Sampah",
    desc: "Geser sampah yang jatuh ke tempat sampah yang tepat. Main sendiri atau lawan teman.",
    emoji: "♻️",
    color: "#2e9e4f",
    tags: ["1–2 pemain", "Lingkungan"],
    url: "https://kelanarasa.github.io/sortir-sampah/",     // contoh: "https://namaanda.github.io/sortir-sampah/"
    image: "assets/sortirsampah.png"
  },
  {
    title: "Let's Explore",
    desc: "Jelajahi peta, Jawab semua soal dan kumpulkan poin.",
    emoji: "🧭",
    color: "#e8772e",
    tags: ["1-4 pemain", "Strategi"],
    url: "https://kelanarasa.github.io/alfajri-letsexplore/",     // contoh: "https://nama-situs-anda.netlify.app/"
    image: "assets/letsexplore.png"
  }
];

/* ---------- tampilan ---------- */
const grid = document.getElementById("grid");

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function card(g) {
  const ready = !!g.url;
  const c = el("article", "card" + (ready ? "" : " soon"));
  c.style.setProperty("--c", g.color || "#4aa3ff");

  const cover = el("div", "cover", g.emoji || "🎮");
  cover.setAttribute("aria-hidden", "true");
  if (g.image) {
    const im = new Image();
    im.alt = "";
    im.onload = () => { cover.textContent = ""; cover.appendChild(im); };
    im.src = g.image;
  }
  c.appendChild(cover);

  const body = el("div", "card-body");
  body.appendChild(el("h3", "", g.title));
  body.appendChild(el("p", "", g.desc));
  if (g.tags && g.tags.length) {
    const t = el("div", "tags");
    g.tags.forEach(x => t.appendChild(el("span", "", x)));
    body.appendChild(t);
  }
  if (ready) {
    const a = el("a", "play", "Mainkan");
    a.href = g.url;
    a.setAttribute("aria-label", "Mainkan " + g.title);
    if (OPEN_IN_NEW_TAB) { a.target = "_blank"; a.rel = "noopener"; }
    body.appendChild(a);
  } else {
    body.appendChild(el("span", "play off", "Segera hadir"));
  }
  c.appendChild(body);
  return c;
}

GAMES.forEach(g => grid.appendChild(card(g)));

/* kartu penutup: ruang untuk game berikutnya */
grid.appendChild(card({
  title: "Game berikutnya",
  desc: "Masih dalam pembuatan. Tunggu ya.",
  emoji: "🛠️",
  color: "#5fa383",
  tags: [],
  url: ""
}));

/* ---------- logo: pakai assets/logo.png jika ada ---------- */
const logoImg = new Image();
logoImg.alt = "Logo Al-Fajri Gamehouse";
logoImg.onload = () => {
  document.querySelectorAll(".logoFallback").forEach(fb => fb.replaceWith(logoImg.cloneNode()));
};
logoImg.src = "assets/logo.png";

/* ---------- tahun di footer ---------- */
document.getElementById("year").textContent = new Date().getFullYear();

/* =====================================================
   MUSIK LATAR + LAYAR SAMBUTAN
   ===================================================== */
const bgm = (() => {
  let ctx = null, master = null, dry = null, wet = null;
  let fileAudio = null, mode = null, timer = null;
  let on = false;                 // musik sedang diizinkan jalan
  let userMuted = false;

  try { userMuted = localStorage.getItem("gh-muted") === "1"; } catch (e) {}

  /* --- nada: maqam Hijaz di D (D Eb F# G A Bb C) --- */
  const SCALE = [0, 1, 4, 5, 7, 8, 10];
  const BASE = 293.66;            // D4
  const BEAT = 0.62;
  const hz = d => {
    const o = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
    return BASE * Math.pow(2, (SCALE[i] + 12 * o) / 12);
  };

  function impulse(c) {
    const len = Math.floor(c.sampleRate * 3), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }

  function buildGraph() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    dry = ctx.createGain(); dry.gain.value = 0.8; dry.connect(master);
    const conv = ctx.createConvolver(); conv.buffer = impulse(ctx);
    wet = ctx.createGain(); wet.gain.value = 0.65;
    wet.connect(conv); conv.connect(master);
    return true;
  }

  function drone() {
    [[73.42, "sine", 0.11], [110.0, "triangle", 0.05], [146.83, "sine", 0.035]].forEach(([f, type, v], k) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
      o.type = type; o.frequency.value = f; o.detune.value = k * 3 - 3;
      lp.type = "lowpass"; lp.frequency.value = 520;
      g.gain.value = v;
      const lfo = ctx.createOscillator(), lg = ctx.createGain();
      lfo.frequency.value = 0.07 + k * 0.03; lg.gain.value = v * 0.35;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(lp); lp.connect(g); g.connect(dry); g.connect(wet);
      o.start(); lfo.start();
    });
  }

  function pluck(f, t, vel, dur) {
    const o = ctx.createOscillator(), o2 = ctx.createOscillator();
    const g = ctx.createGain(), g2 = ctx.createGain(), lp = ctx.createBiquadFilter();
    o.type = "triangle"; o2.type = "sine";
    o.frequency.value = f; o2.frequency.value = f * 2;
    g2.gain.value = 0.22;
    lp.type = "lowpass";
    lp.frequency.setValueAtTime(3000, t);
    lp.frequency.exponentialRampToValueAtTime(650, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); o2.connect(g2); g2.connect(lp); lp.connect(g);
    g.connect(dry); g.connect(wet);
    o.start(t); o2.start(t); o.stop(t + dur + 0.1); o2.stop(t + dur + 0.1);
  }

  let deg = 4, count = 0, next = 0;
  function sequencer() {
    while (next < ctx.currentTime + 0.5) {
      if (count > 0 && Math.random() < 0.18) { next += BEAT * (Math.random() < 0.5 ? 1 : 0.5); continue; }
      count++;
      if (count >= 6 + Math.floor(Math.random() * 4)) {      // akhir frasa: berhenti di nada dasar
        deg = Math.random() < 0.6 ? 0 : 4;
        pluck(hz(deg), next, 0.26, 4.5);
        next += BEAT * 4;
        count = 0;
        continue;
      }
      const r = Math.random();
      deg += r < 0.35 ? -1 : r < 0.7 ? 1 : r < 0.82 ? -2 : r < 0.94 ? 2 : 0;
      deg = Math.max(-2, Math.min(8, deg));
      if (Math.random() < 0.2) pluck(hz(deg + 1), Math.max(next - 0.09, ctx.currentTime), 0.09, 0.4);  // hiasan
      pluck(hz(deg), next, 0.22, 2.4);
      next += BEAT * [0.5, 1, 1, 1.5][Math.floor(Math.random() * 4)];
    }
  }

  function fade(to, sec) { master.gain.setTargetAtTime(to, ctx.currentTime, sec); }

  function resume() {
    if (mode === "file") { fileAudio.play().catch(() => {}); }
    else if (mode === "synth") { ctx.resume(); fade(BGM_VOLUME * 0.8, 1.2); }
  }
  function pause() {
    if (mode === "file") { fileAudio.pause(); }
    else if (mode === "synth") { fade(0, 0.25); setTimeout(() => { if (!on || userMuted) ctx.suspend(); }, 900); }
  }

  /* dipanggil dari klik tombol Mulai (syarat browser untuk memutar suara) */
  function start() {
    on = true;
    if (userMuted) return;                     // sebelumnya dimatikan; mulai saat tombol musik ditekan
    const synthReady = buildGraph();           // dibuat di dalam klik agar iOS mengizinkan
    if (synthReady) ctx.resume();

    const fallback = () => {
      if (!synthReady) return;
      mode = "synth";
      drone(); next = ctx.currentTime + 0.4;
      sequencer(); timer = setInterval(sequencer, 120);
      if (userMuted) pause(); else resume();
    };

    fileAudio = new Audio(BGM_FILE);
    fileAudio.loop = true;
    fileAudio.volume = BGM_VOLUME;
    fileAudio.addEventListener("error", () => { if (!mode) fallback(); });
    fileAudio.play().then(() => { mode = "file"; }).catch(() => { if (!mode) fallback(); });
  }

  function setMuted(m) {
    userMuted = m;
    try { localStorage.setItem("gh-muted", m ? "1" : "0"); } catch (e) {}
    if (!mode) { if (!m) start(); return; }
    if (m) pause(); else resume();
  }

  /* hentikan saat tab disembunyikan */
  document.addEventListener("visibilitychange", () => {
    if (!on || !mode) return;
    if (document.hidden) pause(); else if (!userMuted) resume();
  });

  return { start, setMuted, get muted() { return userMuted; } };
})();

(function welcome() {
  const overlay = document.getElementById("welcome");
  const startBtn = document.getElementById("startBtn");
  const musicBtn = document.getElementById("musicBtn");

  function paintMusicBtn() {
    musicBtn.setAttribute("aria-pressed", String(bgm.muted));
    musicBtn.setAttribute("aria-label", bgm.muted ? "Nyalakan musik" : "Matikan musik");
  }

  startBtn.addEventListener("click", () => {
    bgm.start();
    paintMusicBtn();
    document.body.classList.add("started");
    overlay.classList.add("leaving");
    musicBtn.hidden = false;
    window.scrollTo(0, 0);
    setTimeout(() => {
      document.body.classList.remove("locked");
      overlay.remove();
    }, 850);
  });

  musicBtn.addEventListener("click", () => {
    bgm.setMuted(!bgm.muted);
    paintMusicBtn();
  });

  startBtn.focus({ preventScroll: true });
})();
