import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  server: { proxy: { "/api": "http://127.0.0.1:5186" } },
  build: {
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
