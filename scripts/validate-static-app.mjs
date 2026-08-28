import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = new URL("../", import.meta.url).pathname.replace(/^\/(.:)/, "$1");
const docs = join(root, "docs");
const data = JSON.parse(await readFile(join(docs, "data.json"), "utf8"));
const assets = JSON.parse(await readFile(join(docs, "plan-assets.json"), "utf8"));
if (data.length !== 39) throw new Error(`Expected 39 KVA values, found ${data.length}`);
if (new Set(data.map((row) => row.kva)).size !== 39) throw new Error("Duplicate KVA values");

const list = (value) => !value ? [] : Array.isArray(value) ? value : [value];
let advertised = 0;
for (const [index, row] of data.entries()) {
  if (index && row.kva <= data[index - 1].kva) throw new Error(`KVA order failed at ${row.kva}`);
  for (const mode of ["room65", "canopy65", "canopy75"]) {
    const variant = row[mode];
    if (!variant) continue;
    if (!variant.url?.startsWith("https://www.shmerling.co.il/")) throw new Error(`${row.kva} ${mode}: non-official source`);
    for (const url of list(variant.plans).filter((value) => !decodeURIComponent(value).includes("ללא-השתקה"))) {
      const record = assets[url];
      if (!record) continue;
      for (const [format, relative] of Object.entries(record)) {
        const file = join(docs, relative);
        const info = await stat(file);
        if (info.size < 200) throw new Error(`${row.kva} ${mode}: ${format} file is empty`);
        const bytes = await readFile(file);
        if (format === "pdf" && !bytes.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error(`${relative}: invalid PDF`);
        if (format === "dxf" && !bytes.toString("utf8").trimEnd().endsWith("EOF")) throw new Error(`${relative}: invalid DXF`);
        if (format === "dwg" && !/^AC10(15|18|21|24|27|32)$/.test(bytes.subarray(0, 6).toString("ascii"))) throw new Error(`${relative}: invalid DWG header`);
        advertised += 1;
      }
    }
  }
  console.log(`PASS ${String(index + 1).padStart(2, "0")}/39 | ${row.kva} KVA | room65=${!!row.room65} canopy65=${!!row.canopy65} canopy75=${!!row.canopy75}`);
}
console.log(`PASS: all 39 generator selections validated; ${advertised} local downloads verified.`);
