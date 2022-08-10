import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { join, dirname } from "path";
import viteFastify from "fastify-vite";

// https://vitejs.dev/config/
export default defineConfig({
    root: join(dirname(new URL(import.meta.url).pathname), "..", "client"),
    plugins: [react(), viteFastify()],
});
