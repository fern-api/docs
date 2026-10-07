// Grid frame, rail-dot hover ornaments and animated gutter patterns ported
// from the marketing site (marketing-site/src/components/site-frame.tsx,
// alignment-grid-impl.tsx, pattern-mode-toggle.tsx).
declare const React: any;
const { useEffect, useRef, useState } = React;

type PatternShape = "trail" | "dot" | "line" | "fern";

const PATTERN_PROFILES: Record<
  PatternShape,
  { cellSize: number; wind: number; mouseRadius: number; lineWidth: number }
> = {
  trail: { cellSize: 10, wind: 2, mouseRadius: 80, lineWidth: 0.5 },
  dot: { cellSize: 10, wind: 2, mouseRadius: 80, lineWidth: 0.5 },
  line: { cellSize: 13, wind: 3, mouseRadius: 320, lineWidth: 0.5 },
  fern: { cellSize: 14, wind: 1.8, mouseRadius: 200, lineWidth: 0.6 },
};

const GLOBAL_T0 = typeof performance !== "undefined" ? performance.now() : 0;

const FERN_TILE = 6;
const FERN_WIND_SCALE = 0.45;
const FERN_WIND_DIR = -Math.PI / 4;
const FERN_ANGLES: number[][] = [
  [0.0, 0.5204, 1.0456, 1.5708, -1.0456, -0.5252],
  [0.5204, 1.0456, 1.5708, -1.0456, -0.5252, 0.0],
  [1.0456, 1.5708, -1.0456, -0.5252, 0.0, 0.5204],
  [1.5708, -1.0456, -0.5252, 0.0, 0.5204, 1.0456],
  [-1.0456, -0.5252, 0.0, 0.5204, 1.0456, 1.5708],
  [-0.5252, 0.0, 0.5204, 1.0456, 1.5708, -1.0456],
];

function blendAngles(a: number, b: number, t: number) {
  let diff = b - a;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return a + diff * t;
}

function resolveShape(shape: PatternShape): PatternShape {
  if (typeof window === "undefined") return shape;
  const param = new URLSearchParams(window.location.search).get("pattern");
  return param && param in PATTERN_PROFILES ? (param as PatternShape) : shape;
}

