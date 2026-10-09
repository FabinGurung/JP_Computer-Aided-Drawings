import {copyFileSync,mkdirSync,existsSync} from "node:fs";
import {resolve} from "node:path";
const source=resolve("node_modules/web-ifc/web-ifc.wasm"),destination=resolve("public/cad/web-ifc.wasm");
if(!existsSync(source))throw Error("web-ifc WebAssembly missing at "+source);
mkdirSync(resolve("public/cad"),{recursive:true});copyFileSync(source,destination);
console.log("WEB_IFC_WASM_ASSET_COPIED");
