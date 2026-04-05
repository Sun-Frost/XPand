/* ============================================================
   BottomDock.tsx
   Self-contained bottom navigation bar.

   KEY RULES
   ─────────────────────────────────────────────────────────
   • Zero props required — no activePath, no onNavigate passed
     from outside. The dock reads its own location and navigates
     itself via useLocation / useNavigate.
   • Always renders ALL 6 items from NAV_ITEMS.
   • position: fixed; bottom: 0; left: 0; width: 100%
   • macOS-style proximity magnification via Framer Motion.
   • PageLayout just renders <BottomDock /> with nothing else.
   ============================================================ */

import { useRef } from "react";
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
const ITEM_BASE = 48;   // px — resting size
const ITEM_MAG  = 68;   // px — max magnified size
const MAG_RANGE = 100;  // px — proximity radius that triggers magnification

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

  /* Recalculate distance between mouse and this button's centre */
  const updateDist = () => {
    const el = btnRef.current;
    if (!el) return;
    const { left, width } = el.getBoundingClientRect();
    dist.set(Math.abs(mouseX.get() - (left + width / 2)));
  };

  /* Size spring — maps distance → button size */
  const rawSize   = useTransform(dist, [0, MAG_RANGE], [ITEM_MAG, ITEM_BASE]);
  const size      = useSpring(rawSize, { stiffness: 320, damping: 26, mass: 0.5 });

  /* Label fades in as the button grows */
  const labelOp   = useTransform(size, [ITEM_BASE, ITEM_MAG], [0, 1]);
  const labelY    = useTransform(size, [ITEM_BASE, ITEM_MAG], [6, 0]);

  /* Icon scales up slightly with the button */
  const iconScale = useTransform(size, [ITEM_BASE, ITEM_MAG], [1, 1.18]);

  return (
    <motion.div
      className="bdock-item-wrap"
      onMouseMove={updateDist}
      onMouseLeave={() => dist.set(MAG_RANGE + 1)}
    >
      {/* Label — floats above, visible on hover */}
      <motion.span
        className="bdock-item-label"
        style={{ opacity: labelOp, y: labelY }}
        aria-hidden="true"
      >
        {item.label}
      </motion.span>

      {/* Icon button */}
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
        <motion.span
          className="bdock-item-icon"
          style={{ scale: iconScale }}
        >
          {item.icon}
        </motion.span>

        {/* Active indicator dot — shared layoutId animates between pages */}
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
/*
 * No props. Fully self-contained:
 *   useLocation()  → determines which item is active
 *   useNavigate()  → handles all clicks internally
 *
 * Usage in PageLayout:
 *   <BottomDock />
 */
const BottomDock = () => {
  const navigate     = useNavigate();
  const { pathname } = useLocation();
  const mouseX       = useMotionValue(-9999);

  return (
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
  );
};

export default BottomDock;