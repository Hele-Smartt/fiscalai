// src/components/ClienteBar.jsx
// Barra pequena que mostra o cliente ativo em todas as telas
// Clicável para trocar de cliente

import { useCliente } from '../lib/ClienteContext'

const CSS = `
  .cliente-bar {
    display: flex; align-items: center; gap: 8px;
    padding: 5px 12px; border-radius: 20px;
    background: rgba(0,212,160,0.08); border: 1px solid rgba(0,212,160,0.2);
    cursor: pointer; transition: all 0.2s; max-width: 220px;
    overflow: hidden;
  }
  .cliente-bar:hover { background: rgba(0,212,160,0.14); border-color: rgba(0,212,160,0.4); }
  .cliente-bar-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--accent); flex-shrink: 0; animation: pulse 2s infinite; }
  .cliente-bar-nome { font-size: 12px; font-weight: 600; color: var(--accent); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .cliente-bar-tipo { font-size: 10px; color: var(--text3); white-space: nowrap; }
  .cliente-bar-empty { background: rgba(255,184,0,0.08); border-color: rgba(255,184,0,0.2); }
  .cliente-bar-empty .cliente-bar-nome { color: var(--warn); }
  .cliente-bar-empty .cliente-bar-dot { background: var(--warn); }
`

export default function ClienteBar({ onTrocar }) {
  const { clienteAtivo } = useCliente()

  return (
    <>
      <style>{CSS}</style>
      <div
        className={`cliente-bar ${!clienteAtivo ? 'cliente-bar-empty' : ''}`}
        onClick={onTrocar}
        title={clienteAtivo ? `Cliente: ${clienteAtivo.nome} — clique para trocar` : 'Nenhum cliente selecionado'}
      >
        <div className="cliente-bar-dot" />
        <div style={{minWidth:0}}>
          <div className="cliente-bar-nome">
            {clienteAtivo ? clienteAtivo.nome : 'Sem cliente'}
          </div>
          <div className="cliente-bar-tipo">
            {clienteAtivo
              ? (clienteAtivo.subtipo === 'paciente' ? 'Paciente'
                : clienteAtivo.subtipo === 'convenio' ? 'Convênio'
                : clienteAtivo.tipo === 'pf' ? 'Pessoa Física' : 'Pessoa Jurídica')
              : 'Clique para selecionar'}
          </div>
        </div>
        <span style={{fontSize:10,color:'var(--text3)',flexShrink:0}}>⇄</span>
      </div>
    </>
  )
}
