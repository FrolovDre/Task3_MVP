// app.js — all logic (ready to deploy). No deps. Vanilla JS.

/**
 * Return a stable pseudo user id from localStorage ("uid"), generating if missing.
 * Uses crypto.getRandomValues for reasonably unique 128-bit id, base36.
 * @returns {string} uid
 */
function getUid() {
  let uid = localStorage.getItem("uid");
  if (uid && uid.length > 0) return uid;
  const bytes = new Uint8Array(16);
  (self.crypto || window.crypto).getRandomValues(bytes);
  uid = [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
  uid = parseInt(uid.slice(0, 15), 16).toString(36) + "-" + parseInt(uid.slice(15), 16).toString(36);
  localStorage.setItem("uid", uid);
  return uid;
}

/**
 * Read the saved GAS Web App URL from localStorage ("gas_url").
 * @returns {string|null}
 */
function getSavedGasUrl() {
  return localStorage.getItem("gas_url");
}

/**
 * Validate the GAS Web App URL (must be HTTPS and end with /exec).
 * @param {string} url
 * @returns {boolean}
 */
function isValidGasUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.pathname.endsWith("/exec");
  } catch {
    return false;
  }
}

/**
 * Set short status text with style.
 * @param {string} msg
 * @param {"ok"|"err"|"info"} [type="info"]
 */
function setStatus(msg, type = "info") {
  const el = document.getElementById("status");
  el.className = type === "ok" ? "ok" : type === "err" ? "err" : "";
  el.textContent = msg;
}

/**
 * Persist URL from input to localStorage and hydrate UI.
 */
function saveUrl() {
  const inp = /** @type {HTMLInputElement} */ (document.getElementById("gasUrl"));
  const url = inp.value.trim();
  if (!url) return setStatus("Missing Web App URL", "err");
  if (!isValidGasUrl(url)) return setStatus("Invalid URL (must end with /exec)", "err");
  localStorage.setItem("gas_url", url);
  setStatus("Saved", "ok");
}

/**
 * Send a log entry to GAS using a CORS “simple request”.
 * Uses application/x-www-form-urlencoded via URLSearchParams without headers.
 * @param {{event:string, variant?:string, meta?:Record<string,any>}} payload
 * @returns {Promise<void>}
 */
async function sendLogSimple(payload) {
  const gasUrl = getSavedGasUrl();
  if (!gasUrl) { setStatus("Missing Web App URL", "err"); return; }
  if (!isValidGasUrl(gasUrl)) { setStatus("Invalid URL", "err"); return; }

  const body = new URLSearchParams();
  body.set("event", String(payload.event || "").toLowerCase());
  body.set("variant", String(payload.variant || ""));
  body.set("userId", getUid());
  body.set("ts", Date.now().toString());
  body.set("meta", JSON.stringify(payload.meta || {}));

  try {
    // IMPORTANT: Do not set any headers → stays a “simple request”, avoids preflight.
    const res = await fetch(gasUrl, { method: "POST", body });
    if (!res.ok) {
      setStatus(`HTTP ${res.status}`, "err");
      return;
    }
    setStatus("Logged", "ok");
  } catch (err) {
    setStatus("Network error", "err");
  }
}

/** Wire UI once DOM is ready. */
document.addEventListener("DOMContentLoaded", () => {
  // Hydrate saved URL
  const saved = getSavedGasUrl();
  if (saved) document.getElementById("gasUrl").value = saved;

  // Save button
  document.getElementById("saveUrl").addEventListener("click", saveUrl);

  // Event buttons
  const baseMeta = () => ({ page: location.pathname, ua: navigator.userAgent });

  document.getElementById("ctaA").addEventListener("click", () => {
    sendLogSimple({ event: "cta_click", variant: "A", meta: baseMeta() });
  });
  document.getElementById("ctaB").addEventListener("click", () => {
    sendLogSimple({ event: "cta_click", variant: "B", meta: baseMeta() });
  });
  document.getElementById("heartbeat").addEventListener("click", () => {
    sendLogSimple({ event: "heartbeat", variant: "", meta: baseMeta() });
  });

  // Generate uid early (no-op if exists)
  getUid();
});
