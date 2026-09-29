import { test, describe } from '@appclaw/runner';

describe('Example', () => {
  // Each test gets a fresh `app` on a leased device. Describe what you want in
  // plain English — AppClaw drives the device for you.
  test('the Settings app opens', async ({ app }) => {
    await app.run('open the Settings app');
    await app.verify('Network & internet is visible');

    // Drive it further (uncomment + adapt to your app):
    // await app.run('tap the Search field');
    // await app.run('type hello world');
    // await app.verify('search results are visible');
  });

  // app.run() is one step, resolved by pattern first. app.runGoal() hands a
  // multi-step goal to the LLM agent (gpt-4o-mini) — this confirms your API
  // key works end to end.
  test('agent opens Battery settings', async ({ app }) => {
    await app.run('open the Settings app');
    const result = await app.runGoal('open the Battery page in Settings');
    if (!result.success) throw new Error(`Agent failed: ${result.reason}`);
    await app.verify('Battery usage is visible');
  });

  // Restrict a test to one platform — skipped (not failed) on the other OS:
  // test.android('android-only feature', async ({ app }) => { … });
  // test.ios('ios-only feature', async ({ app }) => { … });
});
