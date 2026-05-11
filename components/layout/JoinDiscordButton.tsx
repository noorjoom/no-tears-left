const FALLBACK_INVITE_URL = 'https://discord.gg/sQfF3r6NvZ';

export function JoinDiscordButton() {
  const url = process.env.NEXT_PUBLIC_DISCORD_INVITE_URL ?? FALLBACK_INVITE_URL;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Join our Discord"
      className="inline-flex items-center gap-1.5 rounded border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent hover:bg-accent/20"
    >
      <DiscordIcon className="h-4 w-4" />
      <span>Join Discord</span>
    </a>
  );
}

function DiscordIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.317 4.369A19.79 19.79 0 0 0 16.558 3a14.51 14.51 0 0 0-.643 1.318 18.27 18.27 0 0 0-5.487 0A12.51 12.51 0 0 0 9.785 3a19.74 19.74 0 0 0-3.762 1.369C2.69 9.41 1.798 14.32 2.241 19.16a19.94 19.94 0 0 0 5.95 3.014c.481-.66.91-1.36 1.276-2.094a12.94 12.94 0 0 1-2.012-.967c.169-.124.334-.253.493-.385a14.21 14.21 0 0 0 12.104 0c.16.132.325.261.493.385-.642.382-1.317.706-2.014.969.366.733.793 1.434 1.275 2.094a19.86 19.86 0 0 0 5.953-3.014c.52-5.604-.888-10.47-3.742-14.793zM8.02 16.275c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.094 2.156 2.42 0 1.334-.955 2.419-2.156 2.419zm7.974 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.42 2.157-2.42 1.21 0 2.176 1.094 2.156 2.42 0 1.334-.946 2.419-2.156 2.419z" />
    </svg>
  );
}
