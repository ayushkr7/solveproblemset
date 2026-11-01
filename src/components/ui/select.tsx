"use client";

/**
 * shadcn/ui Select on Base UI: a button (role="combobox") that opens a listbox.
 * Keyboard: Enter/Space/arrows open it, arrows and type-ahead move, Enter
 * selects, Escape closes and returns focus. The popup lines the selected item
 * up with the trigger, like a native select. Styled by `.select-*` in globals.css.
 *
 * The popup is portalled into the trigger's own landmark (its dialog, or
 * <main>) rather than <body>, so its content is never outside a landmark and
 * it stays interactive while a modal dialog makes the rest of the page inert.
 */
import { Select as SelectPrimitive } from "@base-ui/react/select";
import {
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/Icons";
import { cn } from "@/lib/utils";

type WithClass<T> = Omit<T, "className"> & { className?: string };

const TriggerContext = createContext<RefObject<HTMLButtonElement | null> | null>(null);

function Select<Value>(props: ComponentProps<typeof SelectPrimitive.Root<Value>>) {
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <TriggerContext.Provider value={trigger}>
      <SelectPrimitive.Root data-slot="select" {...props} />
    </TriggerContext.Provider>
  );
}

function SelectLabel({ className, ...props }: WithClass<ComponentProps<typeof SelectPrimitive.Label>>) {
  return <SelectPrimitive.Label data-slot="select-label" className={className} {...props} />;
}

function SelectTrigger({
  className,
  children,
  ref,
  ...props
}: WithClass<ComponentProps<typeof SelectPrimitive.Trigger>> & { ref?: React.Ref<HTMLButtonElement> }) {
  const own = useContext(TriggerContext);
  const setRef = (el: HTMLButtonElement | null) => {
    if (own) own.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };
  return (
    <SelectPrimitive.Trigger ref={setRef} data-slot="select-trigger" className={cn("select-trigger", className)} {...props}>
      {children ?? <SelectPrimitive.Value data-slot="select-value" className="select-trigger__value" />}
      <SelectPrimitive.Icon data-slot="select-icon" className="select-trigger__icon">
        <ChevronDownIcon />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({ className, children, ...props }: WithClass<ComponentProps<typeof SelectPrimitive.Popup>>) {
  const trigger = useContext(TriggerContext);
  const [container, setContainer] = useState<HTMLElement | null>(null);
  useLayoutEffect(() => {
    const el = trigger?.current;
    setContainer(el?.closest<HTMLElement>('[role="dialog"], [role="alertdialog"], main') ?? null);
  }, [trigger]);
  return (
    <SelectPrimitive.Portal container={container ?? undefined}>
      <SelectPrimitive.Positioner
        data-slot="select-positioner"
        className="select-positioner"
        positionMethod="fixed"
        sideOffset={4}
      >
        <SelectPrimitive.Popup data-slot="select-content" className={cn("select-popup", className)} {...props}>
          <SelectPrimitive.List className="select-list">{children}</SelectPrimitive.List>
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }: WithClass<ComponentProps<typeof SelectPrimitive.Item>> & { children: ReactNode }) {
  return (
    <SelectPrimitive.Item data-slot="select-item" className={cn("select-item", className)} {...props}>
      <SelectPrimitive.ItemIndicator className="select-item__indicator" keepMounted>
        <CheckIcon />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText className="select-item__text">{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectContent, SelectItem, SelectLabel, SelectTrigger };
