// Use the package's direct ESM entry to bypass the Vite alias that maps
// "lucide-react" → this shim. Going through "lucide-react" here would
// recurse infinitely (or, with the old customResolver workaround, defeat
// Vite 8's dependency optimizer so brand icons fail at runtime).
export * from "lucide-react/dist/esm/lucide-react.mjs";

// Brand icons that were removed from lucide-react for trademark reasons —
// re-add them so existing call sites keep working.
export { default as Facebook } from "./icons/facebook";
export { default as Instagram } from "./icons/instagram";
export { default as Linkedin } from "./icons/linkedin";
export { default as Twitter } from "./icons/twitter";
export { default as Youtube } from "./icons/youtube";
