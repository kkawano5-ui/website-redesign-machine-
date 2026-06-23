import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { scenes2, FPS } from "./data/storyboard2";
import { SceneView } from "./components/SceneView";

export const Ad3v2: React.FC = () => {
  let acc = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1a33" }}>
      {scenes2.map((s) => {
        const from = Math.round(acc * FPS);
        const dur = Math.round(s.dur * FPS);
        acc += s.dur;
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={`v2 Scene ${s.id}`}>
            <SceneView scene={s} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
