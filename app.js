/* StoreBlox Web - versi pembeli. Tanpa library, tanpa langkah build. */
(function () {
  'use strict';

  var C = window.APP_CONFIG || {};
  var BASE = C.SUPABASE_URL || '';
  var KEY = C.SUPABASE_KEY || '';
  var IMG = BASE + '/storage/v1/object/public/product-images/';
  var QRIS = BASE + '/storage/v1/object/public/qris/';
  var PSEL = 'id,title,price_idr,price_amount,currency,status,created_at,sales_count,categories(name),' +
    'seller:profiles!seller_id(display_name,role),product_images(path,position)';
  var SORTS = ['Terbaru', 'Termurah', 'Termahal', 'Populer'];
  var SORT_PARAM = ['created_at.desc', 'price_idr.asc', 'price_idr.desc', 'sales_count.desc,created_at.desc'];

  var LABEL = {
    awaiting_mm: 'Menunggu penetapan MM', awaiting_payment: 'Menunggu pembayaran',
    payment_review: 'Pembayaran sedang diperiksa', payment_confirmed: 'Pembayaran terkonfirmasi',
    awaiting_handover: 'Menunggu penyerahan produk', handover_review: 'Penyerahan sedang diperiksa',
    awaiting_confirmation: 'Menunggu konfirmasi pembeli & penjual', dispute: 'Sengketa',
    refund_review: 'Pemeriksaan pengembalian dana', completed: 'Selesai', cancelled: 'Dibatalkan',
    user: 'Pengguna', mm: 'MM', moderator: 'Moderator', admin: 'Admin',
    active: 'Aktif', restricted: 'Dibatasi', suspended: 'Ditangguhkan', banned: 'Diblokir',
    warning: 'Peringatan', restriction: 'Pembatasan', suspend: 'Penangguhan', ban: 'Blokir',
    inactive: 'Nonaktif', removed: 'Dihapus',
    penipuan: 'Dugaan penipuan', pelanggaran_aturan: 'Melanggar aturan',
    konten_tidak_pantas: 'Konten tidak pantas', lainnya: 'Lainnya'
  };
  var ERR = {
    invalid_credentials: 'Email atau password salah.',
    email_not_confirmed: 'Email belum dikonfirmasi. Cek kotak masuk emailmu.',
    user_already_exists: 'Email ini sudah terdaftar.',
    weak_password: 'Password terlalu lemah. Pakai minimal 8 karakter.',
    over_email_send_rate_limit: 'Terlalu banyak email terkirim. Coba lagi beberapa menit lagi.',
    email_address_invalid: 'Alamat email tidak valid.',
    signup_disabled: 'Pendaftaran sedang ditutup.',
    validation_failed: 'Data yang dimasukkan tidak valid.',
    forbidden: 'Kamu tidak punya izin untuk tindakan ini.',
    '42501': 'Akses ditolak oleh aturan keamanan.',
    not_authenticated: 'Silakan masuk dulu.',
    no_profile: 'Profil tidak ditemukan.',
    account_not_active: 'Akunmu sedang dibatasi, ditangguhkan, atau diblokir.',
    product_not_available: 'Produk sudah tidak tersedia.',
    product_not_found: 'Produk tidak ditemukan.',
    product_removed: 'Produk ini sudah dihapus dari katalog.',
    cannot_buy_own: 'Tidak bisa membeli produk sendiri.',
    seller_not_available: 'Penjual sedang tidak bisa menerima pesanan.',
    too_many_open_orders: 'Terlalu banyak pesanan yang belum selesai (maksimal 10).',
    invalid_key: 'Permintaan tidak valid. Coba lagi.',
    order_not_found: 'Data tidak ditemukan.',
    order_final: 'Pesanan ini sudah berakhir dan tidak bisa diubah.',
    invalid_transition: 'Perubahan status ini tidak diizinkan saat ini.',
    empty_message: 'Pesan kosong atau terlalu panjang.',
    too_many_requests: 'Terlalu cepat. Tunggu sebentar.',
    review_not_allowed: 'Ulasan hanya untuk pembeli setelah pesanan selesai.',
    already_reviewed: 'Pesanan ini sudah diberi ulasan.',
    invalid_input: 'Isian tidak valid. Periksa lagi.',
    report_limit: 'Batas laporan harian tercapai.',
    too_many_images: 'Maksimal 10 foto/bukti.',
    proof_required: 'Unggah bukti dulu sebelum lanjut.',
    appeal_exists: 'Kamu sudah punya banding yang sedang ditinjau.',
    user_blocked: 'Tidak bisa membuat pesanan: ada pemblokiran antara kamu dan penjual.',
    account_has_orders: 'Akun tidak bisa dihapus karena punya riwayat pesanan. Hubungi admin.',
    mm_not_assigned: 'MM belum ditetapkan untuk pesanan ini.',
    otp_expired: 'Kode salah atau sudah kedaluwarsa. Minta kode baru.',
    same_password: 'Password baru harus berbeda dari yang lama.',
    otp_cooldown: 'Tunggu 2 menit sebelum meminta kode lagi.',
    otp_daily_limit: 'Batas kirim kode hari ini tercapai (maksimal 7 kali kirim ulang). Coba lagi besok.',
    otp_global_limit: 'Layanan kode sedang penuh. Coba lagi nanti.'
  };

  /* ---------------------------------------------------------------- util */
  function ApiErr(code, msg, key) { this.code = code; this.message = msg; this.key = key || ''; }
  ApiErr.prototype = Object.create(Error.prototype);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function add(el, c) {
    if (c == null || c === false) { return; }
    if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) { add(el, c[i]); } return; }
    el.appendChild(c && c.nodeType ? c : document.createTextNode(String(c)));
  }
  function h(tag, props) {
    var el = document.createElement(tag);
    if (props) {
      for (var k in props) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) { continue; }
        var v = props[k];
        if (v == null || v === false) { continue; }
        if (k === 'class') { el.className = v; }
        else if (k === 'text') { el.textContent = v; }
        else if (k.slice(0, 2) === 'on' && typeof v === 'function') { el.addEventListener(k.slice(2), v); }
        else if (k === 'value') { el.value = v; }
        else { el.setAttribute(k, v === true ? '' : String(v)); }
      }
    }
    for (var i = 2; i < arguments.length; i++) { add(el, arguments[i]); }
    return el;
  }
  function clear(el) { while (el.firstChild) { el.removeChild(el.firstChild); } }
  var nf = null;
  function rp(n) {
    try { nf = nf || new Intl.NumberFormat('id-ID'); return 'Rp' + nf.format(Number(n) || 0); }
    catch (e) { return 'Rp' + (Number(n) || 0); }
  }
  function when(iso) {
    if (!iso) { return ''; }
    var d = new Date(iso);
    if (isNaN(d.getTime())) { return ''; }
    try { return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return d.toISOString(); }
  }
  function lbl(k) { return LABEL[k] || k || ''; }
  function str(o, k) { var v = o && o[k]; return v == null ? '' : String(v); }
  function uuid() {
    if (window.crypto && crypto.randomUUID) { return crypto.randomUUID(); }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function kindOf(status) {
    if (status === 'completed' || status === 'active') { return 'ok'; }
    if (status === 'cancelled' || status === 'removed' || status === 'banned') { return 'danger'; }
    if (status === 'dispute' || status === 'refund_review' || status === 'restricted' || status === 'suspended') { return 'warn'; }
    if (status === 'inactive') { return 'sub'; }
    return 'pri';
  }
  function chip(text, kind) { return h('span', { class: 'chip k-' + (kind || 'pri'), text: text }); }
  function notice(text, kind) { return h('div', { class: 'notice k-' + (kind || 'pri'), text: text }); }
  function secTitle(t) { return h('h2', { class: 'sec', text: t }); }
  function card() { var c = h('div', { class: 'card' }); for (var i = 0; i < arguments.length; i++) { add(c, arguments[i]); } return c; }
  function btn(text, kind, onclick, extra) {
    return h('button', { class: 'btn btn-' + (kind || 'pri') + ' btn-block' + (extra ? ' ' + extra : ''), type: 'button', text: text, onclick: onclick });
  }
  function go(hash) { if (location.hash === hash) { route(); } else { location.hash = hash; } }

  /* ---------------------------------------------------------------- ikon */
  var ICONS = {
    home: '<path d="M3 11L12 3.5L21 11"/><path d="M5.5 9.5V20.5H10V14.5H14V20.5H18.5V9.5"/>',
    search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.3 15.3L20.5 20.5"/>',
    tag: '<path d="M3.5 3.5H12.5L20.5 11.5L11.5 20.5L3.5 12.5Z"/><circle class="f" cx="8" cy="8" r="1.4"/>',
    box: '<path d="M12 2.8L20.2 7.4V16.6L12 21.2L3.8 16.6V7.4Z"/><path d="M3.8 7.4L12 12L20.2 7.4M12 12V21.2"/>',
    user: '<circle cx="12" cy="7.8" r="3.8"/><path d="M4.5 20.5C4.5 16.2 7.8 13.8 12 13.8C16.2 13.8 19.5 16.2 19.5 20.5"/>',
    bell: '<path d="M6 17V10.5A6 6 0 0 1 18 10.5V17L20 18.8H4Z"/><path d="M10 21.3Q12 23 14 21.3"/>',
    back: '<path d="M20 12H5M11 6L5 12L11 18"/>',
    close: '<path d="M5.5 5.5L18.5 18.5M18.5 5.5L5.5 18.5"/>',
    chevron: '<path d="M9 5L16 12L9 19"/>',
    gear: '<circle cx="12" cy="12" r="6.4"/><circle cx="12" cy="12" r="2.5"/><path stroke-width="3.2" d="M20.4 12H22.4M17.9 17.9L19.3 19.3M12 20.4V22.4M6.1 17.9L4.7 19.3M3.6 12H1.6M6.1 6.1L4.7 4.7M12 3.6V1.6M17.9 6.1L19.3 4.7"/>',
    bag: '<path d="M5 8.5H19L20.2 20.5H3.8Z"/><path d="M8.8 10.5V7A3.2 3.2 0 0 1 15.2 7V10.5"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3.8 7L12 13.2L20.2 7"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2.5"/><path d="M8 10.5V8A4 4 0 0 1 16 8V10.5"/><circle class="f" cx="12" cy="15.3" r="1.3"/>',
    eye: '<path d="M2 12C5 6.8 8.3 5.2 12 5.2C15.7 5.2 19 6.8 22 12C19 17.2 15.7 18.8 12 18.8C8.3 18.8 5 17.2 2 12Z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M2 12C5 6.8 8.3 5.2 12 5.2C15.7 5.2 19 6.8 22 12C19 17.2 15.7 18.8 12 18.8C8.3 18.8 5 17.2 2 12Z"/><circle cx="12" cy="12" r="3"/><path d="M4 4.5L20 19.5"/>',
    shield: '<path d="M12 2.8L19.8 5.8V11.8C19.8 16.3 16.5 19.8 12 21.4C7.5 19.8 4.2 16.3 4.2 11.8V5.8Z"/><path d="M8.6 12L11.1 14.5L15.6 9.6"/>',
    check: '<path d="M4.5 12.5L9.8 17.8L19.5 7"/>',
    swap: '<path d="M4 8H19M15.5 4.5L19 8L15.5 11.5"/><path d="M20 16H5M8.5 12.5L5 16L8.5 19.5"/>',
    funnel: '<path d="M3.5 5H20.5L14 12.8V19L10 17V12.8Z"/>',
    coins: '<ellipse cx="12" cy="6.5" rx="7" ry="3"/><path d="M5 6.5V11.5C5 13.2 8.1 14.5 12 14.5C15.9 14.5 19 13.2 19 11.5V6.5"/><path d="M5 11.5V16.5C5 18.2 8.1 19.5 12 19.5C15.9 19.5 19 18.2 19 16.5V11.5"/>',
    inbox: '<path d="M3 13L6.4 5.2H17.6L21 13V18.5H3Z"/><path d="M3 13H8C8.3 15.3 9.8 16.3 12 16.3C14.2 16.3 15.7 15.3 16 13H21"/>',
    sad: '<circle cx="12" cy="12" r="9"/><circle class="f" cx="8.8" cy="10" r="1.2"/><circle class="f" cx="15.2" cy="10" r="1.2"/><path d="M8.3 16.8C9.8 14.6 14.2 14.6 15.7 16.8"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle class="f" cx="8.5" cy="9.5" r="1.6"/><path d="M3.5 17.5L9 12.5L13 16.5L15.8 13.8L20.5 18.5"/>',
    camera: '<rect x="3" y="7" width="18" height="12.5" rx="2.5"/><path d="M8 7L9.6 4.4H14.4L16 7"/><circle cx="12" cy="13.2" r="3.5"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M2.8 20C2.8 16.3 5.4 14.4 9 14.4C12.6 14.4 15.2 16.3 15.2 20"/><circle cx="17" cy="8.8" r="2.6"/><path d="M16.2 14.2C19.2 14.2 21.2 16 21.2 19.4"/>',
    wallet: '<rect x="3" y="6.5" width="18" height="13" rx="3"/><path d="M3 10.5H21"/><circle class="f" cx="16.8" cy="15" r="1.3"/>',
    globe: '<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12H21"/>',
    theme: '<circle cx="12" cy="12" r="8.5"/><path class="f" d="M12 3.5A8.5 8.5 0 0 1 12 20.5Z"/>',
    doc: '<path d="M6 3.5H14L19 8.5V20.5H6Z"/><path d="M14 3.5V8.5H19M9 13H16M9 16.8H16"/>',
    logout: '<path d="M10 4H5V20H10M9.5 12H20M16.2 8.2L20 12L16.2 15.8"/>',
    edit: '<path d="M4 20L5.3 14.8L15.8 4.3L19.7 8.2L9.2 18.7Z"/><path d="M13.6 6.5L17.5 10.4"/>',
    trash: '<path d="M4 7H20M9 7V4H15V7M6 7L7 20.5H17L18 7M10.2 11V16.5M13.8 11V16.5"/>',
    flag: '<path d="M5.5 21V3.5M5.5 4.5H18.5L15.5 9L18.5 13.5H5.5"/>',
    download: '<path d="M12 3.5V15M7 10.5L12 15.5L17 10.5M4.5 19.5H19.5"/>'
  };
  function ico(name) {
    var s = h('span', { class: 'ico' });
    s.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true">' + (ICONS[name] || ICONS.inbox) + '</svg>';
    return s;
  }
  function loader() { return h('div', { class: 'load' }, h('span', { class: 'ldr' }, h('i'), h('i'), h('i'), h('i'))); }

  /* ----------------------------------------------------------- sesi & API */
  var S = { access: '', refresh: '', uid: '', me: null, tampil: '', fcur: '' };
  var refreshing = null;
  function loadSession() {
    try {
      var j = JSON.parse(localStorage.getItem('sbx_session') || 'null');
      if (j && j.access) { S.access = j.access; S.refresh = j.refresh || ''; S.uid = j.uid || ''; }
    } catch (e) { /* abaikan */ }
  }
  function saveSession(j) {
    S.access = j.access_token || '';
    S.refresh = j.refresh_token || '';
    S.uid = (j.user && j.user.id) || S.uid;
    try { localStorage.setItem('sbx_session', JSON.stringify({ access: S.access, refresh: S.refresh, uid: S.uid })); } catch (e) { /* abaikan */ }
  }
  function clearSession() {
    S.access = ''; S.refresh = ''; S.uid = ''; S.me = null;
    try { localStorage.removeItem('sbx_session'); } catch (e) { /* abaikan */ }
  }

  function errText(r) {
    var body = r.body || '';
    var keys = ['otp_cooldown', 'otp_daily_limit', 'otp_global_limit'];
    for (var i = 0; i < keys.length; i++) {
      if (body.indexOf(keys[i]) >= 0) { return { text: ERR[keys[i]], key: keys[i] }; }
    }
    var j = null;
    try { j = JSON.parse(body); } catch (e) { j = null; }
    var msg = '', code = '';
    if (j) {
      msg = String(j.message || j.msg || j.error_description || j.error || '');
      code = String(j.error_code || j.code || '');
    }
    var cand = [msg, code];
    for (var k = 0; k < cand.length; k++) {
      if (cand[k] && ERR[cand[k]]) { return { text: ERR[cand[k]], key: cand[k] }; }
    }
    if (body.indexOf('email_not_confirmed') >= 0) { return { text: ERR.email_not_confirmed, key: 'email_not_confirmed' }; }
    if (r.code === 404) { return { text: 'Data tidak ditemukan.', key: '' }; }
    if (r.code === 401) { return { text: 'Sesi berakhir. Silakan masuk lagi.', key: '' }; }
    if (r.code === 403) { return { text: ERR.forbidden, key: '' }; }
    if (r.code === 429) { return { text: 'Terlalu banyak permintaan. Tunggu sebentar.', key: '' }; }
    if (r.code >= 500) { return { text: 'Server sedang bermasalah. Coba lagi nanti.', key: '' }; }
    return { text: msg && msg.length < 140 ? msg : 'Terjadi kesalahan (' + r.code + ').', key: '' };
  }

  function raw(method, path, body, token, ctype, binary) {
    var headers = { apikey: KEY, Accept: 'application/json' };
    if (token) { headers.Authorization = 'Bearer ' + token; }
    var data;
    if (body != null) {
      headers['Content-Type'] = ctype || 'application/json';
      data = binary ? body : (typeof body === 'string' ? body : JSON.stringify(body));
    }
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 45000) : null;
    return fetch(BASE + path, { method: method, headers: headers, body: data, signal: ctl ? ctl.signal : undefined })
      .then(function (r) {
        return r.text().then(function (t) { if (timer) { clearTimeout(timer); } return { code: r.status, body: t }; });
      }, function () {
        if (timer) { clearTimeout(timer); }
        throw new ApiErr(0, 'Tidak bisa terhubung. Periksa internetmu.');
      });
  }

  function refreshSession(used) {
    if (S.access && S.access !== used) { return Promise.resolve(true); }
    if (!S.refresh) { return Promise.resolve(false); }
    if (refreshing) { return refreshing; }
    refreshing = raw('POST', '/auth/v1/token?grant_type=refresh_token', { refresh_token: S.refresh }, null)
      .then(function (r) {
        refreshing = null;
        if (r.code !== 200) { return false; }
        try { saveSession(JSON.parse(r.body)); return true; } catch (e) { return false; }
      }, function () { refreshing = null; return false; });
    return refreshing;
  }

  function call(method, path, body, ctype, binary) {
    var used = S.access;
    return raw(method, path, body, used, ctype, binary).then(function (r) {
      if (r.code === 401 && used) {
        return refreshSession(used).then(function (ok) {
          if (!ok) { throw new ApiErr(-401, 'Sesi berakhir. Silakan masuk lagi.'); }
          return raw(method, path, body, S.access, ctype, binary);
        });
      }
      return r;
    }).then(function (r) {
      if (r.code < 200 || r.code >= 300) {
        var e = errText(r);
        throw new ApiErr(r.code, e.text, e.key);
      }
      return r.body;
    });
  }
  function parse(t) { if (!t || t === 'null') { return null; } try { return JSON.parse(t); } catch (e) { return null; } }
  function get(path) { return call('GET', '/rest/v1/' + path).then(function (t) { return parse(t) || []; }); }
  function rpc(name, args) { return call('POST', '/rest/v1/rpc/' + name, args || {}).then(parse); }

  /* ---------------------------------------------------------------- tema */
  function applyTheme() {
    var m = 'auto';
    try { m = localStorage.getItem('sbx_theme') || 'auto'; } catch (e) { m = 'auto'; }
    if (m === 'auto') { document.documentElement.removeAttribute('data-theme'); }
    else { document.documentElement.setAttribute('data-theme', m); }
  }
  function nextTheme() {
    var m = 'auto';
    try { m = localStorage.getItem('sbx_theme') || 'auto'; } catch (e) { m = 'auto'; }
    var n = m === 'auto' ? 'light' : (m === 'light' ? 'dark' : 'auto');
    try { localStorage.setItem('sbx_theme', n); } catch (e) { /* abaikan */ }
    applyTheme();
    toast('Tema: ' + (n === 'auto' ? 'Otomatis' : (n === 'light' ? 'Terang' : 'Gelap')));
  }

  /* ------------------------------------------------------------------ UI */
  function toast(msg, kind) {
    var box = $('#toasts');
    if (!box) { return; }
    var t = h('div', { class: 'toast' + (kind ? ' ' + kind : ''), text: msg });
    box.appendChild(t);
    setTimeout(function () { if (t.parentNode) { t.parentNode.removeChild(t); } }, 3600);
  }
  var busyN = 0;
  var busyEl = null;
  function busy(on) {
    if (on) { busyN++; } else if (busyN > 0) { busyN--; }
    if (busyN > 0 && !busyEl) {
      busyEl = h('div', { class: 'scrim' }, h('div', { class: 'modal center', style: 'max-width:140px' }, loader()));
      document.body.appendChild(busyEl);
    } else if (busyN === 0 && busyEl) {
      if (busyEl.parentNode) { busyEl.parentNode.removeChild(busyEl); }
      busyEl = null;
    }
  }
  function run(p) {
    busy(true);
    return p.then(function (v) { busy(false); return v; }, function (e) { busy(false); throw e; });
  }
  function fail(e) {
    if (e && e.code === -401) { clearSession(); toast('Sesi berakhir. Silakan masuk lagi.', 'bad'); go('#/login'); return; }
    toast((e && e.message) || 'Terjadi kesalahan.', 'bad');
  }
  function modal(build, opts) {
    var scrim = h('div', { class: 'scrim' });
    var box = h('div', { class: 'modal' });
    function close() { if (scrim.parentNode) { scrim.parentNode.removeChild(scrim); } document.removeEventListener('keydown', onKey); }
    function onKey(ev) { if (ev.key === 'Escape') { close(); } }
    scrim.addEventListener('click', function (ev) { if (ev.target === scrim) { close(); } });
    document.addEventListener('keydown', onKey);
    build(box, close);
    scrim.appendChild(box);
    document.body.appendChild(scrim);
    return close;
  }
  function confirmBox(text, yes, yesLabel, danger) {
    modal(function (box, close) {
      add(box, h('p', { text: text }));
      add(box, h('div', { class: 'acts' },
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Batal', onclick: close }),
        h('button', { class: 'btn ' + (danger ? 'btn-danger' : 'btn-pri'), type: 'button', text: yesLabel || 'Ya', onclick: function () { close(); yes(); } })));
    });
  }
  function formBox(title, fields, ok, label) {
    modal(function (box, close) {
      add(box, h('h3', { text: title }));
      var inputs = [];
      for (var i = 0; i < fields.length; i++) {
        var f = fields[i];
        var inp = f.multi ? h('textarea', { placeholder: f.label, maxlength: f.max || 500 }) : h('input', { placeholder: f.label, type: f.type || 'text', maxlength: f.max || 100 });
        if (f.value) { inp.value = f.value; }
        inputs.push(inp);
        add(box, h('label', { class: 'field' + (f.multi ? ' ta' : '') }, inp));
      }
      add(box, h('div', { class: 'acts' },
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Batal', onclick: close }),
        h('button', { class: 'btn btn-pri', type: 'button', text: label || 'Kirim', onclick: function () {
          var vals = inputs.map(function (x) { return x.value; });
          if (ok(vals) !== false) { close(); }
        } })));
      if (inputs[0]) { setTimeout(function () { try { inputs[0].focus(); } catch (e) { /* abaikan */ } }, 50); }
    });
  }
  function successAnim(then) {
    var close = modal(function (box) {
      box.className = 'modal center';
      box.innerHTML = '<svg class="success" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45"/><path d="M30 52L45 66L72 36"/></svg>';
    });
    setTimeout(function () { close(); then(); }, 1100);
  }
  function toJpeg(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var w = img.naturalWidth, hh = img.naturalHeight;
        var sc = Math.min(1, maxDim / Math.max(w, hh));
        var cv = document.createElement('canvas');
        cv.width = Math.max(1, Math.round(w * sc));
        cv.height = Math.max(1, Math.round(hh * sc));
        var cx = cv.getContext('2d');
        cx.fillStyle = '#fff';
        cx.fillRect(0, 0, cv.width, cv.height);
        cx.drawImage(img, 0, 0, cv.width, cv.height);
        URL.revokeObjectURL(url);
        cv.toBlob(function (b) { if (b) { resolve(b); } else { reject(new Error('Gambar gagal diproses.')); } }, 'image/jpeg', quality);
      };
      img.onerror = function () { URL.revokeObjectURL(url); reject(new Error('Gambar tidak bisa dibaca.')); };
      img.src = url;
    });
  }
  function pickImage(cb) {
    var inp = h('input', { type: 'file', accept: 'image/*', class: 'hidden' });
    inp.addEventListener('change', function () {
      var f = inp.files && inp.files[0];
      if (inp.parentNode) { inp.parentNode.removeChild(inp); }
      if (!f) { return; }
      if (f.size > 25 * 1024 * 1024) { toast('Gambar terlalu besar.', 'bad'); return; }
      run(toJpeg(f, 1600, 0.82)).then(cb).catch(fail);
    });
    document.body.appendChild(inp);
    inp.click();
  }

  /* --------------------------------------------------------------- kerangka */
  var timers = [];
  function later(fn, ms, repeat) {
    var id = repeat ? setInterval(fn, ms) : setTimeout(fn, ms);
    timers.push({ id: id, repeat: !!repeat });
    return id;
  }
  function stopTimers() {
    for (var i = 0; i < timers.length; i++) { if (timers[i].repeat) { clearInterval(timers[i].id); } else { clearTimeout(timers[i].id); } }
    timers = [];
  }
  var bellTimer = null;
  var root = null;
  var main = null;

  function shell(active) {
    var app = $('#app');
    clear(app);
    var nav = [['home', '#/home', 'Beranda', 'home'], ['browse', '#/browse', 'Jelajahi', 'search'],
      ['sell', '#/sell', 'Jual', 'tag'], ['orders', '#/orders', 'Pesanan', 'box'], ['profile', '#/profile', 'Profil', 'user']];
    if (!S.access) {
      nav = [['home', '#/home', 'Beranda', 'home'], ['browse', '#/browse', 'Jelajahi', 'search'],
        ['sell', '#/sell', 'Jual', 'tag'], ['login', '#/login', 'Masuk', 'user']];
    }
    var bell = !S.access ? h('a', { class: 'btn btn-sm gbtn', href: '#/login', text: 'Masuk' }) : h('button', { class: 'ib', type: 'button', 'aria-label': 'Notifikasi', onclick: function () { go('#/notifs'); } },
      ico('bell'), h('span', { class: 'badge hidden', id: 'bellN', text: '0' }));
    var search = h('form', { class: 'tb-search', onsubmit: function (ev) {
      ev.preventDefault();
      var q = $('input', ev.target).value.trim();
      go('#/browse?q=' + encodeURIComponent(q));
    } }, h('input', { type: 'search', placeholder: 'Cari produk atau jasa...', 'aria-label': 'Cari' }));
    var top = h('header', { class: 'topbar' }, h('div', { class: 'in' },
      h('a', { class: 'brand', href: '#/home' }, h('img', { src: 'icon-192.png', alt: '' }), h('span', { text: 'StoreBlox' })),
      h('nav', { class: 'nav-d' }, nav.map(function (n) {
        return h('a', { href: n[1], class: n[0] === active ? 'on' : '', text: n[2] });
      })),
      search, h('span', { class: 'tb-sp' }), bell));
    main = h('main', { id: 'main' });
    var bn = h('nav', { class: 'bnav' }, nav.map(function (n) {
      return h('a', { href: n[1], class: n[0] === active ? 'on' : '' }, ico(n[3]), h('span', { text: n[2] }));
    }));
    app.appendChild(top);
    app.appendChild(main);
    app.appendChild(bn);
    return main;
  }
  function bare() {
    var app = $('#app');
    clear(app);
    main = h('main', { id: 'main' });
    app.appendChild(main);
    return main;
  }
  function pageTitle(t, backHash) {
    var row = h('div', { style: 'display:flex;align-items:center;gap:10px;margin:4px 0 8px' });
    if (backHash) {
      add(row, h('button', { class: 'ib', type: 'button', style: 'background:var(--soft);color:var(--text)', 'aria-label': 'Kembali', onclick: function () {
        if (history.length > 1 && !backHash) { history.back(); } else { go(backHash); }
      } }, ico('back')));
    }
    add(row, h('h1', { text: t, style: 'font-size:21px' }));
    return row;
  }
  function row(iconName, title, sub, onclick) {
    return h('div', { class: 'row', role: 'button', tabindex: '0', onclick: onclick },
      h('div', { class: 'ic' }, ico(iconName)),
      h('div', { class: 'tx' }, h('b', { text: title }), sub ? h('span', { text: sub }) : null),
      onclick ? h('span', { class: 'ch' }, ico('chevron')) : null);
  }
  function sellBox() {
    return h('div', { class: 'sellbox' },
      h('b', { text: 'Mau berjualan di StoreBlox?' }),
      h('div', { class: 'small', style: 'margin-top:4px', text: 'Menjadi penjual hanya bisa lewat aplikasi resmi StoreBlox (seperti di marketplace populer). Versi web ini khusus untuk membeli.' }),
      h('a', { class: 'btn', href: '#/sell', text: 'Lihat cara jadi penjual' }));
  }
  function imgUrl(p) {
    var a = (p.product_images || []).slice().sort(function (x, y) { return (x.position || 0) - (y.position || 0); });
    var out = [];
    for (var i = 0; i < a.length; i++) { if (a[i].path) { out.push(IMG + a[i].path.split('/').map(encodeURIComponent).join('/')); } }
    return out;
  }
  function priceRow(p) {
    var pr = priceOf(p);
    return h('div', { class: 'prow' }, curBadge(pr.cur),
      h('div', { class: 'pv' }, h('div', { class: 'p', text: pr.main }), pr.sub ? h('div', { class: 'ps', text: pr.sub }) : null));
  }
  function productCard(p) {
    var s = p.seller || {};
    var c = p.categories || {};
    var imgs = imgUrl(p);
    var im = h('div', { class: 'im' }, imgs.length ? h('img', { src: imgs[0], loading: 'lazy', alt: '' }) : ico('bag'));
    var sub = (c.name || '') + (p.sales_count > 0 ? (c.name ? ' · ' : '') + p.sales_count + ' terjual' : '');
    return h('div', { class: 'pcard', role: 'button', tabindex: '0', onclick: function () { go('#/product/' + p.id); } },
      im, h('div', { class: 'bd' },
        h('div', { class: 't', text: str(p, 'title') }),
        priceRow(p),
        h('div', { class: 's', text: (s.display_name || '') + (s.role === 'mm' ? ' • MM' : '') }),
        sub ? h('div', { class: 's', text: sub }) : null));
  }
  function grid(items) { var g = h('div', { class: 'grid' }); items.forEach(function (p) { g.appendChild(productCard(p)); }); return g; }
  function empty(iconName, text) {
    return h('div', { class: 'center muted', style: 'padding:36px 0' },
      h('div', { class: 'ic', style: 'width:80px;height:80px;border-radius:40px;margin:0 auto 10px;background:var(--pri-s);color:var(--pri);display:flex;align-items:center;justify-content:center;font-size:34px' }, ico(iconName)),
      h('div', { text: text }));
  }

  /* ----------------------------------------------------------- bell/badge */
  function pollBell() {
    if (!S.access) { return; }
    get('notifications?select=id&read_at=is.null&limit=50').then(function (a) {
      var el = $('#bellN');
      if (!el) { return; }
      if (a.length > 0) { el.textContent = String(a.length); el.classList.remove('hidden'); }
      else { el.classList.add('hidden'); }
    }, function () { /* diam */ });
  }
  function startBell() {
    pollBell();
    if (!bellTimer) { bellTimer = setInterval(pollBell, 45000); }
  }

  /* ----------------------------------------------------------- AUTH views */
  function authWrap(inner) {
    var m = bare();
    var box = h('div', { class: 'auth' });
    box.appendChild(h('div', { class: 'hero' }, h('img', { src: 'icon-192.png', alt: '' }),
      h('div', null, h('b', { style: 'font-size:25px', text: 'StoreBlox' }), h('div', { class: 'small', text: 'Marketplace produk & jasa Roblox' }))));
    inner(box);
    box.appendChild(h('div', { class: 'pills' },
      h('button', { class: 'pill', type: 'button', onclick: nextTheme }, ico('theme'), h('span', { text: 'Tema' })),
      h('a', { class: 'pill', href: 'index.html' }, ico('home'), h('span', { text: 'Halaman utama' }))));
    m.appendChild(box);
    return box;
  }
  function fieldRow(iconName, inputEl, passToggle) {
    var f = h('label', { class: 'field' }, ico(iconName), inputEl);
    if (passToggle) {
      var shown = false;
      var eye = h('button', { class: 'eye', type: 'button', 'aria-label': 'Tampilkan password' }, ico('eye'));
      eye.addEventListener('click', function () {
        shown = !shown;
        inputEl.type = shown ? 'text' : 'password';
        clear(eye); eye.appendChild(ico(shown ? 'eyeoff' : 'eye'));
      });
      f.appendChild(eye);
    }
    return f;
  }
  function viewLogin() {
    authWrap(function (box) {
      box.appendChild(h('h2', { text: 'Masuk' }));
      var nx = ''; try { nx = sessionStorage.getItem('sbx_next') || ''; } catch (e) { nx = ''; }
      if (nx) { box.appendChild(notice('Masuk dulu untuk melanjutkan. Setelah masuk kamu langsung kembali ke halaman tadi.', 'pri')); }
      var email = h('input', { type: 'email', placeholder: 'Email', autocomplete: 'email', inputmode: 'email' });
      var pass = h('input', { type: 'password', placeholder: 'Password', autocomplete: 'current-password' });
      var err = h('div', { class: 'err' });
      box.appendChild(fieldRow('mail', email));
      box.appendChild(fieldRow('lock', pass, true));
      box.appendChild(err);
      function submit() {
        var e = email.value.trim(), p = pass.value;
        if (!e || !p) { err.textContent = 'Isi email dan password.'; return; }
        err.textContent = '';
        run(raw('POST', '/auth/v1/token?grant_type=password', { email: e, password: p }, null).then(function (r) {
          if (r.code !== 200) { var x = errText(r); throw new ApiErr(r.code, x.text, x.key); }
          saveSession(JSON.parse(r.body));
        })).then(function () { return loadMe(); }).then(function () { afterLogin(); }).catch(function (ex) {
          if (ex && ex.key === 'email_not_confirmed') {
            raw('POST', '/auth/v1/resend', { type: 'signup', email: e }, null).then(function () {
              setOtpEnd(e, true); go('#/otp?e=' + encodeURIComponent(e) + '&t=signup');
            }, function () { go('#/otp?e=' + encodeURIComponent(e) + '&t=signup'); });
            return;
          }
          err.textContent = (ex && ex.message) || 'Gagal masuk.';
        });
      }
      pass.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { submit(); } });
      box.appendChild(btn('Masuk', 'pri', submit));
      box.appendChild(h('div', { class: 'split', style: 'margin-top:10px' },
        h('a', { class: 'btn btn-soft', href: '#/signup', text: 'Daftar akun baru' }),
        h('a', { class: 'btn btn-soft', href: '#/forgot', text: 'Lupa password?', onclick: function () { try { sessionStorage.setItem('sbx_pre', email.value.trim()); } catch (e) { /* abaikan */ } } })));
      box.appendChild(h('a', { class: 'btn btn-ghost btn-block', style: 'margin-top:10px', href: '#/home', onclick: function () { try { sessionStorage.removeItem('sbx_next'); } catch (e) { /* abaikan */ } }, text: 'Lihat-lihat dulu tanpa masuk' }));
      box.appendChild(h('div', { class: 'small muted center', style: 'margin:16px 0 6px', text: 'Apa bedanya?' }));
      box.appendChild(tiersBox('web'));
    });
  }
  function viewSignup() {
    authWrap(function (box) {
      box.appendChild(h('h2', { text: 'Daftar akun' }));
      box.appendChild(h('div', { class: 'small muted', text: 'Jangan pernah membagikan password atau kode OTP ke siapa pun.' }));
      var name = h('input', { type: 'text', placeholder: 'Nama tampilan (2-30 huruf)', maxlength: '30', autocomplete: 'nickname' });
      var email = h('input', { type: 'email', placeholder: 'Email', autocomplete: 'email' });
      var pass = h('input', { type: 'password', placeholder: 'Password (min 8 karakter)', autocomplete: 'new-password' });
      var err = h('div', { class: 'err' });
      box.appendChild(fieldRow('user', name));
      box.appendChild(fieldRow('mail', email));
      box.appendChild(fieldRow('lock', pass, true));
      box.appendChild(err);
      box.appendChild(btn('Buat akun', 'pri', function () {
        var n = name.value.trim(), e = email.value.trim(), p = pass.value;
        if (n.length < 2 || n.length > 30) { err.textContent = 'Nama tampilan harus 2-30 karakter.'; return; }
        if (!e || p.length < 8) { err.textContent = 'Isi email dan password minimal 8 karakter.'; return; }
        err.textContent = '';
        run(raw('POST', '/auth/v1/signup', { email: e, password: p, data: { display_name: n } }, null).then(function (r) {
          if (r.code < 200 || r.code >= 300) { var x = errText(r); throw new ApiErr(r.code, x.text, x.key); }
          var j = JSON.parse(r.body || '{}');
          if (j.access_token) { saveSession(j); return 'in'; }
          return 'otp';
        })).then(function (w) {
          if (w === 'in') { return loadMe().then(function () { afterLogin(); }); }
          toast('Kode verifikasi dikirim ke emailmu.', 'good');
          setOtpEnd(e, true);
          go('#/otp?e=' + encodeURIComponent(e) + '&t=signup');
        }).catch(function (ex) { err.textContent = (ex && ex.message) || 'Gagal mendaftar.'; });
      }));
      box.appendChild(h('a', { class: 'btn btn-soft btn-block', style: 'margin-top:10px', href: '#/login', text: 'Sudah punya akun? Masuk' }));
    });
  }
  function otpKey(e) { return 'sbx_otp_' + e.toLowerCase(); }
  function setOtpEnd(e, force) {
    try {
      var cur = Number(sessionStorage.getItem(otpKey(e)) || 0);
      if (force || cur < Date.now()) { sessionStorage.setItem(otpKey(e), String(Date.now() + 120000)); }
    } catch (x) { /* abaikan */ }
  }
  function getOtpEnd(e) { try { return Number(sessionStorage.getItem(otpKey(e)) || 0); } catch (x) { return 0; } }
  function viewOtp(q) {
    var email = q.e || '';
    var type = q.t === 'recovery' ? 'recovery' : 'signup';
    if (!email) { go('#/login'); return; }
    if (getOtpEnd(email) < Date.now() - 600000) { setOtpEnd(email, true); }
    authWrap(function (box) {
      box.appendChild(h('div', { class: 'badge-ic' }, ico(type === 'recovery' ? 'lock' : 'mail')));
      box.appendChild(h('h2', { class: 'center', text: type === 'recovery' ? 'Reset password' : 'Verifikasi email' }));
      box.appendChild(h('div', { class: 'center muted small', text: 'Kami mengirim kode ke ' + email + '. Masukkan kode dari email itu (cek folder Spam).' }));
      var code = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'one-time-code', placeholder: '••••••', maxlength: '10' });
      var err = h('div', { class: 'err center' });
      box.appendChild(h('label', { class: 'field otp' }, code));
      box.appendChild(err);
      function verify() {
        var c = code.value.replace(/\s+/g, '');
        if (c.length < 4) { err.textContent = 'Masukkan kode dari email.'; return; }
        err.textContent = '';
        run(raw('POST', '/auth/v1/verify', { type: type, email: email, token: c }, null).then(function (r) {
          if (r.code !== 200) { var x = errText(r); throw new ApiErr(r.code, x.text === 'Data tidak ditemukan.' ? ERR.otp_expired : x.text, x.key); }
          saveSession(JSON.parse(r.body));
        })).then(function () {
          successAnim(function () {
            if (type === 'recovery') { go('#/newpass'); }
            else { loadMe().then(function () { afterLogin(); }).catch(function () { go('#/login'); }); }
          });
        }).catch(function (ex) { err.textContent = (ex && ex.message) || 'Kode salah.'; });
      }
      code.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { verify(); } });
      box.appendChild(btn('Verifikasi', 'pri', verify));
      var again = h('button', { class: 'btn btn-gray btn-block', type: 'button', style: 'margin-top:10px' });
      var tick = function () {
        if (!again.isConnected && again.parentNode == null) { return; }
        var left = getOtpEnd(email) - Date.now();
        if (left > 0) {
          var s = Math.ceil(left / 1000);
          again.textContent = 'Kirim ulang kode (' + Math.floor(s / 60) + ':' + (s % 60 < 10 ? '0' : '') + (s % 60) + ')';
          again.className = 'btn btn-gray btn-block disabled';
        } else {
          again.textContent = 'Kirim ulang kode';
          again.className = 'btn btn-yellow btn-block';
        }
      };
      again.addEventListener('click', function () {
        if (getOtpEnd(email) - Date.now() > 0) { return; }
        err.textContent = '';
        var p = type === 'recovery' ? raw('POST', '/auth/v1/recover', { email: email }, null) : raw('POST', '/auth/v1/resend', { type: 'signup', email: email }, null);
        run(p.then(function (r) {
          if (r.code < 200 || r.code >= 300) { var x = errText(r); throw new ApiErr(r.code, x.text, x.key); }
        })).then(function () {
          toast('Kode baru dikirim. Kode lama tidak berlaku lagi.', 'good');
          setOtpEnd(email, true);
          tick();
        }).catch(function (ex) {
          err.textContent = (ex && ex.message) || 'Gagal mengirim ulang.';
          try { sessionStorage.setItem(otpKey(email), String(Date.now() + (ex && ex.key === 'otp_daily_limit' ? 600000 : 3000))); } catch (x) { /* abaikan */ }
          tick();
        });
      });
      box.appendChild(again);
      box.appendChild(h('div', { class: 'center muted small', style: 'margin-top:6px', text: 'Kirim ulang tersedia tiap 2 menit, maksimal 7 kali per hari.' }));
      tick();
      later(tick, 500, true);
    });
  }
  function viewForgot() {
    authWrap(function (box) {
      box.appendChild(h('h2', { text: 'Lupa password' }));
      box.appendChild(h('div', { class: 'small muted', text: 'Masukkan email akunmu. Kami kirim kode untuk membuat password baru.' }));
      var pre = '';
      try { pre = sessionStorage.getItem('sbx_pre') || ''; sessionStorage.removeItem('sbx_pre'); } catch (e) { pre = ''; }
      var email = h('input', { type: 'email', placeholder: 'Email', value: pre, autocomplete: 'email' });
      var err = h('div', { class: 'err' });
      box.appendChild(fieldRow('mail', email));
      box.appendChild(err);
      box.appendChild(btn('Kirim kode', 'pri', function () {
        var e = email.value.trim();
        if (!e) { err.textContent = 'Isi email dulu.'; return; }
        err.textContent = '';
        run(raw('POST', '/auth/v1/recover', { email: e }, null).then(function (r) {
          if (r.code < 200 || r.code >= 300) { var x = errText(r); throw new ApiErr(r.code, x.text, x.key); }
        })).then(function () {
          toast('Jika email terdaftar, kode dikirim.', 'good');
          setOtpEnd(e, true);
          go('#/otp?e=' + encodeURIComponent(e) + '&t=recovery');
        }).catch(function (ex) { err.textContent = (ex && ex.message) || 'Gagal mengirim kode.'; });
      }));
      box.appendChild(h('a', { class: 'btn btn-soft btn-block', style: 'margin-top:10px', href: '#/login', text: 'Masuk' }));
    });
  }
  function viewNewPass() {
    if (!S.access) { go('#/login'); return; }
    authWrap(function (box) {
      box.appendChild(h('h2', { text: 'Password baru' }));
      var pass = h('input', { type: 'password', placeholder: 'Password baru (min 8 karakter)', autocomplete: 'new-password' });
      var err = h('div', { class: 'err' });
      box.appendChild(fieldRow('lock', pass, true));
      box.appendChild(err);
      box.appendChild(btn('Simpan password', 'pri', function () {
        var p = pass.value;
        if (p.length < 8) { err.textContent = 'Password minimal 8 karakter.'; return; }
        err.textContent = '';
        run(call('PUT', '/auth/v1/user', { password: p })).then(function () {
          successAnim(function () { clearSession(); toast('Password diperbarui. Silakan masuk.', 'good'); go('#/login'); });
        }).catch(function (ex) { err.textContent = (ex && ex.message) || 'Gagal menyimpan password.'; });
      }));
    });
  }



  /* ------------------------------------------------------------ MATA UANG */
  /* Daftar mata uang + kurs diambil dari server (kurs_daftar). Cadangan di bawah
     dipakai kalau server belum menjawab: tampilan harga asli tetap benar, konversi mati. */
  var CUR = { list: [], map: {}, ok: false };
  var CUR_FALLBACK = [
    { code: 'IDR', name: 'Rupiah', country: 'Indonesia', symbol: 'Rp', decimals: 0 },
    { code: 'USD', name: 'US Dollar', country: 'United States', symbol: '$', decimals: 2 },
    { code: 'EUR', name: 'Euro', country: 'Spain', symbol: '\u20AC', decimals: 2 },
    { code: 'PHP', name: 'Philippine Peso', country: 'Philippines', symbol: '\u20B1', decimals: 2 },
    { code: 'JPY', name: 'Japanese Yen', country: 'Japan', symbol: '\u00A5', decimals: 0 },
    { code: 'MYR', name: 'Malaysian Ringgit', country: 'Malaysia', symbol: 'RM', decimals: 2 },
    { code: 'VND', name: 'Vietnamese Dong', country: 'Vietnam', symbol: '\u20AB', decimals: 0 }
  ];
  function setCurList(list, ok) {
    CUR.list = list; CUR.ok = !!ok; CUR.map = {};
    list.forEach(function (c) { CUR.map[c.code] = c; });
    /* pilihan tersimpan yang sudah tidak ada dibuang */
    if (S.tampil && !CUR.map[S.tampil]) { S.tampil = ''; }
    if (S.fcur && !CUR.map[S.fcur]) { S.fcur = ''; }
  }
  function loadKurs() {
    return rpc('kurs_daftar').then(function (a) {
      if (Array.isArray(a) && a.length) { setCurList(a, true); } else { setCurList(CUR_FALLBACK, false); }
    }, function () { setCurList(CUR_FALLBACK, false); });
  }
  function curInfo(code) { return CUR.map[code] || null; }
  function curSym(code) { var c = curInfo(code); return c ? c.symbol : code; }
  function curLabel(c) { return c.name + ' (' + c.country + ')'; }
  var nfCache = {};
  function fmt(amount, code) {
    var c = curInfo(code), dec = c ? c.decimals : 0, sym = c ? c.symbol : code;
    var key = code + dec;
    try {
      nfCache[key] = nfCache[key] || new Intl.NumberFormat((code === 'IDR' || code === 'VND') ? 'id-ID' : 'en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      return sym + nfCache[key].format(Number(amount) || 0);
    } catch (e) { return sym + (Number(amount) || 0).toFixed(dec); }
  }
  function convertAmt(amount, from, to) {
    var a = curInfo(from), b = curInfo(to);
    if (!a || !b || !a.rate || !b.rate) { return null; }
    return Number(amount) / a.rate * b.rate;
  }
  /* Harga satu barang atau pesanan: { main, sub } sesuai pilihan "Harga dalam" */
  function priceOf(p) {
    var cur = p.currency || 'IDR';
    var amt = p.price_amount != null && Number(p.price_amount) > 0 ? Number(p.price_amount) : Number(p.price_idr) || 0;
    var orig = fmt(amt, cur);
    if (S.tampil && S.tampil !== cur) {
      var v = convertAmt(amt, cur, S.tampil);
      if (v != null) { return { main: '\u2248 ' + fmt(v, S.tampil), sub: 'Harga asli ' + orig, cur: cur }; }
    }
    return { main: orig, sub: '', cur: cur };
  }
  /* Teks panjang untuk konfirmasi: harga asli + setara Rupiah */
  function priceFull(p) {
    var cur = p.currency || 'IDR';
    var amt = p.price_amount != null && Number(p.price_amount) > 0 ? Number(p.price_amount) : Number(p.price_idr) || 0;
    if (cur === 'IDR') { return fmt(amt, 'IDR'); }
    var idr = convertAmt(amt, cur, 'IDR');
    return fmt(amt, cur) + (idr != null ? ' (setara ' + fmt(idr, 'IDR') + ')' : '');
  }
  function curBadge(code, big) {
    return h('span', { class: 'cbadge cb-' + code + (big ? ' big' : ''), title: code, text: curSym(code) });
  }
  function saveCurPrefs() {
    try { localStorage.setItem('sbx_tampil', S.tampil || ''); localStorage.setItem('sbx_fcur', S.fcur || ''); } catch (e) { /* abaikan */ }
  }
  function loadCurPrefs() {
    try { S.tampil = localStorage.getItem('sbx_tampil') || ''; S.fcur = localStorage.getItem('sbx_fcur') || ''; }
    catch (e) { S.tampil = ''; S.fcur = ''; }
  }
  /* Lembar pilihan (daftar vertikal rapi + tombol tutup X) */
  function curSheet(kind) {
    var isShow = kind === 'tampil';
    modal(function (box, close) {
      box.classList.add('sheet');
      add(box, h('div', { class: 'sheet-hd' },
        h('div', { class: 'sheet-tt' },
          h('b', { text: isShow ? 'Tampilkan harga dalam' : 'Hanya barang bermata uang' }),
          h('span', { class: 'small muted', text: isShow ? 'Semua harga diubah ke mata uang pilihanmu.' : 'Hanya barang yang dijual dalam mata uang ini.' })),
        h('button', { class: 'sheet-x', type: 'button', 'aria-label': 'Tutup', onclick: close }, ico('close'))));
      var cur = isShow ? S.tampil : S.fcur;
      var list = h('div', { class: 'clist', role: 'listbox' });
      function row(code, title, sub) {
        var on = (code || '') === (cur || '');
        return h('button', { class: 'crow' + (on ? ' on' : ''), type: 'button', role: 'option', 'aria-selected': on ? 'true' : 'false',
          onclick: function () {
            if (isShow) { S.tampil = code; } else { S.fcur = code; }
            saveCurPrefs(); close(); route();
          } },
          code ? curBadge(code, true) : h('span', { class: 'cbadge cb-ALL big' }, ico(isShow ? 'coins' : 'funnel')),
          h('span', { class: 'ct' }, h('b', { text: title }), h('span', { class: 'small muted', text: sub })),
          on ? h('span', { class: 'ck' }, ico('check')) : null);
      }
      list.appendChild(row('', isShow ? 'Harga asli (tanpa konversi)' : 'Semua mata uang', isShow ? 'Setiap barang tampil dalam mata uang penjualnya' : 'Tampilkan semua barang'));
      CUR.list.forEach(function (c) { list.appendChild(row(c.code, curLabel(c), c.code + ' \u00B7 ' + c.symbol)); });
      add(box, list);
      var f = CUR.list[0];
      var note = 'Kurs: ExchangeRate-API';
      if (f && f.updated_at) {
        try { note += ' \u00B7 diperbarui ' + new Date(f.updated_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { /* abaikan */ }
        if (f.sumber === 'awal') { note += ' (perkiraan awal)'; }
      }
      if (!CUR.ok) { note = 'Kurs belum bisa dimuat. Harga tampil dalam mata uang asli.'; }
      add(box, h('div', { class: 'small muted center', style: 'margin-top:10px', text: note }));
    });
  }
  /* Baris tombol: Harga dalam | Mata uang barang | kembalikan */
  function curBar() {
    var on = !!(S.tampil || S.fcur);
    var bar = h('div', { class: 'curbar' });
    bar.appendChild(h('button', { class: 'cbtn' + (S.tampil ? ' on' : ''), type: 'button', onclick: function () { curSheet('tampil'); } },
      ico('swap'), h('span', { class: 'cl', text: 'Harga dalam' }), h('b', { text: S.tampil ? curSym(S.tampil) + ' ' + S.tampil : 'Asli' })));
    bar.appendChild(h('button', { class: 'cbtn' + (S.fcur ? ' on' : ''), type: 'button', onclick: function () { curSheet('filter'); } },
      ico('funnel'), h('span', { class: 'cl', text: 'Barang' }), h('b', { text: S.fcur ? curSym(S.fcur) + ' ' + S.fcur : 'Semua' })));
    if (on) {
      bar.appendChild(h('button', { class: 'cbtn rst', type: 'button', 'aria-label': 'Kembalikan semula', title: 'Kembalikan semula',
        onclick: function () { S.tampil = ''; S.fcur = ''; saveCurPrefs(); route(); } }, ico('close')));
    }
    return bar;
  }

  /* ------------------------------------------- MODE TAMU: data & gerbang masuk */
  var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  function arr(x) { return Array.isArray(x) ? x : []; }
  /* Pengumuman, kategori, dan produk: tamu lewat fungsi publik (etalase_*), pengguna login seperti biasa. */
  function dataAnn() {
    return S.access ? get('announcements?select=title,body&order=created_at.desc&limit=3')
      : rpc('etalase_pengumuman').then(arr);
  }
  function dataCats() {
    return S.access ? get('categories?select=id,name&order=name.asc')
      : rpc('etalase_kategori').then(arr);
  }
  function dataProducts(o) {
    o = o || {};
    var clean = String(o.q || '').replace(/[*%,()\\]/g, ' ').trim();
    return rpc('etalase_produk', {
      p_q: clean, p_cat: UUID_RE.test(o.cat || '') ? o.cat : null, p_sort: Number(o.sort || 0),
      p_limit: o.limit || 20, p_offset: o.offset || 0, p_seller: UUID_RE.test(o.seller || '') ? o.seller : null,
      p_cur: S.fcur || null
    }).then(arr);
  }

  function afterLogin() {
    var n = '';
    try { n = sessionStorage.getItem('sbx_next') || ''; sessionStorage.removeItem('sbx_next'); } catch (e) { n = ''; }
    if (!/^#\/(home|browse|product|seller|orders|order|pay|notifs|profile)(\/[0-9a-f-]{0,40})?(\?[^\s]{0,200})?$/i.test(n)) { n = '#/home'; }
    go(n);
  }

  /* Tiga tingkat akses: Tamu, Web (setelah masuk), Aplikasi resmi */
  function tiersBox(level) {
    var T = [
      ['Tamu', 'Tanpa akun', 'Lihat produk, cari & filter, baca ulasan, lihat profil penjual.', 'eye', 'tamu'],
      ['Web (sudah masuk)', 'Sekitar 50%', 'Tambah: beli lewat MM, bayar & unggah bukti, pesanan, chat, ulasan, notifikasi.', 'user', 'web'],
      ['Aplikasi resmi', '100%', 'Semua fitur, termasuk jual produk, foto produk, video bukti serah, dan peran MM.', 'download', 'app']
    ];
    var box = h('div', { class: 'tiers' });
    T.forEach(function (x) {
      box.appendChild(h('div', { class: 'tier' + (x[4] === level ? ' on' : '') },
        h('div', { class: 'ti' }, ico(x[3])),
        h('div', { class: 'tx' }, h('b', { text: x[0] }), h('span', { class: 'pct', text: x[1] }), h('div', { class: 'small muted', text: x[2] }))));
    });
    return box;
  }
  /* Jendela "Masuk dulu ya" saat tamu menekan tombol yang butuh akun */
  function gate(reason, next) {
    try { if (next) { sessionStorage.setItem('sbx_next', next); } } catch (e) { /* abaikan */ }
    modal(function (box, close) {
      add(box, h('div', { class: 'gate-ic' }, ico('lock')));
      add(box, h('h3', { text: 'Masuk dulu ya', style: 'text-align:center' }));
      add(box, h('p', { class: 'muted center', text: reason }));
      add(box, tiersBox('web'));
      add(box, h('button', { class: 'btn btn-pri btn-block', type: 'button', style: 'margin-top:12px', onclick: function () { close(); go('#/login'); } },
        ico('user'), h('span', { text: 'Masuk / Daftar di web' })));
      if (C.APK_URL) {
        add(box, h('a', { class: 'btn btn-soft btn-block', style: 'margin-top:8px', href: C.APK_URL, rel: 'noopener' },
          ico('download'), h('span', { text: 'Unduh aplikasi resmi (100%)' })));
      }
      add(box, h('button', { class: 'btn btn-ghost btn-block', type: 'button', style: 'margin-top:8px', text: 'Nanti saja', onclick: close }));
    });
  }
  /* Tombol dengan ikon gembok untuk tamu */
  function lockBtn(text, onclick) {
    return h('button', { class: 'btn btn-pri btn-block', type: 'button', onclick: onclick }, ico('lock'), h('span', { text: text }));
  }
  function guestBanner() {
    return h('div', { class: 'guestbar' },
      h('div', { class: 'gb-ic' }, ico('eye')),
      h('div', { class: 'gb-tx' }, h('b', { text: 'Kamu sedang melihat-lihat sebagai tamu' }),
        h('div', { class: 'small', text: 'Masuk untuk membeli. Menjual dan fitur penuh ada di aplikasi resmi.' })),
      h('a', { class: 'btn btn-sm', href: '#/login', text: 'Masuk' }));
  }

  /* -------------------------------------------------------------- data diri */
  function loadMe() {
    if (!S.access) { return Promise.reject(new ApiErr(-401, 'Sesi berakhir.')); }
    return get('profiles?select=*&id=eq.' + encodeURIComponent(S.uid)).then(function (a) {
      if (!a.length) { clearSession(); throw new ApiErr(-401, 'Profil tidak ditemukan.'); }
      S.me = a[0];
      return S.me;
    });
  }
  function needBuyerOk() {
    if (S.me && S.me.status && S.me.status !== 'active') {
      return notice('Akunmu berstatus ' + lbl(S.me.status) + '. Beberapa tindakan (seperti membeli) dibatasi. Lihat Profil untuk detail dan banding.', 'warn');
    }
    return null;
  }

  /* ------------------------------------------------------------- BERANDA */
  function viewHome() {
    var m = shell('home');
    var name = (S.me && S.me.display_name) || '';
    m.appendChild(h('div', { class: 'hero' }, h('h1', { text: 'Halo' + (name ? ', ' + name : '') + '!' }),
      h('p', { text: 'Belanja produk & jasa Roblox dengan aman lewat MM.' })));
    if (!S.access) { m.appendChild(guestBanner()); }
    var w = needBuyerOk(); if (w) { m.appendChild(w); }
    m.appendChild(curBar());
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    Promise.all([
      dataAnn(),
      dataCats(),
      dataProducts({ sort: 0, limit: 8 }),
      dataProducts({ sort: 3, limit: 8 })
    ]).then(function (r) {
      clear(body);
      r[0].forEach(function (a) { body.appendChild(card(h('b', { text: '📢 ' + str(a, 'title') }), h('div', { class: 'small', text: str(a, 'body') }))); });
      if (r[1].length) {
        body.appendChild(secTitle('Kategori'));
        var chips = h('div', { class: 'chips' });
        r[1].forEach(function (c) { chips.appendChild(h('span', { class: 'chip', text: c.name, onclick: function () { go('#/browse?cat=' + c.id); } })); });
        body.appendChild(chips);
      }
      body.appendChild(secTitle('Populer'));
      body.appendChild(r[3].length ? grid(r[3]) : empty('bag', 'Belum ada produk.'));
      body.appendChild(secTitle('Terbaru'));
      body.appendChild(r[2].length ? grid(r[2]) : empty('bag', 'Belum ada produk.'));
      body.appendChild(sellBox());
    }).catch(function (e) { clear(body); fail(e); body.appendChild(empty('sad', (e && e.message) || 'Gagal memuat.')); });
  }

  /* ------------------------------------------------------------ JELAJAHI */
  function viewBrowse(q) {
    var m = shell('browse');
    if (!S.access) { m.appendChild(guestBanner()); }
    var qs = q.q || '', cat = q.cat || '', sort = Number(q.sort || 0);
    if (!(sort >= 0 && sort < SORTS.length)) { sort = 0; }
    function nav(p) {
      var o = { q: qs, cat: cat, sort: String(sort) };
      for (var k in p) { if (Object.prototype.hasOwnProperty.call(p, k)) { o[k] = p[k]; } }
      var parts = [];
      for (var k2 in o) { if (o[k2] !== '' && o[k2] != null) { parts.push(k2 + '=' + encodeURIComponent(o[k2])); } }
      go('#/browse' + (parts.length ? '?' + parts.join('&') : ''));
    }
    var inp = h('input', { type: 'search', placeholder: 'Cari produk atau jasa...', value: qs });
    m.appendChild(h('form', { onsubmit: function (ev) { ev.preventDefault(); nav({ q: inp.value.trim() }); } },
      h('label', { class: 'field' }, ico('search'), inp)));
    m.appendChild(curBar());
    var sortChips = h('div', { class: 'chips' });
    SORTS.forEach(function (s, i) { sortChips.appendChild(h('span', { class: 'chip' + (i === sort ? ' on' : ''), text: s, onclick: function () { nav({ sort: String(i) }); } })); });
    m.appendChild(sortChips);
    var catBox = h('div', { class: 'chips' }); m.appendChild(catBox);
    var list = h('div'); m.appendChild(list);
    var more = h('div'); m.appendChild(more);
    dataCats().then(function (cs) {
      catBox.appendChild(h('span', { class: 'chip' + (!cat ? ' on' : ''), text: 'Semua', onclick: function () { nav({ cat: '' }); } }));
      cs.forEach(function (c) { catBox.appendChild(h('span', { class: 'chip' + (cat === c.id ? ' on' : ''), text: c.name, onclick: function () { nav({ cat: c.id }); } })); });
    }, function () { /* diam */ });
    var offset = 0, gridEl = null;
    function load() {
      clear(more); more.appendChild(loader());
      dataProducts({ q: qs, cat: cat, sort: sort, limit: 20, offset: offset }).then(function (a) {
        clear(more);
        if (offset === 0 && !a.length) { list.appendChild(empty('search', 'Tidak ada hasil.')); return; }
        if (!gridEl) { gridEl = h('div', { class: 'grid' }); list.appendChild(gridEl); }
        a.forEach(function (p) { gridEl.appendChild(productCard(p)); });
        offset += a.length;
        if (a.length === 20) { more.appendChild(btn('Muat lagi', 'soft', load)); }
      }).catch(function (e) { clear(more); fail(e); });
    }
    load();
  }

  /* -------------------------------------------------------------- PRODUK */
  function viewProduct(id) {
    var m = shell('browse');
    m.appendChild(pageTitle('Detail produk', '#/browse'));
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    var srcP = !S.access ? rpc('etalase_detail', { p_id: id }).then(function (d) {
      if (!d || !d.product) { clear(body); body.appendChild(empty('sad', 'Produk tidak ditemukan atau sudah tidak tersedia.')); return null; }
      return [d.product, d.stats || {}, arr(d.reviews)];
    }) : get('products?select=*,categories(name),seller:profiles!seller_id(id,display_name,role),product_images(path,position)&id=eq.' + encodeURIComponent(id)).then(function (a) {
      if (!a.length) { clear(body); body.appendChild(empty('sad', 'Produk tidak ditemukan atau sudah tidak tersedia.')); return null; }
      var p = a[0];
      return Promise.all([rpc('seller_stats', { p_seller: p.seller_id }), get('reviews?select=rating,comment,created_at,updated_at,reviewer:profiles!reviewer_id(display_name)&product_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=30')])
        .then(function (x) { return [p, x[0], x[1]]; });
    });
    srcP.then(function (x) {
      if (!x) { return; }
      var p = x[0], st = x[1] || {}, rv = x[2];
      var s = p.seller || {};
      var mine = p.seller_id === S.uid;
      var active = p.status === 'active';
      clear(body);
      var imgs = imgUrl(p);
      var main = h('div', { class: 'main' }, imgs.length ? h('img', { src: imgs[0], alt: '' }) : ico('bag'));
      var gal = h('div', { class: 'gal' }, main);
      if (imgs.length > 1) {
        var th = h('div', { class: 'th' });
        imgs.forEach(function (u, i) {
          var t = h('img', { src: u, alt: '', class: i === 0 ? 'on' : '', loading: 'lazy' });
          t.addEventListener('click', function () {
            main.firstChild.src = u;
            Array.prototype.forEach.call(th.children, function (c) { c.classList.remove('on'); });
            t.classList.add('on');
          });
          th.appendChild(t);
        });
        gal.appendChild(th);
      }
      body.appendChild(gal);
      body.appendChild(h('h1', { text: str(p, 'title'), style: 'font-size:22px;margin-top:12px' }));
      var pr0 = priceOf(p);
      body.appendChild(h('div', { class: 'pricebox' }, curBadge(pr0.cur, true),
        h('div', { class: 'pv' }, h('div', { class: 'price', text: pr0.main }),
          pr0.sub ? h('div', { class: 'small muted', text: pr0.sub }) : h('div', { class: 'small muted', text: (curInfo(pr0.cur) ? curLabel(curInfo(pr0.cur)) : pr0.cur) }))));
      var chips = h('div');
      if (p.categories) { chips.appendChild(chip(p.categories.name)); }
      chips.appendChild(chip(lbl(p.status), kindOf(p.status)));
      body.appendChild(chips);
      var rating = Number(st.count) > 0 ? '★ ' + st.avg + ' (' + st.count + ' ulasan)' : 'Belum ada ulasan';
      body.appendChild(row('user', (s.display_name || '-') + (s.role === 'mm' ? ' • MM' : ''), rating + '  ·  ' + (Number(st.sales) || 0) + ' penjualan selesai', function () { go('#/seller/' + p.seller_id); }));
      body.appendChild(card(h('b', { text: 'Deskripsi' }), h('div', { text: str(p, 'description') || '-', style: 'white-space:pre-wrap;margin-top:4px' })));
      if (p.handover_info) { body.appendChild(card(h('b', { text: 'Info penyerahan' }), h('div', { text: p.handover_info, style: 'white-space:pre-wrap;margin-top:4px' }))); }
      else if (!S.access) { body.appendChild(h('div', { class: 'locked' }, ico('lock'), h('span', { text: 'Info penyerahan dan pembayaran terbuka setelah kamu masuk.' }))); }
      var w = needBuyerOk(); if (w) { body.appendChild(w); }
      var key = uuid();
      if (mine) { body.appendChild(notice('Ini produkmu sendiri. Kelola produk lewat aplikasi.', 'pri')); }
      else if (!active) { body.appendChild(notice('Produk ini sedang tidak tersedia.', 'warn')); }
      else if (!S.access) {
        body.appendChild(lockBtn('Beli sekarang', function () { gate('Untuk membeli, kamu perlu masuk dulu. Setelah masuk kamu langsung kembali ke produk ini.', '#/product/' + id); }));
        body.appendChild(h('div', { class: 'small muted center', style: 'margin-top:6px', text: 'Sebagai tamu kamu hanya bisa melihat-lihat.' }));
      }
      else {
        body.appendChild(btn('Beli sekarang', 'pri', function () {
          confirmBox('Buat pesanan senilai ' + priceFull(p) + '? Semua MM aktif akan diberi tahu. Pembayaran dilakukan manual ke MM setelah ia mengambil pesanan.', function () {
            run(rpc('create_order', { p_product: id, p_key: key })).then(function (res) {
              toast('Pesanan dibuat.', 'good');
              var oid = typeof res === 'string' ? res : (res && (res.id || res.order_id)) || '';
              if (oid) { go('#/order/' + oid); } else { go('#/orders'); }
            }).catch(fail);
          }, 'Buat pesanan');
        }));
      }
      body.appendChild(secTitle('Ulasan'));
      if (!rv.length) { body.appendChild(h('div', { class: 'muted', text: 'Belum ada ulasan.' })); }
      rv.forEach(function (r) {
        var who = r.reviewer && r.reviewer.display_name ? r.reviewer.display_name : '-';
        body.appendChild(card(h('div', { class: 'stars', text: new Array(Number(r.rating) + 1).join('★') }),
          h('b', { text: who }), r.comment ? h('div', { text: r.comment, style: 'white-space:pre-wrap' }) : null,
          h('div', { class: 'small muted', text: when(r.updated_at || r.created_at) })));
      });
      body.appendChild(btn('Laporkan produk ini', 'ghost', function () {
        if (!S.access) { gate('Untuk melaporkan produk, kamu perlu masuk dulu.', '#/product/' + id); return; }
        reportFlow('product', id);
      }, 'btn-sm'));
    }).catch(function (e) { clear(body); fail(e); body.appendChild(empty('sad', (e && e.message) || 'Gagal memuat.')); });
  }
  function reportFlow(type, target) {
    var cats = [['penipuan', 'Dugaan penipuan'], ['pelanggaran_aturan', 'Melanggar aturan'], ['konten_tidak_pantas', 'Konten tidak pantas'], ['lainnya', 'Lainnya']];
    modal(function (box, close) {
      box.appendChild(h('h3', { text: 'Laporkan' }));
      var sel = h('select', { style: 'width:100%;padding:12px;border-radius:12px;border:1px solid var(--line);background:var(--soft)' });
      cats.forEach(function (c) { sel.appendChild(h('option', { value: c[0], text: c[1] })); });
      var det = h('textarea', { placeholder: 'Jelaskan masalahnya (opsional)', maxlength: '500' });
      box.appendChild(sel);
      box.appendChild(h('label', { class: 'field ta', style: 'margin-top:10px' }, det));
      box.appendChild(h('div', { class: 'acts' },
        h('button', { class: 'btn btn-ghost', type: 'button', text: 'Batal', onclick: close }),
        h('button', { class: 'btn btn-pri', type: 'button', text: 'Kirim laporan', onclick: function () {
          close();
          run(rpc('create_report', { p_type: type, p_target: target, p_category: sel.value, p_details: det.value.trim() }))
            .then(function () { toast('Laporan terkirim. Terima kasih, akan ditinjau.', 'good'); }).catch(fail);
        } })));
    });
  }

  /* -------------------------------------------------------------- PENJUAL */
  function viewSeller(id) {
    var m = shell('browse');
    m.appendChild(pageTitle('Profil penjual', '#/browse'));
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    (!S.access ? rpc('etalase_penjual', { p_id: id }).then(function (d) {
      d = d || {};
      return [d.profile ? [d.profile] : [], d.stats || {}, arr(d.products)];
    }) : Promise.all([
      get('profiles?select=id,display_name,public_id,role,created_at&id=eq.' + encodeURIComponent(id)),
      rpc('seller_stats', { p_seller: id }),
      get('products?select=' + PSEL + '&status=eq.active&seller_id=eq.' + encodeURIComponent(id) + '&order=created_at.desc&limit=40')
    ])).then(function (r) {
      clear(body);
      if (!r[0].length) { body.appendChild(empty('sad', 'Penjual tidak ditemukan.')); return; }
      var p = r[0][0], st = r[1] || {};
      body.appendChild(h('div', { class: 'hero' }, h('h1', { text: p.display_name }),
        h('p', { text: 'ID ' + str(p, 'public_id') + ' · bergabung ' + when(p.created_at) })));
      body.appendChild(card(
        h('div', { text: Number(st.count) > 0 ? '★ ' + st.avg + ' dari ' + st.count + ' ulasan' : 'Belum ada ulasan' }),
        h('div', { class: 'muted', text: (Number(st.sales) || 0) + ' penjualan selesai' })));
      body.appendChild(secTitle('Produk aktif'));
      body.appendChild(r[2].length ? grid(r[2]) : empty('bag', 'Belum ada produk aktif.'));
    }).catch(function (e) { clear(body); fail(e); });
  }

  /* -------------------------------------------------------------- PESANAN */
  function viewOrders() {
    var m = shell('orders');
    m.appendChild(pageTitle('Pesanan'));
    m.appendChild(notice('Pesanan sebagai penjual atau MM dikelola di aplikasi StoreBlox.', 'pri'));
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    get('orders?select=id,product_title,price_idr,price_amount,currency,status,created_at,buyer_id,seller_id,mm_id,closed_at&buyer_id=eq.' + encodeURIComponent(S.uid) + '&order=created_at.desc&limit=50').then(function (a) {
      clear(body);
      if (!a.length) { body.appendChild(empty('box', 'Belum ada pesanan.')); return; }
      a.forEach(function (o) {
        var label = o.closed_at && o.status === 'completed' ? 'Selesai (ditutup)' : lbl(o.status);
        body.appendChild(h('div', { class: 'row', role: 'button', tabindex: '0', onclick: function () { go('#/order/' + o.id); } },
          h('div', { class: 'ic' }, ico('box')),
          h('div', { class: 'tx' }, h('b', { text: str(o, 'product_title') }), h('span', { text: priceOf(o).main + '\n' + when(o.created_at) })),
          chip(label, kindOf(o.status))));
      });
    }).catch(function (e) { clear(body); fail(e); });
  }
  function doAction(label, order, to, note) {
    var args = { p_order: order, p_to: to };
    if (note != null) { args.p_note = note; }
    run(rpc('order_advance', args)).then(function () { toast('Status diperbarui.', 'good'); route(); }).catch(fail);
  }
  function viewOrder(id) {
    var m = shell('orders');
    m.appendChild(pageTitle('Detail pesanan', '#/orders'));
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    Promise.all([
      get('orders?select=*,buyer:profiles!buyer_id(display_name,public_id),seller:profiles!seller_id(display_name,public_id),mm:profiles!mm_id(display_name,public_id)&id=eq.' + encodeURIComponent(id)),
      get('order_events?select=to_status,note,created_at&order_id=eq.' + encodeURIComponent(id) + '&order=created_at.asc'),
      get('reviews?select=id&order_id=eq.' + encodeURIComponent(id))
    ]).then(function (r) {
      clear(body);
      if (!r[0].length) { body.appendChild(empty('sad', 'Pesanan tidak ditemukan.')); return; }
      renderOrder(body, id, r[0][0], r[1], r[2].length > 0);
    }).catch(function (e) { clear(body); fail(e); });
  }
  function who(o) { return o ? str(o, 'display_name') + ' (' + str(o, 'public_id') + ')' : '-'; }
  function renderOrder(body, id, o, events, reviewed) {
    var status = str(o, 'status');
    var isBuyer = S.uid === o.buyer_id, isSeller = S.uid === o.seller_id, isMm = S.uid === o.mm_id;
    var closed = !!o.closed_at;
    var fin = status === 'cancelled' || closed;
    var head = card(h('h2', { text: str(o, 'product_title'), style: 'font-size:20px' }),
      h('div', { class: 'price', text: priceFull(o) }), chip(lbl(status), kindOf(status)),
      h('div', { class: 'small muted', text: 'Harga tersimpan saat pesanan dibuat dan tidak berubah.' }));
    body.appendChild(head);
    if (closed) {
      if (!o.purged_at) {
        var t = new Date(new Date(o.closed_at).getTime() + 3600000);
        body.appendChild(notice('Bukti (foto/video) dan chat transaksi ini dihapus otomatis dari server pukul ' + ('0' + t.getHours()).slice(-2) + ':' + ('0' + t.getMinutes()).slice(-2) + ' (1 jam setelah ditutup). Simpan yang perlu kamu simpan.', 'warn'));
      } else { body.appendChild(notice('Bukti dan chat transaksi ini sudah dihapus dari server sesuai kebijakan.', 'pri')); }
    }
    body.appendChild(card(
      h('div', { text: 'Pembeli: ' + who(o.buyer) }), h('div', { text: 'Penjual: ' + who(o.seller) }),
      h('div', { text: 'MM: ' + (o.mm_id ? who(o.mm) : 'belum ditetapkan') }),
      h('div', { class: 'small muted', text: 'Konfirmasi pembeli: ' + (o.buyer_confirmed_at ? 'sudah ✔' : 'belum') + '   ·   penjual: ' + (o.seller_confirmed_at ? 'sudah ✔' : 'belum') })));
    body.appendChild(notice('Pembayaran manual ke MM. Tombol "sudah bayar" bukan bukti uang diterima; MM yang memeriksa. Jangan kirim password, PIN, atau OTP di chat.', 'warn'));
    if (!isBuyer) { body.appendChild(notice('Perananmu di pesanan ini bukan pembeli. Tindak lanjut sebagai penjual atau MM dilakukan di aplikasi StoreBlox.', 'pri')); }
    if (o.mm_id && (isBuyer || isSeller || isMm)) { body.appendChild(btn('Lihat cara pembayaran & QRIS', 'soft', function () { go('#/pay/' + id); })); }
    if (isBuyer && (status === 'awaiting_payment' || status === 'payment_review')) {
      body.appendChild(btn('Unggah bukti pembayaran', 'soft', function () { uploadProof(id); }));
    }
    var proofs = h('div'); body.appendChild(proofs); loadProofs(proofs, id);
    if (status === 'awaiting_mm' && (isBuyer || isSeller)) { body.appendChild(notice('Menunggu MM. Semua MM aktif sudah diberi notifikasi. Chat terbuka untuk MM setelah ia menekan Ambil pesanan.', 'pri')); }
    if (isBuyer) {
      if (status === 'awaiting_payment') {
        body.appendChild(notice('Transfer ke QRIS/rekening MM (lihat tombol cara pembayaran), unggah bukti pembayaran, lalu tekan Saya sudah bayar.', 'pri'));
        body.appendChild(btn('Saya sudah bayar', 'pri', function () {
          confirmBox('Konfirmasi bahwa kamu sudah membayar dan sudah mengunggah bukti?', function () { doAction('', id, 'payment_review'); }, 'Ya, sudah bayar');
        }));
      }
      if (status === 'awaiting_mm' || status === 'awaiting_payment') {
        body.appendChild(btn('Batalkan pesanan', 'danger', function () {
          confirmBox('Batalkan pesanan ini? Tindakan ini tidak bisa dibatalkan.', function () { doAction('', id, 'cancelled'); }, 'Batalkan pesanan', true);
        }));
      }
      if (status === 'payment_review') { body.appendChild(notice('Menunggu MM memeriksa pembayaran dan menekan Konfirmasi.', 'pri')); }
      if (status === 'awaiting_confirmation') {
        body.appendChild(notice('MM sudah menerima uang. Pastikan barang/jasa sudah kamu terima, lalu tekan Konfirmasi.', 'pri'));
        if (o.buyer_confirmed_at) { body.appendChild(notice('Kamu sudah menekan Konfirmasi. Menunggu pihak lainnya.', 'ok')); }
        else {
          body.appendChild(btn('Konfirmasi', 'pri', function () {
            confirmBox('Konfirmasi bahwa transaksi sudah sesuai? Ini tidak bisa dibatalkan.', function () {
              run(rpc('order_confirm', { p_order: id })).then(function () { toast('Konfirmasi tersimpan.', 'good'); route(); }).catch(fail);
            }, 'Konfirmasi');
          }));
        }
      }
      if (status === 'completed' && !closed) { body.appendChild(notice('Pembayaran berhasil ✔. MM sedang meneruskan dana ke penjual.', 'ok')); }
    }
    var disputable = ['payment_review', 'payment_confirmed', 'awaiting_handover', 'handover_review', 'awaiting_confirmation'];
    if (isBuyer && disputable.indexOf(status) >= 0) {
      body.appendChild(btn('Ajukan sengketa', 'danger', function () {
        formBox('Ajukan sengketa', [{ label: 'Jelaskan masalahnya (min 10 karakter)', multi: true, max: 500 }], function (v) {
          if (v[0].trim().length < 10) { toast('Penjelasan terlalu pendek.', 'bad'); return false; }
          doAction('', id, 'dispute', v[0].trim());
          return true;
        }, 'Ajukan');
      }));
    }
    if (isBuyer && status === 'completed') {
      body.appendChild(btn(reviewed ? 'Ubah ulasan' : '★ Beri ulasan', 'soft', function () { reviewFlow(id); }));
    }
    body.appendChild(btn('Laporkan pesanan ini', 'ghost', function () { reportFlow('order', id); }, 'btn-sm'));
    body.appendChild(secTitle('Riwayat status'));
    var tl = h('div', { class: 'tl' });
    events.forEach(function (e) { tl.appendChild(h('div', null, h('b', { text: lbl(e.to_status) }), h('span', { text: when(e.created_at) + (e.note ? ' · ' + e.note : '') }))); });
    body.appendChild(tl);
    body.appendChild(secTitle('Chat pesanan'));
    body.appendChild(h('div', { class: 'small muted', text: 'Hanya pembeli, penjual, dan MM yang ditugaskan. Chat ini belum terenkripsi end-to-end.' }));
    var chat = h('div', { style: 'margin:8px 0' }); body.appendChild(chat);
    function refresh() {
      get('messages?select=id,sender_id,body,created_at,sender:profiles!sender_id(display_name,role)&order_id=eq.' + encodeURIComponent(id) + '&order=created_at.asc&limit=100').then(function (a) {
        var nearEnd = (window.innerHeight + window.scrollY) >= document.body.scrollHeight - 160;
        clear(chat);
        if (!a.length) { chat.appendChild(h('div', { class: 'muted', text: 'Belum ada pesan.' })); }
        a.forEach(function (x) {
          var me = x.sender_id === S.uid;
          var nm = x.sender ? str(x.sender, 'display_name') + (x.sender.role === 'mm' ? ' • MM' : '') : '-';
          chat.appendChild(h('div', { class: 'bub' + (me ? ' me' : '') }, h('small', { text: (me ? 'Kamu' : nm) + ' · ' + when(x.created_at) }), h('span', { text: x.body })));
        });
        if (nearEnd) { try { window.scrollTo(0, document.body.scrollHeight); } catch (e) { /* abaikan */ } }
      }, function () { /* diam */ });
    }
    refresh();
    if (!fin) { later(refresh, 6000, true); }
    if (!fin && (isBuyer || isSeller || isMm)) {
      var msg = h('input', { type: 'text', placeholder: 'Tulis pesan...', maxlength: '1000' });
      var send = function () {
        var t = msg.value.trim();
        if (!t) { return; }
        msg.value = '';
        rpc('send_message', { p_order: id, p_body: t }).then(refresh).catch(fail);
      };
      msg.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { send(); } });
      body.appendChild(h('div', { class: 'field' }, msg, h('button', { class: 'btn btn-pri btn-sm', type: 'button', text: 'Kirim', onclick: send })));
    }
  }
  function loadProofs(box, id) {
    get('order_proofs?select=id,kind,media,path,duration_ms,created_at,deleted_at,uploader:profiles!uploader_id(display_name)&order_id=eq.' + encodeURIComponent(id) + '&order=created_at.asc').then(function (a) {
      if (!a.length) { return; }
      box.appendChild(secTitle('Bukti'));
      a.forEach(function (p) {
        var title = (p.kind === 'payment' ? 'Bukti pembayaran' : 'Bukti penyerahan') + ' · ' + (p.uploader ? p.uploader.display_name : '-') + ' · ' + when(p.created_at);
        var c = card(h('div', { class: 'small muted', text: title }));
        if (p.deleted_at) { c.appendChild(h('div', { text: 'Sudah dihapus dari server.' })); box.appendChild(c); return; }
        box.appendChild(c);
        var path = String(p.path || '').split('/').map(encodeURIComponent).join('/');
        call('POST', '/storage/v1/object/sign/proofs/' + path, { expiresIn: 600 }).then(function (t) {
          var j = parse(t) || {};
          var u = j.signedURL || j.signedUrl || '';
          if (!u) { return; }
          var src = BASE + '/storage/v1' + (u.charAt(0) === '/' ? '' : '/') + u;
          c.appendChild(h('div', { class: 'proof' }, p.media === 'video' ? h('video', { src: src, controls: 'controls', preload: 'metadata', playsinline: 'playsinline' }) : h('img', { src: src, alt: 'bukti', loading: 'lazy' })));
        }).catch(function () { c.appendChild(h('div', { class: 'small', text: 'Bukti tidak bisa ditampilkan.' })); });
      });
    }, function () { /* diam */ });
  }
  function uploadProof(orderId) {
    pickImage(function (blob) {
      var path = orderId + '/' + S.uid + '-' + uuid() + '.jpg';
      run(call('POST', '/storage/v1/object/proofs/' + path, blob, 'image/jpeg', true).then(function () {
        return rpc('add_order_proof', { p_order: orderId, p_kind: 'payment', p_media: 'image', p_path: path });
      })).then(function () { toast('Bukti terunggah.', 'good'); route(); }).catch(fail);
    });
  }
  function reviewFlow(orderId) {
    get('reviews?select=rating,comment&order_id=eq.' + encodeURIComponent(orderId)).then(function (a) {
      var cur = a.length ? a[0] : { rating: 0, comment: '' };
      modal(function (box, close) {
        var rating = Number(cur.rating) || 0;
        box.appendChild(h('h3', { text: 'Beri ulasan' }));
        var pick = h('div', { class: 'starpick' });
        function paint() { Array.prototype.forEach.call(pick.children, function (s, i) { s.className = i < rating ? 'on' : ''; }); }
        for (var i = 0; i < 5; i++) { (function (n) { pick.appendChild(h('span', { text: '★', onclick: function () { rating = n; paint(); } })); })(i + 1); }
        paint();
        var cm = h('textarea', { placeholder: 'Komentar (opsional)', maxlength: '500' }); cm.value = cur.comment || '';
        box.appendChild(pick);
        box.appendChild(h('label', { class: 'field ta' }, cm));
        box.appendChild(h('div', { class: 'acts' },
          h('button', { class: 'btn btn-ghost', type: 'button', text: 'Batal', onclick: close }),
          h('button', { class: 'btn btn-pri', type: 'button', text: 'Simpan', onclick: function () {
            if (rating < 1) { toast('Pilih bintang dulu.', 'bad'); return; }
            close();
            run(rpc('save_review', { p_order: orderId, p_rating: rating, p_comment: cm.value.trim() })).then(function () { toast('Ulasan tersimpan.', 'good'); route(); }).catch(fail);
          } })));
      });
    }).catch(fail);
  }
  function viewPay(id) {
    var m = shell('orders');
    m.appendChild(pageTitle('Cara pembayaran', '#/order/' + id));
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    rpc('order_payment_info', { p_order: id }).then(function (d) {
      clear(body);
      d = d || {};
      body.appendChild(h('div', { class: 'hero' }, h('h1', { text: rp(d.amount) }), h('p', { text: 'Bayar tepat nominal ini ke MM: ' + str(d, 'mm_name') })));
      if (d.qris_path) {
        body.appendChild(secTitle('Scan QRIS'));
        body.appendChild(h('img', { class: 'qr', src: QRIS + String(d.qris_path).split('/').map(encodeURIComponent).join('/'), alt: 'QRIS' }));
      } else { body.appendChild(notice('MM belum mengunggah QRIS.', 'warn')); }
      if (d.methods && d.methods.length) {
        body.appendChild(secTitle('Transfer manual'));
        d.methods.forEach(function (x) { body.appendChild(card(h('b', { text: str(x, 'provider') }), h('div', { text: 'A/N ' + str(x, 'account_name') }), h('div', { text: 'No. ' + str(x, 'account_number') }))); });
      }
      if (d.instructions) { body.appendChild(card(h('b', { text: 'Petunjuk dari MM' }), h('div', { text: d.instructions, style: 'white-space:pre-wrap' }))); }
      body.appendChild(notice('Bayar hanya ke QRIS/rekening yang tertera di halaman ini. Simpan bukti, lalu unggah di halaman pesanan. MM tidak pernah meminta PIN, password, atau OTP.', 'warn'));
    }).catch(function (e) { clear(body); fail(e); });
  }

  /* ---------------------------------------------------------- NOTIFIKASI */
  function viewNotifs() {
    var m = shell('home');
    m.appendChild(pageTitle('Notifikasi', '#/home'));
    var body = h('div'); m.appendChild(body); body.appendChild(loader());
    get('notifications?select=id,title,body,kind,ref_id,read_at,created_at&order=created_at.desc&limit=50').then(function (a) {
      clear(body);
      rpc('mark_notifications_read', {}).then(function () { var el = $('#bellN'); if (el) { el.classList.add('hidden'); } }, function () { /* diam */ });
      if (!a.length) { body.appendChild(empty('bell', 'Belum ada notifikasi.')); return; }
      a.forEach(function (n) {
        var click = n.kind === 'order' && n.ref_id ? function () { go('#/order/' + n.ref_id); } : (n.kind === 'product' && n.ref_id ? function () { go('#/product/' + n.ref_id); } : null);
        body.appendChild(row('bell', (n.read_at ? '' : '● ') + str(n, 'title'), str(n, 'body') + '\n' + when(n.created_at), click));
      });
    }).catch(function (e) { clear(body); fail(e); });
  }

  /* -------------------------------------------------------------- PROFIL */
  function viewProfile() {
    var m = shell('profile');
    m.appendChild(pageTitle('Profil'));
    var me = S.me || {};
    m.appendChild(h('div', { class: 'hero' }, h('h1', { text: str(me, 'display_name') }),
      h('p', { text: 'ID ' + str(me, 'public_id') + ' · ' + lbl(me.role) + ' · bergabung ' + when(me.created_at) })));
    m.appendChild(card(h('span', { text: 'Status akun: ' }), chip(lbl(me.status), kindOf(me.status))));
    var body = h('div'); m.appendChild(body);
    if (me.status && me.status !== 'active') {
      get('user_sanctions?select=kind,reason,expires_at&user_id=eq.' + encodeURIComponent(S.uid) + '&order=created_at.desc&limit=5').then(function (a) {
        a.forEach(function (s) { body.appendChild(notice(lbl(s.kind) + ': ' + str(s, 'reason') + (s.expires_at ? ' (sampai ' + when(s.expires_at) + ')' : ''), 'warn')); });
      }, function () { /* diam */ });
      body.appendChild(btn('Ajukan banding', 'soft', function () {
        formBox('Ajukan banding', [{ label: 'Jelaskan alasanmu (min 10 karakter)', multi: true, max: 800 }], function (v) {
          if (v[0].trim().length < 10) { toast('Penjelasan terlalu pendek.', 'bad'); return false; }
          run(rpc('create_appeal', { p_message: v[0].trim() })).then(function () { toast('Banding terkirim.', 'good'); }).catch(fail);
          return true;
        }, 'Kirim');
      }));
    }
    m.appendChild(sellBox());
    m.appendChild(secTitle('Pengaturan'));
    m.appendChild(row('edit', 'Ubah nama tampilan', null, function () {
      formBox('Ubah nama tampilan', [{ label: 'Nama baru (2-30 huruf)', value: me.display_name || '', max: 30 }], function (v) {
        var n = v[0].trim();
        if (n.length < 2 || n.length > 30) { toast('Nama harus 2-30 karakter.', 'bad'); return false; }
        run(rpc('update_my_name', { p_name: n }).then(loadMe)).then(function () { toast('Nama diperbarui.', 'good'); route(); }).catch(fail);
        return true;
      }, 'Simpan');
    }));
    m.appendChild(row('theme', 'Tema tampilan', 'Otomatis / Terang / Gelap', nextTheme));
    m.appendChild(row('doc', 'Aturan & panduan transaksi', null, function () { go('#/rules'); }));
    m.appendChild(row('shield', 'Kebijakan privasi', null, function () { location.href = 'privacy.html'; }));
    m.appendChild(row('doc', 'Ketentuan layanan', null, function () { location.href = 'terms.html'; }));
    m.appendChild(secTitle('Lainnya'));
    m.appendChild(btn('Keluar', 'danger', function () {
      confirmBox('Keluar dari StoreBlox?', function () { logout(); }, 'Keluar', true);
    }));
    m.appendChild(h('div', { style: 'height:8px' }));
    m.appendChild(btn('Hapus akun saya', 'ghost', function () {
      confirmBox('Hapus akun secara permanen? Ini tidak bisa dibatalkan. Akun yang punya riwayat pesanan tidak bisa dihapus.', function () {
        run(rpc('delete_my_account', {})).then(function () { clearSession(); toast('Akun dihapus.', 'good'); go('#/login'); }).catch(fail);
      }, 'Hapus akun', true);
    }, 'btn-sm'));
  }
  function logout() {
    stopTimers();
    if (bellTimer) { clearInterval(bellTimer); bellTimer = null; }
    clearSession();
    go('#/home');
  }

  /* ----------------------------------------------- JUAL (hanya di aplikasi) */
  function viewSell() {
    var m = shell('sell');
    var apk = C.APK_URL || '';
    m.appendChild(pageTitle('Jual di StoreBlox', '#/home'));
    m.appendChild(h('div', { class: 'hero' }, h('h1', { text: 'Jadi penjual lewat aplikasi' }),
      h('p', { text: 'Seperti di marketplace populer: berbelanja bisa di web, berjualan memakai aplikasi resmi.' })));
    m.appendChild(card(h('b', { text: 'Kenapa harus aplikasi?' }),
      h('div', { class: 'muted', style: 'margin-top:4px', text: 'Penjual perlu mengunggah foto produk, merekam video bukti penyerahan (minimal 10 detik), dan menerima notifikasi pesanan. Semua itu paling aman dan lancar di aplikasi.' })));
    m.appendChild(card(h('b', { text: 'Cara jadi penjual' }), h('ol', { style: 'padding-left:20px;margin:6px 0 0' },
      h('li', { text: 'Unduh dan pasang aplikasi StoreBlox.' }),
      h('li', { text: 'Masuk dengan akun yang sama seperti di web ini.' }),
      h('li', { text: 'Buka menu Jual, lalu buat produk atau jasamu.' }))));
    m.appendChild(apk ? h('a', { class: 'btn btn-pri btn-block', href: apk, rel: 'noopener' }, ico('download'), h('span', { text: 'Unduh aplikasi (APK)' }))
      : notice('Link unduh aplikasi belum tersedia. Segera hadir.', 'warn'));
    m.appendChild(h('a', { class: 'btn btn-soft btn-block', style: 'margin-top:10px', href: 'index.html#unduh', text: 'Cara pasang & verifikasi keamanan file' }));
  }
  function viewRules() {
    var m = shell(S.access ? 'profile' : 'home');
    m.appendChild(pageTitle('Aturan & panduan transaksi', S.access ? '#/profile' : '#/home'));
    var items = [
      ['Alur transaksi', 'Pembeli menekan Beli → MM mengambil pesanan → pembeli membayar ke QRIS/rekening MM dan mengunggah bukti → pembeli menekan "Saya sudah bayar" → MM memeriksa dan menekan Konfirmasi → penjual menyerahkan barang/jasa dengan bukti → pembeli dan penjual menekan Konfirmasi → pembayaran berhasil → MM meneruskan dana ke penjual → pesanan ditutup.'],
      ['Yang dilarang', 'Menjual akun, password, cookie, atau token sesi Roblox; data pribadi orang lain; exploit, cheat, atau malware.'],
      ['Keamanan', 'Jangan pernah membagikan password, PIN, atau kode OTP kepada siapa pun, termasuk admin dan MM. Bayar hanya ke QRIS/rekening yang tertera di halaman pembayaran pesanan.'],
      ['Bukti & chat', 'Bukti (foto/video) dan chat pesanan dihapus otomatis 1 jam setelah pesanan ditutup. Simpan yang perlu kamu simpan. Chat belum terenkripsi end-to-end.'],
      ['Sengketa', 'Jika ada masalah, ajukan sengketa sebelum menekan Konfirmasi. Tim akan meninjau bukti dan chat.']
    ];
    items.forEach(function (x) { m.appendChild(card(h('b', { text: x[0] }), h('div', { class: 'muted', style: 'margin-top:4px', text: x[1] }))); });
    m.appendChild(notice('StoreBlox tidak berafiliasi dengan Roblox Corporation.', 'pri'));
  }

  /* ---------------------------------------------------------------- router */
  var PUBLIC = { login: 1, signup: 1, forgot: 1, otp: 1, rules: 1, sell: 1, home: 1, browse: 1, product: 1, seller: 1 };
  function parseHash() {
    var hs = (location.hash || '').replace(/^#\/?/, '');
    var qi = hs.indexOf('?');
    var path = qi >= 0 ? hs.slice(0, qi) : hs;
    var q = {};
    if (qi >= 0) {
      hs.slice(qi + 1).split('&').forEach(function (p) {
        if (!p) { return; }
        var kv = p.split('=');
        try { q[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' ')); } catch (e) { /* abaikan */ }
      });
    }
    var parts = path.split('/');
    return { name: parts[0] || 'home', arg: parts[1] || '', q: q };
  }
  function route() {
    stopTimers();
    var r = parseHash();
    if (!PUBLIC[r.name] && !S.access) {
      try { sessionStorage.setItem('sbx_next', location.hash || ''); } catch (e) { /* abaikan */ }
      go('#/login');
      return;
    }
    if (S.access && !S.me && !PUBLIC[r.name]) {
      var m0 = bare(); m0.appendChild(loader());
      loadMe().then(function () { route(); }).catch(function (e) { fail(e); });
      return;
    }
    if (S.access && (r.name === 'login' || r.name === 'signup') && S.me) { afterLogin(); return; }
    if (S.access) { startBell(); }
    window.scrollTo(0, 0);
    switch (r.name) {
      case 'home': viewHome(); break;
      case 'browse': viewBrowse(r.q); break;
      case 'product': viewProduct(r.arg); break;
      case 'seller': viewSeller(r.arg); break;
      case 'orders': viewOrders(); break;
      case 'order': viewOrder(r.arg); break;
      case 'pay': viewPay(r.arg); break;
      case 'notifs': viewNotifs(); break;
      case 'profile': viewProfile(); break;
      case 'sell': viewSell(); break;
      case 'rules': viewRules(); break;
      case 'login': viewLogin(); break;
      case 'signup': viewSignup(); break;
      case 'forgot': viewForgot(); break;
      case 'otp': viewOtp(r.q); break;
      case 'newpass': viewNewPass(); break;
      default: go('#/home');
    }
  }

  /* ----------------------------------------------------------------- mulai */
  function hideSplash() {
    var sp = $('#splash');
    if (!sp) { return; }
    sp.classList.add('out');
    setTimeout(function () { if (sp.parentNode) { sp.parentNode.removeChild(sp); } }, 450);
  }
  function init() {
    applyTheme();
    loadSession();
    window.addEventListener('hashchange', route);
    var t0 = Date.now();
    var start = function () {
      var wait = Math.max(0, 900 - (Date.now() - t0));
      setTimeout(hideSplash, wait);
    };
    if (!location.hash) { location.hash = '#/home'; }
    loadCurPrefs();
    var kursP = loadKurs();
    if (S.access) {
      loadMe().then(function () { return kursP; }, function () { clearSession(); return kursP; }).then(function () { route(); start(); });
    } else { kursP.then(function () { route(); start(); }); }
    if ('serviceWorker' in navigator && location.protocol === 'https:') {
      navigator.serviceWorker.register('sw.js').catch(function () { /* abaikan */ });
    }
  }
  if (document.readyState === 'loading') { document.addEventListener('DOMContentLoaded', init); } else { init(); }
})();
