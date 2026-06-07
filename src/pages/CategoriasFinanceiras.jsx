// src/pages/CategoriasFinanceiras.jsx
import { useState, useEffect, useCallback } from "react";
import { Categorias } from "../lib/db";

const GRUPOS = [
  { tipo: "receita",       label: "Receitas",        icon: "↑", cor: "#00D4A0" },
  { tipo: "despesa",       label: "Despesas",        icon: "↓", cor: "#FF5470" },
  { tipo: "transferencia", label: "Transferências",  icon: "⇄", cor: "#0090FF" },
];

export default function CategoriasFinanceiras({ empresaId, clienteId, navigate }) {
  const [cats, setCats]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro]       = useState("");
  const [msg, setMsg]         = useState("");
  const [expand, setExpand]   = useState({});     // { [id]: true }
  const [editando, setEditando] = useState(null); // { id, nome } | { novoEm, tipo, parent_id }
  const [novoNome, setNovoNome] = useState("");
  const [semeando, setSemeando] = useState(false);

  const carregar = useCallback(async () => {
    if (!empresaId || !clienteId) { setLoading(false); return; }
    setLoading(true); setErro("");
    const { data, error } = await Categorias.listar(empresaId, clienteId, false);
    if (error) setErro(error.message);
    setCats(data || []);
    setLoading(false);
  }, [empresaId, clienteId]);

  useEffect(() => { carregar(); }, [carregar]);

  const flash = (t) => { setMsg(t); setTimeout(() => setMsg(""), 2500); };

  // ── árvore ──────────────────────────────────────────────
  const filhosDe = (parentId, tipo) =>
    cats
      .filter(c => (c.parent_id || null) === (parentId || null) && c.tipo === tipo)
      .sort((a, b) => (a.codigo || "zz").localeCompare(b.codigo || "zz", undefined, { numeric: true }));

  const temFilhos = (id) => cats.some(c => c.parent_id === id);

  // ── ações ───────────────────────────────────────────────
  async function salvarNome(id) {
    if (!editando?.nome?.trim()) return;
    const { error } = await Categorias.atualizar(id, { nome: editando.nome.trim() });
    if (error) { setErro(error.message); return; }
    setEditando(null); flash("Categoria atualizada."); carregar();
  }

  async function criarFilha(parent, tipo) {
    if (!novoNome.trim()) return;
    const { error } = await Categorias.criar({
      empresa_id: empresaId, cliente_helevare_id: clienteId,
      nome: novoNome.trim(), tipo, parent_id: parent || null, ativo: true,
    });
    if (error) { setErro(error.message); return; }
    setNovoNome(""); setEditando(null);
    if (parent) setExpand(e => ({ ...e, [parent]: true }));
    flash("Categoria criada."); carregar();
  }

  async function toggleAtivo(c) {
    const { error } = await Categorias.atualizar(c.id, { ativo: !c.ativo });
    if (error) { setErro(error.message); return; }
    carregar();
  }

  async function excluir(c) {
    const n = cats.filter(x => x.parent_id === c.id).length;
    const aviso = n > 0
      ? `Excluir "${c.nome}" e suas ${n} subcategoria(s)? Esta ação não pode ser desfeita.`
      : `Excluir "${c.nome}"?`;
    if (!window.confirm(aviso)) return;
    const { error } = await Categorias.deletar(c.id);
    if (error) { setErro(error.message); return; }
    flash("Categoria excluída."); carregar();
  }

  async function carregarPadrao() {
    if (!window.confirm("Carregar o plano de contas padrão para este cliente? As categorias atuais serão mantidas e as novas adicionadas.")) return;
    setSemeando(true); setErro("");
    const { error, count } = await Categorias.semearPadrao(empresaId, clienteId);
    setSemeando(false);
    if (error) { setErro(error.message); return; }
    flash(`Plano padrão carregado: ${count} categorias.`); carregar();
  }

  // ── render de um nó (recursivo) ─────────────────────────
  const Node = ({ c, nivel, cor }) => {
    const aberto = expand[c.id];
    const filhos = cats.filter(x => x.parent_id === c.id)
      .sort((a, b) => (a.codigo || "zz").localeCompare(b.codigo || "zz", undefined, { numeric: true }));
    const editandoEste = editando?.id === c.id;
    const criandoAqui  = editando?.novoEm === c.id;

    return (
      <div>
        <div style={{
          display: "flex", alignItems: "center", gap: 8,
          padding: "8px 10px", paddingLeft: 10 + nivel * 22,
          borderBottom: "1px solid var(--border)",
          background: c.ativo ? "transparent" : "rgba(255,255,255,0.02)",
          opacity: c.ativo ? 1 : 0.5,
        }}>
          <span onClick={() => temFilhos(c.id) && setExpand(e => ({ ...e, [c.id]: !e[c.id] }))}
            style={{ width: 16, cursor: temFilhos(c.id) ? "pointer" : "default", color: "var(--text3)", fontSize: 11, userSelect: "none" }}>
            {temFilhos(c.id) ? (aberto ? "▼" : "▶") : ""}
          </span>
          {c.codigo && <span style={{ color: "var(--text3)", fontSize: 11, fontFamily: "monospace", minWidth: 44 }}>{c.codigo}</span>}

          {editandoEste ? (
            <input autoFocus className="inp" style={{ flex: 1, height: 30, fontSize: 13 }}
              value={editando.nome}
              onChange={e => setEditando({ ...editando, nome: e.target.value })}
              onKeyDown={e => { if (e.key === "Enter") salvarNome(c.id); if (e.key === "Escape") setEditando(null); }} />
          ) : (
            <span style={{ flex: 1, fontSize: 13, color: "var(--text)", fontWeight: nivel === 0 ? 600 : 400 }}>{c.nome}</span>
          )}

          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {editandoEste ? (
              <>
                <button className="btn btn-primary" style={btnMini} onClick={() => salvarNome(c.id)}>Salvar</button>
                <button className="btn btn-ghost" style={btnMini} onClick={() => setEditando(null)}>✕</button>
              </>
            ) : (
              <>
                <button className="btn btn-ghost" style={btnMini} title="Adicionar subcategoria"
                  onClick={() => { setEditando({ novoEm: c.id }); setNovoNome(""); setExpand(e => ({ ...e, [c.id]: true })); }}>＋</button>
                <button className="btn btn-ghost" style={btnMini} title="Renomear"
                  onClick={() => setEditando({ id: c.id, nome: c.nome })}>✎</button>
                <button className="btn btn-ghost" style={btnMini} title={c.ativo ? "Desativar" : "Ativar"}
                  onClick={() => toggleAtivo(c)}>{c.ativo ? "🚫" : "✓"}</button>
                <button className="btn btn-ghost" style={{ ...btnMini, color: "#FF5470" }} title="Excluir"
                  onClick={() => excluir(c)}>🗑</button>
              </>
            )}
          </div>
        </div>

        {/* input de nova subcategoria */}
        {criandoAqui && (
          <div style={{ display: "flex", gap: 8, padding: "8px 10px", paddingLeft: 10 + (nivel + 1) * 22, borderBottom: "1px solid var(--border)", background: "rgba(0,212,160,0.04)" }}>
            <input autoFocus className="inp" style={{ flex: 1, height: 30, fontSize: 13 }}
              placeholder={`Nova subcategoria em "${c.nome}"...`}
              value={novoNome} onChange={e => setNovoNome(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") criarFilha(c.id, c.tipo); if (e.key === "Escape") setEditando(null); }} />
            <button className="btn btn-primary" style={btnMini} onClick={() => criarFilha(c.id, c.tipo)}>Criar</button>
            <button className="btn btn-ghost" style={btnMini} onClick={() => setEditando(null)}>✕</button>
          </div>
        )}

        {aberto && filhos.map(f => <Node key={f.id} c={f} nivel={nivel + 1} cor={cor} />)}
      </div>
    );
  };

  // ── sem cliente ativo ───────────────────────────────────
  if (!clienteId) {
    return (
      <div className="fade-up">
        <BackHeader navigate={navigate} />
        <div className="card"><div className="card-body" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>
          Selecione um cliente ativo para gerenciar as categorias.
        </div></div>
      </div>
    );
  }

  const totalAtivas = cats.filter(c => c.ativo).length;

  return (
    <div className="fade-up">
      <BackHeader navigate={navigate} />

      {msg  && <div className="success-banner" style={{ marginBottom: 12 }}>✅ {msg}</div>}
      {erro && <div className="error-banner"   style={{ marginBottom: 12 }}>⚠️ {erro}</div>}

      <div className="card mb-16">
        <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            <strong style={{ color: "var(--text)" }}>{cats.length}</strong> categorias cadastradas · <strong style={{ color: "var(--accent)" }}>{totalAtivas}</strong> ativas
          </div>
          {cats.length === 0 && (
            <button className="btn btn-primary" onClick={carregarPadrao} disabled={semeando}>
              {semeando ? "⏳ Carregando..." : "📋 Carregar plano de contas padrão"}
            </button>
          )}
          {cats.length > 0 && (
            <button className="btn btn-ghost" onClick={carregarPadrao} disabled={semeando}>
              {semeando ? "⏳ Carregando..." : "＋ Adicionar plano padrão"}
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card"><div className="card-body" style={{ textAlign: "center", padding: 40, color: "var(--text3)" }}>Carregando...</div></div>
      ) : cats.length === 0 ? (
        <div className="card"><div className="card-body" style={{ textAlign: "center", padding: 48, color: "var(--text3)" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
          <div style={{ fontSize: 15, color: "var(--text)", marginBottom: 6 }}>Nenhuma categoria cadastrada para este cliente</div>
          <div style={{ fontSize: 13 }}>Clique em "Carregar plano de contas padrão" para começar com a estrutura completa.</div>
        </div></div>
      ) : (
        <div className="flex-col gap-16">
          {GRUPOS.map(g => {
            const raizes = filhosDe(null, g.tipo);
            return (
              <div key={g.tipo} className="card">
                <div className="card-header" style={{ borderLeft: `3px solid ${g.cor}` }}>
                  <span className="card-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ color: g.cor }}>{g.icon}</span> {g.label}
                    <span className="badge" style={{ background: `${g.cor}22`, color: g.cor }}>{cats.filter(c => c.tipo === g.tipo).length}</span>
                  </span>
                  <button className="btn btn-ghost" style={btnMini}
                    onClick={() => { setEditando({ novoEm: `root-${g.tipo}` }); setNovoNome(""); }}>＋ Categoria</button>
                </div>

                {/* nova categoria raiz */}
                {editando?.novoEm === `root-${g.tipo}` && (
                  <div style={{ display: "flex", gap: 8, padding: "8px 16px", borderBottom: "1px solid var(--border)", background: "rgba(0,212,160,0.04)" }}>
                    <input autoFocus className="inp" style={{ flex: 1, height: 30, fontSize: 13 }}
                      placeholder={`Nova categoria em ${g.label}...`}
                      value={novoNome} onChange={e => setNovoNome(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") criarFilha(null, g.tipo); if (e.key === "Escape") setEditando(null); }} />
                    <button className="btn btn-primary" style={btnMini} onClick={() => criarFilha(null, g.tipo)}>Criar</button>
                    <button className="btn btn-ghost" style={btnMini} onClick={() => setEditando(null)}>✕</button>
                  </div>
                )}

                <div className="card-body" style={{ padding: 0 }}>
                  {raizes.length === 0
                    ? <div style={{ padding: 20, textAlign: "center", color: "var(--text3)", fontSize: 13 }}>Sem categorias neste grupo.</div>
                    : raizes.map(r => <Node key={r.id} c={r} nivel={0} cor={g.cor} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const btnMini = { height: 28, padding: "0 8px", fontSize: 12, minWidth: 0 };

function BackHeader({ navigate }) {
  return (
    <div className="section-header mb-20" style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {navigate && (
        <button className="btn btn-ghost btn-icon" onClick={() => navigate("config")} title="Voltar para Configurações">←</button>
      )}
      <div>
        <div className="section-title">Categorias Financeiras</div>
        <div className="section-sub">Plano de contas em árvore — exclusivo deste cliente</div>
      </div>
    </div>
  );
}
