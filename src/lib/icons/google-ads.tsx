import * as React from "react";

const GoogleAds = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  (props, ref) => (
    <svg ref={ref} viewBox="0 0 48 48" fill="none" {...props}>
      <path
        d="M19.3 6.5a7.1 7.1 0 0 1 9.8 2.6l13 22.5a7.1 7.1 0 0 1-12.3 7.1l-13-22.4a7.1 7.1 0 0 1 2.5-9.8Z"
        fill="#34A853"
      />
      <path
        d="M28.8 9.1a7.1 7.1 0 0 0-12.3-7.1L3.8 24a7.1 7.1 0 1 0 12.3 7.1L28.8 9.1Z"
        fill="#4285F4"
        transform="translate(5.7 2.8)"
      />
      <circle cx="12.2" cy="35.6" r="7.1" fill="#FBBC04" />
    </svg>
  ),
);

GoogleAds.displayName = "GoogleAds";

export default GoogleAds;
