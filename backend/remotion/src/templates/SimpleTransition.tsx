import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { SimpleTransitionProps } from "../schemas";

export const SimpleTransition: React.FC<SimpleTransitionProps> = ({
  transitionType,
  color1,
  color2,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const progress = spring({
    fps,
    frame,
    config: { mass: 0.8, stiffness: 60, damping: 14 },
    durationInFrames,
  });

  const layer2Style = useMemo((): React.CSSProperties => {
    if (transitionType === "fade") {
      return {
        opacity: interpolate(progress, [0, 1], [0, 1]),
      };
    }

    if (transitionType === "wipe") {
      const clipX = interpolate(progress, [0, 1], [0, 100]);
      return {
        clipPath: `inset(0 ${100 - clipX}% 0 0)`,
      };
    }

    if (transitionType === "slide") {
      const translateX = interpolate(progress, [0, 1], [width, 0]);
      return {
        transform: `translateX(${translateX}px)`,
      };
    }

    if (transitionType === "zoom") {
      const scale = interpolate(progress, [0, 0.5, 1], [1, 1.5, 1]);
      const opacity1 = interpolate(progress, [0, 0.4, 0.6], [1, 1, 0], {
        extrapolateRight: "clamp",
      });
      return {
        transform: `scale(${scale})`,
        opacity: 1 - opacity1,
      };
    }

    return {};
  }, [transitionType, progress, width]);

  return (
    <AbsoluteFill>
      {/* Layer 1 — color1 */}
      <AbsoluteFill style={{ backgroundColor: color1 }} />

      {/* Layer 2 — color2 with transition */}
      <AbsoluteFill style={{ backgroundColor: color2, ...layer2Style }} />
    </AbsoluteFill>
  );
};
