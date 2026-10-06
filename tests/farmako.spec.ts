import { execFileSync } from 'node:child_process';
import { test, describe } from '@appclaw/runner';
import type { Device } from '@appclaw/runner';

const PACKAGE = 'in.farmako.users_app_mv2';

const adb = (device: Device, ...args: string[]) =>
  execFileSync('adb', ['-s', device.udid, ...args], { encoding: 'utf8' }).trim();

describe('Farmako', () => {
  test('log in with a phone number', async ({ app, device }) => {
    adb(device, 'shell', 'am', 'force-stop', PACKAGE);
    await app.run(`open ${PACKAGE}`);
    // The splash has no text to wait on; the login form appearing means it's gone.
    await app.run('wait until "Enter Phone Number" is visible');
    // "+91" is a fixed prefix and the field keeps only 10 digits: typing
    // "+911234567890" leaves "9112345678", a different number.
    const login = await app.runFlow('tests/flows/farmako-login.yaml');
    if (!login.success) throw new Error(`Login flow failed at step ${login.failedStep}: ${login.error}`);
    await app.verify('OTP Verification');
    await app.verify('OTP to +91-1234567890');
  });
});
