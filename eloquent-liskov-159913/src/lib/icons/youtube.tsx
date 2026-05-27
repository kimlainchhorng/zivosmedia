import * as React from "react";

const Youtube = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement>>(
  ({ color = "currentColor", fill = "none", stroke = "none", ...props }, ref) => (
    <svg ref={ref} viewBox="0 0 24 24" fill={fill} stroke={stroke} {...props}>
      <path
        fill={color}
        d="M23.499 6.203a3.006 3.006 0 0 0-2.117-2.128C19.505 3.57 12 3.57 12 3.57s-7.505 0-9.382.505A3.006 3.006 0 0 0 .501 6.203C0 8.09 0 12.025 0 12.025s0 3.935.501 5.822a3.006 3.006 0 0 0 2.117 2.128c1.877.505 9.382.505 9.382.505s7.505 0 9.382-.505a3.006 3.006 0 0 0 2.117-2.128C24 15.96 24 12.025 24 12.025s0-3.935-.501-5.822ZM9.545 15.59V8.46l6.273 3.565-6.273 3.565Z"
      />
    </svg>
  ),
);

Youtube.displayName = "Youtube";

export default Youtube;
