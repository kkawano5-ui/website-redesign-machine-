import React from "react";
import { AbsoluteFill, Img, OffthreadVideo, staticFile, useCurrentFrame, useVideoConfig, interpolate } from "remotion";
import { Scene, WIDTH, HEIGHT, SCENES_WITH_VIDEO } from "../data/storyboard";
import { BG } from "../theme";
import { clamp, easeOutCubic, lerpColor } from "../helpers";
import { TelopLine } from "./Telop";
import { NumberStatView } from "./NumberStat";
import { OverlayView } from "./Overlay";
import { Cta } from "./Cta";

export const SceneView: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const onDark = scene.bg === "dark";

  // background (with optional transition, e.g. scene 3 dark->pale)
  let bgColor = BG[scene.bg];
  if (scene.bgFrom) {
    const tp = clamp((frame / fps - 0.2) / 1.1);
    bgColor = lerpColor(BG[scene.bgFrom], BG[scene.bg], easeOutCubic(tp));
  }

  // does this scene have an image->video clip ready?
  const useVideo = SCENES_WITH_VIDEO.includes(scene.id);

  // base image Ken Burns / parallax (kept subtle; skipped when a moving clip is used)
  const prog = frame / durationInFrames;
  let scale = 1, ty = 0;
  if (!useVideo) {
    if (scene.motion === "zoomIn") scale = interpolate(prog, [0, 1], [1.0, 1.08]);
    if (scene.motion === "zoomOut") scale = interpolate(prog, [0, 1], [1.08, 1.0]);
    if (scene.motion === "parallax") { scale = 1.06; ty = interpolate(prog, [0, 1], [-12, 12]); }
    if (scene.motion === "panUp") ty = interpolate(prog, [0, 1], [16, -16]);
  }

  // per-scene clean fade-in (cut feel)
  const fadeIn = clamp((frame / fps) / 0.25);

  // light wash (relief)
  const lightP = scene.light ? clamp((frame / fps - 0.2) / 1.1) : 0;

  // veil clearing (scene 8)
  const veilP = scene.veil ? clamp((frame / fps - 1.2) / 1.4) : 0;

  return (
    <AbsoluteFill style={{ backgroundColor: bgColor }}>
      <AbsoluteFill style={{ opacity: fadeIn }}>
        {/* base: moving clip (image->video) if ready, else the still illustration */}
        {useVideo ? (
          <OffthreadVideo
            src={staticFile(`ad3/assets/s${scene.id}.mp4`)}
            muted
            loop
            style={{ width: WIDTH, height: HEIGHT, objectFit: "cover" }}
          />
        ) : (
          <Img
            src={staticFile(scene.asset)}
            style={{
              width: WIDTH, height: HEIGHT, objectFit: "cover",
              transform: `scale(${scale}) translateY(${ty}px)`,
            }}
          />
        )}

        {/* overlays */}
        {scene.overlays?.map((o, i) => <OverlayView key={i} o={o} />)}

        {/* relief light */}
        {scene.light && (
          <AbsoluteFill
            style={{
              background:
                "radial-gradient(40% 30% at 50% 32%, rgba(255,255,255,0.85), rgba(255,255,255,0))",
              opacity: lightP,
            }}
          />
        )}

        {/* gray veil that clears */}
        {scene.veil && (
          <AbsoluteFill style={{ backgroundColor: "rgba(120,132,150,0.55)", opacity: 1 - veilP }} />
        )}

        {/* telops (upper-center stack) */}
        <AbsoluteFill
          style={{
            flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
            paddingTop: HEIGHT * 0.12, textAlign: "center",
          }}
        >
          {scene.telops.map((t, i) => <TelopLine key={i} t={t} onDark={onDark} />)}
        </AbsoluteFill>

        {/* numbers (scene 6) — one visible at a time */}
        {scene.numbers && (
          <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
            {scene.numbers.map((s, i) => {
              const next = scene.numbers![i + 1];
              const t = frame / fps;
              const active = t >= s.start && (!next || t < next.start);
              return active ? <NumberStatView key={i} s={s} onDark={onDark} /> : null;
            })}
          </AbsoluteFill>
        )}

        {/* CTA */}
        {scene.cta && <Cta line1={scene.cta.line1} line2={scene.cta.line2} delay={1.2} />}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
