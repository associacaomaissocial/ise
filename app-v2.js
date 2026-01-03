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
                       "#cccccc";
}

window.addEventListener("DOMContentLoaded", async () => {
  const mapDiv = document.getElementById("map");

  if (!mapDiv) {
    alert("ERRO: não existe <div id='map'>");
    return;
  }

  mapDiv.style.height = "600px";

  // 1️⃣ Criar o mapa PRIMEIRO
  const map = L.map("map").setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // 2️⃣ Carregar dados
  const [scoresRes, geoRes] = await Promise.all([
    fetch("data/scores.json"),
    fetch("data/world.geojson")
  ]);

  const scoresData = await scoresRes.json();
  const geojson = await geoRes.json();
  scores = scoresData;

  console.log("Scores:", scores);
  console.log("GeoJSON carregado");

  // 3️⃣ Adicionar GeoJSON AO MAPA EXISTENTE
  L.geoJSON(geojson, {
    style: feature => {
      const iso = feature.properties["ISO3166-1-Alpha-3"];
      const score = scores[iso];

      return {
        fillColor: score ? getColor(score) : "#cccccc",
        weight: 0.6,
        color: "#555",
        fillOpacity: 0.8
      };
    },
    onEachFeature: (feature, layer) => {
      const iso = feature.properties["ISO3166-1-Alpha-3"];
      const score = scores[iso];

      layer.bindTooltip(
        `<strong>${feature.properties.name}</strong><br>
         ISE: ${score ?? "Não avaliado"}`,
        { sticky: true }
      );
    }
  }).addTo(map);
});
