export function shouldDebugBooking() {
  if (import.meta.env.DEV) return true;
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get("debugBooking") === "1";
  } catch {
    return false;
  }
}

export function dbg(tag, payload) {
  if (!shouldDebugBooking()) return;
  const ts = new Date().toISOString();
  try {
    console.log(`[${ts}] ${tag}`, payload);
  } catch {
    console.log(`[${ts}] ${tag}`);
  }
}
