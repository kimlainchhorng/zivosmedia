import * as React from "react";

import { cn } from "@/lib/utils";

type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  "checked" | "defaultChecked" | "onChange"
> & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
};

const SwitchInner = React.forwardRef<HTMLButtonElement, SwitchProps>(
  (
    {
      className,
      checked,
      defaultChecked = false,
      disabled,
      onCheckedChange,
      onClick,
      ...props
    },
    ref,
  ) => {
    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = React.useState(Boolean(defaultChecked));
    const currentChecked = isControlled ? Boolean(checked) : internalChecked;
    const state = currentChecked ? "checked" : "unchecked";

    const setChecked = React.useCallback(
      (next: boolean) => {
        if (!isControlled) setInternalChecked(next);
        onCheckedChange?.(next);
      },
      [isControlled, onCheckedChange],
    );

    return (
      <button
        type="button"
        role="switch"
        aria-checked={currentChecked}
        data-state={state}
        disabled={disabled}
        className={cn(
          "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || disabled) return;
          setChecked(!currentChecked);
        }}
        ref={ref}
        {...props}
      >
        <span
          data-state={state}
          className="pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        />
      </button>
    );
  },
);
SwitchInner.displayName = "Switch";

const Switch = React.memo(SwitchInner);

export { Switch };
