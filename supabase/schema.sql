-- ============================================================
-- FiscalAI — Schema completo do banco de dados
-- Rodar no Supabase: SQL Editor → colar tudo → Run
-- ============================================================

-- ── EXTENSÕES ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── EMPRESAS (tenants) ─────────────────────────────────────
create table if not exists empresas (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  cnpj        text unique not null,
  regime      text not null default 'Lucro Presumido'
                check (regime in ('Simples Nacional','Lucro Presumido','Lucro Real')),
  cnae        text,
  responsavel text,
  email       text,
  telefone    text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ── USUÁRIOS ───────────────────────────────────────────────
-- Extende o auth.users do Supabase
create table if not exists perfis (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid references empresas(id) on delete cascade,
  nome        text not null,
  email       text not null,
  papel       text not null default 'viewer'
                check (papel in ('admin','contador','gerente','viewer')),
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ── CATEGORIAS FINANCEIRAS ─────────────────────────────────
create table if not exists categorias (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid references empresas(id) on delete cascade,
  nome        text not null,
  tipo        text not null check (tipo in ('receita','despesa','transferencia')),
  cor         text default '#00D4A0',
  icone       text default '💰',
  ativo       boolean not null default true
);

-- ── CLIENTES ───────────────────────────────────────────────
create table if not exists clientes (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid references empresas(id) on delete cascade,
  nome        text not null,
  cpf_cnpj    text,
  email       text,
  telefone    text,
  endereco    text,
  cidade      text,
  estado      text,
  cep         text,
  tipo        text not null default 'pj' check (tipo in ('pf','pj')),
  limite_credito numeric(15,2) default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ── FORNECEDORES ───────────────────────────────────────────
create table if not exists fornecedores (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid references empresas(id) on delete cascade,
  nome        text not null,
  cpf_cnpj    text,
  email       text,
  telefone    text,
  endereco    text,
  cidade      text,
  estado      text,
  categoria   text,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

-- ── LANÇAMENTOS FINANCEIROS ────────────────────────────────
create table if not exists lancamentos (
  id            uuid primary key default uuid_generate_v4(),
  empresa_id    uuid references empresas(id) on delete cascade,
  descricao     text not null,
  valor         numeric(15,2) not null,
  tipo          text not null check (tipo in ('entrada','saida')),
  status        text not null default 'confirmado'
                  check (status in ('pendente','confirmado','cancelado')),
  data_lancamento date not null default current_date,
  data_competencia date,
  categoria_id  uuid references categorias(id),
  cliente_id    uuid references clientes(id),
  fornecedor_id uuid references fornecedores(id),
  nota_fiscal_id uuid,  -- FK adicionada após criar tabela nfs
  observacao    text,
  criado_por    uuid references auth.users(id),
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ── CONTAS A PAGAR ─────────────────────────────────────────
create table if not exists contas_pagar (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid references empresas(id) on delete cascade,
  descricao       text not null,
  valor           numeric(15,2) not null,
  valor_pago      numeric(15,2) default 0,
  vencimento      date not null,
  data_pagamento  date,
  status          text not null default 'pendente'
                    check (status in ('pendente','pago','vencido','cancelado','parcelado')),
  fornecedor_id   uuid references fornecedores(id),
  categoria_id    uuid references categorias(id),
  recorrente      boolean default false,
  parcelas        int default 1,
  parcela_atual   int default 1,
  observacao      text,
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

-- ── CONTAS A RECEBER ───────────────────────────────────────
create table if not exists contas_receber (
  id                uuid primary key default uuid_generate_v4(),
  empresa_id        uuid references empresas(id) on delete cascade,
  descricao         text not null,
  valor             numeric(15,2) not null,
  valor_recebido    numeric(15,2) default 0,
  vencimento        date not null,
  data_recebimento  date,
  status            text not null default 'pendente'
                      check (status in ('pendente','recebido','vencido','cancelado','parcial')),
  cliente_id        uuid references clientes(id),
  categoria_id      uuid references categorias(id),
  nota_fiscal_numero text,
  observacao        text,
  criado_por        uuid references auth.users(id),
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- ── NOTAS FISCAIS ──────────────────────────────────────────
create table if not exists notas_fiscais (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid references empresas(id) on delete cascade,
  numero          text not null,
  serie           text,
  tipo            text not null check (tipo in ('nfe','nfse','nfce','cte')),
  operacao        text not null check (operacao in ('entrada','saida')),
  status          text not null default 'autorizada'
                    check (status in ('autorizada','cancelada','denegada','pendente')),
  chave_acesso    text unique,
  data_emissao    date not null,
  data_entrada    date,
  valor_total     numeric(15,2) not null,
  valor_produtos  numeric(15,2),
  valor_servicos  numeric(15,2),
  base_calculo    numeric(15,2),
  -- tributos
  valor_icms      numeric(15,2) default 0,
  valor_pis       numeric(15,2) default 0,
  valor_cofins    numeric(15,2) default 0,
  valor_iss       numeric(15,2) default 0,
  valor_ipi       numeric(15,2) default 0,
  valor_inss      numeric(15,2) default 0,
  aliq_icms       numeric(6,4) default 0,
  aliq_pis        numeric(6,4) default 0,
  aliq_cofins     numeric(6,4) default 0,
  -- emitente/destinatário
  emit_cnpj       text,
  emit_nome       text,
  dest_cnpj       text,
  dest_nome       text,
  cliente_id      uuid references clientes(id),
  fornecedor_id   uuid references fornecedores(id),
  -- xml e pdf
  xml_url         text,
  pdf_url         text,
  xml_conteudo    text,
  observacao      text,
  criado_por      uuid references auth.users(id),
  criado_em       timestamptz not null default now()
);

-- FK de lancamentos → notas_fiscais (agora que a tabela existe)
alter table lancamentos
  add constraint fk_lancamento_nf
  foreign key (nota_fiscal_id) references notas_fiscais(id);

-- ── ITENS DAS NOTAS FISCAIS ────────────────────────────────
create table if not exists nf_itens (
  id              uuid primary key default uuid_generate_v4(),
  nota_fiscal_id  uuid references notas_fiscais(id) on delete cascade,
  codigo          text,
  descricao       text not null,
  ncm             text,
  cfop            text,
  unidade         text,
  quantidade      numeric(15,4) not null,
  valor_unitario  numeric(15,4) not null,
  valor_total     numeric(15,2) not null,
  valor_icms      numeric(15,2) default 0,
  valor_pis       numeric(15,2) default 0,
  valor_cofins    numeric(15,2) default 0,
  valor_ipi       numeric(15,2) default 0
);

-- ── CREDITOS TRIBUTÁRIOS ───────────────────────────────────
create table if not exists creditos_tributarios (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid references empresas(id) on delete cascade,
  tipo            text not null,  -- PIS, COFINS, ICMS, INSS, etc.
  tese            text not null,
  fundamentacao   text,
  valor_estimado  numeric(15,2) not null,
  valor_confirmado numeric(15,2),
  probabilidade   int check (probabilidade between 0 and 100),
  status          text not null default 'mapeado'
                    check (status in ('mapeado','em_analise','constituido','recuperado','negado')),
  data_mapeamento date not null default current_date,
  data_constituicao date,
  data_recuperacao date,
  observacao      text,
  criado_em       timestamptz not null default now()
);

-- ── ROW LEVEL SECURITY (RLS) ───────────────────────────────
-- Cada empresa só vê os seus próprios dados

alter table empresas          enable row level security;
alter table perfis            enable row level security;
alter table categorias        enable row level security;
alter table clientes          enable row level security;
alter table fornecedores      enable row level security;
alter table lancamentos       enable row level security;
alter table contas_pagar      enable row level security;
alter table contas_receber    enable row level security;
alter table notas_fiscais     enable row level security;
alter table nf_itens          enable row level security;
alter table creditos_tributarios enable row level security;

-- Função auxiliar: retorna empresa_id do usuário logado
create or replace function empresa_do_usuario()
returns uuid language sql security definer stable as $$
  select empresa_id from perfis where id = auth.uid()
$$;

-- Políticas: usuário vê/altera apenas dados da sua empresa
create policy "empresa propria" on empresas
  using (id = empresa_do_usuario());

create policy "empresa propria" on categorias
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on clientes
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on fornecedores
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on lancamentos
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on contas_pagar
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on contas_receber
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on notas_fiscais
  using (empresa_id = empresa_do_usuario());

create policy "empresa propria" on creditos_tributarios
  using (empresa_id = empresa_do_usuario());

create policy "nf_itens via nf" on nf_itens
  using (nota_fiscal_id in (
    select id from notas_fiscais where empresa_id = empresa_do_usuario()
  ));

create policy "perfil proprio" on perfis
  using (id = auth.uid());

-- ── ÍNDICES ────────────────────────────────────────────────
create index on lancamentos(empresa_id, data_lancamento desc);
create index on lancamentos(empresa_id, tipo);
create index on contas_pagar(empresa_id, vencimento);
create index on contas_pagar(empresa_id, status);
create index on contas_receber(empresa_id, vencimento);
create index on contas_receber(empresa_id, status);
create index on notas_fiscais(empresa_id, data_emissao desc);
create index on notas_fiscais(chave_acesso);
create index on clientes(empresa_id);
create index on fornecedores(empresa_id);

-- ── TRIGGER: atualiza atualizado_em ───────────────────────
create or replace function set_atualizado_em()
returns trigger language plpgsql as $$
begin new.atualizado_em = now(); return new; end;
$$;

create trigger trg_lancamentos_upd
  before update on lancamentos
  for each row execute function set_atualizado_em();

create trigger trg_contas_pagar_upd
  before update on contas_pagar
  for each row execute function set_atualizado_em();

create trigger trg_contas_receber_upd
  before update on contas_receber
  for each row execute function set_atualizado_em();

create trigger trg_clientes_upd
  before update on clientes
  for each row execute function set_atualizado_em();

-- ── DADOS INICIAIS (categorias padrão) ────────────────────
-- Rode após criar sua empresa pelo sistema de onboarding
-- insert into categorias (empresa_id, nome, tipo, cor, icone) values
--   ('<SUA_EMPRESA_ID>', 'Serviços Prestados',  'receita',  '#00D4A0', '💼'),
--   ('<SUA_EMPRESA_ID>', 'Venda de Produtos',   'receita',  '#0090FF', '📦'),
--   ('<SUA_EMPRESA_ID>', 'Tributário',           'despesa',  '#FF4757', '⚖️'),
--   ('<SUA_EMPRESA_ID>', 'Folha de Pagamento',   'despesa',  '#FF6B35', '👥'),
--   ('<SUA_EMPRESA_ID>', 'Infraestrutura',        'despesa',  '#A855F7', '🏢'),
--   ('<SUA_EMPRESA_ID>', 'Marketing',             'despesa',  '#FFB800', '📣');
