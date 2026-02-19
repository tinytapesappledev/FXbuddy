import React, { useMemo } from "react";
import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadRoboto } from "@remotion/google-fonts/Roboto";
import { loadFont as loadOswald } from "@remotion/google-fonts/Oswald";
import { loadFont as loadBebasNeue } from "@remotion/google-fonts/BebasNeue";
import { loadFont as loadMontserrat } from "@remotion/google-fonts/Montserrat";
import type { TitleSlamProps } from "../schemas";

const fontLoaders: Record<string, () => { fontFamily: string }> = {
  Inter: () => loadInter("normal", { subsets: ["latin"], weights: ["700"] }),
  Roboto: () => loadRoboto("normal", { subsets: ["latin"], weights: ["700"] }),
  Oswald: () => loadOswald("normal", { subsets: ["latin"], weights: ["700"] }),
  "Bebas Neue": () =>
    loadBebasNeue("normal", { subsets: ["latin"], weights: ["400"] }),
  Montserrat: () =>
    loadMontserrat("normal", { subsets: ["latin"], weights: ["700"] }),
};

export const TitleSlam: React.FC<TitleSlamProps> = ({
  text,
  color,
  fontSize,
  fontFamily,
  animationStyle,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loaded = fontLoaders[fontFamily]?.();
  const resolvedFont = loaded?.fontFamily ?? fontFamily;

  const enterDuration = Math.min(20, durationInFrames - 10);

  // Exit animation: fade out in last 15 frames
  const exitStart = durationInFrames - 15;
  const exitOpacity = interpolate(frame, [exitStart, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const style = useMemo((): React.CSSProperties => {
    let transform = "";
    let opacity = 1;

    if (animationStyle === "slam") {
      const slamSpring = spring({
        fps,
        frame,
        config: { mass: 0.6, stiffness: 120, damping: 10 },
        durationInFrames: enterDuration,
      });
      const scale = interpolate(slamSpring, [0, 1], [3, 1]);
      opacity = interpolate(slamSpring, [0, 0.3], [0, 1], {
        extrapolateRight: "clamp",
      });
      transform = `scale(${scale})`;
    } else if (animationStyle === "fade") {
      opacity = interpolate(frame, [0, enterDuration], [0, 1], {
        extrapolateRight: "clamp",
      });
    } else if (animationStyle === "slide") {
      const slideSpring = spring({
        fps,
        frame,
        config: { mass: 0.8, stiffness: 80, damping: 14 },
        durationInFrames: enterDuration,
      });
      const translateY = interpolate(slideSpring, [0, 1], [200, 0]);
      opacity = interpolate(slideSpring, [0, 0.4], [0, 1], {
        extrapolateRight: "clamp",
      });
      transform = `translateY(${translateY}px)`;
    }

    return {
      fontFamily: resolvedFont,
      fontSize,
      fontWeight: "bold",
      color,
      transform,
      opacity: opacity * exitOpacity,
      textAlign: "center",
      lineHeight: 1.1,
      padding: "0 80px",
      wordBreak: "break-word",
    };
  }, [
    animationStyle,
    fps,
    frame,
    fontSize,
    color,
    resolvedFont,
    enterDuration,
    exitOpacity,
  ]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor:
          backgroundColor === "transparent" ? undefined : backgroundColor,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div style={style}>{text}</div>
    </AbsoluteFill>
  );
};
