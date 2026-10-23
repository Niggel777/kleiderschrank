-- Garderobe: ein Dokument-Speicher für Teile, Tragetage, Outfits und Einstellungen,
-- dazu ein privater Bilder-Bucket. Jeder Nutzer sieht nur seine eigenen Daten.

create table if not exists public.docs (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null check (kind in ('item', 'wear', 'outfit', 'setting')),
  id text not null,
  data jsonb,
  deleted boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, kind, id)
);

create index if not exists docs_user_updated on public.docs (user_id, updated_at);

alter table public.docs enable row level security;

create policy "eigene Dokumente lesen" on public.docs for select using (auth.uid() = user_id);
create policy "eigene Dokumente anlegen" on public.docs for insert with check (auth.uid() = user_id);
create policy "eigene Dokumente ändern" on public.docs for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "eigene Dokumente löschen" on public.docs for delete using (auth.uid() = user_id);

-- updated_at serverseitig setzen, damit Geräte-Uhren keine Rolle spielen
create or replace function public.docs_touch() returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists docs_touch on public.docs;
create trigger docs_touch before insert or update on public.docs for each row execute function public.docs_touch();

insert into storage.buckets (id, name, public) values ('bilder', 'bilder', false) on conflict (id) do nothing;

create policy "eigene Bilder lesen" on storage.objects for select using (bucket_id = 'bilder' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Bilder hochladen" on storage.objects for insert with check (bucket_id = 'bilder' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Bilder ändern" on storage.objects for update using (bucket_id = 'bilder' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "eigene Bilder löschen" on storage.objects for delete using (bucket_id = 'bilder' and (storage.foldername(name))[1] = auth.uid()::text);
