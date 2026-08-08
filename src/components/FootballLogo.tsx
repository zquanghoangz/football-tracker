export function FootballLogo({ className }: { className?: string }) {
  return (
    <img
      src="/football-logo.png"
      alt="Football"
      className={`rounded-full object-cover ${className ?? ''}`}
    />
  );
}
