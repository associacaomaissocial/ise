// Escala de cores (a tua regra oficial)
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
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Falha a carregar ${path}`);
  return res.json();
}

function getISO3(props) {
  return (
    props["ISO3166-1-Alpha-3"] ||
    props["ISO_A3"] ||
    props["ADM0_A3"] ||
    props["iso_a3"] ||
    props["iso3"] ||
    props["ISO3"] ||
    null
  );
}

function makeLegend() {
  const el = document.getElementById("legend");
  const items = [
    { label: "80–100 Muito sustentável", color: "#15803d" },
    { label: "60–79 Robusta", color: "#86efac" },
    { label: "40–59 Intermédia", color: "#fbbf24" },
    { label: "20–39 Frágil", color: "#dc2626" },
    { label: "0–19 Muito frágil", color: "#991b1b" },
    { label: "Sem avaliação", color: "#e5e7eb" }
  ];

  el.innerHTML = `
    <strong>Legenda</strong>
    ${items.map(i => `
      <div class="row">
        <span class="swatch" style="background:${i.color}"></span>
        <span>${i.label}</span>
      </div>
    `).join("")}
    <div class="muted">Passa o rato num país para ver a nota.</div>
  `;
}

(async function init() {
  makeLegend();

  // Mapa base
  const map = L.map("map").setView([20, 0], 2);

  // Fundo (opcional, mas ajuda a orientar)
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);

  // Carregar fronteiras + notas
  const [world, scores] = await Promise.all([
    loadJSON("data/world.geojson"),
    loadJSON("data/scores.json")
  ]);

  // GeoJSON do datasets/geo-countries usa estas chaves
  // name / ISO3166-1-Alpha-3 (confirmado no README do dataset) :contentReference[oaicite:7]{index=7}
  const layer = L.geoJSON(world, {
    style: (feature) => {
      const iso3 = getISO3(feature.properties);
      const score = scores[iso3]?.score;
      return {
        color: "#ffffff",
        weight: 1,
        fillColor: colorForScore(score),
        fillOpacity: 1
      };
    },
    onEachFeature: (feature, countryLayer) => {
      const name = feature.properties["name"] || "País";
      const iso3 = getISO3(feature.properties);
      const score = scores[iso3]?.score;

      countryLayer.bindTooltip(
        `<strong>${name}</strong><br>Nota: ${score ?? "—"}<br>${labelForScore(score)}`,
        { sticky: true }
      );
    }
  }).addTo(map);

  map.fitBounds(layer.getBounds());

  (async function init() {
  try {
    makeLegend();

    const map = L.map("map").setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 6,
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    const [world, scores] = await Promise.all([
      loadJSON("data/world.geojson"),
      loadJSON("data/scores.json")
    ]);

    const layer = L.geoJSON(world, {
      style: (feature) => {
        const iso3 = getISO3(feature.properties);
        const score = iso3 ? scores[iso3]?.score : undefined;

        return {
          color: "#ffffff",
          weight: 1,
          fillColor: colorForScore(score),
          fillOpacity: 1
        };
      },
      onEachFeature: (feature, countryLayer) => {
        const name = feature.properties["name"] || feature.properties["ADMIN"] || "País";
        const iso3 = getISO3(feature.properties);
        const score = iso3 ? scores[iso3]?.score : undefined;

        countryLayer.bindTooltip(
          `<strong>${name}</strong><br>ISO3: ${iso3 ?? "?"}<br>Nota: ${score ?? "—"}<br>${labelForScore(score)}`,
          { sticky: true }
        );
      }
    }).addTo(map);

    map.fitBounds(layer.getBounds());

  } catch (err) {
    document.getElementById("legend").innerHTML =
      `<strong>Erro a carregar dados</strong><div class="muted">${err.message}</div>`;
    console.error(err);
  }
})();

})();
