/* =====================================================================
   ads.js - ruang iklan StoreBlox (aman, bisa dimatikan dari config.js)
   Mode (APP_CONFIG.ADS.mode):
     "off"     : tidak ada iklan sama sekali (bawaan)
     "demo"    : ruang iklan contoh + hitung mundur, TANPA skrip luar (untuk lihat tampilan)
     "adsense" : banner Google AdSense (butuh akun AdSense yang sudah disetujui)
     "iframe"  : banner jaringan iklan lain, kodenya ditempel di adframe.html dan dijalankan
                 di bingkai terkurung (tidak bisa memindah halaman, tidak bisa baca data login)
   Aturan keras yang dijaga kode ini:
     - iklan hanya untuk tamu (belum login) bila onlyGuest = true
     - tidak pernah di halaman masuk, daftar, OTP, pesanan, bayar, chat, profil, jual
     - iklan layar penuh hanya saat kembali dari detail produk ke daftar, ada hitung mundur,
       tombol tutup jelas, dan jarak minimal antar iklan (capMinutes)
     - tidak ada pengalihan paksa dari kode ini
   ===================================================================== */
(function () {
  'use strict';
  var C = (window.APP_CONFIG && window.APP_CONFIG.ADS) || {};
  var MODE = C.mode || 'off';
  var ONLY_GUEST = C.onlyGuest !== false;
  var SECONDS = Math.max(2, Math.min(5, Number(C.countdown) || 3));
  var CAP_MS = Math.max(1, Number(C.capMinutes) || 8) * 60000;
  var FRAME_H = Math.max(50, Math.min(600, Number(C.bannerHeight) || 100));
  var NATIVE_H = Math.max(100, Math.min(600, Number(C.nativeHeight) || 260));
  var FULL = (C.mode === 'demo') || (C.mode === 'iframe' && C.interstitial === true);
  var MAIL = C.reportEmail || (window.APP_CONFIG && window.APP_CONFIG.CONTACT_EMAIL) || '';
  var CLIENT_OK = /^ca-pub-\d{10,20}$/.test(C.client || '');
  var SLOT_OK = /^\d{5,20}$/.test(C.bannerSlot || '');
  var timer = null, overlay = null, external = false;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) { e.className = cls; }
    if (text != null) { e.textContent = text; }
    return e;
  }
  function active(loggedIn) {
    if (MODE === 'off') { return false; }
    if (MODE === 'adsense' && !(CLIENT_OK && SLOT_OK)) { return false; }
    if (ONLY_GUEST && loggedIn) { return false; }
    return true;
  }
  function loadAdsense() {
    if (external) { return; }
    external = true;
    var s = document.createElement('script');
    s.async = true;
    s.crossOrigin = 'anonymous';
    s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(C.client);
    document.head.appendChild(s);
  }

  /* Kartu "Iklan yang aman" (tampil hanya bila iklan aktif) */
  function notice(loggedIn) {
    if (!active(loggedIn)) { return null; }
    var box = el('div', 'adnote');
    var ic = el('div', 'adnote-ic');
    ic.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3L19.5 6V11.5C19.5 16 16.4 19.6 12 21C7.6 19.6 4.5 16 4.5 11.5V6Z"/><path d="M8.8 12.2L11 14.4L15.4 9.8"/></svg>';
    var tx = el('div', 'adnote-tx');
    tx.appendChild(el('b', '', 'Iklan yang aman'));
    var p = 'Iklan di StoreBlox hanya bisa ditutup dan tidak pernah memaksa kamu pindah halaman. Tidak ada iklan di halaman beli, bayar, dan chat. Kategori judi dan dewasa kami blokir di pengaturan iklan.';
    if (ONLY_GUEST) { p += ' Pengguna yang sudah masuk tidak diganggu iklan.'; }
    tx.appendChild(el('div', 'small', p));
    if (MAIL) {
      var r = el('div', 'small');
      r.appendChild(document.createTextNode('Menemukan iklan tidak pantas? Laporkan ke '));
      var a = el('a', '', MAIL); a.href = 'mailto:' + MAIL; r.appendChild(a);
      tx.appendChild(r);
    }
    box.appendChild(ic); box.appendChild(tx);
    return box;
  }

  /* Bingkai terkurung: tanpa allow-same-origin dan tanpa allow-top-navigation,
     jadi isi iklan tidak bisa membaca data login dan tidak bisa memindahkan halaman utama. */
  function frame(height, native) {
    var f = document.createElement('iframe');
    f.src = native ? 'adframe-native.html' : 'adframe.html';
    /* Terkurung penuh bila sandboxSameOrigin=false (bawaan, paling aman, tapi jaringan iklan tidak
       melihat alamat webmu). true = alamat webmu terlihat, tapi pengurungnya jauh lebih lemah. */
    f.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox' + (C.sandboxSameOrigin === true ? ' allow-same-origin' : ''));
    f.setAttribute('loading', 'lazy');
    f.setAttribute('title', 'Iklan');
    f.className = 'adframe';
    f.style.height = height + 'px';
    return f;
  }

  /* Banner kecil di bawah daftar (beranda dan jelajahi) */
  function banner(loggedIn, kind) {
    if (!active(loggedIn)) { return null; }
    var box = el('div', 'adbox');
    box.appendChild(el('div', 'adlabel', 'Iklan'));
    if (MODE === 'demo') {
      box.appendChild(el('div', 'adbody', 'Ruang iklan (contoh)'));
      return box;
    }
    if (MODE === 'iframe') {
      box.appendChild(kind === 'native' ? frame(NATIVE_H, true) : frame(FRAME_H, false));
      return box;
    }
    loadAdsense();
    var ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.setAttribute('data-ad-client', C.client);
    ins.setAttribute('data-ad-slot', C.bannerSlot);
    ins.setAttribute('data-ad-format', 'auto');
    ins.setAttribute('data-full-width-responsive', 'true');
    box.appendChild(ins);
    try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) { /* abaikan */ }
    return box;
  }

  function cancel() {
    if (timer) { clearInterval(timer); timer = null; }
    if (overlay && overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
    overlay = null;
  }

  /* Iklan layar penuh dengan hitung mundur. Hanya mode demo. */
  function interstitial(from, to, loggedIn) {
    if (!FULL || !active(loggedIn)) { return; }
    if (from !== 'product' || (to !== 'home' && to !== 'browse')) { return; }
    var now = Date.now(), last = 0;
    try { last = Number(sessionStorage.getItem('sbx_ad_last') || 0); } catch (e) { last = 0; }
    if (now - last < CAP_MS) { return; }
    try { sessionStorage.setItem('sbx_ad_last', String(now)); } catch (e) { /* abaikan */ }
    cancel();
    overlay = el('div', 'adov');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    var card = el('div', 'adcard');
    var small = el('div', 'adcd-t', 'Iklan akan muncul dalam');
    var num = el('div', 'adcd-n', String(SECONDS));
    var skip = el('button', 'adskip', 'Lewati');
    skip.type = 'button';
    skip.addEventListener('click', cancel);
    card.appendChild(small); card.appendChild(num); card.appendChild(skip);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    var left = SECONDS;
    timer = setInterval(function () {
      left -= 1;
      if (left > 0) { num.textContent = String(left); return; }
      num.textContent = '0';
      clearInterval(timer); timer = null;
      setTimeout(showAd, 350);
    }, 1000);
  }
  function showAd() {
    if (!overlay) { return; }
    overlay.innerHTML = '';
    var card = el('div', 'adcard wide');
    var head = el('div', 'adhead');
    head.appendChild(el('span', 'adlabel', 'Iklan'));
    var x = el('button', 'adx', '\u2715');
    x.type = 'button';
    x.setAttribute('aria-label', 'Tutup iklan');
    x.addEventListener('click', cancel);
    head.appendChild(x);
    card.appendChild(head);
    if (MODE === 'iframe') { card.appendChild(frame(280)); }
    else { card.appendChild(el('div', 'adbody tall', 'Ruang iklan layar penuh (contoh)')); }
    card.appendChild(el('div', 'small muted', 'Ketuk \u2715 untuk menutup.'));
    overlay.appendChild(card);
  }

  window.SBX_ADS = {
    notice: notice, banner: banner, interstitial: interstitial, cancel: cancel,
    external: function () { return external; },
    mode: MODE
  };

  /* Halaman utama (index.html): isi kartu "Iklan yang aman" bila ada tempatnya */
  document.addEventListener('DOMContentLoaded', function () {
    var host = document.getElementById('adsNotice');
    if (!host) { return; }
    var n = notice(false);
    if (n) { host.appendChild(n); }
  });
})();
