/* ============================================================
   AdminBottomDock.tsx
   Admin-specific bottom navigation dock.
   Same Framer Motion magnification pattern as other docks.
   Collapse: click the pill handle to slide the dock off-screen.
   ============================================================ */

import { useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
} from "framer-motion";
import { ADMIN_NAV_ITEMS, type AdminNavItem } from "./navItems";

const ITEM_BASE = 48;
const ITEM_MAG  = 68;
const MAG_RANGE = 100;

// Full dock height: 10px top pad + 48px items + 14px bottom pad = 72px
// Plus the 22px handle pill on top = 94px total translateY to fully hide
const DOCK_HIDDEN_Y = 94;

interface DockItemProps {
  item:    AdminNavItem;
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
        } as unknown as React.CSSProperties}
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
            layoutId="admin-bdock-active-dot"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    </motion.div>
  );
};

const AdminBottomDock = () => {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const mouseX       = useMotionValue(-9999);
  const [collapsed, setCollapsed] = useState(false);

  const isActive = (path: string) => {
    if (path === "/admin/overview") return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <motion.div
      className="bdock-wrapper"
      animate={{ y: collapsed ? DOCK_HIDDEN_Y : 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 32, mass: 0.8 }}
    >
      {/* Collapse / expand handle pill */}
      <button
        className="bdock-collapse-handle"
        onClick={() => setCollapsed((v) => !v)}
        aria-label={collapsed ? "Expand navigation dock" : "Collapse navigation dock"}
        aria-expanded={!collapsed}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.svg
            key={collapsed ? "up" : "down"}
            width="12" height="12" viewBox="0 0 12 12" fill="none"
            initial={{ opacity: 0, y: collapsed ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{   opacity: 0, y: collapsed ? -4 : 4 }}
            transition={{ duration: 0.15 }}
          >
            <path
              d={collapsed ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"}
              stroke="currentColor" strokeWidth="1.5"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </motion.svg>
        </AnimatePresence>
      </button>

      <nav
        className="bdock"
        aria-label="Admin navigation"
        aria-hidden={collapsed}
        onMouseMove={(e) => mouseX.set(e.clientX)}
        onMouseLeave={() => mouseX.set(-9999)}
      >
        <div className="bdock-inner">
          {ADMIN_NAV_ITEMS.map((item) => (
            <DockItem
              key={item.id}
              item={item}
              active={isActive(item.path)}
              mouseX={mouseX}
              onClick={() => navigate(item.path)}
            />
          ))}
        </div>
      </nav>
    </motion.div>
  );
};

export default AdminBottomDock;