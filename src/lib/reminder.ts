// "Not now, remind me at 7pm" — browser side. Web push where the device
// supports it; an "add to my calendar" file (.ics) everywhere, as the
// fallback (iPhones only allow web push once StudyAce is on the home screen).

/** The next 7pm on this device's clock: today if it's before 6:55pm, else tomorrow. */
export function next7pm(now = new Date()): Date {
  const at = new Date(now);
  at.setHours(19, 0, 0, 0);
  if (at.getTime() - now.getTime() < 5 * 60_000) at.setDate(at.getDate() + 1);
  return at;
}

const icsDate = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const icsText = (s: string) => s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");

/** A one-off 15-minute calendar event with a reminder at the start. */
export function reminderIcs(opts: { at: Date; url: string; uid: string; now?: Date }): string {
  const end = new Date(opts.at.getTime() + 15 * 60_000);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//StudyAce//Reminder//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${opts.uid}@studyace.co`,
    `DTSTAMP:${icsDate(opts.now ?? new Date())}`,
    `DTSTART:${icsDate(opts.at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText("StudyAce grade check (15 min)")}`,
    `DESCRIPTION:${icsText(`Tap to start: ${opts.url}`)}`,
    `URL:${opts.url}`,
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    `DESCRIPTION:${icsText("Time for your StudyAce grade check")}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ].join("\r\n");
}

export function downloadIcs(ics: string, filename = "studyace-7pm.ics") {
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Can this browser get a push right now (without installing anything)? */
export function pushSupported(): boolean {
  try {
    return !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  } catch {
    return false;
  }
}

/** Ask permission and subscribe. null = not supported, declined, or no service worker. */
export async function subscribeToPush(): Promise<PushSubscriptionJSON | null> {
  if (!pushSupported()) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return null;
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return null;
    const sub =
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!) }));
    return sub.toJSON();
  } catch {
    return null;
  }
}
