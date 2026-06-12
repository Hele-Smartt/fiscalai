import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./lib/AuthContext";
import NovoLancamento from "./pages/forms/NovoLancamento";
import NovaContaPagar from "./pages/forms/NovaContaPagar";
import NovoFornecedor from "./pages/forms/NovoFornecedor";
import NovaContaReceber from "./pages/forms/NovaContaReceber";
import ImportarNFe from "./pages/ImportarNFe";
import RelatoriosPage from "./pages/Relatorios";
import Usuarios from "./pages/Usuarios";
import ConciliacaoBancaria from "./pages/ConciliacaoBancaria";
import SplitPaymentPage from "./pages/SplitPayment";
import RepasseMedico from "./pages/RepasseMedico";
import OperadorasCartao from "./pages/OperadorasCartao";
import GestaoBancaria from "./pages/GestaoBancaria";
import { ClienteProvider, useCliente } from "./lib/ClienteContext";
import TelaInicial from "./pages/TelaInicial";
import ClienteBar from "./components/ClienteBar";
import NovoCliente from "./pages/forms/NovoCliente";
import CategoriasFinanceiras from "./pages/CategoriasFinanceiras";
import Login from "./pages/Login";
import { supabase } from "./lib/supabase";
import { Lancamentos, ContasPagar, ContasReceber, Clientes, Fornecedores, NotasFiscais, Categorias, Fluxo, ContasBancarias, Dashboard as DashboardDB } from "./lib/db";

// ─── PALETTE & TOKENS ───────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,300&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg:        #080C14;
    --bg2:       #0D1320;
    --bg3:       #111927;
    --card:      #0F1929;
    --border:    rgba(255,255,255,0.06);
    --border2:   rgba(255,255,255,0.12);
    --text:      #E8EDF5;
    --text2:     #8A97AE;
    --text3:     #4D5A6E;
    --accent:    #00D4A0;
    --accent2:   #0090FF;
    --accent3:   #FF6B35;
    --accent4:   #A855F7;
    --danger:    #FF4757;
    --warn:      #FFB800;
    --success:   #00D4A0;
    --font-head: 'Syne', sans-serif;
    --font-body: 'DM Sans', sans-serif;
    --radius:    12px;
    --radius2:   20px;
    --shadow:    0 4px 24px rgba(0,0,0,0.4);
    --shadow2:   0 8px 40px rgba(0,0,0,0.6);
    --glow:      0 0 40px rgba(0,212,160,0.15);
    --transition: all 0.2s cubic-bezier(0.4,0,0.2,1);
  }

  html, body, #root { height: 100%; width: 100%; overflow: hidden; background: var(--bg); color: var(--text); font-family: var(--font-body); font-size: 14px; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 2px; }

  .app { display: flex; height: 100vh; width: 100vw; overflow: hidden; }

  /* ── SIDEBAR ── */
  .sidebar {
    width: 240px; min-width: 240px; height: 100vh;
    background: var(--bg2);
    border-right: 1px solid var(--border);
    display: flex; flex-direction: column;
    overflow: hidden;
    transition: width 0.3s cubic-bezier(0.4,0,0.2,1);
    z-index: 50;
  }
  .sidebar.collapsed { width: 64px; min-width: 64px; }

  .sidebar-logo {
    padding: 20px 16px 16px;
    display: flex; align-items: center; gap: 10px;
    border-bottom: 1px solid var(--border);
  }
  .logo-icon {
    width: 36px; height: 36px; border-radius: 10px;
    background: linear-gradient(135deg, var(--accent), var(--accent2));
    display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0;
    box-shadow: 0 0 20px rgba(0,212,160,0.3);
  }
  .logo-text { font-family: var(--font-head); font-weight: 800; font-size: 16px; color: var(--text); white-space: nowrap; overflow: hidden; }
  .logo-text span { color: var(--accent); }

  .sidebar-section { padding: 12px 8px 4px; }
  .sidebar-section-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.1em;
    color: var(--text3); text-transform: uppercase;
    padding: 0 8px; margin-bottom: 4px; white-space: nowrap; overflow: hidden;
  }

  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: var(--radius);
    cursor: pointer; transition: var(--transition);
    color: var(--text2); white-space: nowrap; overflow: hidden;
    position: relative; user-select: none;
  }
  .nav-item:hover { background: rgba(255,255,255,0.04); color: var(--text); }
  .nav-item.active { background: rgba(0,212,160,0.1); color: var(--accent); }
  .nav-item.active::before {
    content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
    width: 3px; height: 60%; background: var(--accent); border-radius: 0 2px 2px 0;
  }
  .nav-icon { font-size: 16px; flex-shrink: 0; width: 20px; text-align: center; }
  .nav-label { font-size: 13px; font-weight: 500; }
  .nav-badge {
    margin-left: auto; background: var(--accent); color: var(--bg);
    font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 20px; flex-shrink: 0;
  }
  .nav-badge.warn { background: var(--warn); }
  .nav-badge.danger { background: var(--danger); }

  .sidebar-bottom {
    margin-top: auto; padding: 12px 8px;
    border-top: 1px solid var(--border);
  }
  .user-card {
    display: flex; align-items: center; gap: 10px;
    padding: 10px; border-radius: var(--radius);
    background: rgba(255,255,255,0.03); cursor: pointer;
    transition: var(--transition); overflow: hidden;
  }
  .user-card:hover { background: rgba(255,255,255,0.06); }
  .user-avatar {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    background: linear-gradient(135deg, var(--accent2), var(--accent4));
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; color: #fff;
  }
  .user-info { overflow: hidden; }
  .user-name { font-size: 12px; font-weight: 600; color: var(--text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .user-role { font-size: 11px; color: var(--text3); }

  /* ── MAIN ── */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; min-width: 0; }

  .topbar {
    height: 56px; min-height: 56px;
    background: var(--bg2); border-bottom: 1px solid var(--border);
    display: flex; align-items: center; gap: 12px;
    padding: 0 20px; z-index: 40;
  }
  .topbar-title { font-family: var(--font-head); font-weight: 700; font-size: 17px; flex: 1; }
  .topbar-actions { display: flex; align-items: center; gap: 8px; }

  .btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: var(--radius);
    font-family: var(--font-body); font-size: 13px; font-weight: 500;
    cursor: pointer; border: none; transition: var(--transition); white-space: nowrap;
  }
  .btn-primary { background: var(--accent); color: var(--bg); }
  .btn-primary:hover { background: #00edb3; box-shadow: 0 0 20px rgba(0,212,160,0.4); }
  .btn-ghost { background: transparent; color: var(--text2); border: 1px solid var(--border2); }
  .btn-ghost:hover { background: rgba(255,255,255,0.05); color: var(--text); }
  .btn-icon { padding: 7px 10px; }
  .btn-danger { background: rgba(255,71,87,0.15); color: var(--danger); border: 1px solid rgba(255,71,87,0.3); }
  .btn-danger:hover { background: rgba(255,71,87,0.25); }

  .content { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 20px; background: var(--bg); }

  /* ── CARDS ── */
  .card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius2); overflow: hidden;
  }
  .card-header {
    padding: 16px 20px; border-bottom: 1px solid var(--border);
    display: flex; align-items: center; justify-content: space-between;
  }
  .card-title { font-family: var(--font-head); font-weight: 700; font-size: 14px; }
  .card-body { padding: 20px; }

  /* ── METRIC CARDS ── */
  .metrics-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
  .metric-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 20px;
    position: relative; overflow: hidden; transition: var(--transition);
  }
  .metric-card:hover { border-color: var(--border2); transform: translateY(-2px); box-shadow: var(--shadow); }
  .metric-card::after {
    content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
    background: var(--accent-color, var(--accent));
  }
  .metric-label { font-size: 12px; color: var(--text2); font-weight: 500; margin-bottom: 8px; }
  .metric-value { font-family: var(--font-head); font-size: 26px; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.5px; }
  .metric-change { font-size: 12px; display: flex; align-items: center; gap: 4px; }
  .metric-change.up { color: var(--success); }
  .metric-change.down { color: var(--danger); }
  .metric-icon {
    position: absolute; right: 16px; top: 16px;
    width: 36px; height: 36px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-size: 17px;
    background: rgba(255,255,255,0.05);
  }

  /* ── CHARTS ── */
  .chart-container { width: 100%; position: relative; }

  .bar-chart { display: flex; align-items: flex-end; gap: 6px; height: 120px; padding: 0 4px; }
  .bar-group { flex: 1; display: flex; gap: 2px; align-items: flex-end; height: 100%; }
  .bar {
    flex: 1; border-radius: 4px 4px 0 0; cursor: pointer;
    transition: opacity 0.2s; min-width: 8px;
    background: var(--bar-color, var(--accent));
  }
  .bar:hover { opacity: 0.8; }

  .line-chart-svg { width: 100%; overflow: visible; }

  /* ── TABLES ── */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  thead tr { border-bottom: 1px solid var(--border); }
  th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: var(--text3); text-transform: uppercase; letter-spacing: 0.05em; white-space: nowrap; }
  tbody tr { border-bottom: 1px solid var(--border); transition: var(--transition); cursor: pointer; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: rgba(255,255,255,0.03); }
  td { padding: 11px 12px; font-size: 13px; color: var(--text2); }
  td.primary { color: var(--text); font-weight: 500; }
  td.money { font-family: var(--font-head); font-weight: 600; color: var(--text); }
  td.money.pos { color: var(--success); }
  td.money.neg { color: var(--danger); }

  /* ── BADGES ── */
  .badge { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .badge-success { background: rgba(0,212,160,0.12); color: var(--success); }
  .badge-danger { background: rgba(255,71,87,0.12); color: var(--danger); }
  .badge-warn { background: rgba(255,184,0,0.12); color: var(--warn); }
  .badge-info { background: rgba(0,144,255,0.12); color: var(--accent2); }
  .badge-purple { background: rgba(168,85,247,0.12); color: var(--accent4); }

  /* ── PROGRESS ── */
  .progress { height: 6px; background: rgba(255,255,255,0.06); border-radius: 3px; overflow: hidden; }
  .progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s cubic-bezier(0.4,0,0.2,1); }

  /* ── GRID LAYOUTS ── */
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .grid-12 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
  .grid-21 { display: grid; grid-template-columns: 1fr 1.4fr; gap: 16px; }

  /* ── ALERTS ── */
  .alert {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px; border-radius: var(--radius);
    border-left: 3px solid;
  }
  .alert-success { background: rgba(0,212,160,0.07); border-color: var(--success); }
  .alert-warn { background: rgba(255,184,0,0.07); border-color: var(--warn); }
  .alert-danger { background: rgba(255,71,87,0.07); border-color: var(--danger); }
  .alert-info { background: rgba(0,144,255,0.07); border-color: var(--accent2); }
  .alert-icon { font-size: 16px; margin-top: 1px; flex-shrink: 0; }
  .alert-content { flex: 1; }
  .alert-title { font-weight: 600; font-size: 13px; color: var(--text); margin-bottom: 2px; }
  .alert-desc { font-size: 12px; color: var(--text2); line-height: 1.5; }

  /* ── CHAT ── */
  .chat-wrapper { display: flex; flex-direction: column; height: 100%; }
  .chat-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px; }
  .chat-msg { display: flex; gap: 10px; max-width: 85%; }
  .chat-msg.user { align-self: flex-end; flex-direction: row-reverse; }
  .chat-avatar {
    width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 14px;
  }
  .chat-avatar.ai { background: linear-gradient(135deg, var(--accent), var(--accent2)); color: var(--bg); }
  .chat-avatar.user { background: linear-gradient(135deg, var(--accent4), var(--accent2)); color: #fff; }
  .chat-bubble {
    padding: 12px 14px; border-radius: 12px;
    font-size: 13px; line-height: 1.6; color: var(--text);
  }
  .chat-bubble.ai { background: var(--bg3); border: 1px solid var(--border); border-radius: 4px 12px 12px 12px; }
  .chat-bubble.user { background: rgba(0,212,160,0.12); border: 1px solid rgba(0,212,160,0.2); border-radius: 12px 4px 12px 12px; }
  .chat-input-row {
    padding: 14px 16px; border-top: 1px solid var(--border);
    display: flex; gap: 10px; align-items: center;
  }
  .chat-input {
    flex: 1; background: var(--bg3); border: 1px solid var(--border);
    border-radius: 10px; padding: 10px 14px;
    color: var(--text); font-family: var(--font-body); font-size: 13px;
    outline: none; transition: var(--transition);
    resize: none;
  }
  .chat-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }
  .chat-suggestion {
    padding: 8px 14px; border-radius: 20px;
    background: rgba(255,255,255,0.04); border: 1px solid var(--border);
    font-size: 12px; color: var(--text2); cursor: pointer; transition: var(--transition);
    white-space: nowrap;
  }
  .chat-suggestion:hover { border-color: var(--accent); color: var(--accent); background: rgba(0,212,160,0.06); }

  /* ── TYPING INDICATOR ── */
  .typing { display: flex; gap: 4px; align-items: center; padding: 4px 0; }
  .typing-dot {
    width: 6px; height: 6px; border-radius: 50%;
    background: var(--text3); animation: typingBounce 1.2s infinite;
  }
  .typing-dot:nth-child(2) { animation-delay: 0.2s; }
  .typing-dot:nth-child(3) { animation-delay: 0.4s; }
  @keyframes typingBounce {
    0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
    30% { transform: translateY(-6px); opacity: 1; }
  }

  /* ── DONUT ── */
  .donut-container { display: flex; align-items: center; gap: 20px; }
  .donut-legend { display: flex; flex-direction: column; gap: 8px; flex: 1; }
  .legend-item { display: flex; align-items: center; gap: 8px; }
  .legend-dot { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }
  .legend-label { font-size: 12px; color: var(--text2); flex: 1; }
  .legend-value { font-size: 12px; font-weight: 600; color: var(--text); }

  /* ── KPI ROW ── */
  .kpi-row { display: flex; gap: 12px; margin-bottom: 20px; }
  .kpi-item {
    flex: 1; background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 14px 16px;
    display: flex; align-items: center; gap: 12px;
    transition: var(--transition);
  }
  .kpi-item:hover { border-color: var(--border2); }
  .kpi-icon-box {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 18px;
    flex-shrink: 0;
  }
  .kpi-data { flex: 1; min-width: 0; }
  .kpi-val { font-family: var(--font-head); font-size: 20px; font-weight: 800; }
  .kpi-lbl { font-size: 11px; color: var(--text3); }

  /* ── TABS ── */
  .tabs { display: flex; gap: 2px; background: var(--bg3); padding: 4px; border-radius: var(--radius); margin-bottom: 20px; }
  .tab {
    flex: 1; padding: 8px 12px; border-radius: 8px;
    font-size: 12px; font-weight: 500; color: var(--text3);
    cursor: pointer; transition: var(--transition); text-align: center;
  }
  .tab.active { background: var(--card); color: var(--text); box-shadow: var(--shadow); }
  .tab:hover:not(.active) { color: var(--text2); }

  /* ── REGIME CARDS ── */
  .regime-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 14px; }
  .regime-card {
    border: 2px solid var(--border); border-radius: var(--radius2);
    padding: 20px; cursor: pointer; transition: var(--transition);
    position: relative; overflow: hidden;
  }
  .regime-card:hover { border-color: var(--border2); transform: translateY(-2px); }
  .regime-card.best { border-color: var(--accent); background: rgba(0,212,160,0.04); }
  .regime-card.best::before {
    content: '★ RECOMENDADO'; position: absolute; top: 10px; right: -8px;
    background: var(--accent); color: var(--bg); font-size: 9px; font-weight: 800;
    padding: 3px 20px 3px 10px; letter-spacing: 0.05em;
    clip-path: polygon(0 0, 100% 0, 100% 100%, 8% 100%);
  }
  .regime-name { font-family: var(--font-head); font-weight: 700; font-size: 15px; margin-bottom: 6px; }
  .regime-tax { font-size: 28px; font-weight: 800; font-family: var(--font-head); letter-spacing: -1px; margin: 12px 0; }
  .regime-tax.best-val { color: var(--accent); }
  .regime-items { list-style: none; display: flex; flex-direction: column; gap: 5px; margin-top: 12px; }
  .regime-item { font-size: 12px; color: var(--text2); display: flex; gap: 6px; }
  .regime-item::before { content: '→'; color: var(--accent); }

  /* ── CREDIT ITEM ── */
  .credit-grid { display: flex; flex-direction: column; gap: 10px; }
  .credit-item {
    border: 1px solid var(--border); border-radius: var(--radius);
    padding: 14px 16px; display: flex; align-items: center; gap: 14px;
    transition: var(--transition);
  }
  .credit-item:hover { border-color: var(--border2); background: rgba(255,255,255,0.02); }
  .credit-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0;
  }
  .credit-info { flex: 1; min-width: 0; }
  .credit-title { font-weight: 600; font-size: 13px; color: var(--text); margin-bottom: 2px; }
  .credit-desc { font-size: 12px; color: var(--text2); }
  .credit-amount { text-align: right; }
  .credit-value { font-family: var(--font-head); font-weight: 700; font-size: 16px; color: var(--success); }
  .credit-prob { font-size: 11px; color: var(--text3); }

  /* ── SCORE ── */
  .score-ring { position: relative; display: inline-flex; align-items: center; justify-content: center; }
  .score-label { position: absolute; text-align: center; }
  .score-num { font-family: var(--font-head); font-size: 32px; font-weight: 800; color: var(--text); display: block; line-height: 1; }
  .score-sub { font-size: 11px; color: var(--text3); }

  /* ── INPUT ── */
  .inp {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 9px 12px;
    color: var(--text); font-family: var(--font-body); font-size: 13px;
    outline: none; transition: var(--transition); width: 100%;
  }
  .inp:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }
  .inp-label { font-size: 12px; color: var(--text2); margin-bottom: 6px; display: block; font-weight: 500; }

  /* ── REPORT ITEM ── */
  .report-item {
    display: flex; align-items: center; gap: 12px;
    padding: 14px; border: 1px solid var(--border);
    border-radius: var(--radius); transition: var(--transition); cursor: pointer;
  }
  .report-item:hover { border-color: var(--border2); background: rgba(255,255,255,0.02); }
  .report-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
  .report-info { flex: 1; }
  .report-title { font-weight: 600; font-size: 13px; color: var(--text); margin-bottom: 2px; }
  .report-meta { font-size: 12px; color: var(--text3); }
  .report-actions { display: flex; gap: 6px; }

  /* ── ANIMATE ── */
  @keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
  .fade-up { animation: fadeUp 0.4s ease both; }
  .fade-up-1 { animation-delay: 0.05s; }
  .fade-up-2 { animation-delay: 0.10s; }
  .fade-up-3 { animation-delay: 0.15s; }
  .fade-up-4 { animation-delay: 0.20s; }

  /* ── MISC ── */
  .divider { height: 1px; background: var(--border); margin: 16px 0; }
  .empty { text-align: center; padding: 40px; color: var(--text3); font-size: 13px; }
  .tag { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
  .flex { display: flex; }
  .flex-col { display: flex; flex-direction: column; }
  .items-center { align-items: center; }
  .justify-between { justify-content: space-between; }
  .gap-8 { gap: 8px; }
  .gap-12 { gap: 12px; }
  .gap-16 { gap: 16px; }
  .mb-4 { margin-bottom: 4px; }
  .mb-8 { margin-bottom: 8px; }
  .mb-12 { margin-bottom: 12px; }
  .mb-16 { margin-bottom: 16px; }
  .mb-20 { margin-bottom: 20px; }
  .text-sm { font-size: 12px; }
  .text-xs { font-size: 11px; }
  .text-muted { color: var(--text2); }
  .text-accent { color: var(--accent); }
  .text-danger { color: var(--danger); }
  .text-warn { color: var(--warn); }
  .font-bold { font-weight: 700; }
  .font-head { font-family: var(--font-head); }
  .w-full { width: 100%; }
  .overflow-y { overflow-y: auto; }
  .relative { position: relative; }

  /* ── NOTIFICATION DOT ── */
  .notif-dot {
    width: 7px; height: 7px; border-radius: 50%;
    background: var(--danger); position: absolute;
    top: 4px; right: 4px; border: 1.5px solid var(--bg2);
  }

  /* ── SECTION HEADER ── */
  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-family: var(--font-head); font-weight: 700; font-size: 18px; }
  .section-sub { font-size: 12px; color: var(--text3); margin-top: 2px; }

  /* ── CASHFLOW ROW ── */
  .cf-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .cf-row:last-child { border-bottom: none; }
  .cf-label { font-size: 13px; color: var(--text2); display: flex; align-items: center; gap: 8px; }
  .cf-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .cf-val { font-family: var(--font-head); font-weight: 600; font-size: 14px; }

  /* ── MINI SPARKLINE ── */
  .sparkline { display: inline-block; vertical-align: middle; }

  /* ── COMPLIANCE STATUS ── */
  .compliance-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .compliance-item:last-child { border-bottom: none; }
  .compliance-status { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; flex-shrink: 0; }
  .c-ok { background: rgba(0,212,160,0.15); color: var(--success); }
  .c-warn { background: rgba(255,184,0,0.15); color: var(--warn); }
  .c-err { background: rgba(255,71,87,0.15); color: var(--danger); }

  /* ── TOGGLE ── */
  .toggle { position: relative; cursor: pointer; }
  .toggle input { display: none; }
  .toggle-track {
    width: 40px; height: 22px; background: var(--bg3); border-radius: 11px;
    border: 1px solid var(--border); transition: var(--transition); display: block;
  }
  .toggle input:checked ~ .toggle-track { background: var(--accent); border-color: var(--accent); }
  .toggle-thumb {
    position: absolute; top: 3px; left: 3px;
    width: 16px; height: 16px; background: #fff; border-radius: 50%;
    transition: var(--transition);
  }
  .toggle input:checked ~ .toggle-thumb { left: 21px; }

  /* ── RESPONSIVE ── */
  @media (max-width: 1200px) {
    .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    .grid-12, .grid-21 { grid-template-columns: 1fr; }
    .regime-grid { grid-template-columns: 1fr; }
  }
  @media (max-width: 768px) {
    .sidebar { position: absolute; transform: translateX(-100%); z-index: 100; }
    .sidebar.mobile-open { transform: translateX(0); }
    .metrics-grid { grid-template-columns: 1fr 1fr; }
    .kpi-row { flex-wrap: wrap; }
    .grid-2, .grid-3 { grid-template-columns: 1fr; }
  }
