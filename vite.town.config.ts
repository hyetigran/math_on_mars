import { defineConfig } from "vite";
export default defineConfig({
  base: "./",
  build: {
    outDir: "dist-town",
    rollupOptions: { input: "town-prototype.html" },
  },
});
