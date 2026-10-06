import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test, describe } from '@appclaw/runner';
import type { AppClaw } from '@appclaw/core';
import type { Device } from '@appclaw/runner';

// End-to-end order flow, recorded in tests/farmako/order-flow.md:
// log in → add the first "Recent orders" medicine → checkout to the Work
// address → pay with Axis Bank → Juspay sandbox CHARGED → Track your order.
//
// Every run places a new (sandbox) order. It takes 2.5–4 minutes, beyond the
// runner's default 120 s test timeout, so run it with `npm run test:order`.

const PACKAGE = 'in.farmako.users_app_mv2';
const PHONE = '1234567890';
const OTP = '123456';

const adb = (device: Device, ...args: string[]) =>
  execFileSync('adb', ['-s', device.udid, ...args], { encoding: 'utf8' }).trim();

// Flutter exposes some controls only by hint or by a description with extra
// text, which the plain-English `app.run()` forms can't target. Structured
// selectors can, but only through a YAML flow, so write the steps to a temp
// flow file (YAML is a superset of JSON) and run it.
const flowDir = mkdtempSync(join(tmpdir(), 'farmako-flow-'));
let flowCount = 0;
async function runSteps(app: AppClaw, steps: object[]) {
  const file = join(flowDir, `flow-${++flowCount}.yaml`);
  writeFileSync(file, `appId: ${PACKAGE}\n---\n${JSON.stringify(steps, null, 2)}\n`);
  const result = await app.runFlow(file);
  if (!result.success) throw new Error(`Flow step ${result.failedStep} failed: ${result.error}`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const startsWith = (prefix: string) => ({ value: `^${prefix}`, match: 'regex' });

// True if `text` shows up within `seconds`, without failing the test.
async function appears(app: AppClaw, text: string, seconds: number) {
  try {
    await app.run(`wait ${seconds}s until "${text}" is visible`);
    return true;
  } catch {
    return false;
  }
}

// The phone and OTP inputs are unlabelled fields inside a wrapper whose hint
// names them ("phone_input_field", "OTP input field"). The wrapper's hint stays
// put once text is entered; the inner field's own hint doesn't.
const fieldInside = (wrapperHint: string) => ({
  editable: true,
  clickable: true,
  descendantOf: { hint: { value: wrapperHint, match: 'contains' } },
});

// AppClaw's `type` sets the text in one shot, and these Flutter fields
// sometimes keep the cursor at 0 after the first character: "1234567890"
// lands as "2345678901". Real key events via adb don't, so focus the field with
// AppClaw, clear it, type with adb, and check the whole value landed.
async function typeInto(
  app: AppClaw,
  device: Device,
  field: object,
  value: string,
  landed: () => Promise<boolean>,
) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    await runSteps(app, [{ tap: field }]);
    await sleep(500);
    adb(device, 'shell', 'input', 'keyevent', 'KEYCODE_MOVE_END', ...Array(15).fill('KEYCODE_DEL'));
    adb(device, 'shell', 'input', 'text', value);
    if (await landed()) return;
  }
  throw new Error(`"${value}" did not register in the field after 3 attempts`);
}

// Dismiss any modal bottom sheet (e.g. "Refer and get 70₹") by tapping the
// upper half of the screen, outside the sheet. Flutter exposes that dimmed
// area above an open sheet as "Scrim", which is both how we know a sheet is up
// (everything behind it is hidden from accessibility) and what we tap. The
// sheets' ✕ buttons aren't exposed to accessibility, so they can't be targeted.
// A blind coordinate tap isn't used: once the sheet closes it would hit
// whatever is behind it.
async function dismissBottomSheets(app: AppClaw) {
  for (let attempt = 1; attempt <= 3 && (await appears(app, 'Scrim', 2)); attempt++) {
    await app.run('tap Scrim');
    // The scrim lingers while the sheet animates away; wait for it to go
    // before checking again, or a closing sheet looks like a new one.
    await gone(app, 'Scrim', 3);
  }
}

// True if `text` is gone within `seconds`, without failing the test.
async function gone(app: AppClaw, text: string, seconds: number) {
  try {
    await app.run(`wait ${seconds}s until "${text}" is gone`);
    return true;
  } catch {
    return false;
  }
}

