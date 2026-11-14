import { defineConfig } from "vite";
import { agentHudVite } from "@agent-hud/vite-config";

// The scene preview (#349, ADR-0001): the sidebar's real components on the
// fixed workplace scenes. `pnpm --filter @agent-hud/hud run scenes`, then 127.0.0.1:1480.
const shared = agentHudVite();
export default defineConfig({
  ...shared,
  root: __dirname,
  server: { host: "127.0.0.1", port: 1480, strictPort: true },
});
