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
     - Anti-Adblock: domain khusus Adsterra di kode iklan + layar pemblokir (adblockWall) bila iklan gagal dimuat
   ===================================================================== */
(function () {
  'use strict';
  var C = (window.APP_CONFIG && window.APP_CONFIG.ADS) || {};
  var MODE = C.mode || 'off';
  var ONLY_GUEST = (C.onlyGuest !== false) || (C.sandboxSameOrigin === true);
  var SECONDS = Math.max(2, Math.min(5, Number(C.countdown) || 3));
  var CAP_MS = Math.max(1, Number(C.capMinutes) || 8) * 60000;
  var FRAME_H = Math.max(50, Math.min(600, Number(C.bannerHeight) || 100));
  var NATIVE_H = Math.max(100, Math.min(600, Number(C.nativeHeight) || 260));
  var FULL = (C.mode === 'demo') || (C.mode === 'iframe' && C.interstitial === true);
  var MAIL = C.reportEmail || (window.APP_CONFIG && window.APP_CONFIG.CONTACT_EMAIL) || '';
  var CLIENT_OK = /^ca-pub-\d{10,20}$/.test(C.client || '');
  var SLOT_OK = /^\d{5,20}$/.test(C.bannerSlot || '');
  var timer = null, overlay = null, external = false, frames = [];

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
    var p = 'Iklan di StoreBlox dipasang di tempat yang tidak mengganggu dan tidak ada di halaman beli, bayar, dan chat. Kami meminta jaringan iklan menyaring kategori judi dan dewasa, tetapi tidak ada saringan yang sempurna.';
    if (ONLY_GUEST) { p += ' Pengguna yang sudah masuk tidak diganggu iklan.'; }
    tx.appendChild(el('div', 'small', p));
    if (MAIL) {
      var r = el('div', 'small');
      r.appendChild(document.createTextNode('Menemukan iklan yang tidak pantas? Laporkan ke '));
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
    f.setAttribute('title', 'Iklan');
    f.className = 'adframe';
    f.style.height = height + 'px';
    frames.push(f);
    return f;
  }

  /* Sembunyikan kotak iklan yang tetap kosong (tidak terisi/diblokir) supaya tidak ada ruang kosong.
     Hanya bisa memeriksa isi bingkai bila sandboxSameOrigin=true; bila tidak bisa, kotak dibiarkan. */
  function collapseIfEmpty(box, f) {
    var tries = 0;
    var t = setInterval(function () {
      tries += 1;
      var filled = null;
      try {
        var d = f.contentDocument;
        if (!d || !d.body) { filled = null; }
        else {
          filled = !!d.body.querySelector('iframe,img,a,video,ins,canvas,svg');
          if (!filled) {
            var cs = d.body.querySelectorAll('div[id^="container-"]');
            for (var i = 0; i < cs.length; i++) { if (cs[i].children.length || cs[i].textContent.trim()) { filled = true; } }
          }
        }
      } catch (e) { clearInterval(t); return; }
      if (filled === true) { box.style.display = ''; clearInterval(t); return; }
      if (tries >= 6) { clearInterval(t); if (filled === false) { box.style.display = 'none'; } }
    }, 2500);
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
      var fr = kind === 'native' ? frame(NATIVE_H, true) : frame(FRAME_H, false);
      box.appendChild(fr);
      collapseIfEmpty(box, fr);
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

  /* ---- Layar pemblokir iklan (hanya tamu, hanya bila iklan sungguhan aktif) ----
     Tiga sinyal, semuanya harus dari bingkai iklan kita sendiri:
       1) skrip iklan GAGAL dimuat (error jaringan) -> pemblokir lewat jaringan (Vivo, Chrome, DNS)
       2) skrip iklan berhasil dimuat -> pemblokir tidak aktif, layar tidak pernah muncul
       3) umpan elemen disembunyikan -> pemblokir yang menyembunyikan elemen
     Iklan kosong karena "tidak ada iklan" (no fill) TIDAK dianggap pemblokir. */
  var WALL_ON = (C.adblockWall === true) && (MODE === 'iframe' || MODE === 'adsense');
  var wallEl = null, baitBlocked = null, adFail = false, adOk = false;
  var lastLogged = false, lastRoute = '';
  var AUTH_ROUTES = { login: 1, signup: 1, forgot: 1, otp: 1, newpass: 1 };
  function isBot() { return /bot|crawl|spider|slurp|googlebot|bingbot|lighthouse|headless/i.test(navigator.userAgent || ''); }
  function detect(cb) {
    if (baitBlocked !== null) { cb(); return; }
    var bait = document.createElement('div');
    bait.className = 'adsbox ad-banner adsbygoogle pub_300x250 textads banner-ads';
    bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:12px;height:12px;';
    bait.innerHTML = '&nbsp;';
    document.body.appendChild(bait);
    setTimeout(function () {
      var cs = window.getComputedStyle ? window.getComputedStyle(bait) : null;
      var hidden = !bait.offsetHeight || !bait.offsetWidth || (cs && (cs.display === 'none' || cs.visibility === 'hidden'));
      if (bait.parentNode) { bait.parentNode.removeChild(bait); }
      baitBlocked = !!hidden;
      cb();
    }, 350);
  }
  function blockedNow() { return baitBlocked === true || (adFail && !adOk); }
  function hideWall() { if (wallEl && wallEl.parentNode) { wallEl.parentNode.removeChild(wallEl); } wallEl = null; }
  function showWall() {
    if (wallEl) { return; }
    wallEl = el('div', 'adwall');
    wallEl.setAttribute('role', 'alertdialog');
    wallEl.setAttribute('aria-modal', 'true');
    var card = el('div', 'adwall-card');
    card.appendChild(el('h2', '', 'Ad blocker detected'));
    card.appendChild(el('p', '', 'StoreBlox is free to browse and is supported by ads. Please turn off your ad blocker for this site, then reload the page to continue.'));
    card.appendChild(el('hr', 'adwall-hr'));
    card.appendChild(el('h3', '', 'Pemblokir iklan terdeteksi'));
    card.appendChild(el('p', '', 'StoreBlox gratis dan didukung iklan. Mohon matikan pemblokir iklan untuk situs ini, lalu muat ulang halaman untuk melanjutkan.'));
    var b = el('button', 'adwall-btn', 'Saya sudah mematikannya / Reload');
    b.type = 'button';
    b.addEventListener('click', function () { location.reload(); });
    card.appendChild(b);
    wallEl.appendChild(card);
    document.body.appendChild(wallEl);
  }
  function evaluateWall() {
    if (!WALL_ON || isBot()) { return; }
    if (lastLogged || AUTH_ROUTES[lastRoute]) { hideWall(); return; }
    if (blockedNow()) { showWall(); } else { hideWall(); }
  }
  /* Dipanggil setiap pindah halaman. Tamu di halaman biasa saja; login/daftar tidak dikunci. */
  function wall(loggedIn, route) {
    lastLogged = !!loggedIn; lastRoute = route || '';
    if (!WALL_ON || isBot()) { return; }
    if (lastLogged || AUTH_ROUTES[lastRoute]) { hideWall(); return; }
    detect(evaluateWall);
  }
  /* Kabar dari bingkai iklan (adframe.html / adframe-native.html) */
  window.addEventListener('message', function (ev) {
    var d = ev.data;
    if (!d || typeof d !== 'object' || !d.sbxad) { return; }
    var ours = false;
    for (var i = 0; i < frames.length; i++) { if (frames[i].contentWindow === ev.source) { ours = true; break; } }
    if (!ours) { return; }
    if (d.sbxad === 'adfail') { adFail = true; }
    else if (d.sbxad === 'adok') { adOk = true; }
    else { return; }
    evaluateWall();
  });

  window.SBX_ADS = {
    wall: wall,
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
