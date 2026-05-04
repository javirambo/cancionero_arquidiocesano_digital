import type { ReactElement } from "react";

const baseProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

export function ChordsIcon(): ReactElement {
  // Nota musical (con cabeza y mástil).
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M9 18V6l10-2v10" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="14" r="2" />
    </svg>
  );
}

export function PlayIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M10 8.5v7l6-3.5z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FilesIcon(): ReactElement {
  // Hoja con líneas (representa partitura/archivo).
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M7 3h7l4 4v14H7z" />
      <path d="M14 3v4h4" />
      <path d="M9 13h6M9 17h6" />
    </svg>
  );
}

export function HeartIcon({ filled = false }: { filled?: boolean }): ReactElement {
  return (
    <svg
      {...baseProps}
      aria-hidden="true"
      fill={filled ? "currentColor" : "none"}
    >
      <path d="M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z" />
    </svg>
  );
}

export function MoreIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function SearchIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true" width={20} height={20}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  );
}

export function UserIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true" width={20} height={20}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c1.5-3.5 4.2-5 7-5s5.5 1.5 7 5" />
    </svg>
  );
}

export function CloseIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

export function ChevronRightIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export function EditIcon(): ReactElement {
  // Lápiz (edición).
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M4 20h4l10-10-4-4L4 16v4z" />
      <path d="M14 6l4 4" />
    </svg>
  );
}

export function HelpIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true" width={16} height={16}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .8-1 1.7" />
      <path d="M12 17h.01" />
    </svg>
  );
}
