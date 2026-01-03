const mapDiv = document.getElementById("map");
mapDiv.style.outline = "4px solid red";
mapDiv.insertAdjacentHTML("afterbegin", "<div style='padding:10px;font-size:14px'>#map existe ✅</div>");

console.log("mapDiv height:", mapDiv.offsetHeight);
document.body.insertAdjacentHTML(
  "beforeend",
  `<div style="position:fixed;top:40px;left:10px;z-index:99999;background:#fff;border:1px solid #ddd;padding:6px 8px;border-radius:8px;font-size:12px">
     altura #map: ${mapDiv.offsetHeight}px
   </div>`
);
