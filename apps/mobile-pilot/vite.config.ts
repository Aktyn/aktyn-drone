import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react-swc"
import version from "vite-plugin-package-version"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), version()],
  define: {
    global: "window",
  },
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
    preserveSymlinks: true,
  },
  assetsInclude: ["**/*.stl", "**/*.png"],
})
