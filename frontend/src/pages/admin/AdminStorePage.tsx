/* ============================================================
   AdminStorePage.tsx
   Create, update, and delete XP store items.
   Route: /admin/store
   Endpoints: GET/POST/PUT/DELETE /admin/store-items
   ============================================================ */

import { useEffect, useState, useCallback } from "react";
import AdminPageLayout from "../../components/admin/adminPageLayout";
import {
  adminGetAllStoreItems,
  adminCreateStoreItem,
  adminUpdateStoreItem,
  adminDeleteStoreItem,
  type StoreItemResponse,
  type CreateStoreItemPayload,
} from "../../api/Adminapi";

const ITEM_TYPES = ["READINESS_REPORT", "MOCK_INTERVIEW", "PRIORITY_SLOT"];

const ITEM_TYPE_ICONS: Record<string, string> = {
  READINESS_REPORT: "📊",
  MOCK_INTERVIEW: "🎤",
  PRIORITY_SLOT: "⏰",
};

const emptyForm = (): CreateStoreItemPayload => ({
  name:        "",
  description: "",
  costXp:      100,
  itemType:    "BADGE",
});

const AdminStorePage = () => {
  const [items,    setItems]    = useState<StoreItemResponse[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing,  setEditing]  = useState<StoreItemResponse | null>(null);
  const [form,     setForm]     = useState<CreateStoreItemPayload>(emptyForm());
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState<StoreItemResponse | null>(null);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);
  const [search,   setSearch]   = useState("");
  const [typeFilter, setTypeFilter] = useState("all");

  const load = useCallback(() => {
    setLoading(true);
    adminGetAllStoreItems()
      .then(setItems)
      .catch(() => showToast("Failed to load store items", false))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (item: StoreItemResponse) => {
    setEditing(item);
    setForm({
      name:        item.name,
      description: item.description,
      costXp:      item.costXp,
      itemType:    item.itemType,
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { showToast("Name is required.", false); return; }
    setSaving(true);
    try {
      if (editing) {
        await adminUpdateStoreItem(editing.id, form);
        showToast("Item updated.");
      } else {
        await adminCreateStoreItem(form);
        showToast("Item created.");
      }
      setShowForm(false);
      load();
    } catch { showToast("Save failed.", false); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    try {
      await adminDeleteStoreItem(deleting.id);
      showToast("Item deleted.");
      setDeleting(null);
      load();
    } catch { showToast("Delete failed.", false); }
    finally { setSaving(false); }
  };

  const allTypes = Array.from(new Set(items.map(i => i.itemType)));

  const filtered = items.filter(i => {
    const text = `${i.name} ${i.description} ${i.itemType}`.toLowerCase();
    const matchSearch = text.includes(search.toLowerCase());
    const matchType = typeFilter === "all" || i.itemType === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <AdminPageLayout pageTitle="Manage XP Store">
      <div className="admin-page">

        <div className="admin-page-header">
          <div>
            <h1 className="admin-page-title"><span className="admin-title-icon">🛍️</span>Manage XP Store</h1>
            <p className="admin-page-subtitle">{items.length} purchasable items</p>
          </div>
          <button className="btn btn-primary" onClick={openCreate}>
            + New Item
          </button>
        </div>

        <div className="admin-toolbar">
          <div className="admin-search-wrap">
            <span className="admin-search-icon">🔍</span>
            <input
              className="admin-search-input"
              placeholder="Search items…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <div className="admin-filter-tabs">
            <button className={`admin-filter-tab${typeFilter === "all" ? " active" : ""}`} onClick={() => setTypeFilter("all")}>All</button>
            {allTypes.map(t => (
              <button key={t} className={`admin-filter-tab${typeFilter === t ? " active" : ""}`} onClick={() => setTypeFilter(t)}>
                {ITEM_TYPE_ICONS[t] ?? "📦"} {t}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="admin-loading"><div className="admin-spinner" /><span>Loading…</span></div>
        ) : (
          <div className="store-grid">
            {filtered.length === 0 ? (
              <div className="admin-empty-state" style={{ gridColumn: "1/-1" }}>
                <span>🛍️</span><p>No store items found</p>
              </div>
            ) : filtered.map(item => (
              <div key={item.id} className="store-card">
                <div className="store-card-top">
                  <div className="store-item-icon">
                    {ITEM_TYPE_ICONS[item.itemType] ?? "📦"}
                  </div>
                  <div className="store-item-type">{item.itemType}</div>
                </div>
                <h3 className="store-item-name">{item.name}</h3>
                <p className="store-item-desc">{item.description}</p>
                <div className="store-item-price">
                  <span className="store-xp-cost">⚡ {item.costXp.toLocaleString()} XP</span>
                </div>
                <div className="store-card-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(item)}>✏ Edit</button>
                  <button className="btn btn-sm btn-danger" onClick={() => setDeleting(item)}>🗑 Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="admin-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="admin-modal admin-modal--wide" onClick={e => e.stopPropagation()}>
            <h3 className="admin-modal-title">{editing ? "Edit Store Item" : "New Store Item"}</h3>

            <div className="admin-form">
              <div className="admin-form-group">
                <label className="admin-form-label">Name *</label>
                <input className="admin-form-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Item name" />
              </div>
              <div className="admin-form-group">
                <label className="admin-form-label">Description</label>
                <textarea className="admin-form-input admin-form-textarea" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What does this item do?" rows={3} />
              </div>
              <div className="admin-form-row">
                <div className="admin-form-group">
                  <label className="admin-form-label">Item Type</label>
                  <select className="admin-form-input admin-form-select" value={form.itemType} onChange={e => setForm(f => ({ ...f, itemType: e.target.value }))}>
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{ITEM_TYPE_ICONS[t]} {t}</option>)}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label className="admin-form-label">Cost (XP)</label>
                  <input className="admin-form-input" type="number" min={1} value={form.costXp} onChange={e => setForm(f => ({ ...f, costXp: +e.target.value }))} />
                </div>
              </div>
            </div>

            <div className="admin-modal-actions" style={{ marginTop: "var(--space-6)" }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Item"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleting && (
        <div className="admin-modal-overlay" onClick={() => setDeleting(null)}>
          <div className="admin-modal" onClick={e => e.stopPropagation()}>
            <div className="admin-modal-icon">🗑</div>
            <h3 className="admin-modal-title">Delete Store Item?</h3>
            <p className="admin-modal-body">Permanently delete "{deleting.name}"? Users who purchased it will be unaffected.</p>
            <div className="admin-modal-actions">
              <button className="btn btn-ghost" onClick={() => setDeleting(null)} disabled={saving}>Cancel</button>
              <button className="btn btn-danger-solid" onClick={handleDelete} disabled={saving}>
                {saving ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={`admin-toast ${toast.ok ? "admin-toast--ok" : "admin-toast--err"}`}>
          {toast.ok ? "✅" : "❌"} {toast.msg}
        </div>
      )}

      <style>{pageStyles}</style>
    </AdminPageLayout>
  );
};

const pageStyles = `
  .admin-page { padding: var(--space-8); max-width: 1200px; margin:0 auto; }
  .admin-page-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: var(--space-5); }
  .admin-page-title { font-family: var(--font-display); font-size: var(--text-2xl); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-1) 0; display:flex; align-items:center; gap: var(--space-3); }
  .admin-title-icon { color: var(--color-danger); }
  .admin-page-subtitle { font-size: var(--text-sm); color: var(--color-text-muted); margin:0; }

  .admin-toolbar { display:flex; gap: var(--space-4); align-items:center; margin-bottom: var(--space-5); flex-wrap:wrap; }
  .admin-search-wrap { flex:1; min-width:200px; position:relative; }
  .admin-search-icon { position:absolute; left: var(--space-3); top:50%; transform:translateY(-50%); font-size:14px; }
  .admin-search-input { width:100%; background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: var(--space-2) var(--space-3) var(--space-2) var(--space-8); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; transition: border-color var(--duration-fast); box-sizing:border-box; }
  .admin-search-input:focus { border-color: var(--color-border-focus); }
  .admin-filter-tabs { display:flex; gap: var(--space-1); background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-lg); padding: 3px; flex-wrap:wrap; }
  .admin-filter-tab { padding: var(--space-1) var(--space-3); border-radius: var(--radius-md); background:none; border:none; font-size: var(--text-sm); color: var(--color-text-muted); cursor:pointer; transition: all var(--duration-fast); }
  .admin-filter-tab.active { background: var(--color-bg-active); color: var(--color-text-primary); }

  .store-grid { display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: var(--space-5); }
  .store-card { background: var(--color-bg-surface); border:1px solid var(--color-border-default); border-radius: var(--radius-xl); padding: var(--space-5); display:flex; flex-direction:column; gap: var(--space-3); transition: border-color var(--duration-base), transform var(--duration-fast); }
  .store-card:hover { border-color: var(--color-purple-400); transform: translateY(-2px); }
  .store-card-top { display:flex; align-items:center; justify-content:space-between; }
  .store-item-icon { font-size: 32px; }
  .store-item-type { font-family: var(--font-mono); font-size: 9px; letter-spacing:0.1em; text-transform:uppercase; color: var(--color-purple-400); background: var(--color-purple-glow); border:1px solid rgba(139,92,246,0.2); border-radius: var(--radius-full); padding: 2px 8px; }
  .store-item-name { font-family: var(--font-display); font-size: var(--text-md); font-weight: var(--weight-semibold); color: var(--color-text-primary); margin:0; }
  .store-item-desc { font-size: var(--text-sm); color: var(--color-text-muted); margin:0; flex:1; line-height:1.5; }
  .store-item-price { margin-top:auto; }
  .store-xp-cost { font-family: var(--font-mono); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-xp-gold); }
  .store-card-actions { display:flex; gap: var(--space-2); border-top:1px solid var(--color-border-subtle); padding-top: var(--space-3); }

  .btn-sm { padding: var(--space-1) var(--space-3); font-size: var(--text-xs); border-radius: var(--radius-md); cursor:pointer; transition: all var(--duration-fast); font-family: var(--font-body); }
  .btn-danger { background: var(--color-danger-bg); border:1px solid var(--color-danger-border); color: var(--color-danger); }
  .btn-danger:hover { background: rgba(248,113,113,0.2); }
  .btn-danger-solid { background: var(--color-danger); color:#fff; border:none; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); cursor:pointer; font-weight: var(--weight-semibold); }

  .admin-form { display:flex; flex-direction:column; gap: var(--space-4); text-align:left; }
  .admin-form-row { display:grid; grid-template-columns:1fr 1fr; gap: var(--space-4); }
  .admin-form-group { display:flex; flex-direction:column; gap: var(--space-2); }
  .admin-form-label { font-size: var(--text-xs); font-weight: var(--weight-semibold); letter-spacing:0.06em; text-transform:uppercase; color: var(--color-text-muted); }
  .admin-form-input { background: var(--color-bg-base); border:1px solid var(--color-border-default); border-radius: var(--radius-md); padding: var(--space-2) var(--space-3); font-size: var(--text-sm); color: var(--color-text-primary); outline:none; font-family: var(--font-body); transition: border-color var(--duration-fast); }
  .admin-form-input:focus { border-color: var(--color-border-focus); }
  .admin-form-textarea { resize:vertical; }
  .admin-form-select { cursor:pointer; }

  .admin-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:1000; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); padding: var(--space-4); }
  .admin-modal { background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-2xl); padding: var(--space-8); width:100%; max-width:380px; text-align:center; animation: fadeIn 0.2s ease; }
  .admin-modal--wide { max-width:520px; }
  .admin-modal-icon { font-size:40px; margin-bottom: var(--space-4); }
  .admin-modal-title { font-family: var(--font-display); font-size: var(--text-lg); font-weight: var(--weight-bold); color: var(--color-text-primary); margin:0 0 var(--space-4) 0; }
  .admin-modal-body { font-size: var(--text-sm); color: var(--color-text-secondary); margin:0 0 var(--space-6) 0; }
  .admin-modal-actions { display:flex; gap: var(--space-3); justify-content:flex-end; }

  .admin-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; gap: var(--space-4); padding: var(--space-16); color: var(--color-text-muted); }
  .admin-spinner { width:32px; height:32px; border:2px solid var(--color-border-default); border-top-color: var(--color-primary-400); border-radius:50%; animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .admin-empty-state { display:flex; flex-direction:column; align-items:center; gap: var(--space-2); padding: var(--space-8); color: var(--color-text-muted); font-size: var(--text-sm); }

  .admin-toast { position:fixed; bottom: var(--space-24); left:50%; transform:translateX(-50%); background: var(--color-bg-elevated); border:1px solid var(--color-border-strong); border-radius: var(--radius-full); padding: var(--space-3) var(--space-5); font-size: var(--text-sm); color: var(--color-text-primary); z-index:2000; box-shadow: var(--shadow-lg); animation: fadeIn 0.2s ease; white-space:nowrap; }
  .admin-toast--ok { border-color: var(--color-success-border); }
  .admin-toast--err { border-color: var(--color-danger-border); }

  @media(max-width:768px) { .admin-page { padding: var(--space-4); } .admin-form-row { grid-template-columns:1fr; } }
`;

export default AdminStorePage;