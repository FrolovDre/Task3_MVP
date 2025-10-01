// Code.gs — Google Apps Script backend for the Web App endpoint.
/**
 * doPost handler for the Event Logger.
 * Accepts either application/x-www-form-urlencoded (recommended) via e.parameter
 * or application/json via e.postData.contents. Appends rows to a "logs" sheet.
 *
 * DEPLOYMENT:
 * - Deploy → New Deployment → Type "Web app"
 * - Execute as: Me
 * - Who has access: Anyone
 * - Use the latest deployment URL ending with /exec and paste it in the app.
 */
function doPost(e) {
  try {
    var params = {};
    if (e && e.parameter && Object.keys(e.parameter).length) {
      // x-www-form-urlencoded path (no CORS preflight for static sites)
      params = e.parameter;
    } else if (e && e.postData && e.postData.contents) {
      // JSON body fallback
      try { params = JSON.parse(e.postData.contents) || {}; } catch (_) { params = {}; }
    }

    var event = String(params.event || "").toLowerCase();
    var variant = String(params.variant || "");
    var userId = String(params.userId || "");
    var tsMs = Number(params.ts || Date.now());
    var metaStr = typeof params.meta === "string" ? params.meta : JSON.stringify(params.meta || {});

    var tsIso = new Date(tsMs).toISOString();

    var ss = SpreadsheetApp.getActive();
    var sheet = ss.getSheetByName("logs") || ss.insertSheet("logs");
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(["ts_iso", "event", "variant", "userId", "meta"]);
    }
    sheet.appendRow([tsIso, event, variant, userId, metaStr]);

    return ContentService
      .createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
