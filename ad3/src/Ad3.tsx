import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { scenes, FPS } from "./data/storyboard";
import { SceneView } from "./components/SceneView";

export const Ad3: React.FC = () => {
  let acc = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0b1a33" }}>
      {scenes.map((s, i) => {
        const from = Math.round(acc * FPS);
        const dur = Math.round(s.dur * FPS);
        acc += s.dur;
        return (
          <Sequence key={s.id} from={from} durationInFrames={dur} name={`Scene ${s.id}`}>
            <SceneView scene={s} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
