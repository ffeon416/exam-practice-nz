// Cross-platform haptic feedback for touch UI.
//
//  • Android / Chrome: real Web Vibration API — navigator.vibrate(ms). We scale
//    the pulse DURATION with intensity so "more" feels stronger.
//  • iOS Safari: there is NO web vibration API. The only way to make an iPhone
//    tap from the web is a quirk (iOS 17.4+): a native <input type="checkbox"
//    switch> plays the system haptic when it's toggled. We keep one hidden
//    switch in the DOM and .click() the INPUT to fire a tick. This mirrors the
//    widely-used `use-haptic` approach (click the input, label display:none),
//    which is the most reliable variant in practice.
//
// iOS caveats worth knowing (all outside our control, all silent no-ops here):
//   - needs iOS 17.4+,
//   - Settings → Sounds & Haptics → System Haptics must be ON,
//   - Low Power Mode DISABLES the switch haptic,
//   - must be called inside a user gesture (an input's onChange counts).

let hapticInput: HTMLInputElement | null = null;

/** Create the hidden iOS haptic switch once, up front, so the first tick isn't
 *  swallowed by lazy creation. Safe to call repeatedly; no-op after the first. */
export function initHaptics(): void {
  if (typeof document === "undefined" || hapticInput) return;
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", ""); // iOS-only native switch → haptic on toggle
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    hapticInput = input;
  } catch {
    /* DOM unavailable — ignore */
  }
}

/**
 * Fire a haptic pulse. `intensity` is 0..1 (clamped). On Android it scales the
 * vibration length; on iOS it fires a fixed system tick (intensity ignored).
 * Silent no-op on unsupported devices.
 */
export function haptic(intensity = 1): void {
  const t = Math.max(0, Math.min(1, intensity));
  try {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && typeof nav.vibrate === "function") {
      nav.vibrate(Math.round(8 + t * 27)); // 8ms (light) → 35ms (firm)
      return;
    }
  } catch {
    // fall through to the iOS path
  }
  try {
    if (!hapticInput) initHaptics();
    hapticInput?.click();
  } catch {
    /* unsupported — no-op */
  }
}

/** True if this device can produce any haptic feedback we know how to trigger. */
export function hapticsSupported(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") return true;
  return typeof window !== "undefined" && "ontouchstart" in window;
}
