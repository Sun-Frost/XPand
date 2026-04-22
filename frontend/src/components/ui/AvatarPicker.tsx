/**
 * AvatarPicker.tsx
 *
 * Premium avatar selection modal.
 * Avatars live under:  src/assets/avatars/females/  and  src/assets/avatars/males/
 *
 * Usage:
 *   <AvatarPicker
 *     current={profilePicture ?? null}
 *     onSelect={(path) => setProfilePicture(path)}
 *     onClose={() => setOpen(false)}
 *   />
 *
 * The `path` passed to onSelect is the relative import path string that you store
 * in the backend (e.g.  "avatars/females/f1.png").  To render it anywhere use
 * the helper exported below:  avatarSrc(path)  which resolves it via Vite's
 * import.meta.glob result.
 */

import React, { useState, useMemo } from "react";

// ─── Avatar catalogue ────────────────────────────────────────────────────────
// Vite eager-imports every file in the two folders.
// Keys look like: "/src/assets/avatars/females/f1.png"
const ALL_AVATARS = import.meta.glob<{ default: string }>(
  "/src/assets/avatars/**/*.{png,jpg,jpeg,webp,svg}",
  { eager: true }
);

/** Resolve a stored avatar key to its actual src URL. */
export function avatarSrc(key: string | null | undefined): string | null {
  if (!key) return null;
  const entry = Object.entries(ALL_AVATARS).find(([k]) => k.endsWith(key));
  return entry ? entry[1].default : null;
}

type Gender = "females" | "males";

interface AvatarEntry {
  key: string;   // relative key stored in DB,  e.g.  "avatars/females/f1.png"
  src: string;   // resolved URL for <img>
  gender: Gender;
  index: number;
}