`;

// ─── DATA ────────────────────────────────────────────────────────────────────
const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const revenueData = [410, 480, 520, 490, 610, 580, 720, 695, 780, 820, 760, 910];
const expenseData = [280, 310, 340, 295, 380, 360, 420, 410, 460, 490, 440, 530];
const profitData  = revenueData.map((r, i) => r - expenseData[i]);

const transactions = [
  { id: 1, desc: "Receita de Serviços — Cliente ABC", date: "24/05", cat: "Receita", val: 48500, type: "entrada" },
  { id: 2, desc: "Folha de Pagamento — Maio/2026",    date: "22/05", cat: "RH", val: -32800, type: "saida" },
  { id: 3, desc: "DARF — IRPJ Trimestral",            date: "20/05", cat: "Tributário", val: -8640, type: "saida" },
  { id: 4, desc: "Receita — Venda Produto XYZ",       date: "19/05", cat: "Receita", val: 21200, type: "entrada" },
  { id: 5, desc: "Aluguel Escritório",                date: "18/05", cat: "Infraestrutura", val: -5800, type: "saida" },
  { id: 6, desc: "Recebimento — NF 4712",             date: "16/05", cat: "Receita", val: 15300, type: "entrada" },
  { id: 7, desc: "Simples Nacional — Guia DAS",       date: "15/05", cat: "Tributário", val: -4200, type: "saida" },
  { id: 8, desc: "Contrato SaaS — Novo Cliente",      date: "14/05", cat: "Receita", val: 9800, type: "entrada" },
];

const credits = [
  { id: 1, title: "Exclusão ICMS da Base PIS/COFINS", icon: "⚖️", desc: "Tese fixada pelo STF — RE 574.706", value: 284600, prob: 95, color: "#00D4A0" },
  { id: 2, title: "INSS sobre Verbas Indenizatórias",  icon: "🏛️", desc: "STJ — Tema 1170 — Contribuição patronal", value: 127400, prob: 88, color: "#0090FF" },
  { id: 3, title: "ICMS-ST Pago a Maior",              icon: "📋", desc: "Complementação de substituição tributária", value: 89200,  prob: 82, color: "#A855F7" },
  { id: 4, title: "PIS/COFINS — Créditos de Insumos",  icon: "🔄", desc: "Ampliação do conceito de insumo — STJ", value: 64800,  prob: 79, color: "#FFB800" },
  { id: 5, title: "IRPJ/CSLL — Subvenções Fiscais",    icon: "🏢", desc: "Lei nº 14.789/2023 — ICMS investimento", value: 43100,  prob: 71, color: "#FF6B35" },
];

const chatInit = [
  { role: "ai", text: "Olá! Sou a **IA Tributária FiscalAI**. Analisei o perfil financeiro da sua empresa e estou pronto para ajudar com planejamento tributário, recuperação de créditos e análise estratégica. Como posso ajudar?" },
];

const suggestions = [
  "Qual o melhor regime tributário?",
  "Existe crédito recuperável?",
  "Como reduzir impostos legalmente?",
  "Analise minha carga tributária",
];

const aiResponses = {
  "Qual o melhor regime tributário?": `**Análise de Regime Tributário — ${new Date().getFullYear()}**\n\nCom base na receita anual de **R$ 9,1M** e margem operacional de **42%**, o **Lucro Presumido** é o regime mais vantajoso:\n\n• Alíquota efetiva estimada: **12,8%** sobre a receita bruta\n• Economia vs. Simples Nacional: ~**R$ 84.000/ano**\n• Economia vs. Lucro Real: ~**R$ 31.000/ano**\n\nPontos favoráveis ao Lucro Presumido:\n→ Margem real acima da presumida (32% vs 8%)\n→ Ausência de créditos de PIS/COFINS relevantes\n→ Simplificação operacional\n\n⚠️ Recomendo revisão semestral — crescimento acima de 20% pode inverter a decisão.`,
  "Existe crédito recuperável?": `**Mapeamento de Créditos Tributários**\n\nIdentifiquei **5 oportunidades** com potencial total de **R$ 609.100**:\n\n1. **Exclusão ICMS da Base PIS/COFINS** — R$ 284.600 (prob. 95%)\n   ↳ Tese consolidada pelo STF — RE 574.706\n\n2. **INSS sobre Verbas Indenizatórias** — R$ 127.400 (prob. 88%)\n   ↳ STJ Tema 1170\n\n3. **ICMS-ST pago a maior** — R$ 89.200 (prob. 82%)\n   ↳ Análise das NFs dos últimos 5 anos\n\nPróximos passos: levantamento documental + constituição do crédito via processo administrativo ou judicial.`,
  "Como reduzir impostos legalmente?": `**Estratégias de Planejamento Tributário**\n\nLevantei **7 estratégias legais** aplicáveis ao seu perfil:\n\n1. **Otimização do regime** → Migração para Lucro Presumido\n2. **Reorganização societária** → Separação de atividades por CNAE\n3. **Juros sobre Capital Próprio** → Dedução de até R$ 48.000/ano\n4. **Depreciação acelerada** → Redução IRPJ/CSLL em até 22%\n5. **Incentivos fiscais regionais** → SUDENE/SUDAM se aplicável\n6. **Dedução de inovação (Lei 11.196)** → P&D e Tecnologia\n7. **Crédito de PIS/COFINS** → Revisão de insumos admissíveis\n\nEconomia total estimada: **R$ 312.000/ano**`,
  "Analise minha carga tributária": `**Diagnóstico de Carga Tributária**\n\nAnálise dos últimos 12 meses:\n\n📊 **Composição atual**\n• Tributos federais: R$ 892.000 (9,8% receita)\n• Contribuições sociais: R$ 421.000 (4,6%)\n• Tributos estaduais: R$ 284.000 (3,1%)\n• Municipais: R$ 94.000 (1,0%)\n• **Total: R$ 1.691.000 → 18,5% da receita**\n\n⚠️ **Benchmarking setorial**: média do setor é **14,2%**\nSua empresa paga **4,3 pontos percentuais acima** do mercado.\n\nCausa principal: regime tributário inadequado + créditos não aproveitados.\n**Potencial de economia: R$ 392.000/ano**`,
};

const reportsList = [
  { id: 1, title: "DRE Gerencial — Maio 2026",       icon: "📊", type: "Financeiro",   date: "24/05/2026", size: "248 KB", color: "#0090FF" },
  { id: 2, title: "Relatório de Carga Tributária",    icon: "⚖️", type: "Tributário",   date: "23/05/2026", size: "184 KB", color: "#A855F7" },
  { id: 3, title: "Parecer — Créditos Recuperáveis",  icon: "🏛️", type: "Tributário",   date: "22/05/2026", size: "512 KB", color: "#00D4A0" },
  { id: 4, title: "Fluxo de Caixa Projetado",         icon: "💰", type: "Financeiro",   date: "21/05/2026", size: "160 KB", color: "#FF6B35" },
  { id: 5, title: "Diagnóstico Estratégico Q2",       icon: "🎯", type: "Estratégico",  date: "20/05/2026", size: "320 KB", color: "#FFB800" },
  { id: 6, title: "Simulação de Regimes Tributários", icon: "🔄", type: "Tributário",   date: "19/05/2026", size: "224 KB", color: "#FF4757" },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtK = (n) => n >= 1e6 ? `R$ ${(n/1e6).toFixed(1)}M` : `R$ ${(n/1e3).toFixed(0)}K`;

function BarChart({ data1, data2, labels, h = 120 }) {
  const max = Math.max(...data1, ...(data2 || []));
  return (
    <div>
      <div className="bar-chart" style={{ height: h }}>
        {data1.map((v, i) => (
          <div key={i} className="bar-group">
            <div className="bar" style={{ height: `${(v/max)*100}%`, "--bar-color": "var(--accent2)" }} title={`${labels?.[i]}: ${fmtK(v)}`} />
            {data2 && <div className="bar" style={{ height: `${(data2[i]/max)*100}%`, "--bar-color": "var(--danger)" }} title={`${labels?.[i]}: ${fmtK(data2[i])}`} />}
          </div>
        ))}
      </div>
      {labels && (
        <div style={{ display: "flex", gap: 6, marginTop: 6, justifyContent: "space-between" }}>
          {labels.map((l, i) => <span key={i} style={{ fontSize: 10, color: "var(--text3)", flex: 1, textAlign: "center" }}>{l}</span>)}
        </div>
      )}
    </div>
  );
}

function LineChart({ data, color = "var(--accent)", h = 80 }) {
  const max = Math.max(...data), min = Math.min(...data);
  const range = max - min || 1;
  const W = 300, H = h;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H * 0.85 - H * 0.05}`).join(" ");
  const area = `${pts} ${W},${H} 0,${H}`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="line-chart-svg" style={{ height: h }}>
      <defs>
        <linearGradient id={`lg-${color.replace(/[^a-z]/gi,'')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#lg-${color.replace(/[^a-z]/gi,'')})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    </svg>
  );
}

function DonutChart({ segments, size = 120 }) {
  const total = segments.reduce((s, x) => s + x.val, 0);
  let offset = 0;
  const r = 42, cx = 60, cy = 60, circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" style={{ flexShrink: 0 }}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
      {segments.map((seg, i) => {
        const pct = seg.val / total;
        const dash = pct * circ;
        const gap = circ - dash;
        const el = (
          <circle key={i} cx={cx} cy={cy} r={r} fill="none"
            stroke={seg.color} strokeWidth="12"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset * circ}
            style={{ transform: "rotate(-90deg)", transformOrigin: "60px 60px" }}
          />
        );
        offset += pct;
        return el;
      })}
      <circle cx={cx} cy={cy} r={32} fill="var(--card)" />
    </svg>
  );
}

function ScoreRing({ score, size = 140 }) {
  const r = 54, circ = 2 * Math.PI * r;
  const pct = score / 1000;
  const color = score >= 750 ? "var(--success)" : score >= 500 ? "var(--warn)" : "var(--danger)";
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox="0 0 140 140">
        <circle cx={70} cy={70} r={r} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="12" />
        <circle cx={70} cy={70} r={r} fill="none"
          stroke={color} strokeWidth="12"
          strokeDasharray={`${pct * circ} ${circ}`}
          strokeLinecap="round"
          style={{ transform: "rotate(-90deg)", transformOrigin: "70px 70px", transition: "stroke-dasharray 1s ease" }}
        />
      </svg>
      <div className="score-label">
        <span className="score-num" style={{ color }}>{score}</span>
        <span className="score-sub">/ 1000</span>
      </div>
    </div>
  );
}

// ─── MODULES ─────────────────────────────────────────────────────────────────

function Dashboard({ empresaId, clienteId, openForm, recarregar }) {
  const [dados,   setDados]   = useState(null);
  const [loading, setLoading] = useState(true);

  // Filtro de período
  const _hoje = new Date();
  const _pri = new Date(_hoje.getFullYear(), _hoje.getMonth(), 1).toISOString().slice(0,10);
  const _ult = new Date(_hoje.getFullYear(), _hoje.getMonth()+1, 0).toISOString().slice(0,10);
  const [dataInicio, setDataInicio] = useState(_pri);
  const [dataFim,    setDataFim]    = useState(_ult);

  useEffect(() => {
    if (!empresaId) return;
    carregar();
  }, [empresaId, clienteId, dataInicio, dataFim]);

  async function carregar() {
    setLoading(true);
    try {
      const r = await DashboardDB.resumo(empresaId, clienteId||null, { inicio: dataInicio, fim: dataFim });
      setDados(r);
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—';
  function setPeriodo(tipo) {
    const h = new Date();
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (tipo === 'mes')  { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),1)));   setDataFim(iso(new Date(h.getFullYear(),h.getMonth()+1,0))); }
    if (tipo === 'trim') { const q=Math.floor(h.getMonth()/3)*3; setDataInicio(iso(new Date(h.getFullYear(),q,1))); setDataFim(iso(new Date(h.getFullYear(),q+3,0))); }
    if (tipo === 'ano')  { setDataInicio(`${h.getFullYear()}-01-01`); setDataFim(`${h.getFullYear()}-12-31`); }
    if (tipo === '7d')   { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-6)));  setDataFim(iso(h)); }
    if (tipo === '15d')  { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-14))); setDataFim(iso(h)); }
    if (tipo === '30d')  { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-29))); setDataFim(iso(h)); }
  }

  // Valores extraídos ou zeros
  const entradas   = dados?.fluxo?.entradas   || 0;
  const saidas     = dados?.fluxo?.saidas     || 0;
  const saldo      = dados?.fluxo?.saldo      || 0;
  const aPagar     = dados?.pagar?.pendente   || 0;
  const aReceber   = dados?.receber?.pendente || 0;
  const evolucao   = dados?.evolucao          || [];
  const tributos   = dados?.tributos          || {};
  const totalTrib  = Object.values(tributos).reduce((s,v) => s + v, 0);

  const maxEv = Math.max(...evolucao.map(e => Math.max(e.entradas||0, e.saidas||0)), 1);

  // Segmentos do donut tributário
  const tribSeg = [
    { color: "#FF4757", val: tributos.icms   || 0, label: "ICMS"   },
    { color: "#0090FF", val: tributos.pis    || 0, label: "PIS"    },
    { color: "#A855F7", val: tributos.cofins || 0, label: "COFINS" },
    { color: "#FFB800", val: tributos.iss    || 0, label: "ISS"    },
    { color: "#FF6B35", val: tributos.inss   || 0, label: "INSS"   },
  ].filter(s => s.val > 0);

  const hasTrib = tribSeg.length > 0;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:400, flexDirection:'column', gap:12 }}>
      <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#00D4A0,#0090FF)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, animation:'pulse 1s infinite' }}>⚡</div>
      <div style={{ color:'var(--text3)', fontSize:13 }}>Carregando dados reais...</div>
    </div>
  );

  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Dashboard Executivo</div>
          <div className="section-sub">Dados reais · {fmtD(dataInicio)} até {fmtD(dataFim)}</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={carregar}>🔄 Atualizar</button>
          <button className="btn btn-primary" onClick={() => openForm?.('lancamento')}>+ Lançamento</button>
        </div>
      </div>

      {/* Filtro de período */}
      <div className="card mb-16">
        <div className="card-body" style={{padding:'12px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
            <span style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>📅 Período:</span>
            <input type="date" className="inp" style={{width:145}} value={dataInicio} onChange={e=>setDataInicio(e.target.value)} />
            <span style={{color:'var(--text3)',fontSize:12}}>até</span>
            <input type="date" className="inp" style={{width:145}} value={dataFim} onChange={e=>setDataFim(e.target.value)} />
            <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
              {[{l:'7d',t:'7d'},{l:'15d',t:'15d'},{l:'30d',t:'30d'},{l:'Mês',t:'mes'},{l:'Trim.',t:'trim'},{l:'Ano',t:'ano'}].map(p=>(
                <button key={p.t} className="btn btn-ghost" style={{padding:'5px 10px',fontSize:11,borderRadius:6}} onClick={()=>setPeriodo(p.t)}>{p.l}</button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="kpi-row fade-up fade-up-1 mb-16">
        {[
          { icon:"💹", label:"Entradas no Período",   val: fmtK(entradas),  color:"#0090FF", bg:"rgba(0,144,255,0.1)"  },
          { icon:"📉", label:"Saídas no Período",      val: fmtK(saidas),    color:"#FF6B35", bg:"rgba(255,107,53,0.1)" },
          { icon:"💰", label:"Saldo do Período",        val: fmtK(saldo),     color: saldo>=0?"#00D4A0":"#FF4757", bg: saldo>=0?"rgba(0,212,160,0.1)":"rgba(255,71,87,0.1)" },
          { icon:"⏳", label:"A Pagar (em aberto)",  val: fmtK(aPagar),   color:"#FFB800", bg:"rgba(255,184,0,0.1)"  },
          { icon:"🎯", label:"A Receber (em aberto)",val: fmtK(aReceber), color:"#A855F7", bg:"rgba(168,85,247,0.1)" },
        ].map((k,i) => (
          <div key={i} className="kpi-item">
            <div className="kpi-icon-box" style={{background:k.bg}}><span>{k.icon}</span></div>
            <div className="kpi-data">
              <div className="kpi-val" style={{color:k.color}}>{k.val}</div>
              <div className="kpi-lbl">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Alertas inteligentes */}
      {(aPagar > 0 || aReceber > 0 || saldo < 0) && (
        <div className="fade-up fade-up-2 mb-16" style={{display:'flex',flexDirection:'column',gap:8}}>
          {saldo < 0 && (
            <div className="alert alert-danger">
              <span className="alert-icon">🚨</span>
              <div className="alert-content">
                <div className="alert-title">Saldo negativo no período</div>
                <div className="alert-desc">As saídas ({fmtK(saidas)}) superaram as entradas ({fmtK(entradas)}) em {fmt(Math.abs(saldo))}.</div>
              </div>
            </div>
          )}
          {aPagar > 0 && (
            <div className="alert alert-warn">
              <span className="alert-icon">⚠️</span>
              <div className="alert-content">
                <div className="alert-title">{fmtK(aPagar)} em contas a pagar pendentes</div>
                <div className="alert-desc">Verifique os vencimentos para evitar juros e multas.</div>
              </div>
            </div>
          )}
          {aReceber > 0 && (
            <div className="alert alert-info">
              <span className="alert-icon">💡</span>
              <div className="alert-content">
                <div className="alert-title">{fmtK(aReceber)} em contas a receber</div>
                <div className="alert-desc">Acompanhe a inadimplência e envie lembretes aos clientes.</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gráfico evolução + Tributário */}
      <div className="grid-12 fade-up fade-up-3 mb-16">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Evolução 12 Meses</span>
            <div className="flex gap-8 text-xs text-muted">
              <span style={{display:'flex',gap:4,alignItems:'center'}}><span style={{width:8,height:8,background:'var(--accent2)',borderRadius:2,display:'inline-block'}}/>Entradas</span>
              <span style={{display:'flex',gap:4,alignItems:'center'}}><span style={{width:8,height:8,background:'var(--danger)',borderRadius:2,display:'inline-block'}}/>Saídas</span>
            </div>
          </div>
          <div className="card-body">
            {evolucao.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:28,marginBottom:8}}>📊</div>
                <div>Cadastre lançamentos para visualizar a evolução financeira.</div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={() => openForm?.('lancamento')}>+ Primeiro Lançamento</button>
              </div>
            ) : (
              <>
                <div className="bar-chart" style={{height:140}}>
                  {evolucao.map((e,i) => (
                    <div key={i} className="bar-group">
                      <div className="bar" style={{height:`${((e.entradas||0)/maxEv)*100}%`,"--bar-color":"var(--accent2)"}} title={`${e.mes}: ${fmtK(e.entradas||0)}`}/>
                      <div className="bar" style={{height:`${((e.saidas||0)/maxEv)*100}%`,"--bar-color":"var(--danger)"}} title={`${e.mes}: ${fmtK(e.saidas||0)}`}/>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:6,marginTop:6,justifyContent:'space-between'}}>
                  {evolucao.map((e,i) => <span key={i} style={{fontSize:10,color:'var(--text3)',flex:1,textAlign:'center'}}>{e.mes}</span>)}
                </div>
                {/* Resumo abaixo do gráfico */}
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginTop:16}}>
                  {[
                    { l:'Total Entradas', v: fmtK(evolucao.reduce((s,e)=>s+(e.entradas||0),0)), c:'var(--accent2)' },
                    { l:'Total Saídas',   v: fmtK(evolucao.reduce((s,e)=>s+(e.saidas||0),0)),   c:'var(--danger)'  },
                    { l:'Resultado',      v: fmtK(evolucao.reduce((s,e)=>s+(e.saldo||0),0)),     c:'var(--accent)'  },
                  ].map((x,i) => (
                    <div key={i} style={{textAlign:'center',padding:'10px',background:'rgba(255,255,255,0.02)',borderRadius:8}}>
                      <div style={{fontSize:16,fontWeight:800,fontFamily:'var(--font-head)',color:x.c}}>{x.v}</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{x.l}</div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Distribuição Tributária</span>
            {hasTrib && <span className="badge badge-warn">{fmt(totalTrib)} total</span>}
          </div>
          <div className="card-body">
            {!hasTrib ? (
              <div className="empty">
                <div style={{fontSize:28,marginBottom:8}}>⚖️</div>
                <div>Importe NF-e para visualizar os tributos pagos.</div>
              </div>
            ) : (
              <div className="donut-container">
                <DonutChart segments={tribSeg} size={130} />
                <div className="donut-legend">
                  {tribSeg.map((s,i) => (
                    <div key={i} className="legend-item">
                      <div className="legend-dot" style={{background:s.color}}/>
                      <span className="legend-label">{s.label}</span>
                      <span className="legend-value">{fmt(s.val)}</span>
                    </div>
                  ))}
                  <div className="divider" style={{margin:'8px 0'}}/>
                  <div className="legend-item">
                    <span className="legend-label" style={{fontWeight:600,color:'var(--text)'}}>Total</span>
                    <span className="legend-value" style={{color:'var(--danger)'}}>{fmt(totalTrib)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Últimas movimentações + Saúde */}
      <div className="grid-2 fade-up fade-up-4">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Últimas Movimentações</span>
            <button className="btn btn-ghost" style={{fontSize:11}} onClick={() => openForm?.('lancamento')}>+ Novo</button>
          </div>
          {evolucao.length === 0 ? (
            <div className="empty">Nenhum lançamento ainda.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead><tr><th>Mês</th><th>Entradas</th><th>Saídas</th><th>Saldo</th></tr></thead>
                <tbody>
                  {[...evolucao].reverse().slice(0,6).map((e,i) => (
                    <tr key={i}>
                      <td className="primary">{e.mes}/{new Date().getFullYear()}</td>
                      <td className="money pos">+{fmtK(e.entradas||0)}</td>
                      <td className="money neg">-{fmtK(e.saidas||0)}</td>
                      <td className={`money ${(e.saldo||0)>=0?'pos':'neg'}`}>{fmtK(e.saldo||0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Saúde Financeira</span>
            <span className={`badge ${saldo>=0?'badge-success':'badge-danger'}`}>{saldo>=0?'Positivo':'Atenção'}</span>
          </div>
          <div className="card-body">
            <div className="flex items-center gap-16 mb-16">
              <ScoreRing score={calcScore(entradas, saidas, aPagar, aReceber)} size={130} />
              <div style={{flex:1}}>
                {[
                  { label:'Receita vs Despesa', val: entradas>0 ? `${Math.round((entradas/(entradas+saidas||1))*100)}%` : '—', pct: entradas>0 ? Math.round((entradas/(entradas+saidas||1))*100) : 0, c:'var(--success)' },
                  { label:'Cobertura Pagamentos', val: saidas>0 ? `${(entradas/saidas||0).toFixed(1)}x` : '—', pct: Math.min(Math.round((entradas/(saidas||1))*50),100), c:'var(--accent2)' },
                  { label:'Pendências a Pagar',  val: fmtK(aPagar),   pct: aPagar>0 ? Math.min(Math.round((aPagar/entradas||0)*100),100) : 0, c:'var(--warn)' },
                  { label:'A Receber',           val: fmtK(aReceber), pct: Math.min(Math.round((aReceber/(entradas||1))*100),100), c:'var(--accent4)' },
                ].map((item,i) => (
                  <div key={i} className="mb-12">
                    <div className="flex justify-between mb-4">
                      <span className="text-sm text-muted">{item.label}</span>
                      <span className="text-sm font-bold">{item.val}</span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{width:`${item.pct}%`,background:item.c}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function calcScore(entradas, saidas, aPagar, aReceber) {
  let score = 500;
  if (entradas > 0) score += 100;
  if (entradas > saidas) score += 150;
  if (aPagar < entradas * 0.3) score += 100;
  if (aReceber > 0) score += 50;
  if (saidas === 0 && entradas === 0) score = 400;
  return Math.min(score, 950);
}

function Financeiro({ empresaId, clienteId, openForm, recarregar }) {
  const { clienteAtivo } = useCliente();
  const [tab,        setTab]        = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [salvando,   setSalvando]   = useState(null); // id do lançamento sendo salvo

  // Filtros de período
  const hoje = new Date();
  const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0,10);
  const ultimoDia   = new Date(hoje.getFullYear(), hoje.getMonth()+1, 0).toISOString().slice(0,10);
  const [dataInicio, setDataInicio] = useState(primeiroDia);
  const [dataFim,    setDataFim]    = useState(ultimoDia);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo,   setFiltroTipo]   = useState('');
  const [busca,        setBusca]        = useState('');

  // Dados
  const [lancamentos,   setLancamentos]   = useState([]);
  const [fluxo,         setFluxo]         = useState({ entradas:0, saidas:0, saldo:0 });
  const [evolucao,      setEvolucao]      = useState([]);
  const [contasPagar,   setContasPagar]   = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [totaisPagar,   setTotaisPagar]   = useState({ pendente:0, vencido:0, pago:0 });
  const [totaisReceber, setTotaisReceber] = useState({ pendente:0, vencido:0, recebido:0 });
  const [fluxoCaixa,    setFluxoCaixa]    = useState({ projetado:[], realizado:[] });
  const [fluxoView,     setFluxoView]     = useState('projetado'); // 'projetado' | 'realizado'
  const [bancos,        setBancos]        = useState([]);
  const [baixa,         setBaixa]         = useState(null);   // { tipo:'pagar'|'receber', conta }
  const [baixaForm,     setBaixaForm]     = useState({});
  const [baixando,      setBaixando]      = useState(false);

  // Modal edição
  const [editando,   setEditando]   = useState(null);
  const [editForm,   setEditForm]   = useState({});
  const [showTodos,  setShowTodos]  = useState(false);
  const [todosLanc,  setTodosLanc]  = useState([]);
  const [loadTodos,  setLoadTodos]  = useState(false);

  const tabs = ['Fluxo de Caixa','DRE Gerencial','Contas a Pagar','Contas a Receber'];
  const fmt  = n => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(n||0);
  const fmtK = n => Math.abs(n||0)>=1000 ? `R$ ${((n||0)/1000).toFixed(1)}K` : fmt(n);
  const fmtD = d => d ? new Date(d+'T12:00:00').toLocaleDateString('pt-BR') : '—';

  // Carrega sempre que mudar período, tab ou clienteId
  useEffect(() => {
    if (empresaId && clienteId) carregar();
  }, [empresaId, clienteId, tab, dataInicio, dataFim, filtroStatus]);

  async function carregar() {
    setLoading(true);
    try {
      if (tab === 0) {
        // Fluxo de Caixa automático (Projetado + Realizado) a partir dos títulos e lançamentos
        const fc = await Fluxo.caixa(empresaId, clienteId, dataInicio, dataFim);
        setFluxoCaixa(fc);
        // Evolução 12 meses (independente do filtro de período)
        const ev = await Lancamentos.evolucao12Meses(empresaId, clienteId);
        setEvolucao(ev);
      }
      if (tab === 1) {
        // DRE: lançamentos do período selecionado
        let q = supabase
          .from('lancamentos')
          .select('*, categorias(nome,cor,icone), clientes(nome), fornecedores(nome)')
          .eq('empresa_id', empresaId)
          .eq('cliente_helevare_id', clienteId)
          .neq('status','cancelado')
          .gte('data_lancamento', dataInicio)
          .lte('data_lancamento', dataFim)
          .order('data_lancamento', { ascending: false });
        const { data: lData } = await q;
        const lancs = lData || [];
        setLancamentos(lancs);
        const entradas = lancs.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+Number(l.valor),0);
        const saidas   = lancs.filter(l=>l.tipo==='saida').reduce((s,l)=>s+Number(l.valor),0);
        setFluxo({ entradas, saidas, saldo: entradas - saidas });
      }
      if (tab === 2) {
        const [res, tot, bcs] = await Promise.all([
          ContasPagar.listar(empresaId, filtroStatus ? { status: filtroStatus } : {}, clienteId),
          ContasPagar.totais(empresaId, clienteId),
          ContasBancarias.listar(empresaId, clienteId),
        ]);
        setContasPagar(res.data || []);
        setTotaisPagar(tot);
        setBancos(bcs.data || []);
      }
      if (tab === 3) {
        const [res, tot, bcs] = await Promise.all([
          ContasReceber.listar(empresaId, filtroStatus ? { status: filtroStatus } : {}, clienteId),
          ContasReceber.totais(empresaId, clienteId),
          ContasBancarias.listar(empresaId, clienteId),
        ]);
        setContasReceber(res.data || []);
        setTotaisReceber(tot);
        setBancos(bcs.data || []);
      }
    } catch(e) { console.error(e); }
    setLoading(false);
  }

  // Abre modal de edição
  function abrirEdicao(lanc) {
    setEditando(lanc.id);
    setEditForm({
      descricao:       lanc.descricao       || '',
      valor:           lanc.valor           || '',
      tipo:            lanc.tipo            || 'entrada',
      status:          lanc.status          || 'confirmado',
      data_lancamento: lanc.data_lancamento || '',
      observacao:      lanc.observacao      || '',
    });
  }

  async function salvarEdicao() {
    setSalvando(editando);
    await Lancamentos.atualizar(editando, {
      ...editForm,
      valor: parseFloat(editForm.valor),
    });
    setSalvando(null);
    setEditando(null);
    await carregar();
    if (showTodos) carregarTodos();
  }

  // Altera status direto na tabela e recarrega
  async function alterarStatus(id, novoStatus) {
    setSalvando(id);
    await Lancamentos.atualizar(id, { status: novoStatus });
    setSalvando(null);
    await carregar();
    if (showTodos) {
      setTodosLanc(tl => tl.map(l => l.id===id ? {...l, status:novoStatus} : l));
    }
  }

  async function deletar(id) {
    if (!confirm('Excluir este lançamento?')) return;
    await Lancamentos.deletar(id);
    await carregar();
    if (showTodos) carregarTodos();
  }

  // ── Baixa de títulos (pagar / receber) ──
  function abrirBaixa(tipo, conta) {
    const jaPago = Number(tipo==='pagar' ? conta.valor_pago : conta.valor_recebido) || 0;
    const restante = Number(conta.valor) - jaPago;
    setBaixa({ tipo, conta });
    setBaixaForm({
      data: new Date().toISOString().slice(0,10),
      valor: restante.toFixed(2),
      juros: '', multa: '', desconto: '',
      conta_bancaria_id: bancos[0]?.id || '',
    });
  }

  async function confirmarBaixa() {
    if (!baixa) return;
    const f = baixaForm;
    const c = baixa.conta;
    const payload = {
      data: f.data,
      valor: parseFloat(f.valor) || 0,
      juros: parseFloat(f.juros) || 0,
      multa: parseFloat(f.multa) || 0,
      desconto: parseFloat(f.desconto) || 0,
      conta_bancaria_id: f.conta_bancaria_id || null,
      valorTotal: Number(c.valor),
    };
    setBaixando(true);
    if (baixa.tipo === 'pagar') {
      await ContasPagar.pagar(c.id, { ...payload, valorPagoAnterior: Number(c.valor_pago||0) });
    } else {
      await ContasReceber.receber(c.id, { ...payload, valorRecebidoAnterior: Number(c.valor_recebido||0) });
    }
    setBaixando(false);
    setBaixa(null);
    await carregar();
  }

  async function estornar(tipo, id) {
    if (!confirm('Estornar a baixa deste título? Ele volta para "Em Aberto".')) return;
    if (tipo === 'pagar') await ContasPagar.estornar(id);
    else await ContasReceber.estornar(id);
    await carregar();
  }

  async function carregarTodos() {
    setLoadTodos(true);
    const { data } = await supabase
      .from('lancamentos')
      .select('*, categorias(nome,cor,icone), clientes(nome), fornecedores(nome)')
      .eq('empresa_id', empresaId)
      .eq('cliente_helevare_id', clienteId)
      .order('data_lancamento', { ascending: false })
      .limit(500);
    setTodosLanc(data || []);
    setLoadTodos(false);
  }

  function abrirTodos() { setShowTodos(true); carregarTodos(); }

  // Período rápido (datas em horário local, sem deslocamento de fuso)
  function setPeriodo(tipo) {
    const h = new Date();
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    if (tipo === 'mes')  { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),1)));   setDataFim(iso(new Date(h.getFullYear(),h.getMonth()+1,0))); }
    if (tipo === 'trim') { const q=Math.floor(h.getMonth()/3)*3; setDataInicio(iso(new Date(h.getFullYear(),q,1))); setDataFim(iso(new Date(h.getFullYear(),q+3,0))); }
    if (tipo === 'ano')  { setDataInicio(`${h.getFullYear()}-01-01`); setDataFim(`${h.getFullYear()}-12-31`); }
    if (tipo === '7d')   { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-6)));  setDataFim(iso(h)); }
    if (tipo === '15d')  { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-14))); setDataFim(iso(h)); }
    if (tipo === '30d')  { setDataInicio(iso(new Date(h.getFullYear(),h.getMonth(),h.getDate()-29))); setDataFim(iso(h)); }
  }

  const maxEv = Math.max(...evolucao.map(e=>Math.max(e.entradas||0,e.saidas||0)),1);
  const lancFiltrados = (showTodos ? todosLanc : lancamentos).filter(l => {
    if (filtroTipo && l.tipo !== filtroTipo) return false;
    if (filtroStatus && l.status !== filtroStatus) return false;
    if (busca && !l.descricao?.toLowerCase().includes(busca.toLowerCase())) return false;
    return true;
  });
  const totalEntradas = lancFiltrados.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+Number(l.valor),0);
  const totalSaidas   = lancFiltrados.filter(l=>l.tipo==='saida').reduce((s,l)=>s+Number(l.valor),0);

  // ── Fluxo de Caixa (Projetado / Realizado) ──
  const fluxoLista = (fluxoView==='projetado' ? fluxoCaixa.projetado : fluxoCaixa.realizado)
    .filter(x => !busca || x.descricao?.toLowerCase().includes(busca.toLowerCase()))
    .filter(x => !filtroTipo || x.tipo===filtroTipo);
  const fluxoEntradas = fluxoLista.filter(x=>x.tipo==='entrada').reduce((s,x)=>s+x.valor,0);
  const fluxoSaidas   = fluxoLista.filter(x=>x.tipo==='saida').reduce((s,x)=>s+x.valor,0);
  // agrupa por data e calcula saldo acumulado
  const fluxoPorData = {};
  fluxoLista.forEach(x => {
    (fluxoPorData[x.data] ||= { entradas:0, saidas:0 });
    if (x.tipo==='entrada') fluxoPorData[x.data].entradas += x.valor;
    else fluxoPorData[x.data].saidas += x.valor;
  });
  let acumFluxo = 0;
  const fluxoLinhas = Object.keys(fluxoPorData).sort().map(d => {
    const e = fluxoPorData[d].entradas, s = fluxoPorData[d].saidas;
    acumFluxo += (e - s);
    return { data:d, entradas:e, saidas:s, saldoDia:e-s, acumulado:acumFluxo };
  });

  const StatusSelect = ({ id, value }) => (
    <select
      style={{background:'transparent',border:'1px solid var(--border)',borderRadius:4,fontSize:11,cursor:'pointer',padding:'2px 6px',
        color:value==='confirmado'?'var(--success)':value==='cancelado'?'var(--danger)':'var(--warn)'}}
      value={value}
      onChange={e => alterarStatus(id, e.target.value)}
      disabled={salvando===id}
    >
      <option value="confirmado">✓ Confirmado</option>
      <option value="pendente">⏳ Pendente</option>
      <option value="cancelado">✕ Cancelado</option>
    </select>
  );

  const TabelaLancamentos = ({ lista, mostrarEditar=true }) => (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Descrição</th><th>Categoria</th><th>Data</th>
            <th>Status</th><th>Tipo</th><th>Valor</th><th></th>
          </tr>
        </thead>
        <tbody>
          {lista.map(l=>(
            <tr key={l.id} style={{opacity:salvando===l.id?0.5:1,transition:'opacity 0.2s',
              background:l.tipo==='entrada'?'rgba(0,212,160,0.02)':'rgba(255,71,87,0.02)'}}>
              <td>
                <div style={{fontSize:13,fontWeight:500,color:'var(--text)'}}>{l.descricao}</div>
                {(l.clientes?.nome||l.fornecedores?.nome) && (
                  <div style={{fontSize:11,color:'var(--text3)'}}>{l.clientes?.nome||l.fornecedores?.nome}</div>
                )}
              </td>
              <td>
                {l.categorias
                  ? <span className="badge badge-info" style={{fontSize:10}}>{l.categorias.icone} {l.categorias.nome}</span>
                  : <span style={{color:'var(--text3)',fontSize:11}}>—</span>}
              </td>
              <td style={{fontSize:12,color:'var(--text3)'}}>{fmtD(l.data_lancamento)}</td>
              <td><StatusSelect id={l.id} value={l.status} /></td>
              <td>
                <span className={`badge ${l.tipo==='entrada'?'badge-success':'badge-danger'}`} style={{fontSize:10}}>
                  {l.tipo==='entrada'?'↑ Entrada':'↓ Saída'}
                </span>
              </td>
              <td>
                <span style={{fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,
                  color:l.tipo==='entrada'?'var(--success)':'var(--danger)'}}>
                  {l.tipo==='entrada'?'+':'-'}{fmt(l.valor)}
                </span>
              </td>
              <td>
                <div style={{display:'flex',gap:4}}>
                  {mostrarEditar && (
                    <button title="Editar" style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent2)',fontSize:14}}
                      onClick={()=>abrirEdicao(l)}>✏️</button>
                  )}
                  <button title="Excluir" style={{background:'none',border:'none',cursor:'pointer',color:'var(--danger)',fontSize:14}}
                    onClick={()=>deletar(l.id)}>🗑</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {/* Totais */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:'2px solid var(--border)'}}>
        {[
          { l:'Total Entradas', v:fmt(lista.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+Number(l.valor),0)), c:'var(--success)' },
          { l:'Total Saídas',   v:fmt(lista.filter(l=>l.tipo==='saida').reduce((s,l)=>s+Number(l.valor),0)),   c:'var(--danger)'  },
          { l:'Saldo Período',  v:fmt(lista.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+Number(l.valor),0)-lista.filter(l=>l.tipo==='saida').reduce((s,l)=>s+Number(l.valor),0)), c:'var(--accent)' },
        ].map((t,i)=>(
          <div key={i} style={{padding:'10px 16px',textAlign:'center',borderRight:i<2?'1px solid var(--border)':'none'}}>
            <div style={{fontSize:10,color:'var(--text3)',marginBottom:2}}>{t.l}</div>
            <div style={{fontFamily:'var(--font-head)',fontSize:15,fontWeight:800,color:t.c}}>{t.v}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fade-up">

      {/* Header */}
      <div className="section-header mb-16">
        <div>
          <div className="section-title">Gestão Financeira</div>
          <div className="section-sub">
            <strong style={{color:'var(--accent)'}}>{clienteAtivo?.nome||'—'}</strong>
            {' · '}{fmtD(dataInicio)} até {fmtD(dataFim)}
          </div>
        </div>
        <div className="flex gap-8 flex-wrap">
          <button className="btn btn-ghost" onClick={carregar}>🔄</button>
          <button className="btn btn-ghost" onClick={abrirTodos}>📋 Todos</button>
          <button className="btn btn-ghost" onClick={()=>openForm?.('conta-pagar')}>+ Pagar</button>
          <button className="btn btn-ghost" onClick={()=>openForm?.('conta-receber')}>+ Receber</button>
          <button className="btn btn-primary" onClick={()=>openForm?.('lancamento')}>+ Lançamento</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="metrics-grid mb-16">
        {(tab===0 ? [
          { label: fluxoView==='projetado'?'Entradas Previstas':'Entradas Realizadas', val:fmt(fluxoEntradas), c:'var(--success)' },
          { label: fluxoView==='projetado'?'Saídas Previstas':'Saídas Realizadas',     val:fmt(fluxoSaidas),   c:'var(--danger)'  },
          { label: fluxoView==='projetado'?'Saldo Projetado':'Saldo Realizado',        val:fmt(fluxoEntradas-fluxoSaidas), c:(fluxoEntradas-fluxoSaidas)>=0?'var(--accent)':'var(--danger)' },
          { label:'Títulos',     val:fluxoLista.length, c:'var(--accent2)' },
        ] : [
          { label:'Entradas',     val:fmt(fluxo.entradas), c:'var(--success)' },
          { label:'Saídas',       val:fmt(fluxo.saidas),   c:'var(--danger)'  },
          { label:'Saldo',        val:fmt(fluxo.saldo),    c:fluxo.saldo>=0?'var(--accent)':'var(--danger)' },
          { label:'Lançamentos',  val:lancamentos.length,  c:'var(--accent2)' },
        ]).map((m,i)=>(
          <div key={i} className="metric-card" style={{'--accent-color':m.c}}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs mb-16">
        {tabs.map((t,i)=>(
          <div key={i} className={`tab ${tab===i?'active':''}`} onClick={()=>{setTab(i);setFiltroStatus('');}}>{t}</div>
        ))}
      </div>

      {/* ── TAB 0: FLUXO ── */}
      {tab===0 && (
        <div>
          {/* Filtro de período */}
          <div className="card mb-16">
            <div className="card-body" style={{padding:'14px 20px'}}>
              <div style={{display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                <span style={{fontSize:12,fontWeight:600,color:'var(--text2)'}}>📅 Período:</span>
                <input type="date" className="inp" style={{width:145}} value={dataInicio} onChange={e=>setDataInicio(e.target.value)} />
                <span style={{color:'var(--text3)',fontSize:12}}>até</span>
                <input type="date" className="inp" style={{width:145}} value={dataFim} onChange={e=>setDataFim(e.target.value)} />
                <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                  {[
                    {l:'7d',t:'7d'},{l:'15d',t:'15d'},{l:'30d',t:'30d'},{l:'Mês',t:'mes'},
                    {l:'Trim.',t:'trim'},{l:'Ano',t:'ano'},
                  ].map(p=>(
                    <button key={p.t} className="btn btn-ghost"
                      style={{padding:'5px 10px',fontSize:11,borderRadius:6}}
                      onClick={()=>setPeriodo(p.t)}>{p.l}</button>
                  ))}
                </div>
                <div style={{display:'flex',gap:8,marginLeft:'auto'}}>
                  <select className="inp" style={{width:120,fontSize:12}} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
                    <option value="">Tudo</option>
                    <option value="entrada">Entradas</option>
                    <option value="saida">Saídas</option>
                  </select>
                  <input className="inp" placeholder="🔍 Buscar..." style={{width:160}} value={busca} onChange={e=>setBusca(e.target.value)} />
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico 12 meses */}
          <div className="card mb-16">
            <div className="card-header">
              <span className="card-title">📈 Evolução 12 Meses</span>
              <div style={{display:'flex',gap:12,fontSize:11}}>
                <span style={{color:'var(--accent2)'}}>■ Entradas</span>
                <span style={{color:'var(--danger)'}}>■ Saídas</span>
              </div>
            </div>
            <div className="card-body">
              {evolucao.every(e=>!e.entradas&&!e.saidas) ? (
                <div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>
                  <div style={{fontSize:36,marginBottom:8}}>📊</div>
                  <div style={{fontSize:14,color:'var(--text2)',fontWeight:600,marginBottom:4}}>Nenhum dado nos últimos 12 meses</div>
                  <div style={{fontSize:12}}>Os gráficos são alimentados pelos lançamentos confirmados e pendentes.</div>
                </div>
              ) : (
                <div>
                  <div style={{display:'flex',alignItems:'flex-end',gap:4,height:150,paddingBottom:4}}>
                    {evolucao.map((e,i)=>(
                      <div key={i} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',gap:2,height:'100%',justifyContent:'flex-end'}}>
                        <div style={{width:'100%',display:'flex',gap:1,alignItems:'flex-end',height:'130px',position:'relative'}}>
                          {/* Tooltip */}
                          <div style={{
                            position:'absolute',bottom:'105%',left:'50%',transform:'translateX(-50%)',
                            background:'var(--bg)',border:'1px solid var(--border)',borderRadius:6,
                            padding:'4px 8px',fontSize:10,whiteSpace:'nowrap',display:'none',zIndex:10,
                            pointerEvents:'none',
                          }} className="bar-tooltip">
                            <div style={{color:'var(--accent2)'}}>↑ {fmt(e.entradas)}</div>
                            <div style={{color:'var(--danger)'}}>↓ {fmt(e.saidas)}</div>
                          </div>
                          <div
                            style={{flex:1,background:'var(--accent2)',borderRadius:'3px 3px 0 0',
                              height:`${((e.entradas||0)/maxEv)*100}%`,minHeight:(e.entradas||0)>0?3:0,
                              transition:'height 0.6s ease',opacity:0.9,cursor:'pointer'}}
                            title={`Entradas ${e.mes}: ${fmt(e.entradas)}`}
                          />
                          <div
                            style={{flex:1,background:'var(--danger)',borderRadius:'3px 3px 0 0',
                              height:`${((e.saidas||0)/maxEv)*100}%`,minHeight:(e.saidas||0)>0?3:0,
                              transition:'height 0.6s ease',opacity:0.9,cursor:'pointer'}}
                            title={`Saídas ${e.mes}: ${fmt(e.saidas)}`}
                          />
                        </div>
                        <span style={{fontSize:9,color:'var(--text3)'}}>{e.mes}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:0,borderTop:'1px solid var(--border)',marginTop:8}}>
                    {[
                      {l:'Total Entradas 12m',v:fmtK(evolucao.reduce((s,e)=>s+(e.entradas||0),0)),c:'var(--accent2)'},
                      {l:'Total Saídas 12m',v:fmtK(evolucao.reduce((s,e)=>s+(e.saidas||0),0)),c:'var(--danger)'},
                      {l:'Resultado 12m',v:fmtK(evolucao.reduce((s,e)=>s+(e.saldo||0),0)),c:'var(--accent)'},
                    ].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',padding:'12px 0',borderRight:i<2?'1px solid var(--border)':'none'}}>
                        <div style={{fontSize:10,color:'var(--text3)',marginBottom:3}}>{s.l}</div>
                        <div style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:800,color:s.c}}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Visões do Fluxo de Caixa */}
          <div className="card">
            <div className="card-header" style={{flexWrap:'wrap',gap:10}}>
              <div style={{display:'flex',gap:6}}>
                {[
                  {k:'projetado',l:'📅 Projetado (Previsto)'},
                  {k:'realizado',l:'✅ Realizado'},
                ].map(v=>(
                  <button key={v.k}
                    className={`btn ${fluxoView===v.k?'btn-primary':'btn-ghost'}`}
                    style={{fontSize:12}}
                    onClick={()=>setFluxoView(v.k)}>{v.l}</button>
                ))}
              </div>
              <span style={{fontSize:11,color:'var(--text3)'}}>
                {fluxoView==='projetado'
                  ? 'Títulos em aberto e vencidos (por vencimento) — alimentado por Contas a Pagar/Receber'
                  : 'Recebimentos e pagamentos já baixados (por data de liquidação)'}
              </span>
            </div>

            {loading ? (
              <div style={{textAlign:'center',padding:32,color:'var(--text3)'}}>⏳ Carregando...</div>
            ) : fluxoLista.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:36,marginBottom:8}}>{fluxoView==='projetado'?'📅':'✅'}</div>
                <div style={{fontSize:14,color:'var(--text2)',marginBottom:4}}>
                  {fluxoView==='projetado'
                    ? 'Nenhum título previsto neste período'
                    : 'Nenhum recebimento/pagamento realizado neste período'}
                </div>
                <div style={{fontSize:12,color:'var(--text3)'}}>
                  O fluxo é alimentado automaticamente por Contas a Pagar, Contas a Receber e Lançamentos.
                </div>
                <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
                  <button className="btn btn-ghost" onClick={()=>openForm?.('conta-receber')}>+ Conta a Receber</button>
                  <button className="btn btn-ghost" onClick={()=>openForm?.('conta-pagar')}>+ Conta a Pagar</button>
                </div>
              </div>
            ) : (
              <div className="card-body" style={{padding:0}}>
                {/* Resumo por data com saldo acumulado */}
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Data</th>
                        <th style={{textAlign:'right'}}>{fluxoView==='projetado'?'Entradas Previstas':'Entradas Realizadas'}</th>
                        <th style={{textAlign:'right'}}>{fluxoView==='projetado'?'Saídas Previstas':'Saídas Realizadas'}</th>
                        <th style={{textAlign:'right'}}>Saldo do dia</th>
                        <th style={{textAlign:'right'}}>Saldo acumulado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxoLinhas.map(r=>(
                        <tr key={r.data}>
                          <td style={{fontSize:12,color:'var(--text2)',fontWeight:600}}>{fmtD(r.data)}</td>
                          <td style={{textAlign:'right',color:'var(--success)',fontWeight:600}}>{r.entradas?fmt(r.entradas):'—'}</td>
                          <td style={{textAlign:'right',color:'var(--danger)',fontWeight:600}}>{r.saidas?fmt(r.saidas):'—'}</td>
                          <td style={{textAlign:'right',fontWeight:700,color:r.saldoDia>=0?'var(--accent)':'var(--danger)'}}>{fmt(r.saldoDia)}</td>
                          <td style={{textAlign:'right',fontFamily:'var(--font-head)',fontWeight:800,color:r.acumulado>=0?'var(--accent)':'var(--danger)'}}>{fmt(r.acumulado)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',borderTop:'2px solid var(--border)'}}>
                    {[
                      { l: fluxoView==='projetado'?'Total Previsto (Entradas)':'Total Realizado (Entradas)', v:fmt(fluxoEntradas), c:'var(--success)' },
                      { l: fluxoView==='projetado'?'Total Previsto (Saídas)':'Total Realizado (Saídas)',     v:fmt(fluxoSaidas),   c:'var(--danger)'  },
                      { l:'Saldo do Período', v:fmt(fluxoEntradas-fluxoSaidas), c:'var(--accent)' },
                    ].map((t,i)=>(
                      <div key={i} style={{padding:'10px 16px',textAlign:'center',borderRight:i<2?'1px solid var(--border)':'none'}}>
                        <div style={{fontSize:10,color:'var(--text3)',marginBottom:2}}>{t.l}</div>
                        <div style={{fontFamily:'var(--font-head)',fontSize:15,fontWeight:800,color:t.c}}>{t.v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detalhamento dos títulos */}
                <div style={{borderTop:'1px solid var(--border)'}}>
                  <div style={{padding:'10px 16px',fontSize:12,fontWeight:600,color:'var(--text2)'}}>
                    Detalhamento ({fluxoLista.length} título{fluxoLista.length!==1?'s':''})
                  </div>
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr><th>Descrição</th><th>Origem</th><th>{fluxoView==='projetado'?'Vencimento':'Liquidação'}</th><th>Status</th><th style={{textAlign:'right'}}>Valor</th></tr>
                      </thead>
                      <tbody>
                        {fluxoLista.slice().sort((a,b)=>(a.data||'').localeCompare(b.data||'')).map(x=>(
                          <tr key={x.id} style={{background:x.tipo==='entrada'?'rgba(0,212,160,0.02)':'rgba(255,71,87,0.02)'}}>
                            <td style={{fontSize:13,color:'var(--text)'}}>{x.descricao}</td>
                            <td><span className="badge badge-info" style={{fontSize:10}}>{x.origem}</span></td>
                            <td style={{fontSize:12,color:'var(--text3)'}}>{fmtD(x.data)}</td>
                            <td>
                              <span className={`badge ${x.status==='Vencido'?'badge-danger':(x.status==='Recebido'||x.status==='Pago'||x.status==='Realizado')?'badge-success':'badge-warn'}`} style={{fontSize:10}}>
                                {x.status==='Vencido'?'⚠ '+x.status:x.status}
                              </span>
                            </td>
                            <td style={{textAlign:'right',fontFamily:'var(--font-head)',fontWeight:700,fontSize:14,color:x.tipo==='entrada'?'var(--success)':'var(--danger)'}}>
                              {x.tipo==='entrada'?'+':'-'}{fmt(x.valor)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 1: DRE ── */}
      {tab===1 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">DRE Gerencial</span>
            <span style={{fontSize:12,color:'var(--text3)'}}>{fmtD(dataInicio)} – {fmtD(dataFim)}</span>
          </div>
          <div className="card-body">
            {(() => {
              const rec=fluxo.entradas,ded=rec*0.10,rl=rec-ded,cst=fluxo.saidas*0.40,lb=rl-cst,dsp=fluxo.saidas*0.60,ebt=lb-dsp,irpj=Math.max(ebt*0.15,0),ll=ebt-irpj;
              return [
                {d:'RECEITA BRUTA',v:rec,bold:true},{d:'(-) Deduções (~10%)',v:-ded,bold:false},
                {d:'RECEITA LÍQUIDA',v:rl,bold:true},{d:'(-) Custos (~40% saídas)',v:-cst,bold:false},
                {d:'LUCRO BRUTO',v:lb,bold:true},{d:'(-) Despesas (~60% saídas)',v:-dsp,bold:false},
                {d:'EBITDA',v:ebt,bold:true},{d:'(-) IRPJ/CSLL (~15%)',v:-irpj,bold:false},
                {d:'LUCRO LÍQUIDO',v:ll,bold:true},
              ].map((r,i)=>(
                <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)',
                  background:r.bold?'rgba(255,255,255,0.02)':'transparent'}}>
                  <span style={{fontSize:13,fontWeight:r.bold?700:400,color:r.bold?'var(--text)':'var(--text2)'}}>{r.d}</span>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    {rec>0&&r.bold && <span style={{fontSize:10,color:'var(--text3)'}}>({((r.v/rec)*100).toFixed(1)}%)</span>}
                    <span style={{fontFamily:'var(--font-head)',fontWeight:r.bold?800:500,fontSize:r.bold?16:14,
                      color:r.v>=0?'var(--success)':'var(--danger)'}}>{fmt(r.v)}</span>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── TAB 2: CONTAS A PAGAR ── */}
      {tab===2 && (
        <div>
          <div className="metrics-grid mb-16">
            {[
              {label:'A Vencer',val:fmt(totaisPagar.pendente),c:'var(--warn)'},
              {label:'Vencido',val:fmt(totaisPagar.vencido),c:'var(--danger)'},
              {label:'Pago',val:fmt(totaisPagar.pago),c:'var(--success)'},
              {label:'Total',val:fmt(Object.values(totaisPagar).reduce((s,v)=>s+v,0)),c:'var(--text2)'},
            ].map((m,i)=>(
              <div key={i} className="metric-card" style={{'--accent-color':m.c}}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-value" style={{color:m.c}}>{m.val}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Contas a Pagar</span>
              <div className="flex gap-8">
                <select className="inp" style={{width:130,fontSize:12,padding:'5px 8px'}} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
                  <option value="">Todos</option><option value="pendente">Em Aberto</option>
                  <option value="parcial">Parcial</option><option value="pago">Pago</option>
                </select>
                <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>openForm?.('conta-pagar')}>+ Nova</button>
              </div>
            </div>
            {loading ? <div style={{padding:24,textAlign:'center',color:'var(--text3)'}}>⏳ Carregando...</div> :
             contasPagar.length===0 ? (
              <div className="empty">
                <div style={{fontSize:32,marginBottom:8}}>💸</div>
                <div>Nenhuma conta a pagar cadastrada.</div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>openForm?.('conta-pagar')}>+ Cadastrar</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Descrição</th><th>Fornecedor</th><th>Vencimento</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                  <tbody>
                    {contasPagar.map(c=>(
                      <tr key={c.id}>
                        <td className="primary">{c.descricao}</td>
                        <td style={{fontSize:12,color:'var(--text2)'}}>{c.fornecedores?.nome||'—'}</td>
                        <td style={{fontSize:12,color:new Date(c.vencimento)<new Date()&&c.status==='pendente'?'var(--danger)':'var(--text3)'}}>{fmtD(c.vencimento)}</td>
                        <td>{(()=>{const aberto=c.status==='pendente'||c.status==='parcial';const atrasado=aberto&&(c.vencimento||'9999')<new Date().toISOString().slice(0,10);const cls=c.status==='pago'?'badge-success':atrasado?'badge-danger':c.status==='parcial'?'badge-info':'badge-warn';const lbl=c.status==='pago'?'Pago':c.status==='parcial'?(atrasado?'⚠ Parcial':'Parcial'):atrasado?'⚠ Atrasado':'Em Aberto';return <span className={`badge ${cls}`}>{lbl}</span>;})()}</td>
                        <td style={{fontFamily:'var(--font-head)',fontWeight:700,color:'var(--danger)'}}>
                          {fmt(c.valor)}
                          {c.status==='parcial' && <div style={{fontSize:10,color:'var(--text3)',fontWeight:400}}>pago {fmt(c.valor_pago)} · resta {fmt(Number(c.valor)-Number(c.valor_pago||0))}</div>}
                        </td>
                        <td>{(c.status==='pendente'||c.status==='parcial')
                          ? <button className="btn btn-ghost" style={{fontSize:11,color:'var(--success)'}} onClick={()=>abrirBaixa('pagar',c)}>✓ Baixar</button>
                          : c.status==='pago' && <button className="btn btn-ghost" style={{fontSize:11,color:'var(--text3)'}} onClick={()=>estornar('pagar',c.id)}>↩ Estornar</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── TAB 3: CONTAS A RECEBER ── */}
      {tab===3 && (
        <div>
          <div className="metrics-grid mb-16">
            {[
              {label:'A Receber',val:fmt(totaisReceber.pendente),c:'var(--accent2)'},
              {label:'Vencido',val:fmt(totaisReceber.vencido),c:'var(--danger)'},
              {label:'Recebido',val:fmt(totaisReceber.recebido),c:'var(--success)'},
              {label:'Total',val:fmt(Object.values(totaisReceber).reduce((s,v)=>s+v,0)),c:'var(--text2)'},
            ].map((m,i)=>(
              <div key={i} className="metric-card" style={{'--accent-color':m.c}}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-value" style={{color:m.c}}>{m.val}</div>
              </div>
            ))}
          </div>
          <div className="card">
            <div className="card-header">
              <span className="card-title">Contas a Receber</span>
              <div className="flex gap-8">
                <select className="inp" style={{width:130,fontSize:12,padding:'5px 8px'}} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
                  <option value="">Todos</option><option value="pendente">Em Aberto</option>
                  <option value="parcial">Parcial</option><option value="recebido">Recebido</option>
                </select>
                <button className="btn btn-primary" style={{fontSize:12}} onClick={()=>openForm?.('conta-receber')}>+ Nova</button>
              </div>
            </div>
            {loading ? <div style={{padding:24,textAlign:'center',color:'var(--text3)'}}>⏳ Carregando...</div> :
             contasReceber.length===0 ? (
              <div className="empty">
                <div style={{fontSize:32,marginBottom:8}}>💰</div>
                <div>Nenhuma conta a receber cadastrada.</div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={()=>openForm?.('conta-receber')}>+ Cadastrar</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                  <tbody>
                    {contasReceber.map(c=>(
                      <tr key={c.id}>
                        <td className="primary">{c.descricao}</td>
                        <td style={{fontSize:12,color:'var(--text2)'}}>{c.clientes?.nome||'—'}</td>
                        <td style={{fontSize:12,color:new Date(c.vencimento)<new Date()&&c.status==='pendente'?'var(--danger)':'var(--text3)'}}>{fmtD(c.vencimento)}</td>
                        <td>{(()=>{const aberto=c.status==='pendente'||c.status==='parcial';const atrasado=aberto&&(c.vencimento||'9999')<new Date().toISOString().slice(0,10);const cls=c.status==='recebido'?'badge-success':atrasado?'badge-danger':c.status==='parcial'?'badge-info':'badge-warn';const lbl=c.status==='recebido'?'Recebido':c.status==='parcial'?(atrasado?'⚠ Parcial':'Parcial'):atrasado?'⚠ Em atraso':'Em Aberto';return <span className={`badge ${cls}`}>{lbl}</span>;})()}</td>
                        <td style={{fontFamily:'var(--font-head)',fontWeight:700,color:'var(--success)'}}>
                          {fmt(c.valor)}
                          {c.status==='parcial' && <div style={{fontSize:10,color:'var(--text3)',fontWeight:400}}>recebido {fmt(c.valor_recebido)} · resta {fmt(Number(c.valor)-Number(c.valor_recebido||0))}</div>}
                        </td>
                        <td>{(c.status==='pendente'||c.status==='parcial')
                          ? <button className="btn btn-ghost" style={{fontSize:11,color:'var(--success)'}} onClick={()=>abrirBaixa('receber',c)}>✓ Baixar</button>
                          : c.status==='recebido' && <button className="btn btn-ghost" style={{fontSize:11,color:'var(--text3)'}} onClick={()=>estornar('receber',c.id)}>↩ Estornar</button>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL EDIÇÃO */}
      {editando && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setEditando(null)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:480}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:17,fontWeight:800,marginBottom:20}}>✏️ Editar Lançamento</div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Tipo</label>
                <div style={{display:'flex',gap:8}}>
                  {['entrada','saida'].map(t=>(
                    <div key={t} onClick={()=>setEditForm(f=>({...f,tipo:t}))}
                      style={{flex:1,padding:'8px 0',borderRadius:8,border:`2px solid ${editForm.tipo===t?(t==='entrada'?'var(--success)':'var(--danger)'):'var(--border)'}`,
                        background:editForm.tipo===t?(t==='entrada'?'rgba(0,212,160,0.08)':'rgba(255,71,87,0.08)'):'transparent',
                        cursor:'pointer',textAlign:'center',fontSize:13,fontWeight:600,
                        color:editForm.tipo===t?(t==='entrada'?'var(--success)':'var(--danger)'):'var(--text3)'}}>
                      {t==='entrada'?'↑ Entrada':'↓ Saída'}
                    </div>
                  ))}
                </div>
              </div>
              {[
                {label:'Descrição',key:'descricao',placeholder:'Ex: Receita de serviços'},
                {label:'Valor (R$)',key:'valor',type:'number',placeholder:'0,00'},
                {label:'Data',key:'data_lancamento',type:'date'},
                {label:'Observação',key:'observacao',placeholder:'Opcional'},
              ].map(f=>(
                <div key={f.key}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.label}</label>
                  <input className="inp" type={f.type||'text'} placeholder={f.placeholder}
                    value={editForm[f.key]||''} onChange={e=>setEditForm(ef=>({...ef,[f.key]:e.target.value}))} />
                </div>
              ))}
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Status</label>
                <select className="inp" value={editForm.status} onChange={e=>setEditForm(f=>({...f,status:e.target.value}))}>
                  <option value="confirmado">✓ Confirmado</option>
                  <option value="pendente">⏳ Pendente</option>
                  <option value="cancelado">✕ Cancelado</option>
                </select>
              </div>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}}
                  onClick={()=>setEditando(null)}>Cancelar</button>
                <button style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700}}
                  onClick={salvarEdicao} disabled={!!salvando}>
                  {salvando?'⏳ Salvando...':'✅ Salvar Alterações'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BAIXA DE TÍTULO */}
      {baixa && (()=>{
        const c = baixa.conta;
        const isPagar = baixa.tipo==='pagar';
        const jaBaixado = Number(isPagar?c.valor_pago:c.valor_recebido)||0;
        const restante = Number(c.valor)-jaBaixado;
        const vAbater = parseFloat(baixaForm.valor)||0;
        const liquido = vAbater + (parseFloat(baixaForm.juros)||0) + (parseFloat(baixaForm.multa)||0) - (parseFloat(baixaForm.desconto)||0);
        const parcial = vAbater>0 && vAbater < restante-0.009;
        return (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:20}}
          onClick={e=>e.target===e.currentTarget&&setBaixa(null)}>
          <div style={{background:'var(--card)',border:'1px solid var(--border)',borderRadius:20,padding:32,width:'100%',maxWidth:460}}>
            <div style={{fontFamily:'var(--font-head)',fontSize:17,fontWeight:800,marginBottom:4}}>
              {isPagar?'💸 Baixar Conta a Pagar':'💰 Baixar Conta a Receber'}
            </div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:16}}>{c.descricao} · total {fmt(c.valor)}{jaBaixado>0&&` · já ${isPagar?'pago':'recebido'} ${fmt(jaBaixado)}`} · resta <strong style={{color:'var(--text)'}}>{fmt(restante)}</strong></div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              <div style={{display:'flex',gap:10}}>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Data {isPagar?'do pagamento':'do recebimento'}</label>
                  <input className="inp" type="date" value={baixaForm.data} onChange={e=>setBaixaForm(f=>({...f,data:e.target.value}))} />
                </div>
                <div style={{flex:1}}>
                  <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Valor a {isPagar?'pagar':'receber'} (R$)</label>
                  <input className="inp" type="number" step="0.01" value={baixaForm.valor} onChange={e=>setBaixaForm(f=>({...f,valor:e.target.value}))} />
                </div>
              </div>
              <div>
                <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>Conta bancária</label>
                <select className="inp" value={baixaForm.conta_bancaria_id} onChange={e=>setBaixaForm(f=>({...f,conta_bancaria_id:e.target.value}))}>
                  <option value="">— Selecione —</option>
                  {bancos.map(b=>(<option key={b.id} value={b.id}>{b.nome||b.banco||b.apelido||b.descricao||'Conta'}</option>))}
                </select>
                {bancos.length===0 && <div style={{fontSize:11,color:'var(--warn)',marginTop:4}}>Nenhuma conta bancária cadastrada (Gestão Bancária).</div>}
              </div>
              <div style={{display:'flex',gap:10}}>
                {[
                  {k:'juros',l:'Juros (R$)'},
                  {k:'multa',l:'Multa (R$)'},
                  {k:'desconto',l:'Desconto (R$)'},
                ].map(f=>(
                  <div key={f.k} style={{flex:1}}>
                    <label style={{fontSize:12,fontWeight:600,color:'var(--text2)',display:'block',marginBottom:4}}>{f.l}</label>
                    <input className="inp" type="number" step="0.01" placeholder="0,00" value={baixaForm[f.k]} onChange={e=>setBaixaForm(bf=>({...bf,[f.k]:e.target.value}))} />
                  </div>
                ))}
              </div>
              <div style={{background:'var(--bg)',border:'1px solid var(--border)',borderRadius:10,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:12,color:'var(--text2)'}}>{isPagar?'Saída líquida no banco':'Entrada líquida no banco'}</span>
                <span style={{fontFamily:'var(--font-head)',fontWeight:800,fontSize:17,color:isPagar?'var(--danger)':'var(--success)'}}>{fmt(liquido)}</span>
              </div>
              {parcial && <div style={{fontSize:12,color:'var(--accent2)',background:'rgba(0,144,255,0.08)',borderRadius:8,padding:'8px 12px'}}>ℹ️ Baixa parcial — restará {fmt(restante-vAbater)}. O título fica como <strong>Parcial</strong>.</div>}
              <div style={{display:'flex',gap:10,marginTop:4}}>
                <button style={{flex:1,padding:11,borderRadius:'var(--radius)',background:'transparent',color:'var(--text2)',border:'1px solid var(--border2)',cursor:'pointer'}}
                  onClick={()=>setBaixa(null)}>Cancelar</button>
                <button style={{flex:2,padding:11,borderRadius:'var(--radius)',background:'var(--accent)',color:'var(--bg)',border:'none',cursor:'pointer',fontFamily:'var(--font-head)',fontWeight:700,opacity:(vAbater<=0||baixando)?0.5:1}}
                  onClick={confirmarBaixa} disabled={vAbater<=0||baixando}>
                  {baixando?'⏳ Processando...':parcial?'✅ Confirmar baixa parcial':'✅ Confirmar baixa'}
                </button>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

      {/* MODAL TODOS OS LANÇAMENTOS */}
      {showTodos && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.88)',display:'flex',flexDirection:'column',zIndex:1000}}>
          <div style={{background:'var(--card)',borderBottom:'1px solid var(--border)',padding:'14px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
            <div>
              <div style={{fontFamily:'var(--font-head)',fontSize:16,fontWeight:800}}>
                📋 Todos os Lançamentos — {clienteAtivo?.nome}
              </div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:1}}>
                {todosLanc.length} total · {fmt(todosLanc.filter(l=>l.tipo==='entrada').reduce((s,l)=>s+Number(l.valor),0))} entradas · {fmt(todosLanc.filter(l=>l.tipo==='saida').reduce((s,l)=>s+Number(l.valor),0))} saídas
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <input className="inp" placeholder="🔍 Buscar..." style={{width:180}} value={busca} onChange={e=>setBusca(e.target.value)} />
              <select className="inp" style={{width:110}} value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}>
                <option value="">Todos</option><option value="entrada">Entradas</option><option value="saida">Saídas</option>
              </select>
              <select className="inp" style={{width:120}} value={filtroStatus} onChange={e=>setFiltroStatus(e.target.value)}>
                <option value="">Status: todos</option>
                <option value="confirmado">Confirmado</option>
                <option value="pendente">Pendente</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <button className="btn btn-primary" onClick={()=>openForm?.('lancamento')}>+ Novo</button>
              <button className="btn btn-ghost btn-icon" onClick={()=>{setShowTodos(false);setBusca('');setFiltroTipo('');setFiltroStatus('');}}>✕</button>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto'}}>
            {loadTodos ? (
              <div style={{textAlign:'center',padding:48,color:'var(--text3)'}}>⏳ Carregando...</div>
            ) : (
              <TabelaLancamentos lista={lancFiltrados} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Tributario() {
  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Inteligência Tributária</div>
          <div className="section-sub">Simulação e comparação de regimes — análise automatizada por IA</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost">📋 Parecer Técnico</button>
          <button className="btn btn-primary">🔄 Recalcular</button>
        </div>
      </div>

      <div className="alert alert-success mb-16">
        <span className="alert-icon">🤖</span>
        <div className="alert-content">
          <div className="alert-title">IA identificou oportunidade tributária</div>
          <div className="alert-desc">Com base na análise das 847 NFs e no cruzamento com dados do Portal da Transparência Tributária, o Lucro Presumido é o regime mais vantajoso, gerando economia de <strong>R$ 84.000/ano</strong> vs. regime atual.</div>
        </div>
      </div>

      <div className="regime-grid mb-20">
        {[
          {
            name: "Simples Nacional", tax: "16,2%", val: 1474200, best: false, color: "var(--accent4)",
            items: ["Alíquota progressiva por faixa", "Unifica 8 tributos em 1 guia", "Limite: R$ 4,8M/ano", "IRPJ incluso no DAS"],
          },
          {
            name: "Lucro Presumido", tax: "12,8%", val: 1164800, best: true, color: "var(--success)",
            items: ["Presunção de 32% de lucro", "IRPJ: 15% + adicional 10%", "PIS/COFINS: 0,65% + 3%", "Ideal: margem real > presumida"],
          },
          {
            name: "Lucro Real", tax: "14,1%", val: 1283100, best: false, color: "var(--accent2)",
            items: ["Base no lucro efetivo", "Créditos de PIS/COFINS", "Complexidade contábil alta", "Indicado para margens baixas"],
          },
        ].map((r, i) => (
          <div key={i} className={`regime-card ${r.best ? "best" : ""}`}>
            <div className="regime-name">{r.name}</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Carga efetiva estimada</div>
            <div className={`regime-tax ${r.best ? "best-val" : ""}`} style={{ color: r.best ? "var(--success)" : "var(--text2)" }}>{r.tax}</div>
            <div style={{ fontSize: 14, color: "var(--text)", fontWeight: 600, marginBottom: 4 }}>{fmt(r.val)}<span style={{ fontSize: 11, color: "var(--text3)" }}>/ano</span></div>
            {r.best && <div style={{ fontSize: 11, color: "var(--success)", marginBottom: 8 }}>✓ Economia de {fmt(1474200 - r.val)}/ano</div>}
            <ul className="regime-items">
              {r.items.map((item, j) => <li key={j} className="regime-item">{item}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div className="grid-12">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Composição Tributária Atual</span>
            <span className="badge badge-danger">Acima do mercado +4,3pp</span>
          </div>
          <div className="card-body">
            {[
              { name: "IRPJ + CSLL",  val: 421000, pct: 24.9, c: "var(--accent2)" },
              { name: "PIS + COFINS", val: 512000, pct: 30.3, c: "var(--accent)" },
              { name: "ISS",          val: 91000,  pct: 5.4, c: "var(--accent4)" },
              { name: "INSS Patronal",val: 284000, pct: 16.8, c: "var(--warn)" },
              { name: "ICMS",         val: 148000, pct: 8.8, c: "var(--danger)" },
              { name: "Outros",       val: 235000, pct: 13.9, c: "var(--text3)" },
            ].map((t, i) => (
              <div key={i} className="mb-12">
                <div className="flex justify-between mb-4">
                  <span className="text-sm">{t.name}</span>
                  <span className="text-sm font-bold">{fmt(t.val)} <span className="text-muted">({t.pct}%)</span></span>
                </div>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${t.pct * 3}%`, background: t.c }} />
                </div>
              </div>
            ))}
            <div className="divider" />
            <div className="flex justify-between">
              <span style={{ fontWeight: 700 }}>Total Anual</span>
              <span style={{ fontWeight: 800, color: "var(--danger)", fontFamily: "var(--font-head)" }}>R$ 1.691.000</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Compliance Tributário</span></div>
          <div className="card-body">
            {[
              { label: "SPED Contábil — Entregue", status: "ok" },
              { label: "EFD-REINF — Em dia", status: "ok" },
              { label: "DCTF — Entregue", status: "ok" },
              { label: "DIRF — Entregue", status: "ok" },
              { label: "ECF — Entregue", status: "ok" },
              { label: "GIA Estadual — Pendente revisão", status: "warn" },
              { label: "DARF — 3 guias a vencer", status: "warn" },
              { label: "Parcelamento PGFN — Verificar", status: "warn" },
            ].map((c, i) => (
              <div key={i} className="compliance-item">
                <div className={`compliance-status ${c.status === "ok" ? "c-ok" : c.status === "warn" ? "c-warn" : "c-err"}`}>
                  {c.status === "ok" ? "✓" : c.status === "warn" ? "!" : "✗"}
                </div>
                <span style={{ fontSize: 13, color: c.status === "ok" ? "var(--text2)" : "var(--text)" }}>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Creditos() {
  const total = credits.reduce((s, c) => s + c.value, 0);
  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Recuperação de Créditos Fiscais</div>
          <div className="section-sub">Mapeamento automático de oportunidades — atualizado com jurisprudência do STF/STJ</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost">📋 Gerar Parecer</button>
          <button className="btn btn-primary">⚡ Iniciar Recuperação</button>
        </div>
      </div>

      <div className="kpi-row mb-20">
        {[
          { icon: "💎", label: "Total Recuperável", val: fmtK(total), color: "#00D4A0", bg: "rgba(0,212,160,0.1)" },
          { icon: "📊", label: "Oportunidades", val: "5 ativas", color: "#0090FF", bg: "rgba(0,144,255,0.1)" },
          { icon: "⚖️", label: "Maior Probabilidade", val: "95%", color: "#A855F7", bg: "rgba(168,85,247,0.1)" },
          { icon: "⏱️", label: "Prazo Médio", val: "8-18 meses", color: "#FFB800", bg: "rgba(255,184,0,0.1)" },
        ].map((k, i) => (
          <div key={i} className="kpi-item">
            <div className="kpi-icon-box" style={{ background: k.bg }}><span>{k.icon}</span></div>
            <div className="kpi-data">
              <div className="kpi-val" style={{ color: k.color }}>{k.val}</div>
              <div className="kpi-lbl">{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-12">
        <div>
          <div className="credit-grid">
            {credits.map((c, i) => (
              <div key={i} className="credit-item">
                <div className="credit-icon" style={{ background: `${c.color}18` }}>
                  <span>{c.icon}</span>
                </div>
                <div className="credit-info">
                  <div className="credit-title">{c.title}</div>
                  <div className="credit-desc">{c.desc}</div>
                  <div style={{ marginTop: 6 }}>
                    <div className="progress" style={{ width: 160 }}>
                      <div className="progress-fill" style={{ width: `${c.prob}%`, background: c.color }} />
                    </div>
                  </div>
                </div>
                <div className="credit-amount">
                  <div className="credit-value">{fmtK(c.value)}</div>
                  <div className="credit-prob">{c.prob}% de êxito</div>
                  <button className="btn btn-ghost" style={{ fontSize: 10, padding: "3px 8px", marginTop: 6 }}>Detalhar</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-col gap-16">
          <div className="card">
            <div className="card-header"><span className="card-title">Distribuição do Potencial</span></div>
            <div className="card-body">
              <div className="donut-container">
                <DonutChart segments={credits.map(c => ({ color: c.color, val: c.value }))} size={120} />
                <div className="donut-legend">
                  {credits.map((c, i) => (
                    <div key={i} className="legend-item">
                      <div className="legend-dot" style={{ background: c.color }} />
                      <span className="legend-label" style={{ fontSize: 11 }}>{c.title.split(" ").slice(0, 3).join(" ")}</span>
                      <span className="legend-value">{fmtK(c.value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Teses Aplicáveis</span></div>
            <div className="card-body">
              {[
                { tese: "RE 574.706 — STF", desc: "Exclusão ICMS PIS/COFINS", status: "Transitado em Julgado" },
                { tese: "STJ Tema 1170", desc: "INSS verbas indenizatórias", status: "Repetitivo" },
                { tese: "ADC 49 — STF", desc: "ICMS-ST transferência", status: "Ativo" },
                { tese: "REsp 1.221.170", desc: "Insumos PIS/COFINS", status: "Transitado" },
              ].map((t, i) => (
                <div key={i} style={{ padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <div className="flex justify-between mb-4">
                    <span style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)" }}>{t.tese}</span>
                    <span className="badge badge-success" style={{ fontSize: 10 }}>{t.status}</span>
                  </div>
                  <span style={{ fontSize: 12, color: "var(--text3)" }}>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IAChat() {
  const [messages, setMessages] = useState(chatInit);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  const scrollDown = () => endRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(scrollDown, [messages]);

  const send = async (text) => {
    const q = text || input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages(m => [...m, { role: "user", text: q }]);
    setLoading(true);
    await new Promise(r => setTimeout(r, 1400));

    const known = Object.keys(aiResponses).find(k => q.toLowerCase().includes(k.toLowerCase().split(" ")[1]) || q === k);
    const reply = known ? aiResponses[known] : await callAI(q);
    setMessages(m => [...m, { role: "ai", text: reply }]);
    setLoading(false);
  };

  const callAI = async (q) => {
    try {
      // Chama a Netlify Function — a chave de API fica segura no servidor
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.reply || "Analisando dados tributários... Aguarde.";
    } catch {
      return "IA tributária processando solicitação. Verifique conexão com servidor.";
    }
  };

  const renderText = (t) => {
    const parts = t.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, i) => p.startsWith("**") ? <strong key={i} style={{ color: "var(--accent)", fontWeight: 700 }}>{p.slice(2, -2)}</strong> : p.split("\n").map((l, j) => <span key={j}>{l}{j < p.split("\n").length - 1 && <br />}</span>));
  };

  return (
    <div className="fade-up" style={{ height: "calc(100vh - 120px)", display: "flex", flexDirection: "column" }}>
      <div className="section-header mb-16">
        <div>
          <div className="section-title">IA Tributária</div>
          <div className="section-sub">Assistente especializado em tributação e planejamento fiscal — RAG + Base Jurídica Atualizada</div>
        </div>
        <div className="flex gap-8 items-center">
          <span className="badge badge-success">🟢 Online</span>
          <button className="btn btn-ghost" onClick={() => setMessages(chatInit)}>🗑 Limpar</button>
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div className="chat-messages">
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}>
              <div className={`chat-avatar ${m.role}`}>{m.role === "ai" ? "🤖" : "U"}</div>
              <div className={`chat-bubble ${m.role}`}>{renderText(m.text)}</div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg">
              <div className="chat-avatar ai">🤖</div>
              <div className="chat-bubble ai">
                <div className="typing">
                  <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div style={{ padding: "12px 16px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            {suggestions.map((s, i) => <div key={i} className="chat-suggestion" onClick={() => send(s)}>{s}</div>)}
          </div>
          <div className="chat-input-row" style={{ padding: 0 }}>
            <textarea
              className="chat-input"
              rows={2}
              placeholder="Pergunte sobre tributos, planejamento fiscal, créditos recuperáveis..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
            />
            <button className="btn btn-primary" onClick={() => send()} disabled={loading} style={{ alignSelf: "flex-end" }}>
              {loading ? "⏳" : "↑ Enviar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Relatorios() {
  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Relatórios & Documentos</div>
          <div className="section-sub">Geração automática de relatórios financeiros, tributários e estratégicos</div>
        </div>
        <button className="btn btn-primary">+ Gerar Relatório</button>
      </div>

      <div className="metrics-grid mb-20">
        {[
          { label: "Gerados este Mês", val: "24", c: "var(--accent2)", icon: "📄" },
          { label: "Downloads Totais", val: "187", c: "var(--success)", icon: "📥" },
          { label: "Relatórios Auto.", val: "12", c: "var(--accent4)", icon: "🤖" },
          { label: "Pareceres Fiscais", val: "8", c: "var(--warn)", icon: "⚖️" },
        ].map((m, i) => (
          <div key={i} className="metric-card" style={{ "--accent-color": m.c }}>
            <div className="metric-icon">{m.icon}</div>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{ color: m.c }}>{m.val}</div>
          </div>
        ))}
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="card-header"><span className="card-title">Relatórios Recentes</span></div>
          <div className="card-body flex-col gap-8">
            {reportsList.map((r, i) => (
              <div key={i} className="report-item">
                <div className="report-icon" style={{ background: `${r.color}18` }}>{r.icon}</div>
                <div className="report-info">
                  <div className="report-title">{r.title}</div>
                  <div className="report-meta">{r.type} · {r.date} · {r.size}</div>
                </div>
                <div className="report-actions">
                  <button className="btn btn-ghost btn-icon" title="Visualizar">👁</button>
                  <button className="btn btn-ghost btn-icon" title="PDF">📄</button>
                  <button className="btn btn-ghost btn-icon" title="Excel">📊</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-col gap-16">
          <div className="card">
            <div className="card-header"><span className="card-title">Geração Automática</span></div>
            <div className="card-body">
              {[
                { label: "DRE Mensal", icon: "📊", freq: "Todo dia 1", active: true },
                { label: "Relatório Tributário", icon: "⚖️", freq: "Quinzenal", active: true },
                { label: "Fluxo de Caixa", icon: "💰", freq: "Semanal", active: true },
                { label: "Alerta de Vencimentos", icon: "⏰", freq: "Diário", active: true },
                { label: "Diagnóstico Estratégico", icon: "🎯", freq: "Mensal", active: false },
              ].map((a, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{a.freq}</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked={a.active} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Exportação em Lote</span></div>
            <div className="card-body flex-col gap-8">
              {["PDF Completo (todos os módulos)", "Excel — Dados Financeiros", "CSV — Movimentações", "XML — Notas Fiscais"].map((ex, i) => (
                <button key={i} className="btn btn-ghost" style={{ justifyContent: "flex-start", gap: 8 }}>
                  <span>📥</span> {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Estrategico() {
  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Mapeamento Estratégico</div>
          <div className="section-sub">Diagnóstico empresarial completo com recomendações por IA</div>
        </div>
        <button className="btn btn-primary">🔄 Atualizar Diagnóstico</button>
      </div>

      <div className="grid-12 mb-16">
        <div className="card">
          <div className="card-header"><span className="card-title">Score de Saúde Empresarial</span></div>
          <div className="card-body">
            <div className="flex items-center gap-20 mb-16">
              <ScoreRing score={784} size={150} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "var(--font-head)", color: "var(--success)", marginBottom: 4 }}>Excelente</div>
                <div style={{ fontSize: 13, color: "var(--text2)", marginBottom: 16 }}>Empresa acima da média setorial em 3 dos 5 indicadores analisados.</div>
                {[
                  { l: "Saúde Financeira",     v: 88, c: "var(--success)" },
                  { l: "Eficiência Tributária",v: 64, c: "var(--warn)" },
                  { l: "Liquidez",             v: 92, c: "var(--success)" },
                  { l: "Crescimento",          v: 78, c: "var(--accent2)" },
                  { l: "Compliance",           v: 82, c: "var(--accent)" },
                ].map((s, i) => (
                  <div key={i} className="mb-8">
                    <div className="flex justify-between mb-4">
                      <span className="text-sm">{s.l}</span>
                      <span className="text-sm font-bold" style={{ color: s.c }}>{s.v}/100</span>
                    </div>
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${s.v}%`, background: s.c }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-col gap-16">
          <div className="card">
            <div className="card-header"><span className="card-title">Alertas Estratégicos</span><span className="badge badge-warn">3 atenções</span></div>
            <div className="card-body flex-col gap-8">
              {[
                { type: "warn", title: "Tributação acima do mercado", desc: "+4,3pp vs. benchmark setorial. Migrar para Lucro Presumido." },
                { type: "danger", title: "Créditos não aproveitados", desc: "R$ 609K em créditos recuperáveis mapeados e não constituídos." },
                { type: "warn", title: "Concentração de clientes", desc: "Top 3 clientes = 67% da receita. Risco de concentração elevado." },
                { type: "info", title: "Oportunidade: expansão", desc: "Margem e liquidez suportam crescimento de 30% sem captação." },
              ].map((a, i) => (
                <div key={i} className={`alert alert-${a.type}`}>
                  <span className="alert-icon">{a.type === "warn" ? "⚠️" : a.type === "danger" ? "🚨" : "💡"}</span>
                  <div className="alert-content">
                    <div className="alert-title">{a.title}</div>
                    <div className="alert-desc">{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-3">
        {[
          {
            title: "Roadmap Financeiro",
            icon: "💰",
            color: "var(--accent2)",
            items: [
              { fase: "Q2 2026", acao: "Migração Lucro Presumido", impacto: "+R$ 84K/ano" },
              { fase: "Q3 2026", acao: "Constituição créditos fiscais", impacto: "+R$ 412K" },
              { fase: "Q4 2026", acao: "Captação capital de giro", impacto: "Expansão 30%" },
              { fase: "Q1 2027", acao: "JCP — Juros s/ Capital", impacto: "+R$ 48K/ano" },
            ]
          },
          {
            title: "Roadmap Tributário",
            icon: "⚖️",
            color: "var(--accent4)",
            items: [
              { fase: "Mai 2026", acao: "Levantamento documental PIS/COFINS", impacto: "+R$ 284K" },
              { fase: "Jun 2026", acao: "Habilitação regime Lucro Presumido", impacto: "Migração" },
              { fase: "Jul 2026", acao: "Ação administrativa INSS", impacto: "+R$ 127K" },
              { fase: "Ago 2026", acao: "Revisão créditos ICMS-ST", impacto: "+R$ 89K" },
            ]
          },
          {
            title: "Metas Estratégicas",
            icon: "🎯",
            color: "var(--success)",
            items: [
              { fase: "2026", acao: "Redução carga tributária", impacto: "14,2% (-4,3pp)" },
              { fase: "2026", acao: "Receita anual", impacto: "R$ 12,4M" },
              { fase: "2026", acao: "EBITDA alvo", impacto: "45%" },
              { fase: "2027", acao: "Score fiscal", impacto: "900+/1000" },
            ]
          },
        ].map((rm, i) => (
          <div key={i} className="card">
            <div className="card-header">
              <span className="card-title">{rm.icon} {rm.title}</span>
            </div>
            <div className="card-body">
              {rm.items.map((item, j) => (
                <div key={j} style={{ display: "flex", gap: 10, marginBottom: 14, alignItems: "flex-start" }}>
                  <div style={{ width: 3, height: 40, background: rm.color, borderRadius: 2, flexShrink: 0, marginTop: 2 }} />
                  <div>
                    <div style={{ fontSize: 11, color: "var(--text3)", marginBottom: 2 }}>{item.fase}</div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)", marginBottom: 2 }}>{item.acao}</div>
                    <div style={{ fontSize: 12, color: rm.color, fontWeight: 600 }}>{item.impacto}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ClientesFornecedores({ empresaId, clienteId, openForm }) {
  const [aba,         setAba]         = useState('clientes');
  const [lista,       setLista]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [busca,       setBusca]       = useState('');
  const [importando,  setImportando]  = useState(false);
  const [resultImport, setResultImport] = useState(null);
  const [erro,        setErro]        = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (empresaId) carregar();
  }, [empresaId, clienteId, aba]);

  async function carregar() {
    setLoading(true);
    const { data } = aba === 'clientes'
      ? await Clientes.listar(empresaId, clienteId)
      : await Fornecedores.listar(empresaId, clienteId);
    setLista(data || []);
    setLoading(false);
  }

  async function excluir(id) {
    if (!confirm(`Excluir este ${aba === 'clientes' ? 'cliente' : 'fornecedor'}?`)) return;
    if (aba === 'clientes') await Clientes.deletar(id);
    else await Fornecedores.deletar(id);
    carregar();
  }

  // ── IMPORTAÇÃO EM MASSA ──────────────────────────────────
  async function processarArquivo(file) {
    if (!clienteId) { setErro('Selecione um cliente ativo primeiro.'); return; }
    setImportando(true); setErro(''); setResultImport(null);
    try {
      const text = await new Promise((res, rej) => {
        const r = new FileReader();
        r.onload = e => res(e.target.result);
        r.onerror = rej;
        r.readAsText(file, 'UTF-8');
      });

      const linhas = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (linhas.length < 2) throw new Error('Arquivo vazio ou inválido');

      // Detecta separador
      const sep = linhas[0].includes(';') ? ';' : ',';
      const header = linhas[0].split(sep).map(h => h.replace(/"/g,'').toLowerCase().trim());

      const idx = {
        nome:     header.findIndex(h => h.includes('nome') || h.includes('name')),
        cpf_cnpj: header.findIndex(h => h.includes('cpf') || h.includes('cnpj') || h.includes('documento')),
        email:    header.findIndex(h => h.includes('email') || h.includes('e-mail')),
        telefone: header.findIndex(h => h.includes('tel') || h.includes('fone') || h.includes('phone')),
        cidade:   header.findIndex(h => h.includes('cidade') || h.includes('city')),
        estado:   header.findIndex(h => h.includes('estado') || h.includes('uf') || h.includes('state')),
      };

      if (idx.nome === -1) throw new Error('Coluna "nome" não encontrada no arquivo');

      let ok = 0, erros = 0;
      for (let i = 1; i < linhas.length; i++) {
        const cols = linhas[i].split(sep).map(c => c.replace(/"/g,'').trim());
        const nome = cols[idx.nome];
        if (!nome) continue;
        try {
          const dados = {
            empresa_id: empresaId,
            cliente_helevare_id: clienteId,
            nome,
            cpf_cnpj:  idx.cpf_cnpj >= 0 ? cols[idx.cpf_cnpj] : null,
            email:     idx.email    >= 0 ? cols[idx.email]    : null,
            telefone:  idx.telefone >= 0 ? cols[idx.telefone] : null,
            cidade:    idx.cidade   >= 0 ? cols[idx.cidade]   : null,
            estado:    idx.estado   >= 0 ? cols[idx.estado]   : null,
          };
          if (aba === 'clientes') await Clientes.criar(dados);
          else await Fornecedores.criar(dados);
          ok++;
        } catch { erros++; }
      }
      setResultImport({ ok, erros, total: linhas.length - 1 });
      carregar();
    } catch(e) {
      setErro('Erro na importação: ' + e.message);
    }
    setImportando(false);
  }

  const filtrado = lista.filter(i =>
    !busca ||
    i.nome?.toLowerCase().includes(busca.toLowerCase()) ||
    i.cpf_cnpj?.includes(busca) ||
    i.email?.toLowerCase().includes(busca.toLowerCase())
  );

  return (
    <div className="fade-up">
      <input ref={fileRef} type="file" accept=".csv,.txt,.xlsx,.xls" style={{display:'none'}}
        onChange={e => e.target.files[0] && processarArquivo(e.target.files[0])} />

      <div className="section-header mb-20">
        <div>
          <div className="section-title">Clientes & Fornecedores</div>
          <div className="section-sub">Cadastros vinculados ao cliente ativo</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={carregar}>🔄</button>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={importando}>
            {importando ? '⏳ Importando...' : '📥 Importar CSV'}
          </button>
          <button className="btn btn-primary" onClick={() => openForm?.(aba === 'clientes' ? 'cliente' : 'fornecedor')}>
            + {aba === 'clientes' ? 'Cliente' : 'Fornecedor'}
          </button>
        </div>
      </div>

      {erro && <div className="alert alert-danger mb-16"><span className="alert-icon">⚠️</span><div className="alert-content"><div className="alert-desc">{erro}</div></div></div>}

      {resultImport && (
        <div className="alert alert-success mb-16">
          <span className="alert-icon">✅</span>
          <div className="alert-content">
            <div className="alert-title">Importação concluída</div>
            <div className="alert-desc">{resultImport.ok} registros importados · {resultImport.erros} erros · {resultImport.total} total</div>
          </div>
        </div>
      )}

      {/* Instruções importação */}
      <div className="card mb-16">
        <div className="card-body" style={{padding:'14px 20px'}}>
          <div style={{fontSize:12,color:'var(--text2)',fontWeight:600,marginBottom:6}}>📋 Formato do arquivo CSV para importação:</div>
          <div style={{fontFamily:'monospace',fontSize:11,color:'var(--text3)',background:'var(--bg3)',padding:'8px 12px',borderRadius:6}}>
            nome,cpf_cnpj,email,telefone,cidade,estado<br/>
            João Silva,123.456.789-00,joao@email.com,(17)99999-9999,Votuporanga,SP
          </div>
          <div style={{fontSize:11,color:'var(--text3)',marginTop:6}}>
            Aceita: .csv · .txt · Separadores: vírgula ou ponto-e-vírgula
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="tabs mb-16">
        <div className={`tab ${aba==='clientes'?'active':''}`} onClick={()=>{setAba('clientes');setBusca('')}}>👥 Clientes ({lista.filter(()=>aba==='clientes').length || (aba==='clientes'?lista.length:0)})</div>
        <div className={`tab ${aba==='fornecedores'?'active':''}`} onClick={()=>{setAba('fornecedores');setBusca('')}}>🏢 Fornecedores ({aba==='fornecedores'?lista.length:0})</div>
      </div>

      {/* Métricas */}
      <div className="metrics-grid mb-16">
        {[
          { label: `Total ${aba==='clientes'?'Clientes':'Fornecedores'}`, val: lista.length, c:'var(--accent2)' },
          { label: 'PJ', val: lista.filter(i=>i.tipo==='pj').length, c:'var(--accent)' },
          { label: 'PF', val: lista.filter(i=>i.tipo==='pf').length, c:'var(--accent4)' },
          { label: 'Com e-mail', val: lista.filter(i=>i.email).length, c:'var(--success)' },
        ].map((m,i) => (
          <div key={i} className="metric-card" style={{'--accent-color':m.c}}>
            <div className="metric-label">{m.label}</div>
            <div className="metric-value" style={{color:m.c}}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Lista */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">{aba==='clientes'?'Clientes':'Fornecedores'} Cadastrados</span>
          <input className="inp" placeholder="🔍 Buscar..." style={{width:220}}
            value={busca} onChange={e=>setBusca(e.target.value)} />
        </div>
        {loading ? <div className="empty">Carregando...</div> :
         filtrado.length === 0 ? (
          <div className="empty">
            <div style={{fontSize:32,marginBottom:8}}>{aba==='clientes'?'👥':'🏢'}</div>
            <div style={{fontSize:14,fontWeight:600,color:'var(--text2)',marginBottom:6}}>
              {busca ? 'Nenhum resultado' : `Nenhum ${aba==='clientes'?'cliente':'fornecedor'} cadastrado`}
            </div>
            <div style={{display:'flex',gap:8,justifyContent:'center',marginTop:12}}>
              <button className="btn btn-primary" onClick={() => openForm?.(aba==='clientes'?'cliente':'fornecedor')}>
                + Cadastrar
              </button>
              <button className="btn btn-ghost" onClick={() => fileRef.current?.click()}>
                📥 Importar CSV
              </button>
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>CPF/CNPJ</th>
                  <th>Contato</th>
                  <th>Cidade/UF</th>
                  {aba==='fornecedores' && <th>Categoria</th>}
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtrado.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="primary">{item.nome}</div>
                      {item.email && <div style={{fontSize:11,color:'var(--text3)'}}>{item.email}</div>}
                    </td>
                    <td style={{color:'var(--text3)',fontSize:12}}>{item.cpf_cnpj||'—'}</td>
                    <td style={{fontSize:12}}>
                      {item.telefone
                        ? <a href={`https://wa.me/55${item.telefone.replace(/\D/g,'')}`} target="_blank"
                            style={{color:'var(--accent)',textDecoration:'none'}}>📱 {item.telefone}</a>
                        : <span style={{color:'var(--text3)'}}>—</span>}
                    </td>
                    <td style={{fontSize:12,color:'var(--text2)'}}>
                      {item.cidade&&item.estado?`${item.cidade}/${item.estado}`:'—'}
                    </td>
                    {aba==='fornecedores' && <td><span className="badge badge-info">{item.categoria||'—'}</span></td>}
                    <td>
                      <button className="btn btn-ghost btn-icon" style={{color:'var(--danger)',fontSize:13}}
                        onClick={() => excluir(item.id)}>🗑</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{padding:'10px 16px',borderTop:'1px solid var(--border)',fontSize:12,color:'var(--text3)'}}>
              {filtrado.length} registro(s) {busca?'encontrado(s)':'cadastrado(s)'}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Configuracoes({ navigate }) {
  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div><div className="section-title">Configurações</div><div className="section-sub">Empresa, usuários, segurança e integrações</div></div>
      </div>

      <div className="card mb-16" style={{ cursor: "pointer" }} onClick={() => navigate && navigate("categorias")}>
        <div className="card-body" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ fontSize: 26 }}>🗂️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>Categorias Financeiras</div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>Plano de contas em árvore (Receitas, Despesas e Transferências) — por cliente</div>
          </div>
          <span style={{ color: "var(--accent)", fontSize: 18 }}>→</span>
        </div>
      </div>

      <div className="grid-2">
        <div className="card mb-16">
          <div className="card-header"><span className="card-title">Dados da Empresa</span></div>
          <div className="card-body flex-col gap-12">
            {[
              { label: "Razão Social", val: "Acme Tecnologia Ltda." },
              { label: "CNPJ", val: "00.000.000/0001-00" },
              { label: "Regime Tributário", val: "Lucro Presumido" },
              { label: "CNAE Principal", val: "6201-5/00 — Desenvolvimento de Programas" },
              { label: "Responsável Fiscal", val: "João Silva — CRC SP-12345" },
            ].map((f, i) => (
              <div key={i}>
                <label className="inp-label">{f.label}</label>
                <input className="inp" defaultValue={f.val} />
              </div>
            ))}
            <button className="btn btn-primary" style={{ marginTop: 8 }}>Salvar Dados</button>
          </div>
        </div>
        <div className="flex-col gap-16">
          <div className="card">
            <div className="card-header"><span className="card-title">Segurança</span></div>
            <div className="card-body">
              {[
                { label: "Autenticação MFA", desc: "Two-factor ativo", on: true },
                { label: "Logs de Auditoria", desc: "Registrar todas ações", on: true },
                { label: "Sessão automática", desc: "Logout após 30min", on: true },
                { label: "IP Whitelist", desc: "Restringir por IP", on: false },
                { label: "Backup Automático", desc: "Diário às 02:00", on: true },
              ].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text)" }}>{s.label}</div>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>{s.desc}</div>
                  </div>
                  <label className="toggle">
                    <input type="checkbox" defaultChecked={s.on} />
                    <div className="toggle-track" />
                    <div className="toggle-thumb" />
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div className="card">
            <div className="card-header"><span className="card-title">Integrações Ativas</span></div>
            <div className="card-body">
              {[
                { name: "Portal Transparência Tributária", status: "Conectado", icon: "🏛️" },
                { name: "SEFAZ — Consulta NF-e", status: "Conectado", icon: "📋" },
                { name: "API Bancária (Open Finance)", status: "Configurar", icon: "🏦" },
                { name: "ERP / Contabilidade", status: "Configurar", icon: "⚙️" },
              ].map((int, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderBottom: "1px solid var(--border)" }}>
                  <span style={{ fontSize: 20 }}>{int.icon}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)" }}>{int.name}</span>
                  <span className={`badge ${int.status === "Conectado" ? "badge-success" : "badge-warn"}`}>{int.status}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NAV CONFIG ──────────────────────────────────────────────────────────────
const NAV = [
  { section: "Principal", items: [
    { id: "dashboard",    label: "Dashboard",         icon: "⬛", badge: null },
    { id: "financeiro",   label: "Financeiro",         icon: "💰", badge: null },
    { id: "tributario",   label: "Tributário",         icon: "⚖️", badge: "3", badgeType: "warn" },
    { id: "creditos",     label: "Créditos Fiscais",   icon: "♻️", badge: "5", badgeType: "" },
  ]},
  { section: "Inteligência", items: [
    { id: "ia",          label: "IA Tributária",       icon: "🤖", badge: null },
    { id: "split",       label: "Split Payment",       icon: "⚡", badge: null },
    { id: "repasse",     label: "Repasse Médico",      icon: "👨‍⚕️", badge: null },
    { id: "operadoras",  label: "Operadoras Cartão",   icon: "💳", badge: null },
    { id: "estrategico", label: "Estratégico",          icon: "🎯", badge: null },
    { id: "nfe",        label: "Importar NF-e",        icon: "📋", badge: null },
    { id: "conciliacao", label: "Conciliação Banc.",     icon: "🏦", badge: null },
    { id: "bancario",    label: "Gestão Bancária",     icon: "🏛️", badge: null },
    { id: "relatorios",  label: "Relatórios",           icon: "📄", badge: null },
  ]},
  { section: "Sistema", items: [
    { id: "contatos",    label: "Clientes & Fornec.",   icon: "👥", badge: null },
    { id: "usuarios",    label: "Usuários",               icon: "👥", badge: null },
    { id: "config",      label: "Configurações",        icon: "⚙️", badge: null },
  ]},
];

const TITLES = {
  dashboard: "Dashboard Executivo",
  financeiro: "Gestão Financeira",
  tributario: "Inteligência Tributária",
  creditos: "Recuperação de Créditos",
  ia: "IA Tributária",
  estrategico: "Mapeamento Estratégico",
  relatorios: "Relatórios",
  split: "Split Payment & Reforma",
  repasse: "Repasse Médico",
  operadoras: "Operadoras de Cartão",
  nfe: "Importar NF-e",
  conciliacao: "Conciliação Bancária",
  bancario: "Gestão Bancária & Investimentos",
  usuarios: "Usuários & Permissões",
  contatos: "Clientes & Fornecedores",
  config: "Configurações",
};

// ─── APP ─────────────────────────────────────────────────────────────────────

export default function AppRoot() {
  const { user, empresa, loading } = useAuth();
  if (loading) return <div style={{height:"100vh",background:"#080C14"}} />;
  if (!user) return <Login />;
  return (
    <ClienteProvider empresaId={empresa?.id}>
      <AppWithFormsAndCliente />
    </ClienteProvider>
  );
}

function AppWithFormsAndCliente() {
  const { user, perfil, empresa, loading, logout } = useAuth();
  const { clienteAtivo, clienteId } = useCliente();
  const { selecionarCliente } = useCliente();
  const [page,        setPage]        = useState("dashboard");
  const [formPage,    setFormPage]    = useState(null);
  const [collapsed,   setCollapsed]   = useState(false);
  const [dbData,      setDbData]      = useState({});
  const [dbLoading,   setDbLoading]   = useState(false);
  const [telainicial, setTelaInicial] = useState(!clienteAtivo);

  // Mostra tela inicial se não houver cliente ativo
  useEffect(() => {
    if (!clienteAtivo) setTelaInicial(true);
  }, [clienteAtivo]);

  const carregarDados = useCallback(async () => {
    if (!empresa?.id) return;
    setDbLoading(true);
    try { const r = await DashboardDB.resumo(empresa.id, clienteId||null); setDbData(r); }
    catch(e) { console.error(e); }
    setDbLoading(false);
  }, [empresa?.id]);

  useEffect(() => { carregarDados(); }, [carregarDados]);

  const navigate  = (p) => { setFormPage(null); setPage(p); };
  const openForm  = (f) => setFormPage(f);
  const closeForm = ()  => { setFormPage(null); carregarDados(); };

  const pageProps = { empresa, empresaId: empresa?.id, clienteId: clienteId||null, dbData, recarregar: carregarDados, openForm, navigate };
  const PAGES = {
    dashboard: Dashboard, financeiro: Financeiro, tributario: Tributario,
    creditos: Creditos, ia: IAChat, estrategico: Estrategico,
    relatorios: RelatoriosPage, nfe: ImportarNFe,
    conciliacao: ConciliacaoBancaria, bancario: GestaoBancaria, contatos: ClientesFornecedores,
    usuarios: Usuarios, config: Configuracoes, categorias: CategoriasFinanceiras,
  };
  const Page = PAGES[page] || Dashboard;
  const iniciais = perfil?.nome?.split(' ').slice(0,2).map(n=>n[0]).join('').toUpperCase() || '??';

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div style={{height:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'var(--bg)',flexDirection:'column',gap:16}}>
        <div style={{width:48,height:48,borderRadius:14,background:'linear-gradient(135deg,#00D4A0,#0090FF)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24}}>⚡</div>
        <div style={{color:'var(--text3)',fontSize:13}}>Carregando...</div>
      </div>
    </>
  );

  if (!user) return <Login />;

  // Tela inicial — seletor de cliente
  if (telainicial) return (
    <>
      <style>{CSS}</style>
      <TelaInicial onEntrar={() => setTelaInicial(false)} />
    </>
  );

  const renderFormPage = () => {
    const props = { onBack: closeForm, onSaved: carregarDados };
    switch(formPage) {
      case 'conciliacao':    return <ConciliacaoBancaria {...props} />;
      case 'lancamento':     return <NovoLancamento    {...props} />;
      case 'conta-pagar':    return <NovaContaPagar    {...props} />;
      case 'conta-receber':  return <NovaContaReceber  {...props} />;
      case 'cliente':        return <NovoCliente       {...props} tipo="cliente"    />;
      case 'fornecedor':     return <NovoFornecedor    {...props} />;
      case 'nfe':            return <ImportarNFe       {...props} />;
      default: return null;
    }
  };

  const TITLES2 = {
    dashboard: "Dashboard Executivo", financeiro: "Gestão Financeira",
    tributario: "Inteligência Tributária", creditos: "Recuperação de Créditos",
    ia: "IA Tributária", estrategico: "Mapeamento Estratégico",
    relatorios: "Relatórios", nfe: "Importar NF-e",
    conciliacao: "Conciliação Bancária", contatos: "Clientes & Fornecedores",
    usuarios: "Usuários & Permissões", config: "Configurações",
    categorias: "Categorias Financeiras",
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="app">
        <nav className={`sidebar ${collapsed ? "collapsed" : ""}`}>
          <div className="sidebar-logo" style={{cursor:'pointer'}} onClick={() => setTelaInicial(true)}>
            <div className="logo-icon">⚡</div>
            {!collapsed && <div className="logo-text">HElevare<span>.Fin</span></div>}
          </div>

          {NAV.map((sec, si) => (
            <div key={si} className="sidebar-section">
              {!collapsed && <div className="sidebar-section-label">{sec.section}</div>}
              {sec.items.map(item => (
                <div key={item.id}
                  className={`nav-item ${page === item.id && !formPage ? "active" : ""}`}
                  onClick={() => navigate(item.id)}
                  title={collapsed ? item.label : ""}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!collapsed && <span className="nav-label">{item.label}</span>}
                  {!collapsed && item.badge && <span className={`nav-badge ${item.badgeType || ""}`}>{item.badge}</span>}
                </div>
              ))}
            </div>
          ))}

          {!collapsed && (
            <div className="sidebar-section">
              <div className="sidebar-section-label">Novo</div>
              {[
                { label: '+ Lançamento',    form: 'lancamento'    },
                { label: '+ Conta a Pagar', form: 'conta-pagar'   },
                { label: '+ A Receber',     form: 'conta-receber' },
                { label: '+ Cliente',       form: 'cliente'       },
                { label: '+ Fornecedor',    form: 'fornecedor'    },
                { label: '+ Importar NF-e', form: 'nfe'           },
                { label: '+ Conciliar',     form: 'conciliacao'   },
              ].map(i => (
                <div key={i.form}
                  className={`nav-item ${formPage === i.form ? 'active' : ''}`}
                  onClick={() => openForm(i.form)}
                >
                  <span className="nav-icon" style={{color:'var(--accent)',fontSize:12}}>●</span>
                  <span className="nav-label" style={{fontSize:12}}>{i.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="sidebar-bottom">
            <div className="user-card" onClick={logout} title="Sair">
              <div className="user-avatar">{iniciais}</div>
              {!collapsed && (
                <div className="user-info">
                  <div className="user-name">{perfil?.nome || user.email}</div>
                  <div className="user-role">{perfil?.papel || 'admin'} · {empresa?.nome?.split(' ')[0] || '—'}</div>
                </div>
              )}
            </div>
          </div>
        </nav>

        <div className="main">
          <header className="topbar">
            <button className="btn btn-ghost btn-icon" onClick={() => setCollapsed(c => !c)} style={{fontSize:16}}>
              {collapsed ? "→" : "←"}
            </button>
            <div className="topbar-title" style={{cursor:'pointer'}} onClick={() => setTelaInicial(true)}>
              {formPage ? ({
                'lancamento':'Novo Lançamento','conta-pagar':'Nova Conta a Pagar',
                'conta-receber':'Nova Conta a Receber','cliente':'Novo Cliente',
                'fornecedor':'Novo Fornecedor','nfe':'Importar NF-e','conciliacao':'Conciliação Bancária',
              }[formPage]) : TITLES2[page]}
            </div>
            <div className="topbar-actions">
              {/* Cliente ativo */}
              <ClienteBar onTrocar={() => setTelaInicial(true)} />
              {!formPage && (
                <button className="btn btn-primary" onClick={() => openForm('lancamento')}>+ Lançamento</button>
              )}
              <div style={{position:"relative"}}>
                <button className="btn btn-ghost btn-icon">🔔</button>
                <div className="notif-dot" />
              </div>
              <button className="btn btn-ghost btn-icon" onClick={carregarDados} title="Atualizar">🔄</button>
              <div style={{width:1,height:24,background:"var(--border)"}} />
              <div
                className="user-avatar"
                style={{width:30,height:30,borderRadius:8,background:"linear-gradient(135deg,var(--accent2),var(--accent4))",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:"#fff",cursor:"pointer"}}
                onClick={logout} title="Sair"
              >{iniciais}</div>
            </div>
          </header>

          <div className="content">
            {dbLoading && (
              <div style={{position:'fixed',top:64,right:20,background:'var(--card)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 14px',fontSize:12,color:'var(--text2)',zIndex:999,display:'flex',alignItems:'center',gap:6}}>
                <span style={{animation:'pulse 1s infinite'}}>⏳</span> Atualizando...
              </div>
            )}
            {formPage ? renderFormPage() : <Page key={page} {...pageProps} />}
          </div>
        </div>
      </div>
    </>
  );
}
