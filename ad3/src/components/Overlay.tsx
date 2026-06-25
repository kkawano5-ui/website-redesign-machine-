import React from "react";
import { Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Overlay } from "../data/storyboard";
import { clamp, easeOutBack, easeOutCubic } from "../helpers";
import { WIDTH, HEIGHT } from "../data/storyboard";

// A ChatGPT-generated transparent card/element that animates in.
export const OverlayView: React.FC<{ o: Overlay }> = ({ o }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps - o.delay;
  if (time < 0) return null;

  const e = clamp(time / 0.5);
  let tx = 0, ty = 0, scale = 1;
  if (o.enter === "slideUp") ty = (1 - easeOutCubic(e)) * 90;
  if (o.enter === "slideLeft") tx = (1 - easeOutCubic(e)) * -120;
  if (o.enter === "slideRight") tx = (1 - easeOutCubic(e)) * 120;
  if (o.enter === "pop") scale = 0.7 + 0.3 * easeOutBack(e);
  const opacity = clamp(time / 0.4) * (o.dim ?? 1);

  const floatY = o.float ? Math.sin((frame / fps) * 1.6 + o.delay) * 8 : 0;

  return (
    <Img
      src={staticFile(o.asset)}
      style={{
        position: "absolute",
        width: (o.wPct / 100) * WIDTH,
        left: (o.xPct / 100) * WIDTH,
        top: (o.yPct / 100) * HEIGHT,
        transform: `translate(-50%,-50%) translate(${tx}px, ${ty + floatY}px) scale(${scale})`,
        opacity,
        filter: o.dim && o.dim < 1 ? "saturate(0.8) brightness(0.92)" : "none",
      }}
    />
  );
};
