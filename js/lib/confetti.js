// Confetti: één keer per bezoek bij binnenkomst, en als iemand een cadeau kiest.
// Slaat over als iemand "minder beweging" heeft ingesteld.

const COLORS = ["#e4570f", "#e8b53a", "#1e3b2f", "#7fb69a", "#f2a37a"];

export function confetti({ pieces = 140, duration = 3200 } = {}) {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const canvas = document.createElement("canvas");
  canvas.className = "confetti";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const resize = () => {
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  addEventListener("resize", resize);

  const parts = Array.from({ length: pieces }, () => ({
    x: Math.random() * innerWidth,
    y: -20 - Math.random() * innerHeight * 0.6,
    size: 5 + Math.random() * 5,
    speed: 2 + Math.random() * 3,
    sway: Math.random() * Math.PI * 2,
    spin: Math.random() * 0.2 - 0.1,
    angle: Math.random() * Math.PI,
    color: COLORS[(Math.random() * COLORS.length) | 0]
  }));

  const start = performance.now();
  const frame = (now) => {
    const elapsed = now - start;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    ctx.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - duration + 600) / 600);
    for (const p of parts) {
      p.y += p.speed;
      p.sway += 0.03;
      p.x += Math.sin(p.sway) * 0.8;
      p.angle += p.spin;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
      ctx.restore();
    }
    if (elapsed < duration) requestAnimationFrame(frame);
    else { removeEventListener("resize", resize); canvas.remove(); }
  };
  requestAnimationFrame(frame);
}

/** Alleen de eerste keer in deze browsersessie. */
export function confettiOncePerVisit() {
  try {
    if (sessionStorage.getItem("confetti-shown")) return;
    sessionStorage.setItem("confetti-shown", "1");
  } catch { /* opslag geblokkeerd: dan gewoon tonen */ }
  confetti();
}
