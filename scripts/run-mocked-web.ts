import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { startMockApi } from "../tests/mocks/web-api.js";

const mockApi = await startMockApi();
const nuxtCli = fileURLToPath(new URL("../node_modules/nuxt/bin/nuxt.mjs", import.meta.url));
const webRoot = fileURLToPath(new URL("../apps/web/", import.meta.url));
const web = spawn(process.execPath, [nuxtCli, "dev", "--host", "127.0.0.1", "--port", "3100"], {
  cwd: webRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    MEALMIND_API_BASE_URL: "http://127.0.0.1:3199",
  },
});

let stopping = false;
async function stop(signal?: NodeJS.Signals) {
  if (stopping) return;
  stopping = true;
  if (web.exitCode === null) web.kill(signal ?? "SIGTERM");
  await mockApi.close();
}

process.once("SIGINT", () => { void stop("SIGINT"); });
process.once("SIGTERM", () => { void stop("SIGTERM"); });

web.once("exit", (code) => {
  void stop().finally(() => {
    process.exitCode = code ?? 1;
  });
});
