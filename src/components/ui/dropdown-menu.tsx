"use client";

/**
 * shadcn/ui DropdownMenu on Base UI: a button that opens a list of actions.
 * Keyboard: Enter/Space/ArrowDown open it, arrows and type-ahead move, Enter
 * activates an item, Escape closes it; focus returns to the trigger. Styled
 * by `.menu-*` in globals.css.
 *
 * Like Select, the popup is portalled into the trigger's own landmark (its
 * dialog, or <main>) rather than <body>, so its content is never outside a
 * landmark and it stays interactive inside a modal dialog.
 */
import { Menu as MenuPrimitive } from "@base-ui/react/menu";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";

type WithClass<T> = Omit<T, "className"> & { className?: string };

const TriggerContext = createContext<RefObject<HTMLButtonElement | null> | null>(null);

function DropdownMenu(props: ComponentProps<typeof MenuPrimitive.Root>) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <TriggerContext.Provider value={trigger}>
      <MenuPrimitive.Root {...props} />
    </TriggerContext.Provider>
  );
}

function DropdownMenuTrigger({
  className,
  ref,
  ...props
}: WithClass<ComponentProps<typeof MenuPrimitive.Trigger>> & { ref?: React.Ref<HTMLButtonElement> }) {
  const own = useContext(TriggerContext);
  const setRef = (el: HTMLButtonElement | null) => {
    if (own) own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };
  return <MenuPrimitive.Trigger ref={setRef} data-slot="dropdown-menu-trigger" className={className} {...props} />;
}

function DropdownMenuContent({
  className,
  align = "start",
  children,
  ...props
}: WithClass<ComponentProps<typeof MenuPrimitive.Popup>> & { align?: "start" | "center" | "end" }) {
  const trigger = useContext(TriggerContext);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = trigger?.current;
    setContainer(el?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], main') ?? null);
  }, [trigger]);
  return (
    <MenuPrimitive.Portal container={container ?? undefined}>
      <MenuPrimitive.Positioner
        data-slot="dropdown-menu-positioner"
        className="menu-positioner"
        positionMethod="fixed"
        align={align}
        sideOffset={4}
      >
        <MenuPrimitive.Popup data-slot="dropdown-menu-content" className={cn("menu-popup", className)} {...props}>
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  );
}

function DropdownMenuItem({ className, ...props }: WithClass<ComponentProps<typeof MenuPrimitive.Item>>) {
  return <MenuPrimitive.Item data-slot="dropdown-menu-item" className={cn("menu-item", className)} {...props} />;
}

export { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger };
