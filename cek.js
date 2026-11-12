/* cek.js - uji sambungan web ke Supabase (tanpa mengubah data apa pun) */
(function () {
  'use strict';
  var C = window.APP_CONFIG || {};
  var BASE = (C.SUPABASE_URL || '').replace(/\/+$/, '');
  var KEY = C.SUPABASE_KEY || '';
  var out = document.getElementById('out');
  var sum = document.getElementById('sum');
  var good = 0, bad = 0;

  function add(ok, title, detail, hint) {
    if (ok) { good++; } else { bad++; }
    var d = document.createElement('div');
    d.className = 'card';
    var b = document.createElement('b');
    b.textContent = (ok ? '✔ ' : '✖ ') + title;
    b.style.color = ok ? 'var(--ok)' : 'var(--danger)';
    d.appendChild(b);
    if (detail) { var p = document.createElement('div'); p.className = 'small muted'; p.textContent = detail; d.appendChild(p); }
    if (!ok && hint) { var n = document.createElement('div'); n.className = 'notice k-warn'; n.textContent = 'Cara memperbaiki: ' + hint; d.appendChild(n); }
    out.appendChild(d);
  }
  function req(method, path, body, token) {
    var headers = { apikey: KEY, Accept: 'application/json' };
    if (token) { headers.Authorization = 'Bearer ' + token; }
    if (body != null) { headers['Content-Type'] = 'application/json'; }
    return fetch(BASE + path, { method: method, headers: headers, body: body == null ? undefined : JSON.stringify(body) })
      .then(function (r) { return r.text().then(function (t) { return { code: r.status, body: t }; }); },
        function () { return { code: 0, body: '' }; });
  }
  function j(t) { try { return JSON.parse(t); } catch (e) { return null; } }

  function run(email, pass) {
    out.textContent = '';
    good = 0; bad = 0; sum.textContent = 'Menguji...';
    var token = '', uid = '';
    var steps = [];

    steps.push(function () {
      var okU = /^https:\/\/[a-z0-9]+\.supabase\.co$/.test(BASE);
      add(okU && KEY.length > 20, 'Pengaturan config.js terisi', BASE || '(alamat kosong)',
        'Buka config.js. SUPABASE_URL harus seperti https://xxxx.supabase.co dan SUPABASE_KEY tidak boleh kosong.');
      return Promise.resolve();
    });
    steps.push(function () {
      return req('GET', '/auth/v1/health').then(function (r) {
        var okH = r.code === 200;
        add(okH, 'Server Auth Supabase terjangkau', 'Kode balasan: ' + r.code,
          r.code === 0 ? 'Browser tidak bisa menghubungi Supabase. Periksa internet, alamat di config.js, atau proyek Supabase sedang dijeda (cek dashboard dan tekan Restore).'
            : 'Kunci SUPABASE_KEY mungkin salah atau proyek dijeda. Cek dashboard Supabase.');
      });
    });
    steps.push(function () {
      return req('GET', '/rest/v1/categories?select=id&limit=1').then(function (r) {
        var ok2 = r.code === 200 || r.code === 401 || r.code === 403;
        var inv = r.body.indexOf('Invalid API key') >= 0;
        add(ok2 && !inv, 'Server data (REST) terjangkau', 'Kode ' + r.code + (r.code === 200 || r.code === 401 || r.code === 403 ? ' (normal bagi tamu: data hanya untuk yang sudah masuk)' : ''),
          inv ? 'Kunci publishable salah. Salin ulang dari Supabase: Project Settings > API.' : 'Periksa alamat Supabase dan apakah proyek sedang dijeda.');
      });
    });
    ['product-images', 'qris'].forEach(function (bk) {
      steps.push(function () {
        return req('GET', '/storage/v1/object/public/' + bk + '/cek.jpg').then(function (r) {
          var missing = r.body.indexOf('Bucket not found') >= 0;
          add(r.code !== 0 && !missing, 'Penyimpanan publik "' + bk + '" ada', 'Kode ' + r.code,
            r.code === 0 ? 'Tidak bisa terhubung.' : 'Bucket "' + bk + '" belum ada. Jalankan ulang file SQL yang membuatnya (SQL 03 untuk product-images, SQL 04 untuk qris).');
        });
      });
    });
    if (email && pass) {
      steps.push(function () {
        return req('POST', '/auth/v1/token?grant_type=password', { email: email, password: pass }).then(function (r) {
          var d = j(r.body) || {};
          if (r.code === 200 && d.access_token) { token = d.access_token; uid = d.user && d.user.id; }
          add(r.code === 200, 'Login dengan akunmu', 'Kode ' + r.code + (d.error_code ? ' - ' + d.error_code : ''),
            'Periksa email dan password. Jika "email_not_confirmed", selesaikan verifikasi OTP lewat halaman daftar.');
        });
      });
      var tests = [
        ['profiles?select=id,role,status&id=eq.UID', 'Profil akunmu terbaca', function (a) { return a.length === 1 ? 'Peran: ' + a[0].role + ', status: ' + a[0].status : ''; }, 'Profil tidak dibuat saat daftar. Periksa trigger SQL 01.'],
        ['categories?select=id,name&limit=50', 'Daftar kategori terbaca', function (a) { return a.length + ' kategori'; }, 'Jalankan SQL 02. Pastikan aturan baca kategori untuk pengguna masuk ada.'],
        ['products?select=id,title&status=eq.active&limit=5', 'Produk aktif terbaca', function (a) { return a.length + ' produk (maks 5 ditampilkan)'; }, 'Aturan baca produk bermasalah (SQL 02).'],
        ['announcements?select=id&limit=1', 'Pengumuman terbaca', function (a) { return a.length + ' pengumuman'; }, 'Tabel announcements belum ada (SQL 02).'],
        ['notifications?select=id&limit=1', 'Notifikasi terbaca', function (a) { return a.length + ' notifikasi'; }, 'Tabel notifications belum ada (SQL 04).'],
        ['orders?select=id&buyer_id=eq.UID&limit=1', 'Pesanan sebagai pembeli terbaca', function (a) { return a.length + ' pesanan'; }, 'Tabel orders belum ada atau aturan bacanya salah (SQL 02/06).']
      ];
      tests.forEach(function (t) {
        steps.push(function () {
          var path = t[0].replace('UID', encodeURIComponent(uid || ''));
          if (!token) { add(false, t[1], 'Dilewati karena login gagal.', ''); return Promise.resolve(); }
          return req('GET', '/rest/v1/' + path, null, token).then(function (r) {
            var a = j(r.body);
            var ok3 = r.code === 200 && Array.isArray(a);
            add(ok3, t[1], ok3 ? t[2](a) : 'Kode ' + r.code + ' ' + r.body.slice(0, 120), t[3]);
          });
        });
      });
      steps.push(function () {
        if (!token) { return Promise.resolve(); }
        return req('POST', '/rest/v1/rpc/seller_stats', { p_seller: uid }, token).then(function (r) {
          add(r.code === 200, 'Fungsi server (RPC) bisa dipanggil', 'seller_stats, kode ' + r.code,
            'Fungsi seller_stats belum ada. Jalankan SQL 02/03.');
        });
      });
    } else {
      steps.push(function () {
        add(true, 'Uji data (butuh login) dilewati', 'Isi email dan password akun ujimu di atas untuk menguji pembacaan data.', '');
        return Promise.resolve();
      });
    }
    var p = Promise.resolve();
    steps.forEach(function (s) { p = p.then(s); });
    p.then(function () {
      sum.textContent = bad === 0 ? 'Semua pengujian lulus (' + good + ' ✔)' : bad + ' pengujian gagal, ' + good + ' lulus. Ikuti "Cara memperbaiki" di tiap kartu merah.';
      sum.style.color = bad === 0 ? 'var(--ok)' : 'var(--danger)';
    });
  }
  document.getElementById('go').addEventListener('click', function () {
    run(document.getElementById('em').value.trim(), document.getElementById('pw').value);
  });
})();
