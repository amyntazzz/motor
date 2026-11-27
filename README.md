# RiderCare + Supabase

## Yang sudah disiapkan
- Login/daftar akun dengan Supabase Auth (email + password).
- Data RiderCare disimpan di tabel `public.ridercare_data` (JSONB) dan terikat ke akun.
- Sinkronisasi otomatis setiap kali profil, odometer, jadwal, atau riwayat servis disimpan.
- RLS membatasi setiap akun hanya dapat membaca/menulis datanya sendiri.
- Backup JSON lokal tetap tersedia melalui menu Pengaturan.

## 1. Buat project Supabase
1. Buka https://supabase.com/ lalu buat project baru.
2. Di **Project Settings → API** (atau **Data API**), salin **Project URL** dan **anon/public key** (publishable key).
3. Buka **SQL Editor → New query**, tempel seluruh isi `supabase-schema.sql`, lalu klik Run.
4. Di **Authentication → URL Configuration**, tambahkan URL deployment ke Site URL dan Redirect URLs. Untuk uji lokal, tambahkan `http://localhost:8000/**`.
5. Jika ingin pendaftaran langsung tanpa verifikasi email saat uji, atur Email confirmation di Authentication sesuai kebutuhan. Untuk penggunaan publik, sebaiknya verifikasi email tetap aktif.

## 2. Hubungkan website
1. Buka `config.js`.
2. Ganti `YOUR_PROJECT_ID` pada URL dan isi key anon/publishable.
3. Jangan pernah gunakan `service_role` atau secret key di browser.
4. Simpan file.

## 3. Uji lokal
Jalankan server statis dari folder proyek:
```bash
python -m http.server 8000
```
Lalu buka http://localhost:8000. Daftar akun, login, lalu coba ubah profil dan simpan odometer. Periksa tabel `ridercare_data` di Supabase.

## 4. Publish ke Vercel
1. Upload folder proyek ke repository GitHub.
2. Di Vercel pilih **Add New → Project**, impor repository tersebut.
3. Framework preset: **Other**; Build Command dan Output Directory dikosongkan (static site).
4. Deploy. Karena konfigurasi dibaca dari `config.js`, pastikan file itu sudah diisi sebelum deploy.
5. Masukkan domain Vercel di Supabase **Authentication → URL Configuration** (Site URL dan Redirect URLs), lalu redeploy jika perlu.

## Catatan
- Prototype ini menyimpan satu motor utama per akun.
- Data lama dari localStorage pada browser yang sama akan dicoba diimpor saat pertama login akun baru.
- Sinkronisasi menyimpan snapshot JSONB utuh per akun; untuk MVP sederhana ini praktis. Jika kelak butuh banyak motor, sharing bengkel, laporan kompleks, atau query analitik, migrasikan ke tabel relasional terpisah.
- Pengingat di dalam website dihitung setelah odometer/tanggal diperbarui manual. Website ini belum mengirim notifikasi push/email/WhatsApp otomatis.
- Interval servis bawaan hanyalah contoh. Sesuaikan dengan buku manual motor.
