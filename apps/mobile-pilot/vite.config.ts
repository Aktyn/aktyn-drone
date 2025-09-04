import path from "path"
import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"
import version from "vite-plugin-package-version"
import tailwindcss from "@tailwindcss/vite"

const ReactCompilerConfig = {}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          ["babel-plugin-react-compiler", ReactCompilerConfig],
          "@babel/plugin-proposal-explicit-resource-management",
        ],
      },
    }),
    version(),
    tailwindcss(),
  ],
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
