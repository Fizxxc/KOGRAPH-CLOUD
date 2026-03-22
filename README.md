# Ember Vault Fixed

Perbaikan di versi ini:
- fix HumanCheck agar tidak memanggil state parent saat render
- tambah route dinamis Next.js 15 yang benar dengan `params: Promise<{ id: string }>`
- vault terenkripsi tetap aktif
- akses LAN tetap bisa

## Jalankan lokal
```bash
npm install
npm run dev
```

## Akses dari perangkat lain dalam jaringan yang sama
Jalankan server dengan host terbuka:
```bash
npm run dev -- --hostname 0.0.0.0
```

Lalu buka dari perangkat lain:
```bash
http://IP-KOMPUTER:3000
```

Contoh:
```bash
http://192.168.1.8:3000
```
