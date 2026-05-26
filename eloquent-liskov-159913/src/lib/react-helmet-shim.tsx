// React 19 native-hoisting shim for `react-helmet-async`.
//
// react-helmet-async manipulates <head> directly; React 19 also hoists
// <title>/<meta>/<link>/<script> from any subtree into <head>. The two
// fight, producing `NotFoundError: removeChild — The object can not be
// found here` on commit (most often during route transitions and
// AnimatePresence unmounts). Aliased in vite.config.ts so existing
// `from "react-helmet-async"` imports resolve here unchanged.
import * as React from "react";

type Props = { children?: React.ReactNode };

export const HelmetProvider: React.FC<Props> = ({ children }) => <>{children}</>;
export const Helmet: React.FC<Props> = ({ children }) => <>{children}</>;

export default { Helmet, HelmetProvider };
