import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { fontFamily } from "../fonts";
import { clamp, easeOutBack } from "../helpers";
import { COLORS } from "../theme";

// CTA button: slide up from bottom + pop, then gentle 1-beat pulse (no blink).
export const Cta: React.FC<{ line1: string; line2: string; delay: number }> = ({ line1, line2, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps - delay;
  if (time < 0) return null;

  const enter = clamp(time / 0.6);
  const ty = (1 - easeOutBack(enter)) * 120;
  const pop = 0.95 + 0.1 * easeOutBack(enter);
  const pulse = time > 0.8 ? 1 + 0.02 * Math.sin((time - 0.8) * Math.PI) : 1;
  const scale = Math.min(pop, 1.05) * pulse;

  return (
    <div
      style={{
        position: "absolute",
        left: 0, right: 0, bottom: 150,
        display: "flex", justifyContent: "center",
        transform: `translateY(${ty}px) scale(${scale})`,
        opacity: clamp(enter * 1.4),
      }}
    >
      <div
        style={{
          background: COLORS.orange,
          borderRadius: 44,
          padding: "30px 70px",
          textAlign: "center",
          boxShadow: "0 18px 40px rgba(245,150,72,0.4)",
        }}
      >
        <div style={{ fontFamily, fontWeight: 800, fontSize: 40, color: "#fff", opacity: 0.95 }}>{line1}</div>
        <div style={{ fontFamily, fontWeight: 900, fontSize: 64, color: "#fff", marginTop: 4 }}>{line2}</div>
      </div>
    </div>
  );
};
