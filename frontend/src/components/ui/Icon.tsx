/**
 * /components/ui/Icon.tsx
 *
 * Unified icon system for XPand.
 * - Lucide React for standard icons
 * - Inline SVG for custom brand icons (XpBolt, GithubMark, face moods, SparkDot)
 * - Fully type-safe: `name` is a typed union — invalid names are compile errors
 *
 * Usage:
 *   <Icon name="work" />
 *   <Icon name="badge-gold" size={20} />
 *   <Icon name="xp" size={16} className="text-gold" />
 *   <Icon name="mood-happy" size={24} label="Happy mood" />
 */

import React from "react";
import {
  // Challenges & Quests
  Swords,
  Sunrise,
  CalendarDays,
  Flame,
  Mountain,
  Microscope,
  Handshake,
  Map,
  // Skill Categories
  Monitor,
  Settings2,
  BarChart2,
  Cloud,
  Smartphone,
  Target,
  // Skills Library Filters
  TrendingUp,
  Puzzle,
  // Status & Feedback
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  Flag,
  Ban,
  Clock,
  Timer,
  Hourglass,
  Lock,
  // Mock Interview
  Mic,
  Drama,
  Camera,
  UserRound,
  // Jobs & Employment
  Building2,
  ClipboardList,
  Globe2,
  MapPin,
  Banknote,
  Briefcase,
  Rocket,
  // Profile Sections
  MessageSquare,
  Phone,
  Link2,
  Globe,
  GraduationCap,
  ShieldCheck,
  Pencil,
  Trash2,
  KeyRound,
  // Dashboard & Navigation
  Radio,
  History,
  // Collection & Store
  Luggage,
  Search,
  PenLine,
  // XP & Gamification
  Medal,
  Award,
  Trophy,
  ShoppingBag,
  ShoppingCart,
  // Shared
  type LucideProps,
  ScrollText,
  Star,
  Sun,
  Moon,
  LogOut,
  Plus,
  Archive,
  SortDesc,
  SortAsc,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Custom SVG icons (no Lucide equivalent)
// ---------------------------------------------------------------------------

/** XP lightning bolt — brand icon for XP currency, demand filters, strict tone */
const XpBolt = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    {...props}
  >
    <path
      d="M9.5 2L4 9h4.5L6.5 14 13 7H8.5L9.5 2Z"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth="0.5"
      strokeLinejoin="round"
    />
  </svg>
);

/** GitHub octocat mark */
const GithubMark = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
  </svg>
);

/** Decorative four-pointed star — used for "Recommended" label */
const SparkDot = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    {...props}
  >
    <path d="M8 1l1.5 5.5L15 8l-5.5 1.5L8 15l-1.5-5.5L1 8l5.5-1.5L8 1z" />
  </svg>
);

/** Sad face — failed test result */
const FaceSad = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M16 16s-1.5-2-4-2-4 2-4 2" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
  </svg>
);

/** Happy face — mood selector */
const FaceHappy = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13s1.5 2.5 4 2.5 4-2.5 4-2.5" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
  </svg>
);

/** Neutral face — mood selector */
const FaceNeutral = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
  </svg>
);

/** Nervous face — mood selector */
const FaceNervous = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8.5 15c.5-1 1.5-1.5 2-1s1.5 1.5 2 1 1.5-1.5 2-1" />
    <line x1="9" y1="9" x2="9.01" y2="9" strokeWidth="2.5" />
    <line x1="15" y1="9" x2="15.01" y2="9" strokeWidth="2.5" />
    <path d="M10 7c0-1 .5-1.5 1-1.5" strokeWidth="1" />
    <path d="M14 7c0-1-.5-1.5-1-1.5" strokeWidth="1" />
  </svg>
);

/** Frustrated face — mood selector */
const FaceFrustrated = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 15s1.5-1.5 4-1.5 4 1.5 4 1.5" />
    <path d="M8 8.5l2.5 1M16 8.5l-2.5 1" />
  </svg>
);

/** Confident face — mood selector */
const FaceConfident = ({ size, ...props }: CustomIconProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="12" cy="12" r="10" />
    <path d="M8 13.5s1.5 2 4 2 4-2 4-2" />
    <path d="M9 8.5c0 .83.67 1.5 1.5 1.5S12 9.33 12 8.5" />
    <path d="M12 8.5c0 .83.67 1.5 1.5 1.5S15 9.33 15 8.5" />
  </svg>
);

// ---------------------------------------------------------------------------
// Icon registry
// ---------------------------------------------------------------------------

type LucideComponent = React.ComponentType<LucideProps>;
type CustomIconComponent = React.ComponentType<CustomIconProps>;
type IconComponent = LucideComponent | CustomIconComponent;

interface CustomIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

/**
 * Complete icon name → component mapping.
 * Grouped by domain to match the design system spec.
 */
