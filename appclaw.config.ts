import { defineConfig, TestContext } from '@appclaw/runner';

/**
 * AppClaw Test Runner config. Every lifecycle hook is included below as a
 * starting point — keep what you need, delete the rest. Hooks run in this order:
 *
 *   globalSetup            once per run (control plane) → returns ctx.state
 *     deviceSetup          once per device, before its first test
 *       beforeEach         around every test
 *         <your test>
 *       afterEach          around every test
 *   globalTeardown         once per run, at the very end
 */
export default defineConfig({
  testDir: 'tests',
  concurrency: 1, // run on the emulator only (see deviceSetup guard below)
  retries: 1,
  video: true, // record each test; shown in the HTML report
  node: { local: true }, // spawn a local appium-mcp SSE server

  // ── AppClaw options forwarded to every test's session ──
  platform: 'android',
  provider: (process.env.LLM_PROVIDER as any) ?? 'openai',
  apiKey: process.env.LLM_API_KEY,
  model: process.env.LLM_MODEL ?? 'gpt-4o-mini',
  agentMode: 'dom', // 'vision' also needs GEMINI_API_KEY for screenshot locating
  // capabilitiesFile: './tests/caps.json', // pin appium caps (build path, udid…)
  // maxSteps: 40,
  // waitTimeout: 15000,

  // ── run-scoped: once per run, in the control plane ──
  globalSetup: async ({ pool }) => {
    console.log(`[globalSetup] ${pool.length} device(s) available`);
    // Provision shared backend state, seed data, etc. The returned object is
    // injected into every test as `ctx.state`.
    return { startedAt: Date.now() };
  },
  globalTeardown: async ({ state }) => {
    console.log(`[globalTeardown] run took ${Date.now() - state.startedAt}ms`);
  },

  // ── device-scoped: once per device, before its first test ──
  deviceSetup: async (app, ctx: TestContext) => {
    console.log(`[deviceSetup] preparing ${ctx.device.name}`);
    // The runner leases any adb device; refuse anything that isn't an emulator
    // so tests never drive a physical phone that happens to be plugged in.
    if (!ctx.device.udid.startsWith('emulator-')) {
      throw new Error(`Refusing to run on non-emulator device ${ctx.device.udid}`);
    }
    // e.g. install the build / grant permissions — state persists for the device.
  },

  // ── test-scoped: around every test ──
  beforeEach: async (app, ctx: TestContext) => {
    console.log(`[beforeEach] ${ctx.title} on ${ctx.device.name}`);
  },
  afterEach: async (app, info) => {
    console.log(`[afterEach] ${info.title} → ${info.status} (${info.durationMs}ms)`);
  },
});
