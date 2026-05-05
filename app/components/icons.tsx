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

export function YoutubeIcon(): ReactElement {
  // Logo simplificado de YouTube: rectángulo relleno con un triángulo recortado
  // (fill-rule="evenodd" hace que el path interno sea un hueco real, así el
  // triángulo siempre muestra el color del botón detrás — funciona en hover).
  return (
    <svg {...baseProps} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M5.5 6h13a3 3 0 0 1 3 3v6a3 3 0 0 1-3 3h-13a3 3 0 0 1-3-3V9a3 3 0 0 1 3-3zm4.5 3.5v5l5-2.5-5-2.5z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function PlaylistIcon(): ReactElement {
  // Lista con líneas y un check.
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M4 7h11M4 12h11M4 17h7" />
      <path d="M16 16l2 2 4-4" />
    </svg>
  );
}

export function ShareIcon(): ReactElement {
  // Tres nodos conectados.
  return (
    <svg {...baseProps} aria-hidden="true">
      <circle cx="6" cy="12" r="2.5" />
      <circle cx="18" cy="6" r="2.5" />
      <circle cx="18" cy="18" r="2.5" />
      <path d="M8 11l8-4M8 13l8 4" />
    </svg>
  );
}

export function MinusIcon(): ReactElement {
  // Signo menos en círculo.
  return (
    <svg {...baseProps} aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8" />
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

export function DragHandleIcon(): ReactElement {
  // Hamburguesa de 3 líneas (handle para arrastrar y reordenar).
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  );
}

export function DownloadIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M12 4v12" />
      <path d="M7 11l5 5 5-5" />
      <path d="M5 20h14" />
    </svg>
  );
}

export function MusicIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M9 18V6l10-2v10" />
      <circle cx="7" cy="18" r="2" />
      <circle cx="17" cy="14" r="2" />
    </svg>
  );
}

export function TrashIcon(): ReactElement {
  return (
    <svg {...baseProps} aria-hidden="true">
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="M6 7l1 13h10l1-13" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}
