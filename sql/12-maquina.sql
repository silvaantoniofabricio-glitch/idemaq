-- sql/12-maquina.sql
-- Tabela de máquinas para revenda (Módulo 07 — chassi + revenda).
-- Rode no Supabase SQL Editor antes de usar o cadastro de máquinas.

create table if not exists maquina (
  id            uuid          primary key default gen_random_uuid(),
  modelo        text          not null,
  marca         text,
  capacidade    text,
  estado        text          not null default 'disponivel'
                              check (estado in ('disponivel','em_revisao','do_cliente','vendida')),
  custo_compra  numeric(10,2) not null default 0,
  custo_itens   numeric(10,2) not null default 0,
  custo_servico numeric(10,2) not null default 0,
  preco_venda   numeric(10,2) not null default 0,
  observacoes   text,
  deleted_at    timestamptz,
  criado_em     timestamptz   not null default now(),
  atualizado_em timestamptz   not null default now()
);

create index if not exists maquina_deleted_at_idx on maquina (deleted_at) where deleted_at is null;
create index if not exists maquina_estado_idx     on maquina (estado);

alter table maquina enable row level security;

create policy "maquina_read"   on maquina for select to authenticated using (deleted_at is null);
create policy "maquina_insert" on maquina for insert to authenticated with check (true);
create policy "maquina_update" on maquina for update to authenticated using (true);
create policy "maquina_delete" on maquina for delete to authenticated using (true);
