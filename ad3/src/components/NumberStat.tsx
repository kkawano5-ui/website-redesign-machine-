import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { NumberStat } from "../data/storyboard";
import { fontFamily } from "../fonts";
import { clamp, easeOutCubic } from "../helpers";
import { COLORS } from "../theme";

// Count-up stat with bounce + circular glow (used in scene 6).
export const NumberStatView: React.FC<{ s: NumberStat; onDark: boolean }> = ({ s, onDark }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps - s.start;
  if (time < 0) return null;

  const p = clamp(time / 0.85);
  const val = Math.round(s.value * easeOutCubic(p));
  const opacity = clamp(time / 0.3);
  // bounce just after count completes
  const b = time > 0.85 && time < 1.25 ? 1 + 0.07 * Math.sin(((time - 0.85) / 0.4) * Math.PI) : 1;
  const affix = onDark ? COLORS.white : COLORS.navy;

  return (
    <div style={{ position: "relative", textAlign: "center", opacity }}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: 520,
          height: 520,
          transform: "translate(-50%,-50%)",
          background: "radial-gradient(closest-side, rgba(43,135,232,0.28), rgba(43,135,232,0))",
          filter: "blur(10px)",
        }}
      />
      {s.label && (
        <div style={{ fontFamily, fontWeight: 800, fontSize: 56, color: affix, position: "relative" }}>
          {s.label}
        </div>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "baseline", justifyContent: "center", gap: 14 }}>
        <span
          style={{
            fontFamily, fontWeight: 900, fontSize: 220, lineHeight: 1, color: COLORS.blue,
            transform: `scale(${b})`, transformOrigin: "center bottom",
            textShadow: "0 6px 24px rgba(0,0,0,0.25)",
          }}
        >
          {val.toLocaleString()}
        </span>
        <span style={{ fontFamily, fontWeight: 800, fontSize: 74, color: affix }}>{s.suffix}</span>
      </div>
    </div>
  );
};
