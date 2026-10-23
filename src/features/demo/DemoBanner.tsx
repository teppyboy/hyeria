export function DemoBanner() {
  return (
    <aside
      role="status"
      className="border-b border-primary/30 bg-primary/10 px-4 py-3 text-sm text-foreground"
    >
      <strong>Interactive demo.</strong> Actions are simulated, and changes reset when you reload.
    </aside>
  );
}
