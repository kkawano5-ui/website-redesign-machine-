import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { Telop } from "../data/storyboard";
import { fontFamily } from "../fonts";
import { clamp, easeOutCubic, emphScale, mix } from "../helpers";
import { COLORS } from "../theme";

// One animated telop line. Implements the four kinds from the brief.
export const TelopLine: React.FC<{ t: Telop; onDark: boolean }> = ({ t, onDark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps - t.delay;
  if (time < 0) return null;

  const baseColor = t.color ?? (onDark ? COLORS.white : COLORS.navy);
  const size = t.size ?? 60;

  // base reveal: opacity 0->1, y +24->0, scale .98->1 (easeOutCubic, 0.35s)
  const p = clamp(time / 0.35);
  let opacity = easeOutCubic(p);
  let ty = mix(24, 0, easeOutCubic(p));
  let scale = mix(0.98, 1, easeOutCubic(p));
  let glow = 0;
  let bandScale = 0;

  if (t.kind === "pain") {
    const s = clamp((time - 0.45) / 0.6);
    scale -= 0.02 * s;
    opacity *= 1 - 0.12 * s;
    ty += 6 * s;
  } else if (t.kind === "relief") {
    const r = clamp(time / 0.5);
    scale = 0.95 + 0.05 * easeOutCubic(r) + 0.05 * Math.sin(Math.PI * r);
    opacity = easeOutCubic(clamp(time / 0.4));
    glow = easeOutCubic(r);
  } else if (t.kind === "emphasis") {
    const e = clamp(time / 0.45);
    scale = emphScale(e);
    opacity = clamp(e * 1.5);
    bandScale = easeOutCubic(clamp((time - 0.1) / 0.4));
  }

  const band = t.bandColor ?? COLORS.band;

  return (
    <div
      style={{
        position: "relative",
        display: "inline-block",
        margin: "10px 0",
        transform: `translateY(${ty}px) scale(${scale})`,
        opacity,
      }}
    >
      {glow > 0 && (
        <div
          style={{
            position: "absolute",
            inset: "-40px -90px",
            background:
              "radial-gradient(closest-side, rgba(255,255,255,0.9), rgba(255,255,255,0))",
            opacity: glow * 0.8,
            filter: "blur(8px)",
            zIndex: 0,
          }}
        />
      )}
      {t.kind === "emphasis" && (
        <div
          style={{
            position: "absolute",
            left: -22,
            right: -22,
            top: "16%",
            bottom: "16%",
            background: band,
            borderRadius: 16,
            transformOrigin: "left center",
            transform: `scaleX(${bandScale})`,
            zIndex: 0,
          }}
        />
      )}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontFamily,
          fontWeight: 900,
          fontSize: size,
          color: baseColor,
          letterSpacing: "0.02em",
          textShadow: onDark ? "0 2px 10px rgba(0,0,0,0.35)" : "none",
          whiteSpace: "nowrap",
        }}
      >
        {t.text}
      </span>
    </div>
  );
};