export function AlignmentGrid({ shape = "trail" }: { shape?: PatternShape }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const container: HTMLDivElement | null = containerRef.current;
    const canvas: HTMLCanvasElement | null = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const activeShape = resolveShape(shape);
    const { cellSize, wind, mouseRadius, lineWidth } = PATTERN_PROFILES[activeShape];

    let width = 0;
    let height = 0;
    let offsetX = 0;
    let offsetY = 0;
    let color = "currentColor";
    let mouseX = -1e6;
    let mouseY = -1e6;
    let pointerFactor = 0;
    let pointerTarget = 0;
    const gusts: { x: number; y: number; t0: number }[] = [];
    const GUST_SPEED = 700;
    const GUST_BAND_SQ = 80 * 80;
    const GUST_LIFE = 1.2;

    const readColor = () => {
      color = getComputedStyle(canvas).color;
    };
    const resize = () => {
      const rect = container.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      offsetX = rect.left + window.scrollX;
      offsetY = rect.top + window.scrollY;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      readColor();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    const mo = new MutationObserver(() => requestAnimationFrame(readColor));
    mo.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "data-theme", "style"],
    });

    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseX = e.clientX - rect.left;
      mouseY = e.clientY - rect.top;
      pointerTarget = 1;
    };
    const onLeave = () => {
      pointerTarget = 0;
    };
    const onDown = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      gusts.push({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        t0: (performance.now() - GLOBAL_T0) / 1000,
      });
    };
    container.addEventListener("pointermove", onMove);
    container.addEventListener("pointerleave", onLeave);
    container.addEventListener("pointerdown", onDown);

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = mq.matches;
    const onReducedChange = () => {
      reduced = mq.matches;
    };
    mq.addEventListener("change", onReducedChange);

    let visible = true;
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        visible = entry.isIntersecting;
        if (entry.isIntersecting) container.dataset.visible = "true";
      }
    });
    io.observe(container);

    const draw = (now: number) => {
      const t = (now - GLOBAL_T0) / 1000;
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";

      const half = (cellSize * 0.7) / 2;
      const radiusSq = mouseRadius * mouseRadius;
      pointerFactor += (pointerTarget - pointerFactor) * 0.18;
      while (gusts.length && t - gusts[0]!.t0 > GUST_LIFE) gusts.shift();
      const pointerActive = mouseX > -5e5 && pointerFactor > 0.005;

      const intensity = 0.65 + 0.55 * Math.sin(t * 0.5) + 0.2 * Math.sin(t * 0.17);
      const sway = Math.sin(t * 0.45) * 0.4;
      const amp = wind * intensity * 0.55;
      const dotRadius = cellSize * 0.08;
      const dotWindScale = wind * intensity * 0.15;
      const dotPushMax = mouseRadius * 0.25;
      const first = cellSize / 2;

      for (let x = first; x < width; x += cellSize) {
        for (let y = first; y < height; y += cellSize) {
          const worldX = x + offsetX;
          const worldY = y + offsetY;
          const gust1 = Math.sin(worldX * 0.009 + worldY * 0.004 - t * 1.8);
          const gust2 = Math.sin(worldX * 0.005 - worldY * 0.007 - t * 1.1);
          const texture = Math.sin(worldX * 0.045 + worldY * 0.05) * 0.2;

          if (activeShape === "dot" || activeShape === "trail") {
            let dispX = dotWindScale * cellSize * (gust1 * 0.8 + sway * 0.4);
            let dispY = dotWindScale * cellSize * (gust2 * 0.6 + texture);
            if (pointerActive) {
              const dx = mouseX - x;
              const dy = mouseY - y;
              const distSq = dx * dx + dy * dy;
              if (distSq < radiusSq) {
                const dist = Math.sqrt(distSq) || 1;
                const influence = 1 - dist / mouseRadius;
                const push = dotPushMax * influence * influence * pointerFactor;
                dispX -= (dx / dist) * push;
                dispY -= (dy / dist) * push;
              }
            }
            for (const g of gusts) {
              const age = t - g.t0;
              const gdx = x - g.x;
              const gdy = y - g.y;
              const gdist = Math.sqrt(gdx * gdx + gdy * gdy) || 1;
              const band = gdist - age * GUST_SPEED;
              const mag =
                Math.exp(-(band * band) / GUST_BAND_SQ) * (1 - age / GUST_LIFE) * cellSize * 0.8;
              dispX += (gdx / gdist) * mag;
              dispY += (gdy / gdist) * mag;
            }
            const dotX = x + dispX;
            const dotY = y + dispY;
            if (activeShape === "trail") {
              ctx.beginPath();
              ctx.moveTo(x, y);
              ctx.lineTo(dotX, dotY);
              ctx.stroke();
            }
            ctx.beginPath();
            ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
            ctx.fill();
            continue;
          }

          let angle: number;
          if (activeShape === "fern") {
            const gx = Math.round((x - first) / cellSize);
            const gy = Math.round((y - first) / cellSize);
            const base =
              FERN_ANGLES[((gy % FERN_TILE) + FERN_TILE) % FERN_TILE]![
                ((gx % FERN_TILE) + FERN_TILE) % FERN_TILE
              ]!;
            const wave =
              Math.sin(worldX * 0.007 - worldY * 0.007 - t * 1.5) +
              Math.sin(worldX * 0.015 - worldY * 0.015 - t * 0.9) * 0.4 +
              Math.sin(worldX * 0.04 + worldY * 0.04) * 0.15;
            const factor = Math.min(0.7, Math.max(0.05, wave) * intensity * wind * FERN_WIND_SCALE);
            angle = blendAngles(base, FERN_WIND_DIR, factor);
          } else {
            angle = amp * (gust1 + gust2 * 0.7 + sway + texture);
          }
          if (pointerActive) {
            const dx = mouseX - x;
            const dy = mouseY - y;
            const distSq = dx * dx + dy * dy;
            if (distSq < radiusSq) {
              const influence = 1 - Math.sqrt(distSq) / mouseRadius;
              angle = blendAngles(angle, Math.atan2(dy, dx), influence * influence * pointerFactor);
            }
          }
          for (const g of gusts) {
            const age = t - g.t0;
            const gdx = x - g.x;
            const gdy = y - g.y;
            const band = Math.sqrt(gdx * gdx + gdy * gdy) - age * GUST_SPEED;
            const weight = Math.min(
              1,
              Math.exp(-(band * band) / GUST_BAND_SQ) * (1 - age / GUST_LIFE),
            );
            if (weight > 0.01) angle = blendAngles(angle, Math.atan2(gdy, gdx), weight);
          }
          const cos = Math.cos(angle);
          const sin = Math.sin(angle);
          ctx.beginPath();
          ctx.moveTo(x - half * cos, y - half * sin);
          ctx.lineTo(x + half * cos, y + half * sin);
          ctx.stroke();
        }
      }
    };

    let raf = 0;
    const loop = (now: number) => {
      if (visible && !reduced) draw(now);
      raf = requestAnimationFrame(loop);
    };
    draw(performance.now());
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      mo.disconnect();
      io.disconnect();
      container.removeEventListener("pointermove", onMove);
      container.removeEventListener("pointerleave", onLeave);
      container.removeEventListener("pointerdown", onDown);
      mq.removeEventListener("change", onReducedChange);
    };
  }, []);

  return (
    <div ref={containerRef} aria-hidden className="hg-pattern">
      <canvas ref={canvasRef} />
    </div>
  );
}

