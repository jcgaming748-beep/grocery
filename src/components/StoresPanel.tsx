import { useState } from 'react';

import type { Store } from '@/db/schema';

type Props = {
  stores: Store[];
  onAddStore: (name: string) => Promise<void>;
};

export default function StoresPanel({ stores, onAddStore }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [newStoreName, setNewStoreName] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newStoreName.trim();
    if (!trimmed) return;

    setSaving(true);
    try {
      await onAddStore(trimmed);
      setNewStoreName('');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="stores-panel">
      <button type="button" className="btn-link stores-panel-toggle" onClick={() => setExpanded((v) => !v)}>
        {expanded ? 'Hide stores' : `Stores (${stores.length})`}
      </button>

      {expanded ? (
        <div className="stores-panel-body">
          {stores.length === 0 ? (
            <p className="hint">No stores yet. Add Fareway or other stores you shop at.</p>
          ) : (
            <ul className="stores-list">
              {stores.map((store) => (
                <li key={store.id}>{store.name}</li>
              ))}
            </ul>
          )}

          <form className="stores-add-form" onSubmit={handleAdd}>
            <input
              className="input"
              placeholder="Add store (e.g. Costco)"
              value={newStoreName}
              onChange={(e) => setNewStoreName(e.target.value)}
            />
            <button type="submit" className="btn-secondary" disabled={saving || !newStoreName.trim()}>
              Add
            </button>
          </form>
        </div>
      ) : null}
    </section>
  );
}
