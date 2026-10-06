# Running AppClaw tests on a spare Android phone over Tailscale

The runner lists whatever `adb devices` shows, so once the phone appears there
over the network, the existing tests run on it unchanged, including the raw
`adb -s <udid>` calls in the specs.

## How it works

```
[Mac or VPS: AppClaw + Appium + adb]  ──Tailscale──▶  [Spare phone: adb over TCP :5555]
                                                         plugged into a charger, on home Wi-Fi
```

The phone runs Tailscale itself, so no Raspberry Pi or other always-on computer
is needed next to it. The Mac and the VPS can both `adb connect` to it. Port
5555 is never exposed to the internet, and adb still requires each computer's
key to be approved on the phone.

## Why a phone rather than a VPS emulator or a rented device

- No Play Store / Google account needed: sideload the APK.
- No Play Integrity problems (emulators fail integrity checks; pharmacy and
  payment apps sometimes enforce them).
- Most VPSes lack `/dev/kvm`; without it an emulator is too slow to be reliable.
- Rented devices (BrowserStack, Sauce Labs, LambdaTest — all supported via
  `CLOUD_PROVIDER` in `.env`) cost a couple of hundred dollars a month per
  parallel session and don't give raw adb access, so the `adb -s` calls in the
  specs would have to be rewritten.
- A real phone with a SIM can receive real SMS OTPs.

## 1. Prepare the phone (one time)

1. **Factory reset** it. Skip the Google account or use a throwaway one. Keep
   nothing personal on it.
2. **Enable Developer options**: Settings → About phone → tap *Build number*
   7 times. Then in Developer options:
   - **USB debugging**: on
   - **Stay awake** (screen on while charging): on
   - **Window / Transition / Animator animation scale**: all off — faster,
     less flaky tests
   - **Automatic system updates**: off, so the phone doesn't reboot on its own
   - **Xiaomi / Redmi / POCO only**: also enable *USB debugging (Security
     settings)* and *Install via USB* — Appium needs them
3. **Screen lock**: None. **Screen timeout**: maximum.
4. **Protect the battery.** The phone will charge 24/7. Enable the charge
   limit: Samsung *Protect battery* (85%) or Pixel *Charging optimization /
   Limit to 80%*. If the phone has no such setting, use a smart plug on a
   timer. A battery held at 100% around the clock can swell.

## 2. Tailscale on the phone

1. Install **Tailscale** (Play Store or sideload) and log into the tailnet.
2. Android Settings → Network → VPN → Tailscale → **Always-on VPN**: on.
3. Settings → Apps → Tailscale → Battery → **Unrestricted**, so the OS doesn't
   kill it.
4. Note the phone's Tailscale IP (`100.x.y.z`) from the app. The Mac (and the
   VPS, if used) must be on the same tailnet.

Without an exit node, Tailscale only routes tailnet traffic; the app's own
traffic goes out normally.

## 3. Switch adb to TCP (needs USB once)

Plug the phone into the Mac, accept the "Allow USB debugging?" prompt, then:

```sh
adb devices                          # should list the phone
adb tcpip 5555                       # restart adbd listening on TCP
# unplug the USB cable
adb connect 100.x.y.z:5555           # phone's Tailscale IP
adb devices                          # shows  100.x.y.z:5555   device
```

Accept the RSA prompt on the phone and tick **Always allow**. Repeat the
`adb connect` from the VPS later if tests will run there — each computer's key
is approved once.

## 4. Install the app and run tests

```sh
adb -s 100.x.y.z:5555 install farmako.apk   # use install-multiple for split APKs
npm run test
```

If an emulator is also running the runner may pick it instead. Stop the
emulator, or pin the phone with `DEVICE_UDID=100.x.y.z:5555` in `.env`.

To get the APK from a phone that already has the app installed:

```sh
adb shell pm path in.farmako.users_app_mv2   # may list several split APKs
adb pull <path> .
```

## Things to know

- **A reboot resets TCP mode** (e.g. after a power cut). USB is needed again
  for `adb tcpip 5555`. On Android 11+ *Developer options → Wireless
  debugging* plus `adb pair` avoids the cable but uses a random port, so plain
  `tcpip` is simpler. A rooted phone can make TCP mode permanent with
  `setprop persist.adb.tcp.port 5555`.
- **Reconnecting**: if the connection drops (Wi-Fi blip, sleep), run
  `adb connect 100.x.y.z:5555` again. Worth doing at the start of every test
  run.
- **Latency**: screenshots travel over the home upload link. DOM mode
  (`AGENT_MODE=dom`) is much lighter than vision mode. If runs from the VPS
  are slow, tune the MJPEG screenshot settings in `.env`
  (`APPIUM_MJPEG_SERVER_PORT`, `APPIUM_MJPEG_SCREENSHOT_URL`).
- **Security**: never expose port 5555 outside the tailnet. adb over TCP is
  authenticated by RSA key, but the tailnet is the real boundary.