/** Animated pattern filling the page gutters on both sides of the rails. */
export function GridGutters({ shape = "trail" }: { shape?: PatternShape }) {
  return (
    <div aria-hidden className="hg-gutters">
      <div className="hg-gutter hg-gutter-left">
        <AlignmentGrid shape={shape} />
      </div>
      <div className="hg-gutter hg-gutter-right">
        <AlignmentGrid shape={shape} />
      </div>
    </div>
  );
}

/** Rail-to-rail animated pattern band; `bleed` continues it into both gutters. */
export function GridPatternRow({
  shape = "trail",
  bleed = true,
}: {
  shape?: PatternShape;
  bleed?: boolean;
}) {
  return (
    <div aria-hidden className="hg-pattern-row">
      {bleed && <GridGutters shape={shape} />}
      <AlignmentGrid shape={shape} />
    </div>
  );
}

// --- RailDot geometry (ported from site-frame.tsx) --------------------------

type Corner = "tl" | "tr" | "bl" | "br";

const RING = { cx: 18.5, cy: 18, r: 2.5 };
const BEND_R = 6;
const TIP = 10;
const cornerGeom: Record<Corner, { v: -1 | 1; h: -1 | 1 }> = {
  tl: { v: -1, h: -1 },
  tr: { v: -1, h: 1 },
  bl: { v: 1, h: -1 },
  br: { v: 1, h: 1 },
};

function fmt(n: number): string {
  return String(Number(n.toFixed(4)));
}

function angleDelta(deg: number): number {
  const m = ((deg % 360) + 360) % 360;
  return m > 180 ? m - 360 : m;
}

function arcSegs(cx: number, cy: number, r: number, fromDeg: number, toDeg: number, segments: number) {
  const out: string[] = [];
  const step = (toDeg - fromDeg) / segments;
  for (let i = 0; i < segments; i++) {
    const a = ((fromDeg + step * i) * Math.PI) / 180;
    const b = ((fromDeg + step * (i + 1)) * Math.PI) / 180;
    const k = r * (4 / 3) * Math.tan((b - a) / 4);
    const pbx = cx + r * Math.cos(b);
    const pby = cy + r * Math.sin(b);
    out.push(
      `C ${fmt(cx + r * Math.cos(a) - k * Math.sin(a))} ${fmt(cy + r * Math.sin(a) + k * Math.cos(a))} ` +
        `${fmt(pbx + k * Math.sin(b))} ${fmt(pby - k * Math.cos(b))} ${fmt(pbx)} ${fmt(pby)}`,
    );
  }
  return out.join(" ");
}

function ornamentPath(corner: Corner): string {
  const { v, h } = cornerGeom[corner];
  const stubSide = h > 0 ? 180 : 0;
  const armSide = v > 0 ? 270 : 90;
  const to = stubSide + angleDelta(armSide - stubSide);
  return (
    `M ${fmt(RING.cx)} ${fmt(RING.cy + TIP * v)} L ${fmt(RING.cx)} ${fmt(RING.cy + BEND_R * v)} ` +
    `${arcSegs(RING.cx + BEND_R * h, RING.cy + BEND_R * v, BEND_R, stubSide, to, 1)} ` +
    `L ${fmt(RING.cx + TIP * h)} ${fmt(RING.cy)}`
  );
}

function scalePath(d: string, s: number): string {
  let isX = true;
  return d.replace(/-?\d+(\.\d+)?/g, (num) => {
    const c = isX ? RING.cx : RING.cy;
    isX = !isX;
    return fmt(c + (Number(num) - c) * s);
  });
}

