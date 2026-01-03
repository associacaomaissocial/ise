document.body.insertAdjacentHTML(
  "beforeend",
  `<div style="position:fixed;top:10px;left:10px;z-index:99999;background:#fff;border:2px solid #22c55e;padding:6px 8px;border-radius:8px;font-size:12px">
    app-v2.js carregou ✅
  </div>`
);

let scores = {};

function getColor(score) {
  return score >= 80 ? "#1a9850" :
         score >= 70 ? "#66bd63" :
         score >= 60 ? "#a6d96a" :
         score >= 50 ? "#fee08b" :
         score >= 40 ? "#fdae61" :
         score >= 30 ? "#f46d43" :
                       "#cccccc"; // não avaliado
}

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

  // Define tamanho do mapa (sem meter texto lá dentro)
  mapDiv.style.height = "600px";

  // 1) Criar o mapa PRIMEIRO
  const map = L.map("map").setView([20, 0], 2);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // 2) Carregar scores
  const scoresRes = await fetch("data/scores.json");
  scores = await scoresRes.json();
  console.log("Scores carregados:", scores);

  // 3) Carregar geojson e pintar
  const geoRes = await fetch("data/world.geojson");
  const geojson = await geoRes.json();
  console.log("GeoJSON carregado");

  function style(feature) {
    const iso = feature.properties["ISO3166-1-Alpha-3"];
    const entry = scores[iso];            // { score, name }
    const value = entry?.score;           // número

    return {
      fillColor: Number.isFinite(value) ? getColor(value) : "#cccccc",
      weight: 0.6,
      opacity: 1,
      color: "#555",
      fillOpacity: 0.8
    };
  }

  L.geoJSON(geojson, {
    style,
    onEachFeature: (feature, layer) => {
      const iso = feature.properties["ISO3166-1-Alpha-3"];
      const entry = scores[iso];
      const value = entry?.score;

      layer.bindTooltip(
        `<strong>${feature.properties.name}</strong><br>
         ISE: ${Number.isFinite(value) ? value : "Não avaliado"}`,
        { sticky: true }
      );
    }
  }).addTo(map);
});
