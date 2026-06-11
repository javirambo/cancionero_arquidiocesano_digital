-- =====================================================================
-- Cancionero Arquidiocesano Digital — Orden de listas
-- Migración: 0050_playlists_sort_order
--
-- Agrega la columna `sort_order` a `playlists` para permitir ordenar las
-- listas de forma determinada (una debajo de otra). Menor primero; a
-- igualdad de orden, se desempata por fecha de creación (más nueva
-- primero), igual que el orden previo.
--
-- Default 0 para todas las listas existentes y nuevas.
-- =====================================================================

alter table public.playlists
  add column if not exists sort_order int not null default 0;

create index if not exists playlists_sort_order_idx
  on public.playlists(sort_order);
