function colorForScore(score) {
  if (score === null || score === undefined) return "#e5e7eb"; // sem avaliação
  if (score < 20) return "#991b1b";
  if (score < 40) return "#dc2626";
  if (score < 60) return "#fbbf24";
  if (score < 80) return "#86efac";
  return "#15803d";
}

function labelForScore(score) {
  if (score === null || score === undefined) return "Sem avaliação";
  if (score < 20) return "0–19 Muito frágil";
  if (score < 40) return "20–39 Frágil";
  if (score < 60) return "40–59 Intermédia";
  if (score < 80) return "60–79 Robusta";
  return "80–100 Muito sustentável";
}

async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao carregar ${path}`);
  return res.json();
}

function getISO3(props) {
  return (
    props["ISO3166-1-Alpha-3"] ||
    props["ISO_A3"] ||
    props["ADM0_A3"] ||
    props["iso_a3"] ||
    props["ISO3"] ||
    props["iso3"] ||
    null
  );
}

function addLegendControl(map) {
  const legend = L.control({ position: "topright" });

  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "leaflet-control leaflet-bar");
    div.style.background = "white";
    div.style.padding = "10px 12px";
    div.style.borderRadius = "10px";
    div.style.border = "1px solid #e5e7eb";
    div.style.boxShadow = "0 8px 24px rgba(0,0,0,.08)";
    div.style.fontSize = "14px";
    div.style.width = "240px";

    const items = [
      { label: "80–100 Muito sustentável", color: "#15803d" },
      { label: "60–79 Robusta", color: "#86efac" },
      { label: "40–59 Intermédia", color: "#fbbf24" },
      { label: "20–39 Frágil", color: "#dc2626" },
      { label: "0–19 Muito frágil", color: "#991b1b" },
      { label: "Sem avaliação", color: "#e5e7eb" }
    ];

    div.innerHTML = `
      <strong>Legenda</strong>
      <div style="margin-top:8px">
        ${items.map(i => `
          <div style="display:flex;gap:8px;align-items:center;margin:6px 0">
            <span style="width:16px;height:16px;border-radius:4px;border:1px solid #e5e7eb;background:${i.color}"></span>
            <span>${i.label}</span>
          </div>
        `).join("")}
      </div>
      <div style="color:#6b7280;font-size:12px;margin-top:8px">
        Passa o rato num país para ver a nota.
      </div>
    `;

    // Impedir que arrastar/scroll no mapa seja “roubado” pelo control
    L.DomEvent.disableClickPropagation(div);
    L.DomEvent.disableScrollPropagation(div);
    return div;
  };

  legend.addTo(map);
}

function setDebug(html) {
  let box = document.getElementById("debug");
  if (!box) {
    box = document.createElement("div");
    box.id = "debug";
    document.body.appendChild(box);
  }
  box.innerHTML = html;
}

(async function init() {
  try {
    setDebug(`<strong>ISE Debug</strong><div class="muted">A iniciar…</div>`);

    const map = L.map("map").setView([20, 0], 2);

    // Legenda como control do Leaflet (fica SEMPRE visível)
    addLegendControl(map);

    // Mapa base (fundo)
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 6,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    // Carregar dados
    const [world, scores] = await Promise.all([
      loadJSON("data/world.geojson"),
      loadJSON("data/scores.json")
    ]);

    // Verificações rápidas
    const features = world?.features?.length ?? 0;
    const scoreKeys = Object.keys(scores || {}).length;

    setDebug(`
      <strong>ISE Debug</strong>
      <div>GeoJSON features: <strong>${features}</strong></div>
      <div>Scores entries: <strong>${scoreKeys}</strong></div>
      <div class="muted">A desenhar países…</div>
    `);

    let matched = 0;

    // Desenhar países
    const layer = L.geoJSON(world, {
      style: (feature) => {
        const iso3 = getISO3(feature.properties || {});
        const score = iso3 ? scores[iso3]?.score : undefined;
        if (score !== undefined) matched++;

        return {
          color: "#ffffff",
          weight: 1,
          fillColor: colorForScore(score),
          fillOpacity: 0.95
        };
      },
      onEachFeature: (feature, countryLayer) => {
        const props = feature.properties || {};
        const name = props["name"] || props["ADMIN"] || props["NAME"] || "País";
        const iso3 = getISO3(props);
        const score = iso3 ? scores[iso3]?.score : undefined;

        countryLayer.bindTooltip(
          `<strong>${name}</strong><br>ISO3: ${iso3 ?? "?"}<br>Nota: ${score ?? "—"}<br>${labelForScore(score)}`,
          { sticky: true }
        );
      }
    }).addTo(map);

    map.fitBounds(layer.getBounds(), { padding: [10, 10] });

    setDebug(`
      <strong>ISE Debug</strong>
      <div>GeoJSON features: <strong>${features}</strong></div>
      <div>Scores entries: <strong>${scoreKeys}</strong></div>
      <div>Matches ISO3 com score: <strong>${matched}</strong></div>
      <div class="muted">Se “matches” for 0, o problema é o campo ISO3 no GeoJSON.</div>
    `);

  } catch (err) {
    setDebug(`
      <strong>ISE Debug — ERRO</strong>
      <div>${err.message}</div>
      <div class="muted">Abre os ficheiros em /data/ e confirma que existem e são JSON válido.</div>
    `);
    console.error(err);
  }
})();
