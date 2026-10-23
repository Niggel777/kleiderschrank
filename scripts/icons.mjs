// Erzeugt PNG-Icons aus public/icon.svg (für iOS und Android-Installation).
import { readFileSync, writeFileSync } from "node:fs";
import { Resvg } from "@resvg/resvg-js";

const svg = readFileSync(new URL("../public/icon.svg", import.meta.url), "utf8");
// Maskable: ohne Rundung, Motiv in der sicheren Zone
const maskable = svg.replace('rx="112"', 'rx="0"').replace("<path ", '<path transform="translate(51 51) scale(0.8)" ');
for (const [name, src, size] of [["icon-180.png", svg, 180], ["icon-192.png", svg, 192], ["icon-512.png", svg, 512], ["icon-maskable-512.png", maskable, 512]]) {
  const png = new Resvg(src, { fitTo: { mode: "width", value: size } }).render().asPng();
  writeFileSync(new URL(`../public/${name}`, import.meta.url), png);
  console.log(name, png.length);
}
