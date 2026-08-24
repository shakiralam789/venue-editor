import React from "react";

type IconName =
  | "select"
  | "pan"
  | "wall"
  | "door"
  | "window"
  | "zone"
  | "aisle"
  | "measure"
  | "object"
  | "undo"
  | "redo"
  | "trash"
  | "copy"
  | "duplicate"
  | "lock"
  | "unlock"
  | "eye"
  | "eyeOff"
  | "grid"
  | "snap"
  | "fit"
  | "plus"
  | "minus"
  | "alignLeft"
  | "alignCenter"
  | "alignRight"
  | "alignTop"
  | "alignMiddle"
  | "alignBottom"
  | "front"
  | "back"
  | "forward"
  | "backward"
  | "save"
  | "retry"
  | "warn";

const PATHS: Record<IconName, React.ReactNode> = {
  select: <path d="M4 3l15 7-6 2-2 6-7-15z" />,
  pan: <path d="M4 10V6a1.5 1.5 0 013 0v3m0-1V5a1.5 1.5 0 013 0v4m0-1V6.5a1.5 1.5 0 013 0V12c0 3-2 6-5 6s-5-2-5-5v-1z" />,
  wall: <path d="M3 6h18M3 12h18M3 18h18M9 6v6M15 12v6M9 6V3" />,
  door: <path d="M6 21V4a1 1 0 011-1h6a1 1 0 011 1v17M14 11h6M20 9v4" />,
  window: <path d="M4 5h16v14H4zM4 12h16M12 5v14" />,
  zone: <path d="M4 4h16v16H4z" />,
  aisle: <path d="M8 3v18M16 3v18M12 3v18" />,
  measure: <path d="M3 17L17 3l4 4L7 21l-4-4zm3-3l2 2M9 11l2 2M13 7l2 2" />,
  object: <path d="M12 5v14M5 12h14" />,
  undo: <path d="M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-1" />,
  redo: <path d="M15 7l5 5-5 5M20 12H9a5 5 0 000 10h1" />,
  trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
  copy: <path d="M9 9h11v11H9zM4 15V4h11" />,
  duplicate: <path d="M9 9h11v11H9zM4 15V4h11M14 4v5h5" />,
  lock: <path d="M6 11h12v9H6zM9 11V8a3 3 0 016 0v3" />,
  unlock: <path d="M6 11h12v9H6zM9 11V8a3 3 0 015-2" />,
  eye: <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z" />,
  eyeOff: <path d="M3 3l18 18M10 5a10 10 0 0111 7 12 12 0 01-2 3M6 6a12 12 0 00-4 6s4 7 10 7a10 10 0 004-1" />,
  grid: <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />,
  snap: <path d="M4 4h6v6H4zM14 14h6v6h-6zM14 4v6M4 14v6" />,
  fit: <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  alignLeft: <path d="M4 4v16M8 8h10v8H8z" />,
  alignCenter: <path d="M12 4v16M7 8h10v8H7z" />,
  alignRight: <path d="M20 4v16M6 8h10v8H6z" />,
  alignTop: <path d="M4 4h16M8 8h8v10H8z" />,
  alignMiddle: <path d="M4 12h16M8 7h8v10H8z" />,
  alignBottom: <path d="M4 20h16M8 6h8v10H8z" />,
  front: <path d="M8 8h8v8H8zM4 4h6v4H4zM14 14h6v4h-6z" />,
  back: <path d="M4 4h16v16H4zM8 8h6v6H8z" />,
  forward: <path d="M9 9h6v6H9zM4 4h9v4H4z" />,
  backward: <path d="M9 9h6v6H9zM11 4h9v16h-9z" />,
  save: <path d="M5 3h12l4 4v14H5zM8 3v6h8V3M8 21v-7h8v7" />,
  retry: <path d="M21 12a9 9 0 11-3-6.7M21 4v5h-5" />,
  warn: <path d="M12 3l9 16H3zM12 10v4M12 17v.5" />
};

export function Icon({
  name,
  size = 18,
  className = ""
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}

export type { IconName };
