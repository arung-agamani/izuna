import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        tailwindcss(),
        mdx({
            development: false,
        }),
        react({}),
    ],
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
            },
        },
    },
    build: {
        rollupOptions: {
            onwarn(warning, warn) {
                if (warning.code === "SOURCEMAP_ERROR") return;
                if (warning.message.includes("rollup@<4")) return;
                warn(warning);
            },
        },
    },
});
