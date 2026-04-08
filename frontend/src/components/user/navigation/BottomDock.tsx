/* ============================================================
   BottomDock.tsx
   Self-contained bottom navigation bar with collapse handle.

   KEY RULES
   ─────────────────────────────────────────────────────────
   • Zero props required — no activePath, no onNavigate passed
     from outside. The dock reads its own location and navigates
     itself via useLocation / useNavigate.
   • Always renders ALL items from NAV_ITEMS.
   • Collapsible via a small pill handle above the dock.
   • macOS-style proximity magnification via Framer Motion.
   ============================================================ */

import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { NAV_ITEMS, type NavItem } from "./navItems";
import "../../../assets/css/BottomDock.css";

/* ── Magnification constants ─────────────────────────────────── */
const ITEM_BASE = 48;
const ITEM_MAG  = 68;
const MAG_RANGE = 100;

/* ── DockItem ────────────────────────────────────────────────── */
interface DockItemProps {
  item:    NavItem;
  active:  boolean;
  mouseX:  ReturnType<typeof useMotionValue<number>>;
  onClick: () => void;
}

const DockItem = ({ item, active, mouseX, onClick }: DockItemProps) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const dist   = useMotionValue(MAG_RANGE + 1);

  const updateDist = () => {
    const el = btnRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    dist.set(Math.abs(mouseX.get() - (left + width / 2)));
  };

  const rawSize   = useTransform(dist, [0, MAG_RANGE], [ITEM_MAG, ITEM_BASE]);
  const size      = useSpring(rawSize, { stiffness: 320, damping: 26, mass: 0.5 });
  const labelOp   = useTransform(size, [ITEM_BASE, ITEM_MAG], [0, 1]);
  const labelY    = useTransform(size, [ITEM_BASE, ITEM_MAG], [6, 0]);
  const iconScale = useTransform(size, [ITEM_BASE, ITEM_MAG], [1, 1.18]);

  return (
    <motion.div
      className="bdock-item-wrap"
      onMouseMove={updateDist}
      onMouseLeave={() => dist.set(MAG_RANGE + 1)}
    >
      <motion.span
        className="bdock-item-label"
        style={{ opacity: labelOp, y: labelY }}
        aria-hidden="true"
      >
        {item.label}
      </motion.span>

      <motion.button
        ref={btnRef}
        className={`bdock-item${active ? " bdock-item--active" : ""}`}
        style={{
          width:  size,
          height: size,
          "--item-glow": item.color,
        } as any}
        onClick={onClick}
        whileTap={{ scale: 0.88 }}
        aria-label={item.label}
        aria-current={active ? "page" : undefined}
      >
        <motion.span className="bdock-item-icon" style={{ scale: iconScale }}>
          {item.icon}
        </motion.span>

        {active && (
          <motion.span
            className="bdock-item-dot"
            layoutId="bdock-active-dot"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    </motion.div>
  );
};

/* ── BottomDock ───────────────────────────────────────────────── */
const BottomDock = () => {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const mouseX       = useMotionValue(-9999);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <motion.div
      className="bdock-wrapper"
      animate={{ y: collapsed ? "var(--layout-bottom-height, 64px)" : "0px" }}
      transition={{ type: "spring", stiffness: 320, damping: 30, mass: 0.8 }}
    >
      {/* Collapse handle */}
      <button
        className="bdock-collapse-handle"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
      >
        <motion.svg
          width="16" height="16" viewBox="0 0 16 16"
          fill="none" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
        >
          <path d="M4 6l4 4 4-4" />
        </motion.svg>
      </button>

      {/* Dock bar */}
      <nav
        className="bdock"
        aria-label="Main navigation"
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(-9999)}
      >
        <div className="bdock-inner">
          {NAV_ITEMS.map((item) => (
            <DockItem
              key={item.id}
              item={item}
              active={pathname === item.path}
              mouseX={mouseX}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </nav>
    </motion.div>
  );
};

export default BottomDock;