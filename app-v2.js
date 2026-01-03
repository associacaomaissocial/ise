document.body.insertAdjacentHTML(
  "beforeend",
  `<div style="position:fixed;top:10px;left:10px;z-index:99999;background:#fff;border:2px solid #22c55e;padding:6px 8px;border-radius:8px;font-size:12px">
    app-v2.js carregou ✅
  </div>`
);

window.addEventListener("DOMContentLoaded", () => {
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

  mapDiv.style.height = "600px";
  mapDiv.style.outline = "4px solid red";
  mapDiv.style.background = "#f3f4f6";
  mapDiv.innerHTML = "<div style='padding:10px'>#map existe ✅</div>";

  const map = L.map("map").setView([20, 0], 2);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 6,
    attribution: "&copy; OpenStreetMap"
  }).addTo(map);
});
