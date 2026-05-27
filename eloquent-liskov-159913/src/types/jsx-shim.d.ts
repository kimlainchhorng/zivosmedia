// Compatibility shim for class components from libraries (recharts,
// react-helmet-async, @react-google-maps/api) typed against an older
// @types/react that mismatches the project's React 18.3.x JSX.ElementClass.
import type * as React from "react";

type AnyClassComponent = React.Component<any, any, any> & Record<string, any>;

declare global {
  namespace JSX {
    interface ElementClass extends AnyClassComponent {}
    interface IntrinsicAttributes {
      [key: string]: any;
    }
    interface IntrinsicClassAttributes<T> {
      [key: string]: any;
    }
  }
}

declare module "react" {
  namespace JSX {
    interface ElementClass extends AnyClassComponent {}
    interface IntrinsicAttributes {
      [key: string]: any;
    }
    interface IntrinsicClassAttributes<T> {
      [key: string]: any;
    }
  }
}

export {};