// After a fresh login the app may show bottom sheets over the home screen or,
// when it can't resolve the device location, a full-screen "Select Location"
// page. Clear whichever shows up until "Order Now" does.
async function reachHome(app: AppClaw, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await appears(app, 'Your saved addresses', 2)) await app.run('tap Work');
    await dismissBottomSheets(app);
    if (await appears(app, 'Order Now', 3)) return;
  }
  throw new Error('Home screen ("Order Now") did not appear after login');
}

describe('Farmako', () => {
  // A retry would place a second order, so never retry this test.
  test(
    'order the first recent medicine and land on order tracking',
    { retries: 0 },
    async ({ app, device }) => {
      // ── Fresh install state: logged out. Clearing data also revokes runtime
      // permissions, so re-grant the ones the app would otherwise prompt for.
      adb(device, 'shell', 'am', 'force-stop', PACKAGE);
      adb(device, 'shell', 'pm', 'clear', PACKAGE);
      for (const perm of ['ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'POST_NOTIFICATIONS']) {
        adb(device, 'shell', 'pm', 'grant', PACKAGE, `android.permission.${perm}`);
      }

      // ── Launch; the splash has no text, so wait for the login form. The first
      // launch after clearing data can take well over 30 s.
      await app.run(`open ${PACKAGE}`);
      await app.run('wait 90s until "Enter Phone Number" is visible');

      // ── Log in. "+91" is a fixed prefix; the field takes the 10 digits only.
      await typeInto(app, device, fieldInside('phone_input_field'), PHONE, () => appears(app, PHONE, 3));
      await runSteps(app, [{ tap: { accessibilityId: startsWith('Proceed\\b') } }]);
      await app.run('wait 20s until "OTP Verification" is visible');
      // The OTP submits itself after the 6th digit; once it has, the field may
      // already be gone, which also counts as landed.
      await typeInto(
        app,
        device,
        fieldInside('OTP input field'),
        OTP,
        async () => (await appears(app, OTP, 3)) || !(await appears(app, 'OTP input field', 1)),
      );

      // ── Home (clearing any location prompt and bottom sheets). A sheet can
      // also slide up just after "Order Now" appears, so check once more.
      await reachHome(app);
      await dismissBottomSheets(app);
      await app.run('tap Order Now');

      // ── Store: add the first medicine under "Recent orders" with its + button,
      // exposed only as "Add: <product id>".
      await app.run('wait 20s until "Recent orders" is visible');
      await runSteps(app, [{ tap: { accessibilityId: startsWith('Add: '), index: 0 } }]);
      await app.verify('View Cart');
      await app.run('tap View Cart');

      // ── Checkout → saved "Work" address. Skipped when Work was already picked
      // on the post-login location prompt: checkout then shows "Pay Now" directly.
      await app.run('wait 20s until "Checkout" is visible');
      if (await appears(app, 'Choose delivery address to continue', 10)) {
        await app.run('tap Choose delivery address to continue');
        await app.run('wait 10s until "Select Location" is visible');
        await app.run('tap Work');
      }

      // ── Pay Now → payment methods (≈10 s).
      // "Pay Now" shows up while the bill is still recalculating for the new
      // address, and a tap then is ignored, so let the screen settle first and
      // tap again if the payment screen doesn't open.
      await app.run('wait 20s until "Pay Now" is visible');
      await app.run('wait until screen is stable');
      await app.run('tap Pay Now');
      if (!(await appears(app, 'Axis Bank', 30))) {
        await app.run('tap Pay Now');
        await app.run('wait 40s until "Axis Bank" is visible');
      }
      // This screen is Juspay's native SDK. Its "Pay now" label is a plain
      // TextView that ignores taps; the clickable button around it is
      // described as "btn_pay". The payment window is 3 minutes from here.
      await app.run('tap Axis Bank');
      await app.run('wait until screen is stable');
      const payNow = { tap: { accessibilityId: 'btn_pay', clickable: true, index: 0 } };
      await runSteps(app, [payNow]);

      // ── Juspay sandbox simulator (a web page): simulate a CHARGED payment.
      if (!(await appears(app, 'Transaction State', 30))) {
        await runSteps(app, [payNow]);
        await app.run('wait 40s until "Transaction State" is visible');
      }
      await app.run('tap Select Options');
      await app.run('tap CHARGED');
      await app.run('tap Submit');
      await app.run('wait 20s until "Status captured successfully" is visible');

      // ── Success: "Order confirmed!" shows for only ~2 s before tracking opens,
      // so check the tracking screen, which is what a successful order ends on.
      await app.run('wait 60s until "Track your order" is visible');
      await app.run('wait 20s until "Arriving in" is visible');
    },
  );
});
