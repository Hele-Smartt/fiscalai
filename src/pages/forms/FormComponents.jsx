// src/pages/forms/FormComponents.jsx
// Componentes reutilizáveis para todos os formulários

export const FORM_CSS = `
  .form-page {
    max-width: 760px; margin: 0 auto;
  }
  .form-header {
    display: flex; align-items: center; gap: 12px; margin-bottom: 28px;
  }
  .form-back {
    width: 36px; height: 36px; border-radius: 10px;
    background: rgba(255,255,255,0.05); border: 1px solid var(--border);
    display: flex; align-items: center; justify-content: center;
    cursor: pointer; font-size: 16px; transition: var(--transition);
    flex-shrink: 0;
  }
  .form-back:hover { background: rgba(255,255,255,0.1); }
  .form-title { font-family: var(--font-head); font-weight: 800; font-size: 22px; }
  .form-sub { font-size: 12px; color: var(--text3); margin-top: 2px; }

  .form-card {
    background: var(--card); border: 1px solid var(--border);
    border-radius: var(--radius2); padding: 28px; margin-bottom: 16px;
  }
  .form-section-title {
    font-family: var(--font-head); font-weight: 700; font-size: 13px;
    color: var(--text2); text-transform: uppercase; letter-spacing: 0.08em;
    margin-bottom: 20px; display: flex; align-items: center; gap: 8px;
  }
  .form-section-title::after {
    content: ''; flex: 1; height: 1px; background: var(--border);
  }

  .form-grid { display: grid; gap: 16px; }
  .form-grid-2 { grid-template-columns: 1fr 1fr; }
  .form-grid-3 { grid-template-columns: 1fr 1fr 1fr; }

  .field-group { display: flex; flex-direction: column; gap: 6px; }
  .field-label {
    font-size: 12px; font-weight: 600; color: var(--text2);
    display: flex; align-items: center; gap: 4px;
  }
  .field-label.required::after { content: '*'; color: var(--danger); margin-left: 2px; }

  .field-input {
    background: var(--bg3); border: 1px solid var(--border);
    border-radius: var(--radius); padding: 10px 14px;
    color: var(--text); font-family: var(--font-body); font-size: 13px;
    outline: none; transition: var(--transition); width: 100%;
  }
  .field-input:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(0,212,160,0.1); }
  .field-input::placeholder { color: var(--text3); }
  .field-input:disabled { opacity: 0.5; cursor: not-allowed; }

  select.field-input { cursor: pointer; }
  textarea.field-input { resize: vertical; min-height: 80px; }

  .field-hint { font-size: 11px; color: var(--text3); }
  .field-error { font-size: 11px; color: var(--danger); }

  .tipo-toggle {
    display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
  }
  .tipo-btn {
    padding: 12px; border-radius: var(--radius); border: 2px solid var(--border);
    cursor: pointer; text-align: center; transition: var(--transition);
    font-size: 13px; font-weight: 600;
  }
  .tipo-btn.entrada { color: var(--success); }
  .tipo-btn.entrada.active { border-color: var(--success); background: rgba(0,212,160,0.08); }
  .tipo-btn.saida { color: var(--danger); }
  .tipo-btn.saida.active { border-color: var(--danger); background: rgba(255,71,87,0.08); }
  .tipo-btn:hover { border-color: var(--border2); }

  .valor-input-wrap { position: relative; }
  .valor-prefix {
    position: absolute; left: 12px; top: 50%; transform: translateY(-50%);
    font-size: 13px; color: var(--text3); font-weight: 600; pointer-events: none;
  }
  .valor-input-wrap .field-input { padding-left: 36px; }

  .form-actions {
    display: flex; gap: 12px; justify-content: flex-end; margin-top: 24px;
  }

  .btn-save {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 24px; border-radius: var(--radius);
    background: var(--accent); color: var(--bg);
    font-family: var(--font-head); font-size: 14px; font-weight: 700;
    border: none; cursor: pointer; transition: var(--transition);
  }
  .btn-save:hover { background: #00edb3; box-shadow: 0 0 20px rgba(0,212,160,0.3); }
  .btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .btn-cancel {
    display: flex; align-items: center; gap: 8px;
    padding: 11px 20px; border-radius: var(--radius);
    background: transparent; color: var(--text2);
    border: 1px solid var(--border2); font-family: var(--font-body);
    font-size: 13px; font-weight: 500; cursor: pointer; transition: var(--transition);
  }
  .btn-cancel:hover { background: rgba(255,255,255,0.05); color: var(--text); }

  .success-banner {
    background: rgba(0,212,160,0.08); border: 1px solid rgba(0,212,160,0.2);
    border-radius: var(--radius); padding: 14px 16px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: var(--success); margin-bottom: 20px;
    animation: fadeUp 0.3s ease;
  }
  .error-banner {
    background: rgba(255,71,87,0.08); border: 1px solid rgba(255,71,87,0.2);
    border-radius: var(--radius); padding: 14px 16px;
    display: flex; align-items: center; gap: 10px;
    font-size: 13px; color: var(--danger); margin-bottom: 20px;
  }

  .list-table-wrap { overflow-x: auto; }
  .empty-state {
    text-align: center; padding: 48px 20px;
    color: var(--text3); font-size: 13px;
  }
  .empty-state .empty-icon { font-size: 40px; margin-bottom: 12px; }
  .empty-state .empty-title { font-size: 15px; font-weight: 600; color: var(--text2); margin-bottom: 6px; }

  @media (max-width: 640px) {
    .form-grid-2, .form-grid-3 { grid-template-columns: 1fr; }
    .form-card { padding: 20px 16px; }
  }
`

export function Field({ label, required, hint, error, children }) {
  return (
    <div className="field-group">
      {label && <label className={`field-label ${required ? 'required' : ''}`}>{label}</label>}
      {children}
      {hint  && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">⚠ {error}</span>}
    </div>
  )
}

export function Input({ ...props }) {
  return <input className="field-input" {...props} />
}

export function Select({ children, ...props }) {
  return (
    <select className="field-input" {...props}>
      {children}
    </select>
  )
}

export function Textarea({ ...props }) {
  return <textarea className="field-input" {...props} />
}

export function ValorInput({ value, onChange, placeholder = "0,00" }) {
  return (
    <div className="valor-input-wrap">
      <span className="valor-prefix">R$</span>
      <input
        className="field-input"
        type="number"
        step="0.01"
        min="0"
        placeholder={placeholder}
        value={value}
        onChange={onChange}
      />
    </div>
  )
}
