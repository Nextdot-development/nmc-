import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { ExternalIcon, LayersIcon, SearchIcon } from '../components/Icons.jsx';
import { PACKS, packMeta } from '../packs.js';

const Rule = ({ rule }) => {
  const [open, setOpen] = useState(false);
  return (
    <li className={`rule ${open ? 'rule--open' : ''}`}>
      <button type="button" className="rule__head" onClick={() => setOpen(!open)} aria-expanded={open}>
        <span className="rule__section">§ {rule.section || '—'}</span>
        <span className="rule__title">{rule.title}</span>
        <span className="rule__chev" aria-hidden="true">+</span>
      </button>
      {open && (
        <div className="rule__body">
          <p>{rule.description}</p>
          <div className="rule__foot">
            <code>{rule.id}</code>
            {rule.source && (
              <a href={rule.source} target="_blank" rel="noopener noreferrer">Official source <ExternalIcon width={14} height={14} /></a>
            )}
          </div>
        </div>
      )}
    </li>
  );
};

export default function RulePack() {
  const [params, setParams] = useSearchParams();
  const [groups, setGroups] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState('all');
  const query = params.get('q') || '';
  const setQuery = (q) => setParams(q ? { q } : {}, { replace: true });

  useEffect(() => {
    api.rulePack()
      .then((res) => {
        const byId = Object.fromEntries((res?.data?.groups || []).map((g) => [g.pack, g.rules]));
        const ordered = PACKS.filter((p) => byId[p.id]).map((p) => ({ ...p, rules: byId[p.id] }));
        const extra = Object.keys(byId).filter((id) => !PACKS.some((p) => p.id === id)).map((id) => ({ ...packMeta(id), rules: byId[id] }));
        setGroups([...ordered, ...extra]);
      })
      .catch((err) => setError(err.message));
  }, []);

  const total = groups?.reduce((n, g) => n + g.rules.length, 0) || 0;

  const visible = useMemo(() => {
    if (!groups) return [];
    const q = query.trim().toLowerCase();
    return groups
      .filter((g) => active === 'all' || g.id === active)
      .map((g) => ({
        ...g,
        rules: q ? g.rules.filter((r) => [r.title, r.description, r.section, r.id, r.regulation].join(' ').toLowerCase().includes(q)) : g.rules,
      }))
      .filter((g) => g.rules.length);
  }, [groups, query, active]);

  const shown = visible.reduce((n, g) => n + g.rules.length, 0);

  return (
    <div className="page">
      <header className="page-head">
        <span className="badge-live"><i /> RULE PACKS · INDIA</span>
        <h1>The <b className="lime">{total || 160}</b> <b className="grad">NMC rules</b></h1>
        <p>Built from a review of all 1,014 notices on nmc.org.in/whats-new plus the operative IMC Code of Ethics. The NMC RMP Conduct Regulations 2023 are held in abeyance and are not used.</p>
      </header>

      {error && <p className="alert">{error}</p>}
      {!groups && !error && <div className="panel skeleton">Loading rule pack…</div>}

      {groups && (
        <>
          <div className="rules-toolbar">
            <label className="searchbox">
              <SearchIcon />
              <input value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Search rules — testimonial, discount, stem cell, telemedicine…" aria-label="Search rules" />
            </label>
            <div className="chips" role="group" aria-label="Filter by source">
              <button type="button" className={`chip ${active === 'all' ? 'chip--active' : ''}`} onClick={() => setActive('all')}>All <span>{total}</span></button>
              {groups.map((g) => (
                <button key={g.id} type="button" className={`chip ${active === g.id ? 'chip--active' : ''}`} onClick={() => setActive(g.id)}>
                  {g.short} <span>{g.rules.length}</span>
                </button>
              ))}
            </div>
          </div>

          {query && <p className="muted small results-note">{shown} rule{shown === 1 ? '' : 's'} match “{query}”</p>}

          {visible.map((g) => (
            <section key={g.id} className="panel rule-group">
              <header className="rule-group__head">
                <span className="card-pack__icon card-pack__icon--sm"><LayersIcon width={24} height={24} /></span>
                <div>
                  <h2>{g.label}</h2>
                  <p className="muted small">{g.issuer}</p>
                </div>
                <span className="badge-active"><i /> {g.rules.length} rules</span>
              </header>
              <ul className="rules">{g.rules.map((r) => <Rule key={r.id} rule={r} />)}</ul>
            </section>
          ))}
          {visible.length === 0 && <div className="panel empty">No rule matches your search.</div>}
        </>
      )}
    </div>
  );
}
