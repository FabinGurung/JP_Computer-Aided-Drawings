import { defineConfig } from "vite";
export default defineConfig({base:process.env.CAD_PAGES_BASE||"/",build:{outDir:"dist",emptyOutDir:true,rollupOptions:{input:{home:"index.html",cad:"cad/index.html",cadBrief:"cad/brief/index.html",cadAad:"cad/aad/index.html",cadAadLegacy:"cad/aad/legacy/index.html",cadBim:"cad/aad/multistorey/index.html"}}}});
