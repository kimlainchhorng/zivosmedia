type ChatDateSeparatorProps = {
  label: string;
};

export default function ChatDateSeparator({ label }: ChatDateSeparatorProps) {
  if (!label) return null;

  return (
    <div
      data-chat-date={label}
      className="flex justify-center px-2 py-3"
      role="separator"
      aria-label={label}
    >
      <span className="select-none rounded-full bg-black/35 px-3 py-1 text-[11px] font-bold leading-none text-white shadow-sm ring-1 ring-white/20 backdrop-blur-md dark:bg-white/15 dark:text-white">
        {label}
      </span>
    </div>
  );
}
