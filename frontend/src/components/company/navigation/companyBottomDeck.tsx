/* ============================================================
   CompanyBottomDock.tsx
   Company-specific bottom navigation dock.
   Mirrors BottomDock.tsx exactly — same Framer Motion
   magnification pattern — but reads COMPANY_NAV_ITEMS.
   
   Place this file at the same level as BottomDock.tsx, e.g.:
     src/components/company/navigation/CompanyBottomDock.tsx
   ============================================================ */

import { useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import { COMPANY_NAV_ITEMS, type CompanyNavItem } from "./companyNavItems";

// ── Magnification constants (matches user dock) ───────────────
const ITEM_BASE = 48;
const ITEM_MAG  = 68;
const MAG_RANGE = 100;

// ── DockItem ──────────────────────────────────────────────────
interface DockItemProps {
  item:    CompanyNavItem;
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
            layoutId="company-bdock-active-dot"
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        )}
      </motion.button>
    </motion.div>
  );
};

// ── CompanyBottomDock ─────────────────────────────────────────
const CompanyBottomDock = () => {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const mouseX       = useMotionValue(-9999);

  // Active matching: exact OR prefix (so /company/jobs/123 still highlights "jobs")
  const isActive = (path: string) => {
    if (path === "/company/dashboard") return pathname === path;
    return pathname === path || pathname.startsWith(path + "/");
  };

  return (
    <nav
      className="bdock"
      aria-label="Company navigation"
      onMouseMove={(e) => mouseX.set(e.clientX)}
      onMouseLeave={() => mouseX.set(-9999)}
    >
      <div className="bdock-inner">
        {COMPANY_NAV_ITEMS.map((item) => (
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
  );
};

export default CompanyBottomDock;