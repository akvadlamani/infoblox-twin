// Two fixed gradient overlays — a small one beneath the tab nav and a taller one
// above the narrator. Content scrolling under them fades into the page color
// before it ever reaches the chrome, so nothing overlaps visually.

export function ScrollFades() {
  return (
    <>
      {/* Top fade — under the tab nav, fading scrolled content into page */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-20"
        style={{
          top: 96, // below the tab nav baseline (~58 + 32)
          height: 14,
          background:
            'linear-gradient(to bottom, rgba(10,10,15,0.95), rgba(10,10,15,0.6) 60%, rgba(10,10,15,0))',
        }}
      />
      {/* Bottom fade — above the narrator strip */}
      <div
        className="pointer-events-none fixed left-0 right-0 z-20"
        style={{
          bottom: 56, // just above the narrator strip
          height: 28,
          background:
            'linear-gradient(to top, rgba(10,10,15,0.95), rgba(10,10,15,0.5) 60%, rgba(10,10,15,0))',
        }}
      />
    </>
  );
}
