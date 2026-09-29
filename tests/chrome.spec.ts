import { test, describe } from '@appclaw/runner';

describe('Chrome', () => {
  test('search for Lionel Messi', async ({ app }) => {
    await app.run('open the Chrome app');
    // First launch on a fresh emulator shows welcome / sign-in / notification
    // prompts — the agent is told to get past them before searching.
    const result = await app.runGoal(
      'In Chrome, dismiss any welcome, sign-in or notification prompts ' +
        '(choose "Use without an account" / "No thanks" where offered), then ' +
        'search for "Lionel Messi" and wait for the search results to load',
    );
    if (!result.success) throw new Error(`Agent failed: ${result.reason}`);
    await app.verify('Lionel Messi is visible');
  });
});
