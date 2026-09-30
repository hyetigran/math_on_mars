import { defineConfig } from "vite";
export default defineConfig({
  base: "/",
  server: {
    host: "127.0.0.1",
    port: 5185,
    strictPort: true,
    proxy: { "/api": "http://127.0.0.1:5186" },
  },
  build: {
    outDir: "dist-connected",
    rollupOptions: {
      input: [
        "index.html",
        "play/index.html",
        "play/battle/index.html",
        "parents/index.html",
        "battle.html",
        "connected-town.html",
        "town-prototype.html",
      ],
    },
  },
});
