-- RiderCare: jalankan seluruh SQL ini di Supabase Dashboard > SQL Editor.
-- Satu baris per akun; payload JSONB menyimpan profil motor, odometer,
-- jadwal maintenance, dan riwayat servis sebagai satu snapshot.
create table if not exists public.ridercare_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  app_data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.ridercare_data enable row level security;

drop policy if exists "Users can read own RiderCare data" on public.ridercare_data;
create policy "Users can read own RiderCare data"
  on public.ridercare_data for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own RiderCare data" on public.ridercare_data;
create policy "Users can insert own RiderCare data"
  on public.ridercare_data for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own RiderCare data" on public.ridercare_data;
create policy "Users can update own RiderCare data"
  on public.ridercare_data for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Tidak ada policy DELETE: aplikasi tidak membutuhkan penghapusan baris akun.
