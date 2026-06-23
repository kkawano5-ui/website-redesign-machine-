import React from "react";
import { Composition } from "remotion";
import { Ad3 } from "./Ad3";
import { Ad3v2 } from "./Ad3v2";
import { TOTAL_FRAMES, FPS, WIDTH, HEIGHT } from "./data/storyboard";
import { TOTAL_FRAMES2 } from "./data/storyboard2";

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="Ad3"
        component={Ad3}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
      <Composition
        id="Ad3v2"
        component={Ad3v2}
        durationInFrames={TOTAL_FRAMES2}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
      />
    </>
  );
};