function buildCatalogue(): AvatarEntry[] {
  return Object.entries(ALL_AVATARS).map(([fullKey, mod]) => {
    // fullKey: /src/assets/avatars/females/f1.png
    const gender: Gender = fullKey.includes("/females/") ? "females" : "males";
    const filename = fullKey.split("/").pop() ?? "";
    const index = parseInt(filename.replace(/\D/g, ""), 10) || 0;
    const key = fullKey.replace(/^.*\/src\/assets\//, ""); // avatars/females/f1.png
    return { key, src: mod.default, gender, index };
  }).sort((a, b) => a.gender.localeCompare(b.gender) || a.index - b.index);
}

// ─── Component ───────────────────────────────────────────────────────────────

interface AvatarPickerProps {
  current: string | null;
  onSelect: (key: string) => void;
  onClose: () => void;
}

const AvatarPicker: React.FC<AvatarPickerProps> = ({ current, onSelect, onClose }) => {
  const [tab, setTab] = useState<Gender>("females");
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(current);

  const catalogue = useMemo(buildCatalogue, []);
  const filtered = useMemo(() => catalogue.filter(a => a.gender === tab), [catalogue, tab]);

  const handleConfirm = () => {
    if (selected) {
      onSelect(selected);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div className="av-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Modal */}
      <div className="av-modal" role="dialog" aria-modal="true" aria-label="Choose your avatar">
        {/* Header */}
        <div className="av-header">
          <div className="av-header-left">
            <div className="av-header-icon">✦</div>
            <div>
              <h2 className="av-title">Choose Your Avatar</h2>
              <p className="av-subtitle">Select the face that represents you</p>
            </div>
          </div>
          <button className="av-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {/* Tabs */}
        <div className="av-tabs">
          {(["females", "males"] as Gender[]).map((g) => (
            <button
              key={g}
              className={`av-tab ${tab === g ? "av-tab--active" : ""}`}
              onClick={() => setTab(g)}
            >
              <span className="av-tab-dot" />
              {g === "females" ? "Female Avatars" : "Male Avatars"}
              <span className="av-tab-count">
                {catalogue.filter(a => a.gender === g).length}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="av-grid-wrap">
          {filtered.length === 0 ? (
            <div className="av-empty">
              <span className="av-empty-icon">🖼</span>
              <p>No avatars found.<br />Add images to <code>src/assets/avatars/{tab}/</code></p>
            </div>
          ) : (
            <div className="av-grid">
              {filtered.map((avatar) => {
                const isSelected = selected === avatar.key;
                const isHovered  = hovered === avatar.key;
                return (
                  <button
                    key={avatar.key}
                    className={`av-cell ${isSelected ? "av-cell--selected" : ""} ${isHovered ? "av-cell--hovered" : ""}`}
                    onClick={() => setSelected(avatar.key)}
                    onMouseEnter={() => setHovered(avatar.key)}
                    onMouseLeave={() => setHovered(null)}
                    aria-pressed={isSelected}
                    aria-label={`Avatar ${avatar.index}`}
                  >
                    <img
                      src={avatar.src}
                      alt={`Avatar ${avatar.index}`}
                      className="av-img"
                      draggable={false}
                    />
                    {/* Selection ring */}
                    {isSelected && (
                      <>
                        <div className="av-ring" />
                        <div className="av-check">✓</div>
                      </>
                    )}
                    {/* Hover glow */}
                    {isHovered && !isSelected && <div className="av-hover-glow" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview + confirm */}
        <div className="av-footer">
          <div className="av-preview-wrap">
            {selected ? (
              <>
                <img
                  src={avatarSrc(selected) ?? ""}
                  alt="Selected avatar"
                  className="av-preview-img"
                />
                <div className="av-preview-badge">Selected</div>
              </>
            ) : (
              <div className="av-preview-empty">?</div>
            )}
          </div>

          <div className="av-footer-actions">
            <p className="av-footer-hint">
              {selected
                ? "Looking good! Confirm to apply."
                : "Click an avatar to select it."}
            </p>
            <div className="av-footer-btns">
              <button className="av-btn-cancel" onClick={onClose}>Cancel</button>
              <button
                className="av-btn-confirm"
                onClick={handleConfirm}
                disabled={!selected}
              >
                <span className="av-btn-confirm-shine" />
                Confirm Avatar →
              </button>
            </div>
          </div>
        </div>
      </div>

      <style>{styles}</style>
    </>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = `
  /* Backdrop */
  .av-backdrop {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(4, 5, 14, 0.80);
    backdrop-filter: blur(8px);
    animation: av-fade-in 0.18s ease;
  }

  /* Modal */
  .av-modal {
    position: fixed;
    inset: 0; margin: auto;
    z-index: 9001;
    width: min(660px, calc(100vw - 32px));
    height: min(600px, calc(100vh - 40px));
    display: flex; flex-direction: column;
    background: #0d0f1c;
    border: 1px solid rgba(155, 124, 255, 0.22);
    border-radius: 24px;
    box-shadow:
      0 0 0 1px rgba(155,124,255,0.08),
      0 32px 80px rgba(0,0,0,0.6),
      0 0 80px rgba(123,94,167,0.12);
    animation: av-modal-in 0.28s cubic-bezier(0.34,1.56,0.64,1);
    overflow: hidden;
  }

  @keyframes av-fade-in { from { opacity: 0 } to { opacity: 1 } }
  @keyframes av-modal-in {
    from { opacity: 0; transform: scale(0.90) translateY(16px) }
    to   { opacity: 1; transform: scale(1)    translateY(0) }
  }

  /* Header */
  .av-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 20px 24px 16px;
    border-bottom: 1px solid rgba(255,255,255,0.06);
    flex-shrink: 0;
    background: linear-gradient(180deg, rgba(123,94,167,0.08) 0%, transparent 100%);
  }
  .av-header-left { display: flex; align-items: center; gap: 14px; }
  .av-header-icon {
    width: 40px; height: 40px;
    display: flex; align-items: center; justify-content: center;
    background: linear-gradient(135deg, #7B5EA7, #9B7CFF);
    border-radius: 12px;
    font-size: 18px; color: #fff;
    box-shadow: 0 4px 16px rgba(123,94,167,0.4);
    flex-shrink: 0;
  }
  .av-title {
    font-size: 18px; font-weight: 700; color: #f0f0ff;
    letter-spacing: -0.02em; margin: 0;
  }
  .av-subtitle {
    font-size: 12px; color: rgba(255,255,255,0.4);
    margin: 0; margin-top: 2px;
  }
  .av-close {
    width: 32px; height: 32px;
    display: flex; align-items: center; justify-content: center;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 50%;
    color: rgba(255,255,255,0.5); font-size: 12px;
    cursor: pointer; flex-shrink: 0;
    transition: all 0.15s;
  }
  .av-close:hover { background: rgba(255,255,255,0.12); color: #fff; }

  /* Tabs */
  .av-tabs {
    display: flex; gap: 4px; padding: 12px 24px 0;
    flex-shrink: 0;
  }
  .av-tab {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 16px;
    background: transparent;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 100px;
    color: rgba(255,255,255,0.45);
    font-size: 13px; font-weight: 500;
    cursor: pointer;
    transition: all 0.18s;
    position: relative;
    overflow: hidden;
  }
  .av-tab:hover {
    border-color: rgba(155,124,255,0.35);
    color: rgba(255,255,255,0.75);
  }
  .av-tab--active {
    background: rgba(155,124,255,0.15);
    border-color: rgba(155,124,255,0.5);
    color: #c4a9ff;
  }
  .av-tab-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(155,124,255,0.4);
    transition: background 0.15s;
  }
  .av-tab--active .av-tab-dot { background: #9B7CFF; }
  .av-tab-count {
    margin-left: 2px;
    background: rgba(255,255,255,0.1);
    border-radius: 100px;
    padding: 1px 7px;
    font-size: 11px; font-weight: 600;
  }

  /* Grid */
  .av-grid-wrap {
    flex: 1; overflow-y: auto;
    padding: 16px 24px;
    /* custom scrollbar */
    scrollbar-width: thin;
    scrollbar-color: rgba(155,124,255,0.25) transparent;
  }
  .av-grid-wrap::-webkit-scrollbar { width: 4px; }
  .av-grid-wrap::-webkit-scrollbar-track { background: transparent; }
  .av-grid-wrap::-webkit-scrollbar-thumb {
    background: rgba(155,124,255,0.25);
    border-radius: 2px;
  }
  .av-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(86px, 1fr));
    gap: 10px;
  }

  /* Avatar cell */
  .av-cell {
    position: relative;
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,0.07);
    background: rgba(255,255,255,0.04);
    overflow: hidden;
    cursor: pointer;
    aspect-ratio: 1;
    display: flex; align-items: center; justify-content: center;
    transition: transform 0.15s, border-color 0.15s;
    padding: 0;
  }
  .av-cell:hover { transform: scale(1.06); }
  .av-cell--selected {
    border-color: #9B7CFF;
    box-shadow: 0 0 0 3px rgba(155,124,255,0.25), 0 0 20px rgba(155,124,255,0.35);
  }
  .av-img {
    width: 100%; height: 100%;
    object-fit: cover;
    display: block;
    border-radius: 14px;
    transition: opacity 0.15s;
  }

  /* Selection ring */
  .av-ring {
    position: absolute; inset: 0;
    border-radius: 14px;
    border: 2px solid rgba(155,124,255,0.6);
    pointer-events: none;
    animation: av-ring-pop 0.25s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes av-ring-pop {
    from { opacity: 0; transform: scale(0.85) }
    to   { opacity: 1; transform: scale(1) }
  }
  .av-check {
    position: absolute; bottom: 5px; right: 5px;
    width: 20px; height: 20px;
    background: #9B7CFF;
    border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 10px; color: #fff; font-weight: 700;
    box-shadow: 0 2px 8px rgba(155,124,255,0.5);
    animation: av-check-pop 0.22s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes av-check-pop {
    from { transform: scale(0) }
    to   { transform: scale(1) }
  }

  /* Hover glow */
  .av-hover-glow {
    position: absolute; inset: 0;
    background: rgba(155,124,255,0.12);
    border-radius: 14px;
    pointer-events: none;
  }

  /* Empty state */
  .av-empty {
    grid-column: 1/-1;
    display: flex; flex-direction: column; align-items: center;
    gap: 12px; padding: 48px 24px; text-align: center;
    color: rgba(255,255,255,0.3);
  }
  .av-empty-icon { font-size: 40px; opacity: 0.5; }
  .av-empty p { font-size: 13px; line-height: 1.6; margin: 0; }
  .av-empty code {
    font-size: 11px;
    background: rgba(255,255,255,0.08);
    padding: 2px 6px; border-radius: 4px;
  }

  /* Footer */
  .av-footer {
    display: flex; align-items: center; gap: 16px;
    padding: 14px 24px;
    border-top: 1px solid rgba(255,255,255,0.06);
    background: rgba(255,255,255,0.02);
    flex-shrink: 0;
  }
  .av-preview-wrap {
    position: relative;
    width: 54px; height: 54px; flex-shrink: 0;
  }
  .av-preview-img {
    width: 54px; height: 54px;
    object-fit: cover;
    border-radius: 50%;
    border: 2px solid rgba(155,124,255,0.5);
    box-shadow: 0 0 16px rgba(155,124,255,0.35);
    animation: av-preview-pop 0.22s cubic-bezier(0.34,1.56,0.64,1);
  }
  @keyframes av-preview-pop {
    from { transform: scale(0.8); opacity: 0 }
    to   { transform: scale(1);   opacity: 1 }
  }
  .av-preview-empty {
    width: 54px; height: 54px;
    border-radius: 50%;
    border: 2px dashed rgba(255,255,255,0.15);
    display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,0.2); font-size: 22px;
  }
  .av-preview-badge {
    position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%);
    background: #9B7CFF;
    color: #fff; font-size: 9px; font-weight: 700;
    padding: 1px 6px; border-radius: 100px;
    white-space: nowrap; letter-spacing: 0.04em;
  }
  .av-footer-actions { flex: 1; }
  .av-footer-hint {
    font-size: 12px; color: rgba(255,255,255,0.35);
    margin: 0 0 10px;
  }
  .av-footer-btns { display: flex; gap: 8px; }
  .av-btn-cancel {
    padding: 9px 18px;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 100px;
    color: rgba(255,255,255,0.55); font-size: 13px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .av-btn-cancel:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .av-btn-confirm {
    position: relative;
    flex: 1;
    padding: 9px 22px;
    background: linear-gradient(135deg, #7B5EA7 0%, #9B7CFF 100%);
    border: none; border-radius: 100px;
    color: #fff; font-size: 13px; font-weight: 600;
    cursor: pointer; overflow: hidden;
    transition: all 0.2s;
    box-shadow: 0 4px 16px rgba(123,94,167,0.4);
  }
  .av-btn-confirm:disabled {
    opacity: 0.35; cursor: not-allowed;
    box-shadow: none;
  }
  .av-btn-confirm:not(:disabled):hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 24px rgba(123,94,167,0.55);
  }
  .av-btn-confirm-shine {
    position: absolute;
    top: 0; left: -75%;
    width: 50%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
    transform: skewX(-20deg);
    animation: av-shine 2.8s infinite 0.8s;
  }
  @keyframes av-shine {
    0%, 100% { left: -75% }
    50%       { left: 125% }
  }

  @media (max-width: 520px) {
    .av-modal { border-radius: 20px; }
    .av-grid { grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
    .av-footer { flex-direction: column; align-items: stretch; }
    .av-preview-wrap { align-self: center; }
  }
`;

export default AvatarPicker;