const DEVICE_KEY = "tabibi_device_id"
const SEQ_KEY = "tabibi_device_seq"

function makeUuid() {
  const s = []
  const hex = "0123456789abcdef"
  for (let i = 0; i < 36; i++) s[i] = hex[Math.floor(Math.random() * 16)]
  s[14] = "4"
  s[19] = hex[(parseInt(s[19], 16) & 0x3) | 0x8]
  s[8] = s[13] = s[18] = s[23] = "-"
  return s.join("")
}

export function getDeviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = makeUuid()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return "unknown"
  }
}

export function getNextSeq() {
  try {
    const v = Number(localStorage.getItem(SEQ_KEY) || "0")
    const n = Number.isFinite(v) ? v + 1 : 1
    localStorage.setItem(SEQ_KEY, String(n))
    return n
  } catch {
    return Date.now()
  }
}

export function getNowHlc(previous) {
  const now = Date.now()
  const last = previous && previous.t ? previous.t : 0
  const lastCtr = previous && previous.c ? previous.c : 0
  if (now > last) {
    return { t: now, c: 0 }
  }
  return { t: last, c: lastCtr + 1 }
}

export function encodeHlc(hlc) {
  return `${hlc.t}-${hlc.c}`
}

export function decodeHlc(s) {
  if (!s) return { t: 0, c: 0 }
  const parts = String(s).split("-")
  return { t: Number(parts[0] || 0), c: Number(parts[1] || 0) }
}

export function makeIdempotencyKey({ deviceId, seq, entityType, entityId, tempId }) {
  const raw = `${deviceId}|${seq}|${entityType}|${entityId || ""}|${tempId || ""}`
  let h = 0
  for (let i = 0; i < raw.length; i++) {
    h = (h << 5) - h + raw.charCodeAt(i)
    h |= 0
  }
  return `${raw}|${Math.abs(h)}`
}
