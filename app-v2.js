// app-v2.js (versão limpa)

window.addEventListener("DOMContentLoaded", async () => {
  // 1) Validar div do mapa
  const mapDiv = document.getElementById("map");
  if (!mapDiv) {
    console.error('ERRO: não existe <div id="map">');
    return;
  }

  // 2) Garantir altura (sem mexer no innerHTML)
  mapDiv.style.height = "600px";

  // 3) Criar o mapa primeiro
  const map = L.map("map", {
    worldCopyJump: true,
  }).setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap",
  }).addTo(map);

  // 4) Carregar scores e geojson (pela ordem certa)
  let scores = {};
  try {
    const scoresRes = await fetch("data/scores.json", { cache: "no-store" });
    scores = await scoresRes.json();
    console.log("Scores carregados:", scores);
  } catch (e) {
    console.error("ERRO ao carregar scores.json:", e);
  }

  let world = null;
  try {
    const geoRes = await fetch("data/world.geojson", { cache: "no-store" });
    world = await geoRes.json();
    console.log("GeoJSON carregado");
  } catch (e) {
    console.error("ERRO ao carregar world.geojson:", e);
    return;
  }

  // 5) Helpers
  function getScoreValue(iso3) {
    // Aceita formatos:
    // A) "PRT": 52
    // B) "PRT": { "score": 52, "name": "Portugal" }
    const v = scores?.[iso3];
    if (typeof v === "number") return v;
    if (v && typeof v === "object" && typeof v.score === "number") return v.score;
    return null;
  }

  function getColor(score) {
    if (score === null || score === undefined) return "#cccccc"; // não avaliado
    return score >= 80 ? "#1a9850" :
           score >= 70 ? "#66bd63" :
           score >= 60 ? "#a6d96a" :
           score >= 50 ? "#fee08b" :
           score >= 40 ? "#fdae61" :
           score >= 30 ? "#f46d43" :
                         "#d73027";
  }

  function style(feature) {
    const iso3 = feature?.properties?.["ISO3166-1-Alpha-3"];
    const score = iso3 ? getScoreValue(iso3) : null;

    return {
      fillColor: getColor(score),
      weight: 0.8,
      opacity: 1,
      color: "#555",
      fillOpacity: 0.8,
    };
  }

  function highlightFeature(e) {
    const layer = e.target;
    layer.setStyle({
      weight: 2,
      color: "#111",
      fillOpacity: 0.9,
    });
    layer.bringToFront();
  }

  function resetHighlight(e) {
    geojsonLayer.resetStyle(e.target);
  }

  function onCountryClick(feature) {
    const iso3 = feature?.properties?.["ISO3166-1-Alpha-3"];
    const score = iso3 ? getScoreValue(iso3) : null;

    // Troca isto por: abrir modal / navegar para página do país
    console.log("CLICK:", feature?.properties?.name, iso3, score);

    // Exemplo (se tiveres páginas por ISO3):
    // window.location.href = `pais.html?iso=${encodeURIComponent(iso3)}`;
  }

  function onEachFeature(feature, layer) {
    const name = feature?.properties?.name ?? "País";
    const iso3 = feature?.properties?.["ISO3166-1-Alpha-3"];
    const score = iso3 ? getScoreValue(iso3) : null;

    layer.bindTooltip(
      `<strong>${name}</strong><br>ISE: ${score ?? "Não avaliado"}`,
      { sticky: true }
    );

    layer.on({
      mouseover: highlightFeature,
      mouseout: resetHighlight,
      click: () => onCountryClick(feature),
    });
  }

  // 6) Desenhar GeoJSON
  const geojsonLayer = L.geoJSON(world, {
    style,
    onEachFeature,
  }).addTo(map);

  // 7) Legenda fixa
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "legend");
    div.innerHTML = `
      <div style="background:#fff;padding:10px;border-radius:10px;border:1px solid #ddd;box-shadow:0 4px 16px rgba(0,0,0,.08);font:12px system-ui">
        <div style="font-weight:700;margin-bottom:6px">Legenda (ISE)</div>
        <div style="display:grid;grid-template-columns:14px 1fr;gap:6px 8px;align-items:center">
          <span style="width:14px;height:10px;background:#1a9850;display:inline-block;border:1px solid #999"></span><span>80–100</span>
          <span style="width:14px;height:10px;background:#66bd63;display:inline-block;border:1px solid #999"></span><span>70–79</span>
          <span style="width:14px;height:10px;background:#a6d96a;display:inline-block;border:1px solid #999"></span><span>60–69</span>
          <span style="width:14px;height:10px;background:#fee08b;display:inline-block;border:1px solid #999"></span><span>50–59</span>
          <span style="width:14px;height:10px;background:#fdae61;display:inline-block;border:1px solid #999"></span><span>40–49</span>
          <span style="width:14px;height:10px;background:#f46d43;display:inline-block;border:1px solid #999"></span><span>30–39</span>
          <span style="width:14px;height:10px;background:#d73027;display:inline-block;border:1px solid #999"></span><span>&lt; 30</span>
          <span style="width:14px;height:10px;background:#cccccc;display:inline-block;border:1px solid #999"></span><span>Não avaliado</span>
        </div>
      </div>
    `;
    return div;
  };
  legend.addTo(map);
});
