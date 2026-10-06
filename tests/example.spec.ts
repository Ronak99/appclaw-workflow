import { execFileSync } from 'node:child_process';
import { test, describe } from '@appclaw/runner';
import type { AppClaw } from '@appclaw/core';
import type { Device } from '@appclaw/runner';

// Arrange device state with adb, then let AppClaw act and assert. Resetting via
// adb is instant and deterministic; asking the LLM to "get back to the start"
// is what sends DOM mode in circles.
const adb = (device: Device, ...args: string[]) =>
  execFileSync('adb', ['-s', device.udid, ...args], { encoding: 'utf8' }).trim();

// Settings search runs in its own package, so force-stopping Settings alone
// brings the stale search screen back on the next launch.
const SETTINGS_PACKAGES = ['com.google.android.settings.intelligence', 'com.android.settings'];

async function openFreshSettings(app: AppClaw, device: Device) {
  for (const pkg of SETTINGS_PACKAGES) adb(device, 'shell', 'am', 'force-stop', pkg);
  await app.run('open the Settings app');
  await app.verify('Network & internet');
}

// Go through the power service: writing the low_power setting directly desyncs
// Android's battery-saver state machine and the Settings switch stops working.
const setBatterySaver = (device: Device, on: boolean) =>
  adb(device, 'shell', 'cmd', 'power', 'set-mode', on ? '1' : '0');

// The mode change lands asynchronously, so poll briefly instead of reading once.
async function waitForBatterySaver(device: Device, on: boolean, timeoutMs = 5000) {
  const deadline = Date.now() + timeoutMs;
  do {
    if (adb(device, 'shell', 'settings', 'get', 'global', 'low_power') === (on ? '1' : '0')) return true;
    await new Promise((r) => setTimeout(r, 250));
  } while (Date.now() < deadline);
  return false;
}

// Naming the field makes AppClaw wait for it; a bare "type X" fires before the
// search screen has finished opening.
async function searchSettings(app: AppClaw, query: string) {
  await app.run('tap Search Settings');
  await app.run(`type "${query}" into Search settings`);
}

describe('Example', () => {
  // Each app.run() is one deterministic step. DOM-mode verify() is a plain text
  // search, so assert on text that is really on screen ("Battery Saver"), not a
  // description of it ("search results are visible").
  test('search Settings for Battery', async ({ app, device }) => {
    await openFreshSettings(app, device);
    await searchSettings(app, 'Battery');
    await app.verify('Battery Saver');
  });

  // "turn on X" is a plain tap, so it would switch Battery Saver OFF if it was
  // already on. Force a known OFF state first, then check the real setting.
  // The switch is toggled inline in the search results: on this emulator image
  // the Battery Saver page itself crashes Settings.
  test('turn on battery saver', async ({ app, device }) => {
    setBatterySaver(device, false);
    try {
      await openFreshSettings(app, device);
      await searchSettings(app, 'Battery Saver');
      // Results re-render after typing; tapping mid-refresh hits a stale position.
      await app.run('wait until screen is stable');
      await app.run('tap the switch to the right of Use Battery Saver');

      if (!(await waitForBatterySaver(device, true))) throw new Error('Battery Saver did not turn on');
    } finally {
      setBatterySaver(device, false);
    }
  });

  // Restrict a test to one platform — skipped (not failed) on the other OS:
  // test.android('android-only feature', async ({ app }) => { … });
  // test.ios('ios-only feature', async ({ app }) => { … });
});
