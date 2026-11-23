/* =====================================================================
   config.js - SATU-SATUNYA file yang perlu kamu edit.
   Isi bagian yang bertanda (ISI) lalu simpan. Jangan hapus tanda kutip.
   ===================================================================== */
window.APP_CONFIG = {
  // Alamat Supabase dan kunci publishable (sama dengan di aplikasi, memang aman dipublikasikan)
  SUPABASE_URL: "https://caewaswnnvfofofyjqob.supabase.co",
  SUPABASE_KEY: "sb_publishable_Ty_EdOtd9nJWbG1Wr8DWFw_X7w84FuV",

  APP_NAME: "StoreBlox",
  BY: "By Zky",

  // (ISI) Link unduh APK. Contoh dari GitHub Releases:
  // "https://github.com/NAMAKAMU/storblox/releases/download/v1.0/StoreBlox.apk"
  APK_URL: "https://github.com/storblox404/storblox.github.io/releases/download/V1.0/StoreBlox-1.2.apk",
  APK_VERSION: "1.2",          // versi aplikasi
  APK_SIZE: "245 KB",          // ukuran file APK
  APK_SHA256: "sha256:a767a2a6394243eafabd931a31541306f86cc3ff35f6adfcf40693f6ec14a8b7", // sidik jari file APK

  CONTACT_EMAIL: "haloword1345@gmail.com", // email kontak (Privasi & Ketentuan)
  SITE_URL: "https://storblox404.github.io",

  // Iklan. Bawaan MATI. Cara menyalakan ada di tutorial.
  ADS: {
    mode: "iframe",       // "off" = tanpa iklan | "demo" = ruang iklan contoh | "adsense" = banner Google AdSense | "iframe" = kode banner jaringan lain (adframe.html)
    client: "",         // (ISI nanti) contoh: "ca-pub-1234567890123456" (hanya mode adsense)
    bannerSlot: "",     // (ISI nanti) angka ID unit iklan banner (hanya mode adsense)
    onlyGuest: true,    // true = iklan hanya untuk tamu (yang sudah login tidak diganggu)
    bannerHeight: 250,  // tinggi banner 300x250 (Jelajahi), mode iframe
    nativeHeight: 260,  // tinggi native banner (Beranda), mode iframe
    socialBar: "https://bauval.org/14/e04085f3656e086997dbed8c9ba6e4dc", // Social Bar Adsterra (bilah notifikasi kecil). Kosongkan "" untuk mematikan. Hanya untuk tamu.
    adblockWall: true,  // true = tamu yang memakai pemblokir iklan diminta mematikannya (Inggris + Indonesia)
    sandboxSameOrigin: true, // false = iklan terkurung penuh (aman) | true = alamat webmu terlihat jaringan iklan (lihat tutorial)
    interstitial: true, // mode iframe: true = tampilkan juga di jendela layar penuh dengan hitung mundur
    countdown: 3,       // detik hitung mundur sebelum iklan layar penuh (2-5, mode demo)
    capMinutes: 8,      // jarak minimal antar iklan layar penuh (menit)
    reportEmail: ""     // kosong = pakai CONTACT_EMAIL
  }
};
