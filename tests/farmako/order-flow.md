# Farmako order flow: step by step

Deduced frame by frame from [`farmako-screen.mp4`](./farmako-screen.mp4) (77.5 s, sampled every 0.5 s).
Timestamps (`t=`) are positions in that video. On-screen text is quoted exactly as rendered, including
capitalisation and currency symbols; use it for `verify` and `tap` targets.

The flow runs from a cold launch to the **Track your order** screen, which is the success condition.

## At a glance

| # | Screen | Action | Value / target | Leaves at |
|---|---|---|---|---|
| 1 | Android home | Tap the Farmako icon | package `in.farmako.users_app_mv2` | t=1.5 |
| 2 | Splash | Wait (≈8.5 s) | ends when the login form appears | t=10.0 |
| 3 | Login | Type phone number | `1234567890` (prefix `+91` is fixed) | — |
| 4 | Login | Tap | `Proceed` | t=18.0 |
| 5 | OTP Verification | Type OTP | `123456` | t=28.5 |
| 6 | Home | Tap | `Order Now` | t=32.5 |
| 7 | Store | Tap `+` on the medicine card | `Dolo-500 Tablet` (₹16.96) | — |
| 8 | Store | Tap | `View Cart` | t=37.5 |
| 9 | Checkout | Tap | `Choose delivery address to continue` | t=41.5 |
| 10 | Select Location sheet | Tap saved address | `Work` | t=43.5 |
| 11 | Checkout | Tap | `Pay Now` | t=56.5 |
| 12 | Payment methods | Select | `Axis Bank` | — |
| 13 | Payment methods | Tap | `Pay now` | t=61.5 |
| 14 | Juspay simulator | Choose transaction state | `CHARGED` | — |
| 15 | Juspay simulator | Tap | `Submit` | t=69.0 |
| 16 | Payment processing | Wait | until `Order confirmed!` | t=73.0 |
| 17 | Track your order | **Verify success** | `Track your order`, `Arriving in 14 mins` | end |

## Preconditions (as seen in the video)

- **Build:** the development build (red "DEVELOPMENT" ribbon, top-right), version `v9.9.9+40500`.
- **Session:** logged out at launch, so the app opens on the login form.
- **Test account `+91 1234567890`:**
  - OTP `123456` is accepted.
  - Contact name on checkout: `Ronak`.
  - Saved addresses `Work` and `Hh`.
  - Fitcoin balance ≥ 68 (the wallet is auto-applied).
  - A previous order exists, which affects steps 6, 7 and 17.
- **Payments:** they go through the Juspay **sandbox** simulator, so no real money moves.

---

## 1. Launch the app — t=0.0 → 1.5

- **Screen:** Android launcher (Tue, Sep 29).
- **Action:** tap the Farmako icon, the 4th icon in the dock (next to Chrome).
- **In a test:** `open in.farmako.users_app_mv2`, after force-stopping it for a clean start.

## 2. Splash — t=1.5 → 10.0 (≈8.5 s)

| t | What's on screen |
|---|---|
| 1.5 – 6.0 | Black screen, Farmako logo (3×3 dots/bars) centred |
| 6.0 – 9.5 | Logo shrinks; the `farmako` wordmark animates in; `v9.9.9+40500` at the bottom |
| 10.0 | Login form appears |

