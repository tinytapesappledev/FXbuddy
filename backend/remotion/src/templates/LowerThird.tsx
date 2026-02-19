import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", {
  subsets: ["latin"],
  weights: ["400", "700"],
});

import type { LowerThirdProps } from "../schemas";

export const LowerThird: React.FC<LowerThirdProps> = ({
  name,
  title,
  barColor,
  textColor,
  nameColor,
  position,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Bar slide-in spring
  const barSpring = spring({
    fps,
    frame,
    config: { mass: 0.6, stiffness: 100, damping: 14 },
    durationInFrames: 25,
  });

  // Name appears slightly after bar
  const nameSpring = spring({
    fps,
    frame: frame - 6,
    config: { mass: 0.5, stiffness: 100, damping: 14 },
    durationInFrames: 20,
  });

  // Title appears after name
  const titleSpring = spring({
    fps,
    frame: frame - 12,
    config: { mass: 0.5, stiffness: 100, damping: 14 },
    durationInFrames: 20,
  });

  // Exit animation
  const exitStart = durationInFrames - 15;
  const exitSpring = spring({
    fps,
    frame: frame - exitStart,
    config: { mass: 0.5, damping: 20 },
    durationInFrames: 15,
  });
  const exitX = frame >= exitStart ? interpolate(exitSpring, [0, 1], [0, -600]) : 0;

  const isRight = position === "bottom-right";
  const barWidth = interpolate(barSpring, [0, 1], [0, 320]);
  const nameOpacity = interpolate(nameSpring, [0, 1], [0, 1]);
  const nameTranslateY = interpolate(nameSpring, [0, 1], [20, 0]);
  const titleOpacity = interpolate(titleSpring, [0, 1], [0, 1]);
  const titleTranslateY = interpolate(titleSpring, [0, 1], [15, 0]);

  const containerStyle = useMemo(
    (): React.CSSProperties => ({
      position: "absolute",
      bottom: 120,
      [isRight ? "right" : "left"]: 80,
      display: "flex",
      flexDirection: "column",
      gap: 8,
      transform: `translateX(${exitX}px)`,
    }),
    [isRight, exitX]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor:
          backgroundColor === "transparent" ? undefined : backgroundColor,
      }}
    >
      <div style={containerStyle}>
        {/* Name */}
        <div
          style={{
            fontFamily,
            fontSize: 42,
            fontWeight: 700,
            color: nameColor,
            opacity: nameOpacity,
            transform: `translateY(${nameTranslateY}px)`,
            textAlign: isRight ? "right" : "left",
          }}
        >
          {name}
        </div>

        {/* Accent bar */}
        <div
          style={{
            width: barWidth,
            height: 4,
            backgroundColor: barColor,
            borderRadius: 2,
            alignSelf: isRight ? "flex-end" : "flex-start",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontFamily,
            fontSize: 24,
            fontWeight: 400,
            color: textColor,
            opacity: titleOpacity,
            transform: `translateY(${titleTranslateY}px)`,
            textAlign: isRight ? "right" : "left",
          }}
        >
          {title}
        </div>
      </div>
    </AbsoluteFill>
  );
};
