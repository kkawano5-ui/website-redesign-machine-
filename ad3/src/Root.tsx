import React from "react";
import { Composition } from "remotion";
import { Ad3 } from "./Ad3";
import { TOTAL_FRAMES, FPS, WIDTH, HEIGHT } from "./data/storyboard";

export const Root: React.FC = () => {
  return (
    <Composition
      id="Ad3"
      component={Ad3}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
