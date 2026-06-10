/**
 * Drop-in replacement for @radix-ui/react-compose-refs (aliased in vite config).
 *
 * Radix's PopperAnchor sets state inside its callback ref (onAnchorChange ->
 * setAnchor). Under React 19.2 a callback ref whose identity changes between
 * renders is re-invoked on every commit, so that setState re-fires every
 * render -> "Maximum update depth exceeded". This loops across every
 * popper-based control (Select, Popover, DropdownMenu, Tooltip) and is what
 * white-screens pages like /more and the embedded Build R.O. sections.
 *
 * Fix: useComposedRefs returns a STABLE-identity callback ref (empty deps) that
 * reads the latest refs from a ref-box. React then only invokes it on
 * mount/unmount — never on re-render — which breaks the loop while still
 * forwarding the node to every ref. composeRefs (the non-hook variant) keeps
 * Radix's exact original behavior for the rare inline-composition call sites.
 */
import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, value: T) {
  if (typeof ref === "function") return (ref as (v: T) => unknown)(value);
  if (ref !== null && ref !== undefined) (ref as React.MutableRefObject<T>).current = value;
}

function composeRefs<T>(...refs: PossibleRef<T>[]) {
  return (node: T) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup === "function") hasCleanup = true;
      return cleanup;
    });
    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup === "function") (cleanup as () => void)();
          else setRef(refs[i], null as unknown as T);
        }
      };
    }
  };
}

function useComposedRefs<T>(...refs: PossibleRef<T>[]) {
  const refsRef = React.useRef(refs);
  refsRef.current = refs;
  return React.useCallback((node: T | null) => {
    for (const ref of refsRef.current) setRef(ref, node as T);
  }, []);
}

export { composeRefs, useComposedRefs, setRef };
