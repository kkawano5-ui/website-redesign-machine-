import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { WIDTH, HEIGHT } from "../data/storyboard";
import { clamp, easeOutCubic } from "../helpers";

// ---- S1: animate the cut-out person over a blurred plate (breathe + slump) ----
export const ForegroundS1: React.FC<{ src: string }> = ({ src }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;
  const prog = frame / durationInFrames;
  const breathe = Math.sin(t * 1.7) * 2.2;            // gentle up/down
  const slump = easeOutCubic(clamp(prog / 0.9)) * 8;   // shoulders sink over the scene
  const sc = 1 + Math.sin(t * 1.7) * 0.004;
  const rot = easeOutCubic(clamp(prog / 0.9)) * 0.7;   // head tilts a touch
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: "absolute",
        width: WIDTH, height: HEIGHT, objectFit: "cover",
        transformOrigin: "40% 80%",
        transform: `translateY(${breathe + slump}px) scale(${sc}) rotate(${rot}deg)`,
      }}
    />
  );
};

const Heart = ({ c = "#F59648" }: { c?: string }) => (
  <svg width="44" height="44" viewBox="0 0 24 24"><path fill={c} d="M12 21s-7-4.5-9.5-8.5C.7 9.4 2 6 5.2 6c1.9 0 3.1 1 3.8 2 .7-1 1.9-2 3.8-2C16 6 17.3 9.4 15.5 12.5 13 16.5 12 21 12 21z"/></svg>
);
const Bell = ({ c = "#9FC0E6" }: { c?: string }) => (
  <svg width="40" height="40" viewBox="0 0 24 24"><path fill={c} d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm7-5v-1l-1.5-1.5V10a5.5 5.5 0 0 0-4-5.3V4a1.5 1.5 0 0 0-3 0v.7A5.5 5.5 0 0 0 6.5 10v3.5L5 15v2h14z"/></svg>
);

// ---- S1 overlays: phone-glow pulse + notifications fading out one by one ----
export const FxS1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const pulse = 0.45 + 0.25 * (0.5 + 0.5 * Math.sin(t * 3.0));
  const icons = [
    { x: 0.66, y: 0.70, out: 1.0, el: <Heart /> },
    { x: 0.74, y: 0.74, out: 1.8, el: <Bell /> },
  ];
  return (
    <AbsoluteFill>
      {/* phone glow */}
      <div style={{
        position: "absolute", left: WIDTH * 0.35, top: HEIGHT * 0.905,
        width: 360, height: 360, transform: "translate(-50%,-50%)",
        background: "radial-gradient(closest-side, rgba(120,170,255,0.5), rgba(120,170,255,0))",
        opacity: pulse, filter: "blur(6px)",
      }} />
      {icons.map((ic, i) => {
        const op = clamp(1 - (t - ic.out) / 0.6) * clamp(t / 0.4);
        const rise = (1 - op) * -14;
        return (
          <div key={i} style={{
            position: "absolute", left: WIDTH * ic.x, top: HEIGHT * ic.y,
            transform: `translate(-50%,-50%) translateY(${rise}px)`, opacity: op,
            filter: "drop-shadow(0 0 8px rgba(120,160,220,0.5))",
          }}>{ic.el}</div>
        );
      })}
    </AbsoluteFill>
  );
};

// ---- S6 overlays: twinkles + outward particles + light sweep ----
const TW = Array.from({ length: 22 }, (_, i) => ({
  x: (Math.sin(i * 12.9) * 0.5 + 0.5), y: (Math.cos(i * 7.3) * 0.5 + 0.5),
  ph: (i * 1.7) % 6.28, r: 2 + (i % 3),
}));
const PT = Array.from({ length: 18 }, (_, i) => ({
  ang: (i / 18) * Math.PI * 2, sp: 0.5 + (i % 4) * 0.12, r0: 80 + (i % 5) * 20,
}));

export const FxS6: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const cx = WIDTH / 2, cy = HEIGHT * 0.46;
  const sweep = ((t * 0.45) % 1.6) - 0.3; // diagonal shine pass
  return (
    <AbsoluteFill>
      {/* outward drifting audience particles */}
      {PT.map((p, i) => {
        const rr = p.r0 + ((t * 40 * p.sp) % 360);
        const op = clamp(1 - ((t * 40 * p.sp) % 360) / 360) * 0.5;
        return (
          <div key={"p" + i} style={{
            position: "absolute", left: cx + Math.cos(p.ang) * rr,
            top: cy + Math.sin(p.ang) * rr * 1.3, width: 8, height: 8, borderRadius: 8,
            background: "#7Fa8e0", opacity: op, transform: "translate(-50%,-50%)",
          }} />
        );
      })}
      {/* twinkles */}
      {TW.map((s, i) => {
        const op = 0.2 + 0.8 * Math.max(0, Math.sin(t * 3 + s.ph));
        return (
          <div key={"t" + i} style={{
            position: "absolute", left: WIDTH * s.x, top: HEIGHT * (0.06 + s.y * 0.5),
            width: s.r * 2, height: s.r * 2, borderRadius: s.r, background: "#cfe2ff",
            opacity: op * 0.8, transform: "translate(-50%,-50%)", filter: "blur(0.5px)",
          }} />
        );
      })}
      {/* light sweep */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%)",
        transform: `translateX(${sweep * WIDTH}px)`,
      }} />
    </AbsoluteFill>
  );
};
