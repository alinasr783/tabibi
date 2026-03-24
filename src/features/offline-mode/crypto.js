const KEK_ID_KEY = "tabibi_kek_id"
const DEK_BUNDLE_KEY = "tabibi_dek_bundle"

async function getSubtle() {
  return crypto && crypto.subtle ? crypto.subtle : null
}

function toBytes(s) {
  return new TextEncoder().encode(s)
}

function fromBytes(b) {
  return new TextDecoder().decode(b)
}

function b64e(buf) {
  let binary = ""
  const bytes = new Uint8Array(buf)
  const len = bytes.byteLength
  for (let i = 0; i < len; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function b64d(s) {
  const binary = atob(s)
  const len = binary.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer
}

async function deriveKeyFromPin(pin, salt) {
  const subtle = await getSubtle()
  const baseKey = await subtle.importKey("raw", toBytes(pin), "PBKDF2", false, ["deriveKey"])
  return subtle.deriveKey(
    { name: "PBKDF2", salt: toBytes(salt), iterations: 100000, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["wrapKey", "unwrapKey"]
  )
}

async function generateDek() {
  const subtle = await getSubtle()
  return subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

export async function ensureDekWithPin(pin) {
  const subtle = await getSubtle()
  const salt = "tabibi"
  const kek = await deriveKeyFromPin(pin, salt)
  const existing = localStorage.getItem(DEK_BUNDLE_KEY)
  if (existing) return true
  const dek = await generateDek()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const wrapped = await subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv })
  const bundle = JSON.stringify({ iv: b64e(iv), wrapped: b64e(wrapped) })
  localStorage.setItem(DEK_BUNDLE_KEY, bundle)
  localStorage.setItem(KEK_ID_KEY, "pin")
  return true
}

async function loadDekWithPin(pin) {
  const subtle = await getSubtle()
  const bundleText = localStorage.getItem(DEK_BUNDLE_KEY)
  if (!bundleText) return null
  const bundle = JSON.parse(bundleText)
  const kek = await deriveKeyFromPin(pin, "tabibi")
  const iv = new Uint8Array(b64d(bundle.iv))
  const wrapped = b64d(bundle.wrapped)
  return subtle.unwrapKey("raw", wrapped, kek, { name: "AES-GCM", iv }, { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"])
}

export async function encryptJson(json, pin) {
  const subtle = await getSubtle()
  const dek = await loadDekWithPin(pin)
  if (!dek) return null
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const data = toBytes(JSON.stringify(json))
  const enc = await subtle.encrypt({ name: "AES-GCM", iv }, dek, data)
  return { __enc: true, iv: b64e(iv), data: b64e(enc) }
}

export async function decryptJson(encObj, pin) {
  if (!encObj || !encObj.__enc) return encObj
  const subtle = await getSubtle()
  const dek = await loadDekWithPin(pin)
  if (!dek) return null
  const iv = new Uint8Array(b64d(encObj.iv))
  const ct = b64d(encObj.data)
  const pt = await subtle.decrypt({ name: "AES-GCM", iv }, dek, ct)
  return JSON.parse(fromBytes(new Uint8Array(pt)))
}

export function isBiometricsAvailable() {
  return !!(window.PublicKeyCredential && navigator.credentials)
}

export async function tryBiometricGate() {
  if (!isBiometricsAvailable()) return false
  try {
    const createSupported = PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable
      ? await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
      : false
    if (!createSupported) return false
    return true
  } catch {
    return false
  }
}
