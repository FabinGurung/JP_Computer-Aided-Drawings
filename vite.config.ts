import { defineConfig } from "vite";
export default defineConfig({base:process.env.CAD_PAGES_BASE||"/",build:{outDir:"dist",emptyOutDir:true,rollupOptions:{input:{home:"index.html",cad:"cad/index.html"}}}});