const ICON_MAP = {
  // --- XP & Gamification ---
  xp:               XpBolt,
  "badge-gold":     Medal,
  "badge-silver":   Medal,
  "badge-bronze":   Medal,
  badge:            Award,
  trophy:           Trophy,
  "xp-spend":       ShoppingBag,
  store:            ShoppingCart,

  // --- Challenges & Quests ---
  quest:                Swords,
  "challenge-daily":    Sunrise,
  "challenge-weekly":   CalendarDays,
  "challenge-streak":   Flame,
  "challenge-milestone":Mountain,
  "challenge-skill":    Microscope,
  "challenge-social":   Handshake,
  map:                  Map,

  // --- Skill Categories ---
  "cat-frontend":  Monitor,
  "cat-backend":   Settings2,
  "cat-data":      BarChart2,
  "cat-cloud":     Cloud,
  "cat-mobile":    Smartphone,
  "cat-default":   Target,

  // --- Skills Library Filters ---
  "filter-hot":         Flame,
  "filter-high-demand": XpBolt,
  "filter-growing":     TrendingUp,
  "filter-specialized": Puzzle,

  // --- Status & Feedback ---
  warning:              AlertTriangle,
  success:              CheckCircle2,
  check:                Check,
  close:                X,
  flag:                 Flag,
  blocked:              Ban,
  "job-type-part-time": Clock,
  timer:                Timer,
  pending:              Hourglass,
  locked:               Lock,
  "result-fail":        FaceSad,
  recommended:          SparkDot,

  // --- Mock Interview ---
  interview:              Mic,
  "interviewer-unknown":  Drama,
  "interviewer-neutral":  Target,
  "interviewer-strict":   XpBolt,
  "interviewer-friendly": Handshake,
  "question-technical":   Settings2,
  "question-personal":    UserRound,
  "mood-happy":           FaceHappy,
  "mood-neutral":         FaceNeutral,
  "mood-nervous":         FaceNervous,
  "mood-frustrated":      FaceFrustrated,
  "mood-confident":       FaceConfident,
  camera:                 Camera,

  // --- Jobs & Employment ---
  "job-type-full-time": Building2,
  "job-type-contract":  ClipboardList,
  "job-type-remote":    Globe2,
  location:             MapPin,
  salary:               Banknote,
  work:                 Briefcase,
  apply:                Rocket,
  "add-job":            Plus,
  archive:              Archive,
  "sort-desc":          SortDesc,
  "sort-asc":           SortAsc,

  // --- Profile Sections ---
  about:      MessageSquare,
  contact:    Phone,
  links:      Link2,
  portfolio:  Globe,
  github:     GithubMark,
  education:  GraduationCap,
  account:    ShieldCheck,
  edit:       Pencil,
  delete:     Trash2,
  password:   KeyRound,
  complete:   CheckCircle2,
  target:     Target,
  error:      AlertTriangle,
  medal:      Medal,
  lock:       Lock,
  briefcase:  Briefcase,
  certificate: ScrollText,
  rocket:     Rocket,
  star:       Star,
  profile:    UserRound,
  skills:     Target,
  challenges: Trophy,
  logout:     LogOut,

  // --- Dashboard & Navigation ---
  "market-intel": Radio,
  activity:       History,
  clipboard:      ClipboardList,
  readiness:      TrendingUp,
  sun: Sun,
  moon: Moon,

  // --- Collection & Store ---
  collection: Luggage,
  search:     Search,
  answers:    PenLine,
  date:       CalendarDays,
} as const satisfies Record<string, IconComponent>;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type IconName = keyof typeof ICON_MAP;

export interface IconProps {
  /** Icon identifier — must be a valid key from the icon registry */
  name: IconName;
  /** Width and height in px. Default: 16 */
  size?: number;
  /** Additional CSS classes */
  className?: string;
  /** Accessible label. Defaults to the icon name. Pass "" to mark as decorative. */
  label?: string;
  /** Stroke width, applied to Lucide icons only. Default: 1.5 */
  strokeWidth?: number;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Custom SVG components are identified by a non-Lucide signature */
const CUSTOM_ICONS = new Set<IconComponent>([
  XpBolt,
  GithubMark,
  SparkDot,
  FaceSad,
  FaceHappy,
  FaceNeutral,
  FaceNervous,
  FaceFrustrated,
  FaceConfident,
]);

function isCustomIcon(
  component: IconComponent
): component is CustomIconComponent {
  return CUSTOM_ICONS.has(component);
}

// ---------------------------------------------------------------------------
// Icon component
// ---------------------------------------------------------------------------

/**
 * XPand Icon component.
 *
 * @example
 * // Basic usage
 * <Icon name="work" />
 *
 * @example
 * // With size and class
 * <Icon name="xp" size={20} className="icon-gold" />
 *
 * @example
 * // Decorative (no aria-label)
 * <Icon name="close" label="" />
 *
 * @example
 * // Explicit accessible label
 * <Icon name="warning" label="Form has errors" />
 */
export const Icon = React.memo(function Icon({
  name,
  size = 16,
  className,
  label,
  strokeWidth = 1.5,
  style,
}: IconProps) {
  const Component = ICON_MAP[name] as IconComponent;

  // Determine aria props
  const ariaLabel = label === "" ? undefined : (label ?? name);
  const ariaHidden = label === "" ? true : undefined;
  const role = label === "" ? undefined : "img";

  if (isCustomIcon(Component)) {
    return (
      <Component
        size={size}
        className={className}
        style={style}
        aria-label={ariaLabel}
        aria-hidden={ariaHidden}
        role={role}
      />
    );
  }

  const LucideComponent = Component as LucideComponent;

  return (
    <LucideComponent
      size={size}
      className={className}
      style={style}
      strokeWidth={strokeWidth}
      aria-label={ariaLabel}
      aria-hidden={ariaHidden}
      role={role}
    />
  );
});

Icon.displayName = "Icon";

export default Icon;