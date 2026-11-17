/* Mengisi bagian unduh di index.html dari config.js */
(function () {
  'use strict';
  var C = window.APP_CONFIG || {};
  function $(s) { return document.querySelector(s); }
  var btn = $('#apkBtn');
  if (btn) {
    if (C.APK_URL) { btn.setAttribute('href', C.APK_URL); btn.removeAttribute('aria-disabled'); }
    else { btn.textContent = 'Segera hadir'; btn.className = 'btn btn-gray'; btn.removeAttribute('href'); }
  }
  var v = $('#apkVer'); if (v) { v.textContent = 'Versi ' + (C.APK_VERSION || '-'); }
  var sz = $('#apkSize'); if (sz) { sz.textContent = C.APK_SIZE ? 'Ukuran ' + C.APK_SIZE : ''; }
  var hs = $('#apkHash');
  if (hs) { hs.textContent = C.APK_SHA256 || 'Belum tersedia (akan dicantumkan saat file APK dirilis).'; }
  var cp = $('#copyHash');
  if (cp) {
    if (!C.APK_SHA256) { cp.style.display = 'none'; }
    cp.addEventListener('click', function () {
      var t = C.APK_SHA256 || '';
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(function () { cp.textContent = 'Tersalin ✔'; });
      } else { cp.textContent = 'Salin manual'; }
    });
  }
  var up = $('#upd');
  if (up) { up.textContent = new Date(document.lastModified).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); }
  var y = $('#yr'); if (y) { y.textContent = String(new Date().getFullYear()); }
  var mail = $('#contactMail');
  if (mail && C.CONTACT_EMAIL) { mail.textContent = C.CONTACT_EMAIL; mail.setAttribute('href', 'mailto:' + C.CONTACT_EMAIL); }
})();
