export function SocialDivider() {
  return (
    <div className="my-5 flex items-center gap-3">
      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
      <span className="text-xs text-[var(--text-secondary)]">or</span>
      <div className="h-px flex-1 bg-[var(--border-subtle)]" />
    </div>
  );
}