- **Wait signal:** the splash has no text to wait on besides the version label. Wait for the login form instead: `Enter Phone Number` (the field's hint) or `Proceed`.
- **Timeout:** allow at least 15 s.

## 3. Enter the phone number — t=10.0 → 14.5

**Login screen:**
- Header: `Skip` (top-right).
- Tagline: `India's 30 Minute medicine delivery app`.
- Card `Log in or sign up`, containing a fixed `+91` prefix and a field with hint `Enter Phone Number`.
- Button: `Proceed`.
- Footer: `By continuing, you agree to our Terms of service & Privacy policy`.

**What happens:**

| t | Event |
|---|---|
| 11.0 | Field tapped; keyboard opens (floating keyboard toolbar on the left) |
| 12.0 – 14.5 | `1234567890` typed digit by digit (`12` → `1234` → `123456` → `12345678` → `1234567890`) |
| 14.5 | `Proceed` turns from grey (disabled) to blue (enabled), exactly when the 10th digit is entered |

- **Value:** `1234567890`. Do **not** type `+911234567890`: the field drops the `+` and keeps only 10 digits, which leaves `9112345678`.
- **In a test:** already automated in [`../farmako.spec.ts`](../farmako.spec.ts) and [`../flows/farmako-login.yaml`](../flows/farmako-login.yaml). The field can only be targeted by `hint`, so it has to be typed via a YAML flow.

## 4. Tap Proceed — t=15.0 → 18.0

| t | Event |
|---|---|
| 15.0 | `Proceed` tapped |
| 15.5 – 17.5 | The button shows a `…` loading state |
| 18.0 | OTP screen |

- **In a test:** `tap` with selector `accessibilityId: "^Proceed\b"` (regex). The accessible label is `Proceed, Press to proceed to the next step.`.

## 5. Enter the OTP — t=18.0 → 28.5

**OTP Verification screen:**
- Header: back arrow, `OTP Verification`, and `Skip`.
- `We've sent an OTP to +91-1234567890` appears at t=19.5, above the OTP box.
- `Enter OTP`, with a countdown `Resend OTP in 30s` that counts down.
- Six single-digit boxes.
- Button: `Proceed`.

**What happens:**

| t | Event |
|---|---|
| 18.0 – 19.0 | Keyboard opens; the first box is focused |
| 19.5 – 20.5 | `1 2 3 4 5 6` entered |
| 20.5 | Button switches to `…` |
| 20.5 – 28.0 | Verification loading (≈7.5 s) |
| 28.5 | Home screen |

- **OTP:** `123456`.
- **Unclear from the video:** whether the OTP auto-submits on the 6th digit or `Proceed` was tapped. The pointer hovers over `Proceed`, but no tap ripple is visible. A test should tap `Proceed` only if it is still enabled after typing.
- **Success signal:** home screen text `Order Now`. Allow a timeout of ≥ 15 s.
- **Automation note:** the OTP boxes most likely expose only hints, like the phone field (verified earlier: `Enter OTP … OTP input field, Enter your OTP here.`). Plan for a YAML `type` with a `hint` selector.

## 6. Home → Order Now — t=28.5 → 32.5

**Home screen:**

| Area | Content |
|---|---|
| Top bar | Location `7, Gurugram, Haryana, 122003 ▾`, profile avatar |
| Search | `Search` with a rotating placeholder: `"Cough Syrup"`, `"Multi-Vitamin"`, `"Sunscreen"` |
| Hero card (green) | `Medicine Delivery` / `in 30 minutes`, which updates to `in 12 minutes` by t=29.5; button **`Order Now`** |
| Side card (pink) | `Health Assistant` |
| Referral card | `Benefits worth ₹70 for both`, `Get coins worth ₹70` |
| Section | `Know your medicines` |
| Previous order card | `Order placed 29 Sep, 04:38PM`, `Ssd, Vi-John Tower, Gurugram`, **`Track order`** (from an earlier order) |
| Bottom tabs | `Home`, `Chat`, `Activity` |

- **Action:** tap `Order Now` at t=31.5.
- **Caution:** the `Track order` button here belongs to a **previous** order. Never use it as the success signal.

## 7. Store → add Dolo-500 with the + button — t=32.5 → 35.0

**Store screen:**

| Area | Content |
|---|---|
| Header (green) | Back arrow, `12 minutes delivery`, `to 7, Gurugram, Haryana, 122003` |
| Search | `Search "Paracetamol"` (rotating placeholder) |
| Prescription banner | `Add prescription and our pharmacist will assist you!`, `Upload` |
| Section `Recent orders` | Horizontal product cards (below) |
| Section `Categories` | `Skin Care`, `Supplements`, `Eye Care` |
| Bottom floating bar | `Order received.` / `Your order is being packed!`, `Track Order` (the previous order again) |

**Product cards under `Recent orders`:**

| Card | Name | Pack | Price | Control |
|---|---|---|---|---|
| 1st | **`Dolo-500 Tablet`** | `1 Strip of 15 Tablet` | `₹16.96` | blue circular **`+`** |
| 2nd | `Ahaglow Advanced Skin Rejuvenating Fa…` | `1 Tube of 100 Gm` | `₹565.00` | blue circular `+` |

**What happens:**

| t | Event |
|---|---|
| 33.5 – 34.5 | The `+` button on the **Dolo-500 Tablet** card is tapped (bottom-right of that card, right of `₹16.96`) |
| 35.0 | The `+` becomes a quantity stepper `− 1 +` |
| 35.0 | The bottom bar changes from the "Order received" banner to **`1 item`** + **`View Cart`** |

- **Selected medicine:** `Dolo-500 Tablet`, quantity 1, chosen via the **`+` button** on its card (not by opening the product page).
- **Success signal for this step:** `1 item` and `View Cart` are visible.
- **Robustness notes:**
  - Dolo-500 appears here only because it is in this account's **Recent orders**. On a fresh account it won't be there, so searching for `Dolo-500` is safer for a test.
  - The `+` is an icon with no text. Target it relative to the card, e.g. the `+` to the right of `₹16.96` or below `Dolo-500 Tablet`, or with a structured selector. Dump the screen first to see what Flutter exposes.

## 8. View Cart — t=36.0 → 37.5

- **Action:** tap `View Cart` in the bottom bar (tap ripple visible at t=36.5).
- **Result:** Checkout opens at t=37.5.

## 9. Checkout → choose the address — t=37.5 → 41.5

**Checkout screen (from top to bottom):**

| Area | Content |
|---|---|
| Header | Back arrow, **`Checkout`**, `ID #1309` (order-specific), chat/support pill |
| Savings banner | `You saved ₹68 with this order` (appears at t=39.0) |
| Prescription | `Don't have a doctor's prescription? ▾` |
| Delivery | `12 minute delivery`, `1 item`, `+ Add more items` |
| `Your medicines` | `Dolo-500 Tablet`, `1 Strip of 15 Tablet`, stepper `− 1 +`, price `₹14.9` |
| Wallet | `Fitcoin Wallet`, `You can redeem upto 50% of the order value`, toggle, `Available 9.9Cr` |
| Bill | `Item Total ₹14.95`, `Shipping Charge ₹35.00`, `Small Cart Fee ₹85.05`, `Fitcoin wallet discount -₹67.50`, **`Grand Total ₹67.50`** |
| Contact | `Ronak , +911234567890 ▾` |
| Link | `Cancellation policy` |
| Bottom CTA | **`Choose delivery address to continue`** |

**What happens:**

| t | Event |
|---|---|
| 37.5 | Checkout opens; Fitcoin toggle off (`0`); bill still loading |
| 39.0 | Fitcoin auto-applies without a tap: toggle on, `68` coins, `You saved ₹68 with this order` |
| 39.5 – 41.0 | `Choose delivery address to continue` tapped |
| 41.5 | Select Location bottom sheet opens |

- **Wait signal:** `Grand Total` is visible before tapping. The bill loads a moment after the screen appears.

## 10. Select Location → Work — t=41.5 → 43.5

**`Select Location` sheet:**
- A close `✕` at the top-right.
- Search box: `Search for area, street name...`.
- `Use your current location` / `7, Gurugram, Haryana, 122003`.
- `Add new address`.
- **`Your saved addresses`**:
  - **`Work`**: `Ssd, Vi-John Tower, Gurugram, 122016`, `6.8 km`, `⋮` menu.
  - `Hh`: `Indian public canteen, Connaught Place, New Delhi, 110001`, `25.1 km`.

**What happens:**

| t | Event |
|---|---|
| 42.0 – 42.5 | **`Work`** tapped (on the title/address text, not the `⋮` menu) |
| 43.0 | `Work` shows a green `Selected` badge; the sheet slides down |
| 43.5 | Checkout is back, with `Work Ssd, Vi-John Tower, Gurugram, 122016 ▾` at the top |

## 11. Pay Now — t=43.5 → 56.5

| t | Event |
|---|---|
| 43.5 – 44.0 | Bottom bar `1 Item ₹67.50` with a spinner in the button; `View all promos and offers` appears in the page |
| 44.5 | Button becomes **`Pay Now`** (capital N), enabled/blue |
| 46.0 | `Pay Now` tapped |
| 46.5 – 55.5 | Whole screen dimmed, button spinner (≈10 s); delivery text updates to `14 minute delivery` |
| 56.5 | Payment methods screen |

- **Wait signal:** `Payment methods`. Allow a timeout of ≥ 20 s, since this was the longest wait in the video.

## 12. Payment methods → Axis Bank — t=56.5 → 58.5

**Payment methods screen:**
- Top strip: **`Remaining Time : 03:00`**. This is a countdown, so the payment must be completed within 3 minutes.
- Header: back arrow and `Payment methods`.
- `Delivering to your location`.
- **`Preferred payment method`**: **`Axis Bank`** with a radio button on the right. A `Setting up →` chip is briefly visible.
- `Cards`: `Cards ›`.
- `Wallets`: `Wallet ›`.
- `Netbanking`: `HDFC`.
- Bottom: `Total amount ₹67.5` and **`Pay now`** (lowercase n), disabled/grey.

**What happens:**

| t | Event |
|---|---|
| 58.0 | The radio next to **`Axis Bank`** is tapped (tap ripple on the radio) |
| 58.5 | The radio is filled; `Pay now` turns blue (enabled) |

## 13. Pay now — t=59.5 → 61.5

| t | Event |
|---|---|
| 59.5 | **`Pay now`** tapped |
| 60.0 | Button shows `Processing...` |
| 60.5 | Blank white screen (Juspay loading) |
| 61.0 | `JUSPAY Safe` / `Processing your payment` |
| 61.5 | Juspay simulator page |

## 14 – 15. Juspay simulator → CHARGED → Submit — t=61.5 → 69.0

**Simulator page** (white web page with a blue `Farmako ⚡` header):
- `Choose the statuses you want to simulate`.
- `Transaction id:farmako-1790680266834-1309-1`, `Order id: 1790680266834-1309`, `Currency: INR`, `Amount: 67.5` (IDs vary per order).
- **`Transaction State`**: dropdown showing `Select Options ⌄`.
- **`Submit`**: disabled (pale blue) until a state is chosen.
- `Secured by JUSPAY`.

**What happens:**

| t | Event |
|---|---|
| 62.5 | `Select Options` dropdown tapped (it highlights) |
| 63.0 | Options list opens: `PENDING_VBV`, `AUTHORIZING`, `CHARGED` (the list is scrollable) |
| 63.5 | **`CHARGED`** selected; the dropdown now reads `CHARGED`, and `Submit` turns solid blue |
| 65.0 | **`Submit`** tapped |
| 65.5 – 68.5 | `✓ Status captured successfully`, `Transaction State CHARGED` |
| 69.0 | Returns to the app |

- **Charged state:** confirmed by `Status captured successfully` together with `Transaction State CHARGED`.
- **Automation notes:**
  - This page is a **web page** (a WebView or Custom Tab), not Flutter, so its accessibility tree will differ from the rest of the app. Dump it before writing selectors.
  - `CHARGED` is the last item in a scrollable list. Scroll inside the list if it isn't visible.

## 16. Payment processing → Order confirmed — t=69.0 → 73.0

| t | Event |
|---|---|
| 69.0 | White `Processing your payment` (with `Remaining Time : 02:47` strip) |
| 69.5 – 70.5 | Dark screen: spinner, **`Payment processing`**, `Please wait while we process your payment.` |
| 71.0 – 72.5 | Box illustration with a green tick, **`Order confirmed!`**, `Your order will be on the way soon.` |
| 73.0 | Track your order |

- **Wait signal:** `Order confirmed!`. It's only visible for ≈2 s before navigating away, so wait for it with a short poll interval, or skip straight to step 17's check.

## 17. Track your order: success — t=73.0 → 77.5

| t | Event |
|---|---|
| 73.0 – 74.5 | Header: back arrow and **`Track your order`**; the body is loading skeletons |
| 75.0 | Content loads (see below) |
| 76.0 – 77.0 | The map loads (`Google`), showing a route from the store pin to the home pin |

**Content once loaded (t=75.0):**
- `We'll assign a delivery partner once your order is packed`.
- Blue status card: `Packing your order` and **`Arriving in 14 mins`**.
- `Learn about delivery partner safety ›`.
- `OTP  8 5 6 0`: the delivery OTP, which varies per order.

**Successful order means all of these are visible:**
1. `Track your order` (header).
2. `Packing your order`.
3. `Arriving in` (the minute count varies: 12–14 in this video).

**Watch out:**
- At **t=77.0** a red **`Internal Server Error`** banner appears at the top of the tracking screen. The order itself had already been confirmed, and the tracking content stays on screen. Decide whether a test should **fail** on this banner (recommended: flag it, e.g. `verify` it is *not* visible) or ignore it.
- Don't treat `Track order` / `Track Order` on the home or store screens as success. Those belong to the previous order (steps 6–7).

---

## Values used

| What | Value |
|---|---|
| Package | `in.farmako.users_app_mv2` |
| Phone number (typed) | `1234567890` (shown as `+91-1234567890`) |
| OTP | `123456` |
| Home CTA | `Order Now` |
| Medicine | `Dolo-500 Tablet`, `1 Strip of 15 Tablet`, qty 1, ₹16.96 (₹14.9 at checkout) |
| Add-to-cart control | Blue `+` on the product card → becomes `− 1 +` |
| Cart CTA | `View Cart` (bar shows `1 item`) |
| Address CTA | `Choose delivery address to continue` |
| Delivery address | Saved address `Work`: `Ssd, Vi-John Tower, Gurugram, 122016` |
| Checkout CTA | `Pay Now` |
| Grand total | `₹67.50` (after `-₹67.50` Fitcoin discount) |
| Payment method | `Axis Bank` (under `Preferred payment method`) |
| Payment CTA | `Pay now` |
| Juspay state | `CHARGED`, then `Submit` |
| Confirmation | `Order confirmed!` |
| Success screen | `Track your order` + `Packing your order` + `Arriving in … mins` |

## Timing budget (for test timeouts)

| Wait | Observed | Suggested timeout |
|---|---|---|
| Splash → login | 8.5 s | 15 s |
| Proceed → OTP screen | 3 s | 10 s |
| OTP → home | 7.5 s | 15 s |
| Pay Now → payment methods | 10 s | 20 s |
| Pay now → Juspay simulator | 2 s | 10 s |
| Submit → Order confirmed | 6 s | 15 s |
| Order confirmed → tracking content | 4 s | 10 s |
| Payment window (`Remaining Time`) | 3:00 | hard limit |

The whole flow took ≈77 s with a human driving it, so set the per-test timeout to at least 180 s.

## Notes for turning this into AppClaw tests

These come from automating the login screen and are **untested** for the later screens:

- **Flutter labels.** The app exposes most text as accessibility descriptions (`content-desc`), not `text`. `verify` and label taps work against these, but some buttons carry extended labels, like `Proceed, Press to proceed to the next step.`. Match those by prefix (YAML selector `accessibilityId` + `match: regex`).
- **Input fields.** Fields expose only a `hint`, so type into them with a YAML flow `type: { value, into: { hint } }`.
- **Icon-only buttons.** Controls like the `+` need a relative or structured selector.
- **Dump each screen first.** Before writing a step, run `adb exec-out uiautomator dump /dev/tty` on it. This only works when no Appium session is running.
- **Sandbox side effects.** Every full run creates a real (sandbox) order on the dev backend. After a run, the home and store screens will show that order's `Track order` banner.
