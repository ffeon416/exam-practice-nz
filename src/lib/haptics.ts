// Cross-platform haptic feedback for touch UI.
//
// Two very different worlds:
//  • Android / Chrome: the Web Vibration API works — navigator.vibrate(ms).
//    We scale the buzz DURATION with the caller's intensity so "more" feels
//    stronger.
//  • iOS Safari: navigator.vibrate does NOT exist and there is no web vibration
//    API. The only way to make an iPhone tap from the web is a documented
//    quirk: programmatically toggling a native <input type="checkbox" switch>
//    plays the system haptic (iOS 17.4+). We keep one hidden switch around and
//    .click() its label to fire a tick. Intensity can't be varied on iOS, so
//    callers convey "more" by firing ticks more often (e.g. one per step).
//
// Must be called from within a user-gesture handler (e.g. an input's onChange)
// or the tap won't fire. All paths are wrapped so an unsupported device is a
// silent no-op — never throws.

let iosSwitchLabel: HTMLLabelElement | null = null;

function getIosSwitch(): HTMLLabelElement | null {
  if (typeof document === "undefined") return null;
  if (iosSwitchLabel) return iosSwitchLabel;
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    // Visually gone, non-interactive, out of layout — but still in the DOM so
    // the switch toggle (and its haptic) works.
    label.style.cssText =
      "position:absolute;top:0;left:0;width:0;height:0;overflow:hidden;opacity:0;pointer-events:none;";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", ""); // iOS-only native switch → haptic on toggle
    input.tabIndex = -1;
    label.appendChild(input);
    document.body.appendChild(label);
    iosSwitchLabel = label;
    return label;
  } catch {
    return null;
  }
}

/**
 * Fire a haptic pulse. `intensity` is 0..1 (clamped). On Android it scales the
 * vibration length; on iOS it fires a fixed system tick (intensity ignored).
 */
export function haptic(intensity = 1): void {
  const t = Math.max(0, Math.min(1, intensity));
  try {
    const nav = typeof navigator !== "undefined" ? navigator : undefined;
    if (nav && typeof nav.vibrate === "function") {
      // 8ms (light) → 35ms (firm) as intensity climbs.
      nav.vibrate(Math.round(8 + t * 27));
      return;
    }
  } catch {
    // fall through to the iOS path
  }
  // iOS: no vibrate API — toggle the hidden switch to play a system tap.
  try {
    getIosSwitch()?.click();
  } catch {
    /* unsupported — no-op */
  }
}

/** True if this device can produce any haptic feedback we know how to trigger. */
export function hapticsSupported(): boolean {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") return true;
  // We can't feature-detect the iOS switch haptic reliably, so assume touch
  // Safari might support it. Harmless if it doesn't (no-op).
  return typeof window !== "undefined" && "ontouchstart" in window;
}
