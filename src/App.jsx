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
import Login from "./pages/Login";
import { Lancamentos, ContasPagar, ContasReceber, Clientes, Fornecedores, NotasFiscais, Categorias, Dashboard as DashboardDB } from "./lib/db";

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

  useEffect(() => {
    if (!empresaId) return;
    carregar();
  }, [empresaId, clienteId]);

  async function carregar() {
    setLoading(true);
    try {
      const r = await DashboardDB.resumo(empresaId, clienteId||null);
      setDados(r);
    } catch(e) { console.error(e); }
    setLoading(false);
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
          <div className="section-sub">Dados reais · {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={carregar}>🔄 Atualizar</button>
          <button className="btn btn-primary" onClick={() => openForm?.('lancamento')}>+ Lançamento</button>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="kpi-row fade-up fade-up-1 mb-16">
        {[
          { icon:"💹", label:"Entradas no Mês",   val: fmtK(entradas),  color:"#0090FF", bg:"rgba(0,144,255,0.1)"  },
          { icon:"📉", label:"Saídas no Mês",      val: fmtK(saidas),    color:"#FF6B35", bg:"rgba(255,107,53,0.1)" },
          { icon:"💰", label:"Saldo do Mês",        val: fmtK(saldo),     color: saldo>=0?"#00D4A0":"#FF4757", bg: saldo>=0?"rgba(0,212,160,0.1)":"rgba(255,71,87,0.1)" },
          { icon:"⏳", label:"A Pagar (pendente)",  val: fmtK(aPagar),   color:"#FFB800", bg:"rgba(255,184,0,0.1)"  },
          { icon:"🎯", label:"A Receber (pendente)",val: fmtK(aReceber), color:"#A855F7", bg:"rgba(168,85,247,0.1)" },
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
                <div className="alert-title">Saldo negativo no mês</div>
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
function Financeiro({ empresaId, openForm, recarregar }) {
  const [tab, setTab]               = useState(0);
  const [lancamentos, setLancamentos] = useState([]);
  const [contasPagar, setContasPagar] = useState([]);
  const [contasReceber, setContasReceber] = useState([]);
  const [totaisPagar, setTotaisPagar]   = useState({ pendente:0, vencido:0, pago:0 });
  const [totaisReceber, setTotaisReceber] = useState({ pendente:0, vencido:0, recebido:0 });
  const [fluxo, setFluxo]           = useState({ entradas:0, saidas:0, saldo:0 });
  const [evolucao, setEvolucao]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filtroStatus, setFiltroStatus] = useState('');
  const tabs = ["Fluxo de Caixa", "DRE Gerencial", "Contas a Pagar", "Contas a Receber"];

  useEffect(() => {
    if (!empresaId) return;
    carregarDados();
  }, [empresaId, tab]);

  async function carregarDados() {
    setLoading(true);
    const mes = new Date().toISOString().slice(0,7);
    if (tab === 0 || tab === 1) {
      const [lRes, fluxoRes, evRes] = await Promise.all([
        Lancamentos.listar(empresaId, { limite: 20 }),
        Lancamentos.resumoMes(empresaId, mes),
        Lancamentos.evolucao12Meses(empresaId),
      ]);
      setLancamentos(lRes.data || []);
      setFluxo(fluxoRes);
      setEvolucao(evRes);
    }
    if (tab === 2) {
      const [res, tot] = await Promise.all([
        ContasPagar.listar(empresaId, filtroStatus ? { status: filtroStatus } : {}),
        ContasPagar.totais(empresaId),
      ]);
      setContasPagar(res.data || []);
      setTotaisPagar(tot);
    }
    if (tab === 3) {
      const [res, tot] = await Promise.all([
        ContasReceber.listar(empresaId, filtroStatus ? { status: filtroStatus } : {}),
        ContasReceber.totais(empresaId),
      ]);
      setContasReceber(res.data || []);
      setTotaisReceber(tot);
    }
    setLoading(false);
  }

  async function marcarPago(id) {
    await ContasPagar.pagar(id, new Date().toISOString().slice(0,10), null);
    carregarDados();
  }

  async function marcarRecebido(id) {
    await ContasReceber.receber(id, new Date().toISOString().slice(0,10), null);
    carregarDados();
  }

  async function deletarLancamento(id) {
    if (!confirm('Excluir este lançamento?')) return;
    await Lancamentos.deletar(id);
    carregarDados();
  }

  const revenueArr = evolucao.map(e => e.entradas || 0);
  const expenseArr = evolucao.map(e => e.saidas   || 0);
  const labelsArr  = evolucao.map(e => e.mes);
  const maxEv = Math.max(...revenueArr, ...expenseArr, 1);

  const statusBadge = (s) => {
    const map = {
      confirmado:  ['badge-success', '✓ Confirmado'],
      pendente:    ['badge-warn',    '⏳ Pendente'],
      cancelado:   ['badge-danger',  '✗ Cancelado'],
      pago:        ['badge-success', '✓ Pago'],
      vencido:     ['badge-danger',  '⚠ Vencido'],
      recebido:    ['badge-success', '✓ Recebido'],
      parcelado:   ['badge-info',    '📋 Parcelado'],
      parcial:     ['badge-warn',    '📋 Parcial'],
    };
    const [cls, label] = map[s] || ['badge-info', s];
    return <span className={`badge ${cls}`}>{label}</span>;
  };

  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div>
          <div className="section-title">Gestão Financeira</div>
          <div className="section-sub">Dados reais da empresa · {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</div>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-ghost" onClick={carregarDados}>🔄 Atualizar</button>
          <button className="btn btn-ghost" onClick={() => openForm?.('conta-pagar')}>+ Conta a Pagar</button>
          <button className="btn btn-primary" onClick={() => openForm?.('lancamento')}>+ Lançamento</button>
        </div>
      </div>

      <div className="tabs">
        {tabs.map((t,i) => <div key={i} className={`tab ${tab===i?'active':''}`} onClick={() => { setTab(i); setFiltroStatus(''); }}>{t}</div>)}
      </div>

      {/* ── FLUXO DE CAIXA ── */}
      {tab === 0 && (
        <div>
          <div className="metrics-grid mb-16">
            {[
              { label: "Entradas (Mês)", val: fmtK(fluxo.entradas), c: "var(--success)" },
              { label: "Saídas (Mês)",   val: fmtK(fluxo.saidas),   c: "var(--danger)" },
              { label: "Saldo do Mês",   val: fmtK(fluxo.saldo),    c: fluxo.saldo >= 0 ? "var(--accent)" : "var(--danger)" },
              { label: "Lançamentos",    val: lancamentos.length,    c: "var(--accent2)" },
            ].map((m,i) => (
              <div key={i} className="metric-card" style={{"--accent-color": m.c}}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-value" style={{color: m.c}}>{m.val}</div>
              </div>
            ))}
          </div>

          {evolucao.length > 0 && (
            <div className="card mb-16">
              <div className="card-header">
                <span className="card-title">Evolução 12 Meses</span>
                <div className="flex gap-8 text-xs text-muted">
                  <span style={{display:'flex',gap:4,alignItems:'center'}}><span style={{width:8,height:8,background:'var(--accent2)',borderRadius:2,display:'inline-block'}}/>Entradas</span>
                  <span style={{display:'flex',gap:4,alignItems:'center'}}><span style={{width:8,height:8,background:'var(--danger)',borderRadius:2,display:'inline-block'}}/>Saídas</span>
                </div>
              </div>
              <div className="card-body">
                <div className="bar-chart" style={{height:140}}>
                  {evolucao.map((e,i) => (
                    <div key={i} className="bar-group">
                      <div className="bar" style={{height:`${(e.entradas/maxEv)*100}%`,"--bar-color":"var(--accent2)"}} title={`${e.mes}: ${fmtK(e.entradas)}`}/>
                      <div className="bar" style={{height:`${(e.saidas/maxEv)*100}%`,"--bar-color":"var(--danger)"}} title={`${e.mes}: ${fmtK(e.saidas)}`}/>
                    </div>
                  ))}
                </div>
                <div style={{display:'flex',gap:6,marginTop:6,justifyContent:'space-between'}}>
                  {evolucao.map((e,i) => <span key={i} style={{fontSize:10,color:'var(--text3)',flex:1,textAlign:'center'}}>{e.mes}</span>)}
                </div>
              </div>
            </div>
          )}

          <div className="card">
            <div className="card-header">
              <span className="card-title">Movimentações Recentes</span>
              <button className="btn btn-ghost" style={{fontSize:11}} onClick={() => openForm?.('lancamento')}>+ Novo</button>
            </div>
            {loading ? (
              <div className="empty">Carregando...</div>
            ) : lancamentos.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:32,marginBottom:8}}>💸</div>
                <div>Nenhum lançamento ainda.</div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={() => openForm?.('lancamento')}>+ Primeiro Lançamento</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Descrição</th><th>Categoria</th><th>Data</th><th>Status</th><th>Valor</th><th></th></tr></thead>
                  <tbody>
                    {lancamentos.map(t => (
                      <tr key={t.id}>
                        <td><div className="primary" style={{maxWidth:220,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.descricao}</div>
                          {(t.clientes?.nome || t.fornecedores?.nome) && <div style={{fontSize:11,color:'var(--text3)'}}>{t.clientes?.nome || t.fornecedores?.nome}</div>}
                        </td>
                        <td>{t.categorias ? <span className="badge badge-info">{t.categorias.icone} {t.categorias.nome}</span> : <span className="text-muted">—</span>}</td>
                        <td>{new Date(t.data_lancamento+'T12:00:00').toLocaleDateString('pt-BR')}</td>
                        <td>{statusBadge(t.status)}</td>
                        <td className={`money ${t.tipo==='entrada'?'pos':'neg'}`}>{t.tipo==='entrada'?'+':'-'}{fmt(Math.abs(t.valor))}</td>
                        <td><button className="btn btn-ghost btn-icon" style={{fontSize:12,color:'var(--danger)'}} onClick={() => deletarLancamento(t.id)}>🗑</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DRE GERENCIAL ── */}
      {tab === 1 && (
        <div className="card">
          <div className="card-header"><span className="card-title">DRE Gerencial — {new Date().toLocaleDateString('pt-BR',{month:'long',year:'numeric'})}</span></div>
          <div className="card-body">
            {[
              { label: "RECEITA BRUTA",    val: fluxo.entradas, bold:true, border:true },
              { label: "(-) Deduções estimadas (10%)", val: -(fluxo.entradas*0.10), indent:true },
              { label: "RECEITA LÍQUIDA",  val: fluxo.entradas*0.90, bold:true, border:true, accent:"var(--accent2)" },
              { label: "(-) Custos operacionais (40%)", val: -(fluxo.saidas*0.40), indent:true },
              { label: "LUCRO BRUTO",      val: fluxo.entradas*0.90 - fluxo.saidas*0.40, bold:true, border:true, accent:"var(--accent)" },
              { label: "(-) Despesas administrativas", val: -(fluxo.saidas*0.60), indent:true },
              { label: "RESULTADO OPERACIONAL", val: fluxo.saldo, bold:true, accent: fluxo.saldo>=0?"var(--success)":"var(--danger)" },
            ].map((row,i) => (
              <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'9px 12px',borderBottom:row.border?'2px solid var(--border2)':'1px solid var(--border)',background:row.bold?'rgba(255,255,255,0.02)':'transparent',paddingLeft:row.indent?32:12,borderRadius:4,marginBottom:1}}>
                <span style={{fontSize:13,fontWeight:row.bold?700:400,color:row.bold?'var(--text)':'var(--text2)',fontFamily:row.bold?'var(--font-head)':'var(--font-body)'}}>{row.label}</span>
                <span style={{fontSize:13,fontWeight:row.bold?700:500,color:row.accent||(row.val<0?'var(--danger)':'var(--text)')}}>{fmt(row.val)}</span>
              </div>
            ))}
            <div className="alert alert-info" style={{marginTop:16}}>
              <span className="alert-icon">ℹ️</span>
              <div className="alert-content">
                <div className="alert-title">DRE baseado nos lançamentos reais</div>
                <div className="alert-desc">Para um DRE completo, cadastre todos os lançamentos com categorias corretas. Os percentuais são estimativas automáticas.</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CONTAS A PAGAR ── */}
      {tab === 2 && (
        <div>
          <div className="metrics-grid mb-16">
            {[
              { label: "A Vencer",    val: fmtK(totaisPagar.pendente), c: "var(--warn)" },
              { label: "Vencido",     val: fmtK(totaisPagar.vencido),  c: "var(--danger)" },
              { label: "Pago no Mês", val: fmtK(totaisPagar.pago),     c: "var(--success)" },
              { label: "Total",       val: fmtK(totaisPagar.pendente + totaisPagar.vencido), c: "var(--accent2)" },
            ].map((m,i) => (
              <div key={i} className="metric-card" style={{"--accent-color":m.c}}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-value" style={{color:m.c}}>{m.val}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Contas a Pagar</span>
              <div className="flex gap-8">
                <select className="inp" style={{width:160,padding:'6px 10px'}} value={filtroStatus} onChange={e=>{setFiltroStatus(e.target.value);setTimeout(carregarDados,0)}}>
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="vencido">Vencido</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
                <button className="btn btn-primary" onClick={() => openForm?.('conta-pagar')}>+ Nova</button>
              </div>
            </div>
            {loading ? <div className="empty">Carregando...</div> :
             contasPagar.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:32,marginBottom:8}}>📋</div>
                <div>Nenhuma conta a pagar{filtroStatus ? ` com status "${filtroStatus}"` : ''}.</div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={() => openForm?.('conta-pagar')}>+ Cadastrar</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Descrição</th><th>Fornecedor</th><th>Vencimento</th><th>Status</th><th>Valor</th><th>Ação</th></tr></thead>
                  <tbody>
                    {contasPagar.map(c => (
                      <tr key={c.id}>
                        <td className="primary">{c.descricao}</td>
                        <td>{c.fornecedores?.nome || <span className="text-muted">—</span>}</td>
                        <td style={{color: new Date(c.vencimento) < new Date() && c.status==='pendente' ? 'var(--danger)' : 'var(--text2)'}}>
                          {new Date(c.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td>{statusBadge(c.status)}</td>
                        <td className="money">{fmt(c.valor)}</td>
                        <td>
                          {c.status === 'pendente' || c.status === 'vencido' ? (
                            <button className="btn btn-ghost" style={{fontSize:11,color:'var(--success)'}} onClick={() => marcarPago(c.id)}>✓ Pagar</button>
                          ) : <span style={{fontSize:11,color:'var(--text3)'}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CONTAS A RECEBER ── */}
      {tab === 3 && (
        <div>
          <div className="metrics-grid mb-16">
            {[
              { label: "A Receber",       val: fmtK(totaisReceber.pendente),  c: "var(--accent2)" },
              { label: "Vencido",         val: fmtK(totaisReceber.vencido),   c: "var(--danger)" },
              { label: "Recebido no Mês", val: fmtK(totaisReceber.recebido),  c: "var(--success)" },
              { label: "Total Pendente",  val: fmtK(totaisReceber.pendente + totaisReceber.vencido), c: "var(--warn)" },
            ].map((m,i) => (
              <div key={i} className="metric-card" style={{"--accent-color":m.c}}>
                <div className="metric-label">{m.label}</div>
                <div className="metric-value" style={{color:m.c}}>{m.val}</div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header">
              <span className="card-title">Contas a Receber</span>
              <div className="flex gap-8">
                <select className="inp" style={{width:160,padding:'6px 10px'}} value={filtroStatus} onChange={e=>{setFiltroStatus(e.target.value);setTimeout(carregarDados,0)}}>
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="vencido">Vencido</option>
                  <option value="recebido">Recebido</option>
                  <option value="parcial">Parcial</option>
                </select>
                <button className="btn btn-primary" onClick={() => openForm?.('conta-receber')}>+ Nova</button>
              </div>
            </div>
            {loading ? <div className="empty">Carregando...</div> :
             contasReceber.length === 0 ? (
              <div className="empty">
                <div style={{fontSize:32,marginBottom:8}}>💰</div>
                <div>Nenhuma conta a receber{filtroStatus ? ` com status "${filtroStatus}"` : ''}.</div>
                <button className="btn btn-primary" style={{marginTop:12}} onClick={() => openForm?.('conta-receber')}>+ Cadastrar</button>
              </div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Descrição</th><th>Cliente</th><th>Vencimento</th><th>NF</th><th>Status</th><th>Valor</th><th>Ação</th></tr></thead>
                  <tbody>
                    {contasReceber.map(c => (
                      <tr key={c.id}>
                        <td className="primary">{c.descricao}</td>
                        <td>{c.clientes?.nome || <span className="text-muted">—</span>}</td>
                        <td style={{color: new Date(c.vencimento) < new Date() && c.status==='pendente' ? 'var(--danger)' : 'var(--text2)'}}>
                          {new Date(c.vencimento+'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{color:'var(--text3)'}}>{c.nota_fiscal_numero || '—'}</td>
                        <td>{statusBadge(c.status)}</td>
                        <td className="money pos">{fmt(c.valor)}</td>
                        <td>
                          {c.status === 'pendente' || c.status === 'vencido' ? (
                            <button className="btn btn-ghost" style={{fontSize:11,color:'var(--success)'}} onClick={() => marcarRecebido(c.id)}>✓ Receber</button>
                          ) : <span style={{fontSize:11,color:'var(--text3)'}}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

function Configuracoes() {
  return (
    <div className="fade-up">
      <div className="section-header mb-20">
        <div><div className="section-title">Configurações</div><div className="section-sub">Empresa, usuários, segurança e integrações</div></div>
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

  const pageProps = { empresa, empresaId: empresa?.id, clienteId: clienteId||null, dbData, recarregar: carregarDados, openForm };
  const PAGES = {
    dashboard: Dashboard, financeiro: Financeiro, tributario: Tributario,
    creditos: Creditos, ia: IAChat, estrategico: Estrategico,
    relatorios: RelatoriosPage, nfe: ImportarNFe,
    conciliacao: ConciliacaoBancaria, bancario: GestaoBancaria, contatos: ClientesFornecedores,
    usuarios: Usuarios, config: Configuracoes,
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