const RING_PATH = `M ${fmt(RING.cx + RING.r)} ${fmt(RING.cy)} ${arcSegs(RING.cx, RING.cy, RING.r, 0, 360, 4)}`;
const RING_DOT = scalePath(RING_PATH, 0.16);
const CORNER_PATHS = (Object.keys(cornerGeom) as Corner[]).reduce(
  (acc, c) => {
    const full = ornamentPath(c);
    acc[c] = { rest: scalePath(full, 0.09), hover: full };
    return acc;
  },
  {} as Record<Corner, { rest: string; hover: string }>,
);

const pathVars = (rest: string, hover: string) =>
  ({
    "--rail-dot-d-rest": `path("${rest}")`,
    "--rail-dot-d-hover": `path("${hover}")`,
  }) as any;

/**
 * Ring on a grid intersection that morphs into a corner bracket when its
 * `.group` ancestor is hovered. `corner` is the bracket that hugs the tile.
 */
export function RailDot({ position, curve }: { position: Corner; curve: Corner }) {
  return (
    <svg aria-hidden viewBox="0 0 36 36" width={36} height={36} className={`rail-dot rail-dot-${position}`}>
      <circle className="rail-dot-bg" cx="18.5" cy="18" r="8" />
      <g className="rail-dot-mask">
        <rect x="1.5" y="17" width="34" height="3" />
        <rect x="17" y="1" width="3" height="34" />
      </g>
      <path
        className="rail-dot-ring"
        d={RING_PATH}
        style={pathVars(RING_PATH, RING_DOT)}
        fill="none"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
      <path
        className="rail-dot-curve"
        d={CORNER_PATHS[curve].rest}
        style={pathVars(CORNER_PATHS[curve].rest, CORNER_PATHS[curve].hover)}
        fill="none"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/** Four rail dots for a tile's corners; the tile needs `group hg-tile`. */
export function TileDots() {
  const ref = useRef(null);

  // Neighboring tiles stack their own dots on shared corners. While a tile is
  // hovered, hide the neighbors' rest rings there so the bracket stays clean.
  useEffect(() => {
    const wrapper = ref.current as HTMLElement | null;
    if (!wrapper) return;

    // Listen on the document: the surrounding MDX tile can be re-rendered
    // after hydration, so a listener bound to it directly may go stale.
    let suppressed: Element[] = [];
    const center = (el: Element) => {
      const r = el.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    };
    const release = () => {
      for (const dot of suppressed) dot.removeAttribute("data-suppressed");
      suppressed = [];
    };
    const onOver = (event: PointerEvent) => {
      const tile = wrapper.closest(".hg-tile");
      const grid = tile?.closest(".hg-grid");
      if (!tile || !grid || suppressed.length > 0) return;
      if (!tile.contains(event.target as Node)) return;
      const own = Array.from(wrapper.querySelectorAll(".rail-dot")).map(center);
      suppressed = Array.from(grid.querySelectorAll(".rail-dot")).filter((dot) => {
        if (wrapper.contains(dot)) return false;
        const [x, y] = center(dot);
        return own.some(([ox, oy]) => Math.abs(ox - x) < 3 && Math.abs(oy - y) < 3);
      });
      for (const dot of suppressed) dot.setAttribute("data-suppressed", "true");
    };
    const onOut = (event: PointerEvent) => {
      const tile = wrapper.closest(".hg-tile");
      if (suppressed.length === 0) return;
      if (tile && tile.contains(event.relatedTarget as Node)) return;
      release();
    };
    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    return () => {
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      release();
    };
  }, []);

  return (
    <span ref={ref} className="hg-dots">
      <RailDot position="tl" curve="br" />
      <RailDot position="tr" curve="bl" />
      <RailDot position="bl" curve="tr" />
      <RailDot position="br" curve="tl" />
    </span>
  );
}

/** Up-right arrow that nudges on `.hg-tile` hover. */
export function TileArrow() {
  return (
    <svg
      aria-hidden
      className="hg-arrow"
      viewBox="0 0 24 24"
      width={16}
      height={16}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 7h10v10" />
      <path d="M7 17 17 7" />
    </svg>
  );
}

/**
 * Grid cell with marketing-site hover: arrow nudges up-right and the four
 * corner rail dots open into brackets. Renders as a link when `href` is set.
 */
export function GridTile({
  href,
  className = "",
  arrow = true,
  children,
}: {
  href?: string;
  className?: string;
  arrow?: boolean;
  children?: any;
}) {
  const content = (
    <>
      <TileDots />
      {arrow && href ? <TileArrow /> : null}
      {children}
    </>
  );
  const cls = `group hg-tile ${href ? "hg-tile-link" : ""} ${className}`;
  return href ? (
    <a className={cls} href={href}>
      {content}
    </a>
  ) : (
    <div className={cls}>{content}</div>
  );
}

// Grayscale port of the buildwithfern.com/cli hero terminal
// (marketing-site/src/components/cli-hero-terminal.tsx).
const CLI_BANNER = [
  "██╗   ██╗ ██████╗ ██╗   ██╗██████╗      ██████╗ ██████╗ ███╗   ███╗██████╗  █████╗ ███╗   ██╗██╗   ██╗",
  "╚██╗ ██╔╝██╔═══██╗██║   ██║██╔══██╗    ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██╔══██╗████╗  ██║╚██╗ ██╔╝",
  " ╚████╔╝ ██║   ██║██║   ██║██████╔╝    ██║     ██║   ██║██╔████╔██║██████╔╝███████║██╔██╗ ██║ ╚████╔╝ ",
  "  ╚██╔╝  ██║   ██║██║   ██║██╔══██╗    ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██╔══██║██║╚██╗██║  ╚██╔╝  ",
  "   ██║   ╚██████╔╝╚██████╔╝██║  ██║    ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║  ██║██║ ╚████║   ██║   ",
  "   ╚═╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝     ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝  ╚═╝╚═╝  ╚═══╝   ╚═╝   ",
].join("\n");

type CliTone = "fg" | "dim" | "accent";
const CLI_SCRIPT: { text: string; tone: CliTone; bullet?: string }[] = [
  { text: "$ yourco orders create --amount 4200 --currency usd", tone: "fg" },
  { text: "Authenticating with API key", tone: "dim" },
  { text: "POST /v1/orders", tone: "accent", bullet: "→" },
  { text: "Order ord_8e2x created (pending)", tone: "fg", bullet: "✓" },
  { text: "$ yourco orders list --status pending --limit 5", tone: "fg" },
  { text: "3 orders in 142ms", tone: "accent", bullet: "→" },
  { text: "$ ", tone: "fg" },
];

const CLI_PROMPT = "$ ";
const CLI_START_MS = 2000;
const CLI_LINE_MS = 380;
const CLI_CHAR_MS = 28;
const CLI_POST_TYPE_MS = 280;

export function CliTerminal() {
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [typed, setTyped] = useState(() => CLI_SCRIPT.map(() => -1));

  useEffect(() => {
    const el = ref.current as HTMLElement | null;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    const timers: number[] = [];
    const finish = () => {
      setStarted(true);
      setTyped(CLI_SCRIPT.map((line) => line.text.length));
    };
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      finish();
      return () => ro.disconnect();
    }

    const setLine = (i: number, n: number) =>
      setTyped((prev: number[]) => {
        const next = prev.slice();
        next[i] = n;
        return next;
      });

    const run = () => {
      setStarted(true);
      let cursor = CLI_START_MS;
      CLI_SCRIPT.forEach((line, i) => {
        if (line.text.startsWith(CLI_PROMPT)) {
          const start = CLI_PROMPT.length;
          const at = cursor;
          timers.push(window.setTimeout(() => setLine(i, start), at));
          for (let c = start + 1; c <= line.text.length; c++) {
            timers.push(window.setTimeout(() => setLine(i, c), at + (c - start) * CLI_CHAR_MS));
          }
          cursor = at + (line.text.length - start) * CLI_CHAR_MS + CLI_POST_TYPE_MS;
        } else {
          const at = cursor;
          timers.push(window.setTimeout(() => setLine(i, line.text.length), at));
          cursor = at + CLI_LINE_MS;
        }
      });
    };

    const io = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        io.disconnect();
        run();
      }
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
      timers.forEach(window.clearTimeout);
    };
  }, []);

  const lastShown = typed.reduce((acc: number, n: number, i: number) => (n >= 0 ? i : acc), -1);

  return (
    <div ref={ref} className="hg-cli-frame" data-started={started ? "true" : "false"} aria-hidden="true">
      {size.w > 0 && size.h > 0 ? (
        <svg className="hg-cli-trace" width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`}>
          <rect x={0.5} y={0.5} width={size.w - 1} height={size.h - 1} rx={10} ry={10} pathLength={1000} />
        </svg>
      ) : null}
      <div className="hg-cli" data-started={started ? "true" : "false"}>
      <div className="hg-cli-titlebar">
        <span className="hg-cli-dots">
          <span />
          <span />
          <span />
        </span>
        <span className="hg-cli-path">~/projects/yourco</span>
      </div>
      <div className="hg-cli-body">
        <pre className="hg-cli-banner">{CLI_BANNER}</pre>
        <div className="hg-cli-subtitle">
          <span>v1.4.0</span>
          <span>·</span>
          <span>Your Company API, in your terminal</span>
        </div>
        <div className="hg-cli-lines">
          {CLI_SCRIPT.map((line, i) => {
            const n = typed[i];
            const input = line.text.startsWith(CLI_PROMPT);
            const typing = input && n >= 0 && n < line.text.length;
            const caret = n >= 0 && (typing || (line.text === CLI_PROMPT && i === lastShown));
            return (
              <div key={i} className={`hg-cli-line hg-cli-${line.tone}`} data-visible={n >= 0 ? "true" : "false"}>
                {line.bullet ? <span className="hg-cli-bullet">{line.bullet}</span> : null}
                <span>{input ? line.text.slice(0, Math.max(n, 0)) : line.text}</span>
                {caret ? <span className={`hg-cli-caret ${typing ? "" : "hg-cli-caret-blink"}`} /> : null}
              </div>
            );
          })}
        </div>
      </div>
      </div>
    </div>
  );
}

// --- Quick nav ----------------------------------------------------------------

type QuickNavItem = { id: string; label: string };
type QuickNavLink = { label: string; href: string };

/** Sticky left rail that jumps to page sections and tracks the one in view. */
export function QuickNav({ items, links = [] }: { items: QuickNavItem[]; links?: QuickNavLink[] }) {
  const [active, setActive] = useState(items[0]?.id);
  // While a click-triggered smooth scroll runs, hold the clicked item so the
  // highlight doesn't flash through the sections scrolled past.
  const navRef = useRef(null);
  const lockRef = useRef(false);
  const unlockRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const header = document.getElementById("fern-header");
      const line = (header?.getBoundingClientRect().bottom ?? 0) + 120;
      let current = items[0]?.id;
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (el && el.getBoundingClientRect().top <= line) current = item.id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (lockRef.current) {
        window.clearTimeout(unlockRef.current);
        unlockRef.current = window.setTimeout(() => (lockRef.current = false), 150);
        return;
      }
      if (!raf) raf = requestAnimationFrame(update);
    };
    // Line the first link's text up with the first section's heading.
    const align = () => {
      const nav = navRef.current as HTMLElement | null;
      const first = items[0] && document.getElementById(items[0].id);
      const title = first?.querySelector(".card-title, h1, h2, h3") ?? first;
      const link = nav?.querySelector(".hg-quicknav-link") as HTMLElement | null;
      if (!nav || !title || !link || nav.offsetParent === null) return;
      const t = title.getBoundingClientRect();
      const offset = t.top + t.height / 2 - nav.getBoundingClientRect().top - link.offsetHeight / 2;
      nav.style.setProperty("--hg-quicknav-offset", `${Math.max(0, Math.round(offset))}px`);
    };
    const onResize = () => {
      align();
      onScroll();
    };
    align();
    document.fonts?.ready.then(align);
    const alignLater = window.setTimeout(align, 1500);
    update();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(unlockRef.current);
      window.clearTimeout(alignLater);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const jump = (e: MouseEvent, id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    e.preventDefault();
    lockRef.current = true;
    window.clearTimeout(unlockRef.current);
    unlockRef.current = window.setTimeout(() => (lockRef.current = false), 1000);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const headerBottom = document.getElementById("fern-header")?.getBoundingClientRect().bottom ?? 0;
    window.scrollTo({
      top: el.getBoundingClientRect().top + window.scrollY - headerBottom - 24,
      behavior: reduced ? "auto" : "smooth",
    });
    history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    <nav ref={navRef} aria-label="Page sections" className="hg-quicknav">
      <div className="hg-quicknav-inner">
        <ul className="hg-quicknav-list">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                className="hg-quicknav-link"
                data-active={active === item.id ? "true" : undefined}
                aria-current={active === item.id ? "location" : undefined}
                onClick={(e: MouseEvent) => jump(e, item.id)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
        {links.length > 0 && (
          <ul className="hg-quicknav-list hg-quicknav-ctas">
            {links.map((link) => (
              <li key={link.href}>
                <a href={link.href} className="hg-quicknav-cta">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}
