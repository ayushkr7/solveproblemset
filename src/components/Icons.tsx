import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function Icon({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="square"
      strokeLinejoin="miter"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const PlayIcon = (p: IconProps) => <Icon {...p}><path d="M7 4.5v15l12-7.5z" /></Icon>;
export const PauseIcon = (p: IconProps) => <Icon {...p}><path d="M8 5v14M16 5v14" /></Icon>;
export const StopIcon = (p: IconProps) => <Icon {...p}><rect x="6" y="6" width="12" height="12" /></Icon>;
export const RestartIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" /></Icon>
);
export const SunIcon = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
  </Icon>
);
export const MoonIcon = (p: IconProps) => <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z" /></Icon>;
export const PlusIcon = (p: IconProps) => <Icon {...p}><path d="M12 5v14M5 12h14" /></Icon>;
export const MinusIcon = (p: IconProps) => <Icon {...p}><path d="M5 12h14" /></Icon>;
export const TrashIcon = (p: IconProps) => (
  <Icon {...p}><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5" /></Icon>
);
export const ArrowRightIcon = (p: IconProps) => <Icon {...p}><path d="M4 12h15M13 6l6 6-6 6" /></Icon>;
export const ArrowLeftIcon = (p: IconProps) => <Icon {...p}><path d="M20 12H5M11 6l-6 6 6 6" /></Icon>;
export const ExternalIcon = (p: IconProps) => <Icon {...p}><path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" /></Icon>;
export const AlertIcon = (p: IconProps) => (
  <Icon {...p}><path d="M12 3 2 20h20zM12 10v4M12 17v.5" /></Icon>
);
export const InfoIcon = (p: IconProps) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 11v6M12 7.5V8" /></Icon>
);
export const CheckIcon = (p: IconProps) => <Icon {...p}><path d="m5 12.5 4.5 4.5L19 7.5" /></Icon>;
export const CloseIcon = (p: IconProps) => <Icon {...p}><path d="M6 6l12 12M18 6 6 18" /></Icon>;
export const PencilIcon = (p: IconProps) => <Icon {...p}><path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" /></Icon>;
