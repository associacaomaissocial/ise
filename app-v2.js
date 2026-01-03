document.body.insertAdjacentHTML(
  "beforeend",
  `<div style="position:fixed;top:10px;left:10px;z-index:99999;background:#fff;border:2px solid #22c55e;padding:6px 8px;border-radius:8px;font-size:12px">
    app-v2.js carregou ✅
  </div>`
);

// ---------- Helpers ----------
function getIso(feature) {
  const p = feature?.properties || {};
  return (
    p["ISO3166-1-Alpha-3"] ||
    p["ISO3166-1-Alpha-2"] ||
    p["iso_a3"] ||
    p["iso_a2"] ||
    p["ISO_A3"] ||
    p["ISO_A2"]
  );
}

function getScoreValue(scores, iso) {
  const entry = scores?.[iso];
  if (entry == null) return null;              // null/undefined -> não avaliado
  if (typeof entry === "number") return entry; // formato simples
  if (typeof entry === "object" && "score" in entry) return entry.score; // formato objeto
  return null;
}

function getCountryName(feature, scores, iso) {
  const p = feature?.properties || {};
  const fromGeo = p.name || p.ADMIN || p.admin || p.NAME || p["name_en"];
  const entry = scores?.[iso];
  const fromScores =
    entry && typeof entry === "object"
      ? (entry.name || entry.nome || entry.country)
      : null;
  return fromGeo || fromScores || iso || "País";
}

function getColor(score) {
  return score >= 80 ? "#1a9850" :
         score >= 70 ? "#66bd63" :
         score >= 60 ? "#a6d96a" :
         score >= 50 ? "#fee08b" :
         score >= 40 ? "#fdae61" :
         score >= 30 ? "#f46d43" :
                       "#cccccc"; // não avaliado
}

// ---------- Main ----------
window.addEventListener("DOMContentLoaded", async () => {
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div style="position:fixed;top:40px;left:10px;z-index:99999;background:#fff;border:2px solid #ef4444;padding:6px 8px;border-radius:8px;font-size:12px">
        ERRO: não existe &lt;div id="map"&gt; ❌
      </div>`
    );
    return;
  }

  // Tamanho do mapa
  mapDiv.style.height = "600px";

  // 1) Criar o mapa PRIMEIRO
  const map = L.map("map", { zoomControl: true }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // 2) Carregar dados (scores + geojson)
  let scores = {};
  let geojson = null;

  try {
    const [scoresRes, geoRes] = await Promise.all([
      fetch("data/scores.json", { cache: "no-store" }),
      fetch("data/world.geojson", { cache: "no-store" })
    ]);

    if (!scoresRes.ok) throw new Error("scores.json não encontrado/erro");
    if (!geoRes.ok) throw new Error("world.geojson não encontrado/erro");

    scores = await scoresRes.json();
    geojson = await geoRes.json();

    console.log("Scores carregados:", scores);
    console.log("GeoJSON carregado");
  } catch (err) {
    console.error(err);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<div style="position:fixed;top:40px;left:10px;z-index:99999;background:#fff;border:2px solid #ef4444;padding:6px 8px;border-radius:8px;font-size:12px;max-width:360px">
        ERRO a carregar ficheiros: ${String(err.message || err)} ❌
      </div>`
    );
    return;
  }

  // 3) Pintar países
  const layer = L.geoJSON(geojson, {
    style: (feature) => {
      const iso = getIso(feature);
      const value = getScoreValue(scores, iso);
      return {
        fillColor: value != null ? getColor(value) : "#cccccc",
        weight: 0.6,
        opacity: 1,
        color: "#555",
        fillOpacity: 0.8
      };
    },
    onEachFeature: (feature, layer) => {
      const iso = getIso(feature);
      const value = getScoreValue(scores, iso);
      const name = getCountryName(feature, scores, iso);

      layer.bindTooltip(
        `<strong>${name}</strong><br>ISE: ${value != null ? value : "Não avaliado"}`,
        { sticky: true }
      );
    }
  }).addTo(map);

  // 4) Legenda fixa (sempre visível)
  const legend = L.control({ position: "bottomright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.style.background = "white";
    div.style.padding = "10px";
    div.style.borderRadius = "10px";
    div.style.boxShadow = "0 2px 10px rgba(0,0,0,0.15)";
    div.style.fontSize = "12px";
    div.style.lineHeight = "1.2";
    div.style.minWidth = "160px";

    const bins = [
      { label: "80–100", color: getColor(80) },
      { label: "70–79",  color: getColor(70) },
      { label: "60–69",  color: getColor(60) },
      { label: "50–59",  color: getColor(50) },
      { label: "40–49",  color: getColor(40) },
      { label: "30–39",  color: getColor(30) },
      { label: "Não avaliado", color: "#cccccc" }
    ];

    div.innerHTML =
      `<div style="font-weight:700;margin-bottom:6px">Legenda (ISE)</div>` +
      bins.map(b => `
        <div style="display:flex;align-items:center;gap:8px;margin:4px 0">
          <span style="display:inline-block;width:14px;height:14px;background:${b.color};border:1px solid #999"></span>
          <span>${b.label}</span>
        </div>
      `).join("");

    return div;
  };

  legend.addTo(map);
});
