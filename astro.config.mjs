import { defineConfig } from "astro/config";
import preact from "@astrojs/preact";
import solidJs from "@astrojs/solid-js";
import node from "@astrojs/node";

// https://astro.build/config
export default defineConfig({
  output: "server",
  integrations: [
    preact({
      include: ["**/preact/*"],
    }),
    solidJs({ include: ["**/solid/*"] }),
  ],
  adapter: node({
    mode: "standalone",
  }),
  vite: {
    server: {
      watch: {
        ignored: ["**/*.db*"],
      },
    },
  },
  // just because this is annoying for printing
  devToolbar: {
    enabled: false,
  },
});
