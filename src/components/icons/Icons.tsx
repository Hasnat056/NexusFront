import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base: IconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

export function IconGrid(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.2" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.2" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.2" />
    </svg>
  );
}

export function IconPerson(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.8-4 3.6-6.2 7.5-6.2s6.7 2.2 7.5 6.2" />
    </svg>
  );
}

export function IconPeople(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="8.5" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.4" />
      <path d="M2.5 20c.7-3.4 3-5.2 6-5.2s5.4 1.9 6 5.2" />
      <path d="M14.7 15c2.4.2 4 1.8 4.6 4.4" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M4 5.5c2-1 5-1 8 0v13c-3-1-6-1-8 0Z" />
      <path d="M20 5.5c-2-1-5-1-8 0v13c3-1 6-1 8 0Z" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
      <line x1="3.5" y1="10" x2="20.5" y2="10" />
    </svg>
  );
}

export function IconBuilding(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5" y="3.5" width="14" height="17" rx="1.2" />
      <rect x="8.3" y="7" width="2.4" height="2.4" />
      <rect x="13.3" y="7" width="2.4" height="2.4" />
      <rect x="8.3" y="12" width="2.4" height="2.4" />
      <rect x="13.3" y="12" width="2.4" height="2.4" />
      <path d="M10 20.5v-3.5h4v3.5" />
    </svg>
  );
}

export function IconLayers(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 3.5 21 8l-9 4.5L3 8Z" />
      <path d="M3 13l9 4.5 9-4.5" />
      <path d="M3 17.5 12 22l9-4.5" />
    </svg>
  );
}

export function IconGraduationCap(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 9 12 4.5 21.5 9 12 13.5Z" />
      <path d="M6.5 11.2v5c0 1.5 2.5 2.8 5.5 2.8s5.5-1.3 5.5-2.8v-5" />
      <path d="M21.5 9v6" />
    </svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="5.5" y="4.5" width="13" height="17" rx="1.6" />
      <rect x="9" y="3" width="6" height="3" rx="1" />
      <line x1="8.5" y1="11" x2="15.5" y2="11" />
      <line x1="8.5" y1="14.5" x2="15.5" y2="14.5" />
      <line x1="8.5" y1="18" x2="12.5" y2="18" />
    </svg>
  );
}

export function IconUserCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="9.5" cy="8" r="3.6" />
      <path d="M2.5 20c.8-4 3.6-6.2 7-6.2" />
      <path d="M15 16.5l2.4 2.4L21.5 14" />
    </svg>
  );
}

export function IconInbox(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 12.5h5l1.5 2.5h4l1.5-2.5h5" />
      <path d="M5.5 5.5h13l2 7v6a1.6 1.6 0 0 1-1.6 1.6H5.1A1.6 1.6 0 0 1 3.5 18.5v-6Z" />
    </svg>
  );
}

export function IconHourglass(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3h12" />
      <path d="M6 21h12" />
      <path d="M7 3c0 4.5 3 6.5 5 8.5C10 13.5 7 15.5 7 21" />
      <path d="M17 3c0 4.5-3 6.5-5 8.5c2 2 5 4 5 9.5" />
    </svg>
  );
}

export function IconScroll(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 3.5h11a2 2 0 0 1 2 2V17a2.5 2.5 0 0 1-2.5 2.5H8" />
      <path d="M6 3.5A2.5 2.5 0 0 0 3.5 6v12A2.5 2.5 0 0 0 6 20.5" />
      <line x1="8" y1="8" x2="15" y2="8" />
      <line x1="8" y1="12" x2="15" y2="12" />
    </svg>
  );
}

export function IconBars(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <line x1="6" y1="18" x2="6" y2="13" />
      <line x1="12" y1="18" x2="12" y2="8" />
      <line x1="18" y1="18" x2="18" y2="4" />
    </svg>
  );
}

export function IconTerminal(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9.5 10.5 12 7 14.5" />
      <line x1="12.5" y1="14.5" x2="17" y2="14.5" />
    </svg>
  );
}

export function IconEye(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </svg>
  );
}

export function IconEyeOff(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3.5 3.5l17 17" />
      <path d="M10.6 5.7A10.6 10.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a15.2 15.2 0 0 1-3.6 4.3M7.4 7.2A15.6 15.6 0 0 0 2.5 12S6 18.5 12 18.5a10.3 10.3 0 0 0 4.4-.98" />
      <path d="M9.9 10.1a2.8 2.8 0 0 0 3.9 3.9" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M10 20.5H5.5a1.5 1.5 0 0 1-1.5-1.5V5a1.5 1.5 0 0 1 1.5-1.5H10" />
      <path d="M15.5 16.5 20 12l-4.5-4.5" />
      <line x1="20" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function IconUpload(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M12 15.5V4" />
      <path d="M7.5 8.5 12 4l4.5 4.5" />
      <path d="M4 15.5V19a1.6 1.6 0 0 0 1.6 1.6h12.8A1.6 1.6 0 0 0 20 19v-3.5" />
    </svg>
  );
}

export function IconHome(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...base} {...props}>
      <path d="M5 13l4 4L19 7" />
    </svg>
  );
}
