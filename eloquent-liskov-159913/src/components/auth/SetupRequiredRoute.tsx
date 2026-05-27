import type { ReactNode } from "react";

interface SetupRequiredRouteProps {
  children: ReactNode;
  className?: string;
  [key: string]: any;
}

export default function SetupRequiredRoute({ children }: SetupRequiredRouteProps) {
  return <>{children}</>;
}
