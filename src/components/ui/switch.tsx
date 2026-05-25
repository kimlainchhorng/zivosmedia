import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

// Wrapped in React.memo because Radix Switch internally calls
// `useComposedRefs(forwardedRef, (node) => setButton(node))`, where the second
// callback is a fresh function every render. Under React 19 that triggers the
// previous ref-callback with null on each parent re-render, which calls
// setButton(null) and queues another render — an infinite loop when the parent
// re-renders for unrelated reasons. Shallow-comparing props avoids re-running
// Radix's internals when nothing for Switch actually changed.
const SwitchInner = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors data-[state=checked]:bg-primary data-[state=unchecked]:bg-input focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0",
      )}
    />
  </SwitchPrimitives.Root>
));
SwitchInner.displayName = SwitchPrimitives.Root.displayName;

const Switch = React.memo(SwitchInner);

export { Switch };
