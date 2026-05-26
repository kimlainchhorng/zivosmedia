import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      position="top-center"
      visibleToasts={3}
      gap={8}
      offset="calc(var(--zivo-safe-top,0px) + 14px)"
      style={
        {
          zIndex: 99999,
          "--width": "340px",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:rounded-2xl group-[.toaster]:bg-zinc-950/90 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-white group-[.toaster]:border group-[.toaster]:border-white/10 group-[.toaster]:shadow-[0_14px_40px_rgba(0,0,0,0.45)] group-[.toaster]:px-3.5 group-[.toaster]:py-2.5 group-[.toaster]:gap-2",
          title: "group-[.toast]:text-[13px] group-[.toast]:text-white group-[.toast]:font-medium group-[.toast]:leading-tight",
          description: "group-[.toast]:text-[12px] group-[.toast]:text-white/70",
          actionButton:
            "group-[.toast]:!bg-emerald-500 group-[.toast]:!text-zinc-950 group-[.toast]:!rounded-full group-[.toast]:!px-3 group-[.toast]:!py-1 group-[.toast]:!text-[11px] group-[.toast]:!font-semibold group-[.toast]:!h-auto hover:group-[.toast]:!bg-emerald-400",
          cancelButton:
            "group-[.toast]:!bg-white/10 group-[.toast]:!text-white/80 group-[.toast]:!rounded-full group-[.toast]:!px-3 group-[.toast]:!py-1 group-[.toast]:!text-[11px] group-[.toast]:!h-auto",
          success: "group-[.toaster]:!text-emerald-400",
          error: "group-[.toaster]:!text-rose-400",
          warning: "group-[.toaster]:!text-amber-400",
          info: "group-[.toaster]:!text-sky-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
