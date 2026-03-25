import { useState, useEffect, useRef, useMemo } from "react";

const C = {
  bg: "#0A0A0F", sub: "#12121A", text: "#E8E4DD", dim: "#5A5A65",
  amber: "#D4A053", amberDim: "rgba(212,160,83,0.12)", amberGlow: "rgba(212,160,83,0.25)",
};

// ── Intersection observer ───────────────────────────────────────────────────
function useInView(t = 0.1) {
  const r = useRef(null);
  const [v, setV] = useState(false);
  useEffect(() => {
    const el = r.current;
    if (!el) return;
    const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: t });
    o.observe(el);
    return () => o.disconnect();
  }, [t]);
  return [r, v];
}

function Reveal({ children, delay = 0, style = {} }) {
  const [r, v] = useInView(0.05);
  return (
    <div ref={r} style={{ opacity: v ? 1 : 0, transform: v ? "none" : "translateY(32px)", transition: `all 0.9s cubic-bezier(.22,1,.36,1) ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

// ── Animated counter ────────────────────────────────────────────────────────
function Counter({ to, suffix = "", duration = 1500 }) {
  const [val, setVal] = useState(0);
  const [ref, vis] = useInView();
  useEffect(() => {
    if (!vis) return;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(to * eased));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [vis, to, duration]);
  return <span ref={ref}>{val}{suffix}</span>;
}

// ── AVD Radar ───────────────────────────────────────────────────────────────
function Radar({ a, v, d, size = 160, color = C.amber, pulse = false }) {
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const axes = [{ l: "A", ang: -90 }, { l: "V", ang: 30 }, { l: "D", ang: 150 }];
  const pt = (val, ang) => {
    const rad = (ang * Math.PI) / 180;
    return [cx + val * r * Math.cos(rad), cy + val * r * Math.sin(rad)];
  };
  const pts = [pt(a, -90), pt(v, 30), pt(d, 150)];
  const path = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ") + "Z";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {[.33, .66, 1].map(s => (
        <polygon key={s} points={axes.map(ax => pt(s, ax.ang).join(",")).join(" ")} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
      ))}
      {axes.map(ax => {
        const e = pt(1, ax.ang), lb = pt(1.22, ax.ang);
        return <g key={ax.l}><line x1={cx} y1={cy} x2={e[0]} y2={e[1]} stroke="rgba(255,255,255,0.06)" /><text x={lb[0]} y={lb[1]} fill={C.dim} fontSize="9" fontFamily="monospace" textAnchor="middle" dominantBaseline="central">{ax.l}</text></g>;
      })}
      {pulse && <path d={path} fill={`${color}10`} stroke={color} strokeWidth="1" opacity="0.3"><animate attributeName="opacity" values="0.3;0.1;0.3" dur="3s" repeatCount="indefinite" /></path>}
      <path d={path} fill={`${color}18`} stroke={color} strokeWidth="1.5" />
      {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="3" fill={color} />)}
    </svg>
  );
}

// ── Flowing connection line ─────────────────────────────────────────────────
function FlowLine({ height = 60 }) {
  return (
    <svg width="2" height={height} style={{ display: "block", margin: "0 auto" }}>
      <line x1="1" y1="0" x2="1" y2={height} stroke={C.amber} strokeWidth="1" strokeDasharray="4 4" opacity="0.25" />
      <circle r="2" fill={C.amber} opacity="0.6">
        <animate attributeName="cy" values={`0;${height}`} dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.6;0.2;0.6" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

// ── Phase ring segment ──────────────────────────────────────────────────────
function PhaseRing({ phases, size = 380 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.4;
  const gap = 0.02;
  const total = phases.reduce((s, p) => s + p.weight, 0);
  let acc = -Math.PI / 2;
  const [hovered, setHovered] = useState(null);

  const arcs = phases.map((p, i) => {
    const sweep = ((p.weight / total) * Math.PI * 2) - gap;
    const startAngle = acc + gap / 2;
    acc += (p.weight / total) * Math.PI * 2;
    const endAngle = startAngle + sweep;
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle), y2 = cy + r * Math.sin(endAngle);
    const large = sweep > Math.PI ? 1 : 0;
    const midAngle = startAngle + sweep / 2;
    const labelR = r + 24;
    const lx = cx + labelR * Math.cos(midAngle), ly = cy + labelR * Math.sin(midAngle);
    // Determine text-anchor based on which side of the circle the label is on
    const normalizedAngle = ((midAngle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    const cosMA = Math.cos(midAngle);
    let anchor = "middle";
    if (cosMA > 0.3) anchor = "start";
    else if (cosMA < -0.3) anchor = "end";
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
    return { ...p, d, lx, ly, midAngle, anchor, index: i };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: "visible" }}>
      {arcs.map((arc) => (
        <g key={arc.index} onMouseEnter={() => setHovered(arc.index)} onMouseLeave={() => setHovered(null)} style={{ cursor: "default" }}>
          <path d={arc.d} fill="none" stroke={hovered === arc.index ? C.amber : arc.color} strokeWidth={hovered === arc.index ? 6 : 4} strokeLinecap="round" style={{ transition: "all 0.3s ease" }} />
          <text x={arc.lx} y={arc.ly} fill={hovered === arc.index ? C.text : C.dim} fontSize="9" fontFamily="monospace" textAnchor={arc.anchor} dominantBaseline="central" style={{ transition: "fill 0.3s" }}>{arc.label}</text>
        </g>
      ))}
      <text x={cx} y={cy - 8} fill={C.text} fontSize="11" fontFamily="'Instrument Serif', serif" textAnchor="middle">{hovered !== null ? phases[hovered].name : "8 phases"}</text>
      <text x={cx} y={cy + 10} fill={C.dim} fontSize="9" fontFamily="monospace" textAnchor="middle">{hovered !== null ? phases[hovered].dim : "one arc"}</text>
    </svg>
  );
}

// ── Dissolve visualization ──────────────────────────────────────────────────
function DissolveViz() {
  const canvasRef = useRef(null);
  const [ref, vis] = useInView(0.2);
  const particles = useMemo(() => Array.from({ length: 80 }, (_, i) => ({
    x: 150 + (Math.random() - 0.5) * 40,
    y: 100 + (Math.random() - 0.5) * 40,
    tx: Math.random() * 300,
    ty: Math.random() * 200,
    delay: Math.random() * 2,
    size: 1 + Math.random() * 2,
  })), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !vis) return;
    const ctx = canvas.getContext("2d");
    const dpr = 2;
    canvas.width = 300 * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);
    let startTime = null;
    let raf;

    const draw = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const elapsed = (timestamp - startTime) / 1000;
      ctx.clearRect(0, 0, 300, 200);

      const progress = Math.min(1, elapsed / 5);
      const eased = 1 - Math.pow(1 - progress, 2);

      particles.forEach((p) => {
        const t = Math.max(0, Math.min(1, (eased - p.delay * 0.15)));
        const x = p.x + (p.tx - p.x) * t;
        const y = p.y + (p.ty - p.y) * t;
        const alpha = 1 - t * 0.7;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(212,160,83,${alpha * 0.6})`;
        ctx.fill();
      });

      // Central form shrinks
      const formScale = 1 - eased * 0.8;
      if (formScale > 0.05) {
        ctx.beginPath();
        ctx.arc(150, 100, 20 * formScale, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(212,160,83,${formScale})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      if (progress < 1) raf = requestAnimationFrame(draw);
      else {
        startTime = null;
        setTimeout(() => { raf = requestAnimationFrame(draw); }, 1500);
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [vis, particles]);

  return (
    <div ref={ref} style={{ display: "flex", justifyContent: "center" }}>
      <canvas ref={canvasRef} style={{ width: 300, height: 200 }} />
    </div>
  );
}

// ── Audio graph diagram ─────────────────────────────────────────────────────
function AudioGraph() {
  const nodes = [
    { id: "song", x: 30, y: 20, label: "Your Song", w: 72 },
    { id: "dry", x: 20, y: 65, label: "Dry", w: 40, dim: true },
    { id: "low", x: 80, y: 55, label: "LOW", w: 44 },
    { id: "mid", x: 140, y: 55, label: "MID", w: 44 },
    { id: "high", x: 200, y: 55, label: "HIGH", w: 44 },
    { id: "hall", x: 140, y: 90, label: "Hall IR", w: 52 },
    { id: "duck", x: 140, y: 120, label: "Duck", w: 44 },
    { id: "trackb", x: 260, y: 55, label: "Track B", w: 56 },
    { id: "bin", x: 260, y: 90, label: "Binaural", w: 60 },
    { id: "voice", x: 260, y: 120, label: "Voices", w: 52 },
    { id: "out", x: 160, y: 155, label: "🎧", w: 30 },
  ];
  const edges = [
    ["song", "dry"], ["song", "low"], ["song", "mid"], ["song", "high"],
    ["low", "hall"], ["mid", "hall"], ["high", "hall"],
    ["hall", "duck"], ["duck", "out"],
    ["trackb", "out"], ["bin", "out"], ["voice", "out"], ["dry", "out"],
  ];
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg width="320" height="180" viewBox="0 0 320 180" style={{ display: "block", margin: "0 auto" }}>
      {edges.map(([from, to], i) => {
        const a = nodeMap[from], b = nodeMap[to];
        return <line key={i} x1={a.x + a.w / 2} y1={a.y + 10} x2={b.x + b.w / 2} y2={b.y} stroke="rgba(212,160,83,0.15)" strokeWidth="1" />;
      })}
      {nodes.map(n => (
        <g key={n.id}>
          <rect x={n.x} y={n.y} width={n.w} height={20} rx="4" fill={n.dim ? "rgba(255,255,255,0.03)" : C.sub} stroke={n.id === "song" ? C.amber : "rgba(255,255,255,0.06)"} strokeWidth="0.8" />
          <text x={n.x + n.w / 2} y={n.y + 13} fill={n.id === "song" ? C.amber : C.dim} fontSize="8" fontFamily="monospace" textAnchor="middle">{n.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ── Inflate→Dissolve curve ──────────────────────────────────────────────────
function InflateCurve() {
  const w = 320, h = 100, pad = 20;
  const points = [];
  for (let i = 0; i <= 100; i++) {
    const t = i / 100;
    let y;
    if (t < 0.35) y = 1 + t * 2.5; // inflate
    else if (t < 0.45) y = 1.875; // peak
    else y = 1.875 * Math.pow(1 - ((t - 0.45) / 0.55), 1.5); // dissolve
    const px = pad + t * (w - pad * 2);
    const py = h - pad - y / 2 * (h - pad * 2);
    points.push(`${px},${py}`);
  }

  return (
    <svg width={w} height={h + 30} viewBox={`0 0 ${w} ${h + 30}`} style={{ display: "block", margin: "0 auto" }}>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(255,255,255,0.06)" />
      <polyline points={points.join(" ")} fill="none" stroke={C.amber} strokeWidth="2" />
      <circle cx={pad + 0.35 * (w - pad * 2)} cy={h - pad - 1.875 / 2 * (h - pad * 2)} r="3" fill={C.amber} />
      <text x={pad + 0.15 * (w - pad * 2)} y={h + 14} fill={C.dim} fontSize="8" fontFamily="monospace" textAnchor="middle">INFLATE</text>
      <text x={pad + 0.4 * (w - pad * 2)} y={h + 14} fill={C.amber} fontSize="8" fontFamily="monospace" textAnchor="middle">PEAK</text>
      <text x={pad + 0.72 * (w - pad * 2)} y={h + 14} fill={C.dim} fontSize="8" fontFamily="monospace" textAnchor="middle">DISSOLVE</text>
      <text x={pad} y={h + 26} fill={C.dim} fontSize="7" fontFamily="monospace">Throne</text>
      <text x={w - pad} y={h + 26} fill={C.dim} fontSize="7" fontFamily="monospace" textAnchor="end">Silence</text>
    </svg>
  );
}

// ── Theory web ──────────────────────────────────────────────────────────────
function TheoryWeb() {
  const [hovered, setHovered] = useState(null);
  const items = [
    { label: "Barthes", sub: "Death of Author", x: 160, y: 30 },
    { label: "Foucault", sub: "Author-function", x: 280, y: 70 },
    { label: "Benjamin", sub: "Aura → Semi-aura", x: 280, y: 140 },
    { label: "Adorno", sub: "Pseudo-individuation", x: 160, y: 180 },
    { label: "Bourdieu", sub: "Taste as capital", x: 40, y: 140 },
    { label: "Fingerhut", sub: "Aesthetic Self Effect", x: 40, y: 70 },
  ];
  const cx = 160, cy = 105;

  return (
    <svg width="320" height="210" viewBox="0 0 320 210" style={{ display: "block", margin: "0 auto", overflow: "visible" }}>
      {items.map((item, i) => (
        <line key={`l${i}`} x1={cx} y1={cy} x2={item.x} y2={item.y} stroke={hovered === i ? C.amber : "rgba(255,255,255,0.06)"} strokeWidth="1" style={{ transition: "stroke 0.3s" }} />
      ))}
      <circle cx={cx} cy={cy} r="18" fill={C.sub} stroke={C.amber} strokeWidth="1.5" />
      <text x={cx} y={cy - 3} fill={C.amber} fontSize="7" fontFamily="monospace" textAnchor="middle">POST-</text>
      <text x={cx} y={cy + 7} fill={C.amber} fontSize="7" fontFamily="monospace" textAnchor="middle">LISTENER</text>
      {items.map((item, i) => (
        <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: "default" }}>
          <circle cx={item.x} cy={item.y} r="8" fill={hovered === i ? C.amber : C.sub} stroke={hovered === i ? C.amber : "rgba(255,255,255,0.1)"} strokeWidth="1" style={{ transition: "all 0.3s" }} />
          <text x={item.x} y={item.y - 16} fill={hovered === i ? C.text : C.dim} fontSize="9" fontFamily="'Instrument Serif', serif" textAnchor="middle" style={{ transition: "fill 0.3s" }}>{item.label}</text>
          {hovered === i && <text x={item.x} y={item.y + 22} fill={C.amber} fontSize="7.5" fontFamily="monospace" textAnchor="middle">{item.sub}</text>}
        </g>
      ))}
    </svg>
  );
}

// ── Coupling decay diagram ──────────────────────────────────────────────────
function CouplingDecay() {
  const w = 300, h = 80, pad = 16;
  const bands = [
    { label: "HIGH", color: "#E8685A", decay: [0, 0, 1, 0.7, 0.5, 0.2, 0.1, 0.1, 0, 0] },
    { label: "MID", color: "#D4A053", decay: [0, 0, 1, 0.8, 0.6, 0.3, 0.15, 0.1, 0, 0] },
    { label: "LOW", color: "#6A9EC4", decay: [0, 0, 1, 0.85, 0.7, 0.5, 0.35, 0.15, 0, 0] },
  ];
  const labels = ["", "Bloom", "Throne", "", "Ascent", "", "", "Diss.", "Silence", ""];
  const stepW = (w - pad * 2) / 9;

  return (
    <svg width={w} height={h + 24} viewBox={`0 0 ${w} ${h + 24}`} style={{ display: "block", margin: "0 auto" }}>
      <line x1={pad} y1={h - 4} x2={w - pad} y2={h - 4} stroke="rgba(255,255,255,0.06)" />
      {bands.map((band) => {
        const pts = band.decay.map((v, i) => `${pad + i * stepW},${h - 4 - v * (h - 20)}`).join(" ");
        return <polyline key={band.label} points={pts} fill="none" stroke={band.color} strokeWidth="1.5" opacity="0.7" />;
      })}
      {labels.map((l, i) => l && (
        <text key={i} x={pad + i * stepW} y={h + 12} fill={C.dim} fontSize="7" fontFamily="monospace" textAnchor="middle">{l}</text>
      ))}
      {bands.map((band, i) => (
        <g key={band.label}>
          <line x1={w - pad + 8} y1={12 + i * 14} x2={w - pad + 18} y2={12 + i * 14} stroke={band.color} strokeWidth="2" />
          <text x={w - pad + 22} y={12 + i * 14 + 3} fill={C.dim} fontSize="7" fontFamily="monospace">{band.label}</text>
        </g>
      ))}
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════
export default function App() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", overflowX: "hidden", fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Grain */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 999, opacity: 0.03, backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`, backgroundSize: "256px" }} />

      {/* ─── HERO ─── */}
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 24px", position: "relative" }}>
        <div style={{ position: "absolute", top: "20%", left: "50%", transform: "translate(-50%,0)", width: 400, height: 400, borderRadius: "50%", background: `radial-gradient(circle, ${C.amber}06 0%, transparent 70%)`, pointerEvents: "none" }} />
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.3em", textAlign: "center", marginBottom: 32 }}>NID M.DES. NEW MEDIA DESIGN · 2026</div></Reveal>
        <Reveal delay={0.15}><h1 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(40px, 10vw, 72px)", textAlign: "center", lineHeight: 1.05, margin: 0, letterSpacing: "0.03em" }}>The Post-Listener</h1></Reveal>
        <Reveal delay={0.3}><p style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(14px, 2.5vw, 18px)", color: C.dim, textAlign: "center", marginTop: 16, maxWidth: 440 }}>Taste as the living residue of craft in the age of generative AI</p></Reveal>

        <Reveal delay={0.5}>
          <div style={{ display: "flex", gap: 48, marginTop: 56, flexWrap: "wrap", justifyContent: "center" }}>
            {[{ v: "5", l: "PROFILING PHASES" }, { v: "3", l: "AVD DIMENSIONS" }, { v: "10:30", l: "DISSOLUTION" }, { v: "1", l: "SINGLE APP" }].map((s, i) => (
              <div key={i} style={{ textAlign: "center" }}>
                <div style={{ fontFamily: "'Instrument Serif', serif", fontSize: 32, color: C.amber }}>{s.v}</div>
                <div style={{ fontSize: 8, color: C.dim, letterSpacing: "0.12em", marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.7} style={{ marginTop: 60 }}><FlowLine height={50} /></Reveal>
      </div>

      {/* ─── THE WHY ─── */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "80px 24px 60px" }}>
        <Reveal>
          <div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12, textAlign: "center" }}>THE ORIGIN</div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(22px, 5vw, 30px)", lineHeight: 1.35, textAlign: "center", margin: "0 0 28px" }}>I am a classically trained guitarist who prefers music made by machines.</h2>
        </Reveal>
        <Reveal delay={0.2}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20, textAlign: "center" }}>
            Trinity Level 5. Years of scales, arpeggios, and performance anxiety. Then I stopped playing. Life happened. Music became something other people made and I consumed.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20, textAlign: "center" }}>
            Then I found Suno. I typed words and got music back — music that felt like mine in a way no Spotify playlist ever had. I was choosing textures, moods, structures. I was <span style={{ color: C.text }}>curating</span>. And the result was closer to who I am musically than anything I'd played with my own hands.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{ background: C.amberDim, borderLeft: `2px solid ${C.amber}`, padding: "18px 22px", borderRadius: "0 8px 8px 0", margin: "28px 0" }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, color: C.text, lineHeight: 1.65, margin: 0 }}>
              This should feel like a crisis. A trained musician abandoning human music for algorithmic output. Instead, it felt like coming home.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.33}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20, textAlign: "center" }}>
            But the deeper realisation came later. I went back and listened to the tracks I'd generated — the ones I'd been so proud of. Separated from the act of making them, they were <span style={{ color: C.text }}>fine</span>. Just fine. The magic wasn't in the output. It was in the process — the prompting, the iterating, the moment a generation surprised me and I thought <span style={{ fontFamily: "'Instrument Serif', serif", fontStyle: "italic", color: C.text }}>yes, that's it</span>. The songs themselves were vessels. What I actually loved was the act of searching.
          </p>
        </Reveal>
        <Reveal delay={0.36}>
          <div style={{ background: C.amberDim, borderLeft: `2px solid ${C.amber}`, padding: "18px 22px", borderRadius: "0 8px 8px 0", margin: "28px 0" }}>
            <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: 15, color: C.text, lineHeight: 1.65, margin: 0 }}>
              I don't love AI music. I love <span style={{ color: C.amber }}>making</span> AI music. The taste isn't in the listening — it's in the choosing. That's the residue of craft.
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.39}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20, textAlign: "center" }}>
            This changed the entire thesis. The cognitive dissonance I was documenting wasn't about preferring machine music over human music. It was about mistaking curatorial practice for passive consumption. The craft hadn't disappeared when I stopped playing guitar — it had migrated. From fingers on frets to judgment calls on generations. From performance to curation. The ear trained by Trinity Grade 5 was still working. It just had a different instrument now.
          </p>
        </Reveal>
        <Reveal delay={0.42}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, textAlign: "center" }}>
            This thesis is an attempt to understand that feeling — and to make other people feel it too. The PostListener profiles your musical identity. The Orchestra dissolves it. Both are designed experiences that sit between speculative design, installation art, and autoethnographic research. I am simultaneously the researcher, the subject, and the first test case.
          </p>
        </Reveal>
      </div>

      <FlowLine />

      {/* ─── AVD MODEL ─── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12 }}>THE MODEL</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 32px" }}>Arousal · Valence · Depth</h2></Reveal>
        <Reveal delay={0.2}>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap", marginBottom: 16 }}>
            <Radar a={0.85} v={0.2} d={0.7} pulse />
            <Radar a={0.3} v={0.8} d={0.4} color="#8AAEC4" />
            <Radar a={0.55} v={0.5} d={0.95} color="#9B8AC4" />
          </div>
        </Reveal>
        <Reveal delay={0.3}><p style={{ fontSize: 11, color: C.dim, maxWidth: 400, margin: "0 auto", lineHeight: 1.7 }}>Every listener occupies a unique point in this space. Empirically derived from 9,454 participants. Confirmed at scale across 1M streaming histories. This is not an invented model — it is the most robustly validated psychometric structure of musical preference in the literature.</p></Reveal>
        <Reveal delay={0.35}><p style={{ fontSize: 11, color: C.dim, maxWidth: 400, margin: "16px auto 0", lineHeight: 1.7 }}>Per Fingerhut et al. (2021), changes in your position within this space are experienced as <span style={{ color: C.text }}>changes in who you are</span> — not just what you like. The AVD vector is an identity map.</p></Reveal>
      </div>

      <FlowLine />

      {/* ─── PHASE RING ─── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12 }}>THE EXPERIENCE</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 32px" }}>Two apps, one arc</h2></Reveal>
        <Reveal delay={0.2}>
          <PhaseRing phases={[
            { label: "SPECTRUM", name: "The Spectrum", dim: "Valence via 8 pairs", weight: 12, color: "#6A9EC4" },
            { label: "DEPTH", name: "The Depth Dial", dim: "Layer tolerance", weight: 8, color: "#7A8EC4" },
            { label: "TEXTURES", name: "The Textures", dim: "Sound preference", weight: 8, color: "#9A8EC4" },
            { label: "MOMENT", name: "The Moment", dim: "Tap-to-beat arousal", weight: 6, color: "#B48EA4" },
            { label: "REVEAL", name: "The Reveal", dim: "AI music + disclosure", weight: 10, color: "#C48E84" },
            { label: "BLOOM", name: "Bloom", dim: "Hall materializes", weight: 4, color: C.amber },
            { label: "THRONE", name: "Throne", dim: "Full conducting", weight: 18, color: C.amber },
            { label: "ASCENT", name: "Ascent", dim: "Orchestra fractures", weight: 18, color: "rgba(212,160,83,0.6)" },
            { label: "DISSOLVE", name: "Dissolution", dim: "Ego dissolves", weight: 20, color: "rgba(212,160,83,0.35)" },
            { label: "SILENCE", name: "Silence", dim: "25s of nothing", weight: 5, color: "rgba(255,255,255,0.15)" },
          ]} />
        </Reveal>
        <Reveal delay={0.3}>
          <div style={{ display: "flex", justifyContent: "center", gap: 32, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: "#7A8EC4" }} /><span style={{ fontSize: 9, color: C.dim }}>PostListener</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}><div style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber }} /><span style={{ fontSize: 9, color: C.dim }}>Orchestra</span></div>
          </div>
        </Reveal>
      </div>

      <FlowLine />

      {/* ─── WHAT IT FEELS LIKE ─── */}
      <div style={{ maxWidth: 560, margin: "0 auto", padding: "60px 24px 80px" }}>
        <Reveal>
          <div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12, textAlign: "center" }}>THE JOURNEY</div>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 28px", textAlign: "center" }}>What it feels like</h2>
        </Reveal>
        <Reveal delay={0.15}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20 }}>
            You open the app in darkness. Headphones on. The screen is almost black — a single amber circle pulses slowly. You tap it and the machine opens its eyes.
          </p>
        </Reveal>
        <Reveal delay={0.2}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20 }}>
            For the next five minutes, it reads you. It plays you <span style={{ color: C.text }}>shadow</span> against <span style={{ color: C.text }}>warmth</span>, watches which way you lean, how long you hesitate, whether you change your mind. It builds layers of sound and notes when you pull back. It gives you textures and tracks which ones you linger on. It plays a beat and watches you tap.
          </p>
        </Reveal>
        <Reveal delay={0.25}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20 }}>
            Then it plays you a song. An AI-generated track built from who you are — your arousal, your valence, your depth. While you listen, five lines of text appear: <span style={{ fontFamily: "'Instrument Serif', serif", color: C.text, fontStyle: "italic" }}>this music was composed by an algorithm. the only human in this composition was you.</span>
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20 }}>
            The song doesn't stop. The screen goes black. A concert hall materializes around the music you're already hearing — reverb, spatial width, an audience murmuring behind you. You're holding your phone like a conductor's baton. You tilt and the sound follows. A voice says: <span style={{ fontFamily: "'Instrument Serif', serif", color: C.amber, fontStyle: "italic" }}>not everyone hears this way.</span>
          </p>
        </Reveal>
        <Reveal delay={0.35}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85, marginBottom: 20 }}>
            For two minutes you are the conductor. The orchestra obeys. Then it stops obeying. The high frequencies drift away first. Then the mids. A new sound enters — muffled, vast, something that doesn't belong to you. It's the <span style={{ color: C.text }}>collective</span>: every previous visitor's AVD profile averaged into a single ambient texture, a sonic composite of everyone who stood where you're standing. Your unique taste dissolving into the aggregate of all taste. A voice from behind: <span style={{ fontFamily: "'Instrument Serif', serif", color: C.dim, fontStyle: "italic" }}>they thought they were conducting.</span>
          </p>
        </Reveal>
        <Reveal delay={0.4}>
          <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.85 }}>
            Your song dies. The collective remains. Then silence — twenty-five seconds of nothing. A single low tone rises, its frequency set by your depth value. The screen brightens. Your AVD shape floats over the collective's. <span style={{ fontFamily: "'Instrument Serif', serif", color: C.amber }}>You were always part of this.</span>
          </p>
        </Reveal>
      </div>

      <FlowLine />
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12 }}>CORE MECHANISM</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 8px" }}>Inflate, then dissolve</h2></Reveal>
        <Reveal delay={0.15}><p style={{ fontSize: 11, color: C.dim, maxWidth: 380, margin: "0 auto 28px", lineHeight: 1.6 }}>Stronger priors → larger prediction errors → deeper altered state</p></Reveal>
        <Reveal delay={0.2}><InflateCurve /></Reveal>
        <Reveal delay={0.3} style={{ marginTop: 32 }}>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
            {["REBUS model", "Ego Dissolution Inventory", "Loss aversion (2×)", "Ericksonian pacing", "IKEA effect (+63%)", "Paradoxical intervention"].map(t => (
              <div key={t} style={{ background: C.sub, borderRadius: 20, padding: "6px 14px", fontSize: 9, color: C.dim, border: "1px solid rgba(255,255,255,0.04)" }}>{t}</div>
            ))}
          </div>
        </Reveal>
        <Reveal delay={0.4} style={{ marginTop: 32 }}><DissolveViz /></Reveal>
        <Reveal delay={0.45}><p style={{ fontSize: 10, color: C.dim, fontStyle: "italic" }}>≈ 1.5–2× experiential intensity vs dissolution alone</p></Reveal>
      </div>

      <FlowLine />

      {/* ─── THEORY WEB ─── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12 }}>THEORETICAL BACKBONE</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 12px" }}>Six frameworks, one convergence</h2></Reveal>
        <Reveal delay={0.15}><p style={{ fontSize: 11, color: C.dim, maxWidth: 400, margin: "0 auto 28px", lineHeight: 1.7 }}>Each theorist diagnosed a piece of what generative AI now resolves. The author is literally absent. Aura transforms rather than vanishes. Pseudo-individualization becomes so total it collapses. Distinction migrates from content to craft. Hover to explore.</p></Reveal>
        <Reveal delay={0.2}><TheoryWeb /></Reveal>
      </div>

      <FlowLine />

      {/* ─── COUPLING DECAY ─── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12 }}>FRACTURE MECHANICS</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 8px" }}>The orchestra stops obeying</h2></Reveal>
        <Reveal delay={0.15}><p style={{ fontSize: 11, color: C.dim, maxWidth: 380, margin: "0 auto 28px", lineHeight: 1.6 }}>HIGH stops responding first, then MID, then LOW. Per-section coupling decay with azimuth drift and detune.</p></Reveal>
        <Reveal delay={0.2}><CouplingDecay /></Reveal>
        <Reveal delay={0.25}><p style={{ fontSize: 11, color: C.dim, maxWidth: 380, margin: "20px auto 0", lineHeight: 1.6 }}>The conducting gesture that once controlled everything now controls nothing. The loss is gradual enough to feel like your fault.</p></Reveal>
      </div>

      <FlowLine />

      {/* ─── AUDIO ARCHITECTURE ─── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "60px 24px 80px", textAlign: "center" }}>
        <Reveal><div style={{ fontSize: 9, color: C.amber, letterSpacing: "0.2em", marginBottom: 12 }}>AUDIO ARCHITECTURE</div></Reveal>
        <Reveal delay={0.1}><h2 style={{ fontFamily: "'Instrument Serif', serif", fontSize: 28, margin: "0 0 8px" }}>Raw Web Audio, no libraries</h2></Reveal>
        <Reveal delay={0.15}><p style={{ fontSize: 11, color: C.dim, maxWidth: 380, margin: "0 auto 28px", lineHeight: 1.6 }}>3-band split · HRTF spatial · convolution reverb · sidechain duck · binaural beats · conducting gestures</p></Reveal>
        <Reveal delay={0.2}><AudioGraph /></Reveal>
        <Reveal delay={0.3}>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 28, flexWrap: "wrap" }}>
            {["React 19", "Vite 7", "Web Audio API", "DeviceMotion", "ElevenLabs", "Vercel"].map(t => (
              <span key={t} style={{ fontSize: 9, color: C.dim, padding: "4px 10px", background: C.sub, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>{t}</span>
            ))}
          </div>
        </Reveal>
      </div>

      {/* ─── FOOTER ─── */}
      <div style={{ maxWidth: 560, padding: "80px 24px 120px", textAlign: "center", margin: "0 auto" }}>
        <Reveal>
          <div style={{ width: 1, height: 50, background: `linear-gradient(transparent, ${C.amber}33)`, margin: "0 auto 32px" }} />
          <p style={{ fontFamily: "'Instrument Serif', serif", fontSize: "clamp(16px, 3.5vw, 22px)", color: C.text, maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.5 }}>
            The Dissolution Chamber does not destroy the listener. It reveals what the listener has always been.
          </p>
          <p style={{ fontSize: 11.5, color: C.dim, maxWidth: 420, margin: "0 auto 28px", lineHeight: 1.75 }}>
            A node in a collective sonic field, temporarily individuated, whose practice of taste is the very act that sustains the illusion — and the reality — of musical selfhood. Not a consumer diminished by AI, but a practitioner transformed by it.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 24, marginBottom: 32, flexWrap: "wrap" }}>
            {["Autoethnography", "Speculative Design", "Installation Art", "Web Audio", "Spatial Sound"].map(t => (
              <span key={t} style={{ fontSize: 9, color: C.dim, padding: "4px 10px", background: C.sub, borderRadius: 12, border: "1px solid rgba(255,255,255,0.04)" }}>{t}</span>
            ))}
          </div>
          <p style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em" }}>NID M.DES. NEW MEDIA DESIGN · JUNE 2026</p>
        </Reveal>
      </div>
    </div>
  );
}
