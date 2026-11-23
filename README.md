# Aplikasi Credit Scoring & Survey Lapangan

Sistem penilaian kapasitas calon debitur, credit scoring 5C otomatis, alur persetujuan berjenjang (AO, Branch Manager, Analis/Komite, Manajemen Risiko, Admin Cabang), dasbor analitik, log audit, dan ekspor laporan PDF/Excel.

## Prasyarat

- **Node.js** versi `>= 22.18.0` (wajib agar `node server.ts` berjalan langsung di server produksi)
- **npm** (atau **bun**)

## Menjalankan di Lokal

1. Instal dependensi:
   ```bash
   npm install
   ```
2. Salin `.env.example` menjadi `.env` (opsional, hanya isi jika ingin menimpa pengaturan bawaan):
   ```bash
   cp .env.example .env
   ```
3. Jalankan mode pengembangan:
   ```bash
   npm run dev
   ```
4. Cek build produksi secara lokal:
   ```bash
   npm run lint
   npm run build
   NODE_ENV=production npm start
   ```

## Publish ke GitHub

Pastikan tidak ada file `.env` atau file rahasia lokal yang ikut ter-commit (`.gitignore` sudah mengecualikan `.env*`, `node_modules/`, dan `dist/`):

```bash
git init
git add .
git commit -m "Siapkan aplikasi untuk hosting produksi"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## Deploy ke Hosting dari GitHub

Aplikasi ini membutuhkan backend `/api/local-auth/verify` untuk verifikasi login Super Admin (tidak bisa berjalan di hosting statis murni seperti **GitHub Pages**). Pilih salah satu platform berikut yang terhubung ke repository GitHub Anda:

### Opsi 1: Vercel (`vercel.json` + Serverless `/api/*` sudah tersedia)
1. Buka [Vercel](https://vercel.com) → **Add New Project** → pilih repository GitHub ini.
2. Vercel otomatis membaca `vercel.json` (`npm run build`, output `dist`, dan Serverless Functions di `/api/*`).
3. Klik **Deploy**.

### Opsi 2: Netlify (`netlify.toml` + Functions sudah tersedia)
1. Buka [Netlify](https://app.netlify.com) → **Add new site** → **Import an existing project** → pilih repository GitHub ini.
2. Netlify otomatis membaca `netlify.toml` (`npm run build`, publish `dist`, dan Netlify Functions untuk `/api/local-auth/verify`).

### Opsi 3: Render (`render.yaml` sudah tersedia)
1. Buka [Render](https://render.com) → **New +** → **Web Service** (atau **Blueprint**).
2. Hubungkan akun GitHub dan pilih repository aplikasi ini.
3. Konfigurasi otomatis / manual:
   - **Runtime**: Node (`>= 22.18.0`)
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Health Check Path**: `/api/health`
4. Tambahkan **Environment Variables**:
   - `NODE_ENV` = `production`
   - `SUPERADMIN_PASSWORD` = *(opsional, isi password custom jika ingin mengganti password server bawaan)*

### Opsi 4: Railway / Koyeb / Fly.io / VPS (Docker)
- File `Dockerfile` sudah tersedia untuk deployment berbasis container (`Node 22 Alpine`, `EXPOSE 3000`, `npm run build`, `npm start`).
- Atau jalankan langsung via Node.js:
  - Build command: `npm install && npm run build`
  - Start command: `npm start`

## Pengaturan Wajib Setelah Hosting Aktif (Firebase)

Jika Anda menggunakan sinkronisasi Cloud Firestore pada domain hosting baru:

1. Buka [Firebase Console](https://console.firebase.google.com/) untuk proyek yang terhubung.
2. Masuk ke **Authentication → Settings → Authorized domains**.
3. Klik **Add domain**, lalu masukkan domain hosting Anda (misalnya `nama-app.onrender.com` atau domain kustom Anda).
