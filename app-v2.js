// Debug simples (podes apagar quando estiver tudo ok)
document.body.insertAdjacentHTML(
  "beforeend",
  `<div style="position:fixed;top:10px;left:10px;z-index:99999;background:#fff;border:2px solid #22c55e;padding:6px 8px;border-radius:8px;font-size:12px">
    app.js carregou ✅
  </div>`
);

// ---------- Helpers ----------
function normalizeScoreValue(v) {
  // Aceita:
  // 1) score como número (ex: 52)
  // 2) score como objeto (ex: {score:52, name:"Portugal"})
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && typeof v.score === "number") return v.score;
  return null;
}

function normalizeNameValue(v, fallback) {
  if (v == null) return fallback;
  if (typeof v === "object" && typeof v.name === "string") return v.name;
  return fallback;
}

function getColor(score) {
  // score é número 0–100
  return score >= 80 ? "#1a9850" :
         score >= 70 ? "#66bd63" :
         score >= 60 ? "#a6d96a" :
         score >= 50 ? "#fee08b" :
         score >= 40 ? "#fdae61" :
         score >= 30 ? "#f46d43" :
                       "#cccccc"; // não avaliado
}

function makeLegend() {
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <h4>Legenda (ISE)</h4>
      <div class="row"><i style="background:${getColor(80)}"></i> 80–100</div>
      <div class="row"><i style="background:${getColor(70)}"></i> 70–79</div>
      <div class="row"><i style="background:${getColor(60)}"></i> 60–69</div>
      <div class="row"><i style="background:${getColor(50)}"></i> 50–59</div>
      <div class="row"><i style="background:${getColor(40)}"></i> 40–49</div>
      <div class="row"><i style="background:${getColor(30)}"></i> 30–39</div>
      <div class="row"><i style="background:#cccccc"></i> Não avaliado</div>
    `;
    return div;
  };

  return legend;
}

// ---------- Painel ----------
const panel = {
  el: document.getElementById("panel"),
  title: document.getElementById("panelTitle"),
  meta: document.getElementById("panelMeta"),
  body: document.getElementById("panelBody"),
  closeBtn: document.getElementById("panelClose"),

  open(countryName, iso3, score, fullObj) {
    this.title.textContent = countryName;
    this.meta.textContent = `ISO3: ${iso3} · ISE: ${score ?? "Não avaliado"}`;

    // Conteúdo (adaptável ao que tiveres no JSON)
    const short = fullObj?.short ?? null;
    const full = fullObj?.full ?? null;
    const pillars = fullObj?.pillars ?? null;

    let html = "";

    if (short) {
      html += `
        <div class="card">
          <h3>Resumo curto</h3>
          <div>${escapeHtml(short)}</div>
        </div>
      `;
    }

    if (pillars && typeof pillars === "object") {
      const rows = Object.entries(pillars)
        .map(([k, v]) => `<div>${escapeHtml(k)}</div><div><strong>${escapeHtml(String(v))}</strong></div>`)
        .join("");

      html += `
        <div class="card">
          <h3>Pilares</h3>
          <div class="kv">${rows}</div>
        </div>
      `;
    }

    if (full) {
      html += `
        <div class="card">
          <h3>Análise detalhada</h3>
          <div style="white-space:pre-wrap">${escapeHtml(full)}</div>
        </div>
      `;
    }

    if (!html) {
      html = `
        <div class="panel__hint">
          Ainda não há “resumo/pilares/análise” para este país no teu JSON.
          <br><br>
          Mas o mapa e o score já funcionam.
        </div>
      `;
    }

    this.body.innerHTML = html;
  },

  close() {
    this.title.textContent = "Seleciona um país";
    this.meta.textContent = "Clica num país para ver detalhes.";
    this.body.innerHTML = `<div class="panel__hint">Dica: passa o rato para ver o tooltip, e clica para abrir o painel.</div>`;
  }
};

panel.closeBtn.addEventListener("click", () => panel.close());

// Evitar que o Leaflet “roube” o focus e desenhe outlines (extra segurança)
function removeMapFocusRing(map) {
  const c = map.getContainer();
  c.setAttribute("tabindex", "-1");
  c.addEventListener("mousedown", (e) => e.preventDefault());
}

// Para não rebentar com HTML no painel
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------- App ----------
window.addEventListener("DOMContentLoaded", async () => {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    alert('ERRO: não existe <div id="map">');
    return;
  }

  // 1) Criar mapa primeiro
  const map = L.map("map", { worldCopyJump: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 7,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  makeLegend().addTo(map);
  removeMapFocusRing(map);

  // 2) Carregar dados (scores + geojson) em paralelo
  let scoresData = {};
  let countriesData = null; // opcional: se criares data/countries.json com texto/pilares

  try {
    const [scoresRes, geoRes] = await Promise.all([
      fetch("data/scores.json", { cache: "no-store" }),
      fetch("data/world.geojson", { cache: "no-store" })
    ]);

    if (!scoresRes.ok) throw new Error("Falha a carregar data/scores.json");
    if (!geoRes.ok) throw new Error("Falha a carregar data/world.geojson");

    scoresData = await scoresRes.json();
    const geojson = await geoRes.json();

    // 3) (Opcional) tentar carregar countries.json se existir
    // Se não existir, ignoramos.
    try {
      const cRes = await fetch("data/countries.json", { cache: "no-store" });
      if (cRes.ok) countriesData = await cRes.json();
    } catch (_) {}

    // 4) Criar layer GeoJSON já com accesso ao scoresData
    const geoLayer = L.geoJSON(geojson, {
      style: (feature) => {
        const iso3 = feature?.properties?.["ISO3166-1-Alpha-3"];
        const raw = scoresData?.[iso3];
        const score = normalizeScoreValue(raw);

        return {
          fillColor: score != null ? getColor(score) : "#cccccc",
          weight: 0.7,
          opacity: 1,
          color: "#374151",
          fillOpacity: 0.85
        };
      },

      onEachFeature: (feature, layer) => {
        const iso3 = feature?.properties?.["ISO3166-1-Alpha-3"];
        const defaultName = feature?.properties?.name ?? "País";
        const raw = scoresData?.[iso3];

        const score = normalizeScoreValue(raw);
        const name = normalizeNameValue(raw, defaultName);

        layer.bindTooltip(
          `<strong>${escapeHtml(name)}</strong><br>ISE: ${score ?? "Não avaliado"}`,
          { sticky: true }
        );

        layer.on("click", () => {
          // Se tiveres countries.json, ele ganha prioridade (tem texto/pilares/etc.)
          const fullObj = countriesData?.[iso3] ?? raw ?? null;
          panel.open(name, iso3, score, fullObj);
        });

        // Hover feedback (opcional mas dá “vida”)
        layer.on("mouseover", () => layer.setStyle({ weight: 1.6 }));
        layer.on("mouseout", () => layer.setStyle({ weight: 0.7 }));
      }
    }).addTo(map);

    // 5) Ajustar bounds iniciais (opcional)
    // map.fitBounds(geoLayer.getBounds(), { padding: [10, 10] });

    console.log("Scores carregados:", scoresData);
    console.log("GeoJSON carregado.");
    if (countriesData) console.log("Countries carregado:", countriesData);
  } catch (err) {
    console.error(err);
    alert("Erro a carregar dados. Abre a consola (F12) para ver detalhes.");
  }
});
