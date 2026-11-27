# Integrasi Telegram RiderCare — multi-pengguna

Paket ini menghubungkan Telegram ID setiap pengguna ke akun Supabase Auth/RiderCare masing-masing. Bot menyediakan tombol menu dan perintah teks.

## Isi paket
- `index.html`: website RiderCare dengan panel Pengaturan → Hubungkan Telegram.
- `supabase/telegram-schema.sql`: tabel pairing dan RPC untuk menulis data ke JSONB RiderCare.
- `supabase/functions/telegram-link-code/index.ts`: membuat kode pairing setelah user login.
- `supabase/functions/telegram-bot/index.ts`: webhook Telegram.
- `supabase/config.toml`: konfigurasi Supabase CLI.

## Prasyarat
Project Supabase RiderCare aktif, tabel `public.ridercare_data(user_id, app_data, updated_at)` sudah tersedia, serta Supabase CLI terpasang. Jangan matikan RLS pada tabel data utama.

## 1. Jalankan SQL
Supabase Dashboard → SQL Editor → New query. Salin seluruh `supabase/telegram-schema.sql`, lalu Run. SQL ini mengasumsikan tabel `ridercare_data` yang dipakai website sudah ada.

## 2. Buat bot
Di Telegram, buka `@BotFather`, kirim `/newbot`, ikuti instruksi, simpan token bot secara privat. Jangan masukkan token ke HTML, GitHub, atau chat.

## 3. Deploy Edge Functions
Di terminal, dari folder paket:
```bash
supabase login
supabase link --project-ref PROJECT_REF_ANDA
supabase secrets set TELEGRAM_BOT_TOKEN="TOKEN_BOTFATHER" TELEGRAM_WEBHOOK_SECRET="RAHASIA_PANJANG_RANDOM"
supabase functions deploy telegram-link-code --no-verify-jwt
supabase functions deploy telegram-bot --no-verify-jwt
```
Ganti placeholder di komputer Anda. Project ref ada di Project Settings → General. Edge Functions memakai `SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` dari environment Supabase. Pastikan service-role tersedia sebagai secret server-side. Jangan pernah memasukkannya ke frontend.

## 4. Daftarkan webhook (PowerShell)
```powershell
$token = "TOKEN_BOTFATHER"
$secret = "RAHASIA_PANJANG_RANDOM"
$webhook = "https://PROJECT_REF_ANDA.supabase.co/functions/v1/telegram-bot"
Invoke-RestMethod -Method Post -Uri "https://api.telegram.org/bot$token/setWebhook" -Headers @{"Content-Type"="application/json"} -Body (@{url=$webhook; secret_token=$secret} | ConvertTo-Json)
```
Gunakan nilai rahasia yang sama persis dengan `TELEGRAM_WEBHOOK_SECRET`. Jangan bagikan token atau output rahasia.

## 5. Pasang website
Backup `index.html` lama, lalu ganti dengan `index.html` dari paket ini. Pertahankan `config.js` milik Anda yang berisi Project URL dan anon/publishable key. Login website → Pengaturan → Buat kode penghubung Telegram. Buka bot, kirim `/link KODE`.

Kode 6 digit berlaku 10 menit, sekali pakai, dan disimpan dalam bentuk hash.

## 6. Cara input
Tombol menu:
- `📍 Catat KM`, lalu kirim `28500 | Perjalanan pulang`
- `🛠 Catat Servis`, lalu kirim `Ganti oli | 28500 | 75000 | 25000 | Ganti oli sintetis`
- `🏍 Profil Motor`, `📅 Jadwal`, `💰 Pengeluaran`, `❓ Bantuan`

Perintah teks:
```text
/odo 28500 | Perjalanan pulang
/servis Ganti oli | 28500 | 75000 | 25000 | Catatan
/motor
/jadwal
/biaya
/bantuan
```
Format servis: nama | KM | biaya sparepart | biaya jasa | catatan. Biaya tanpa pemisah ribuan.

## 7. Uji multi-pengguna
Buat dua akun RiderCare berbeda. Dari masing-masing akun, buat kode lalu tautkan Telegram masing-masing. Kirim catatan dari kedua Telegram dan pastikan data hanya muncul di akun yang sesuai.

## Keamanan dan batasan versi awal
- Satu Telegram ID dan satu akun RiderCare hanya dapat memiliki satu relasi aktif. Fitur unlink/ganti akun belum disediakan.
- Webhook mengandalkan header secret Telegram karena Telegram tidak mengirim JWT Supabase. Endpoint pembuat kode tetap memvalidasi access token Supabase.
- Service-role key dan token bot hanya berada di server/Edge Function.
- Bot dapat menambah odometer dan servis serta membaca profil, jadwal, dan pengeluaran. Edit profil dan edit jadwal via Telegram belum tersedia.
- Sebelum rilis publik, tambahkan rate limiting, logging, prosedur unlink, dan pengujian keamanan.
