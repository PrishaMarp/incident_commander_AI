import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/ws": { target: "http://127.0.0.1:8000", ws: true, changeOrigin: true },
      "/sse": { target: "http://127.0.0.1:8000", changeOrigin: true },
      "/scenarios": { target: "http://127.0.0.1:8000" },
      "/health": { target: "http://127.0.0.1:8000" },
    },
  },
});
