-- Freigaben: Link zum Ansehen des eigenen Schranks (nur lesen). Der Besitzer kann sie anlegen und widerrufen.
create table if not exists public.freigaben (
  token text primary key default encode(gen_random_bytes(12), 'hex'),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

alter table public.freigaben enable row level security;

create policy "eigene Freigaben lesen" on public.freigaben for select using (auth.uid() = user_id);
create policy "eigene Freigaben anlegen" on public.freigaben for insert with check (auth.uid() = user_id);
create policy "eigene Freigaben löschen" on public.freigaben for delete using (auth.uid() = user_id);
