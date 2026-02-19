import React from "react";
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
import type { KineticTypeProps } from "../schemas";

const fontLoaders: Record<string, () => { fontFamily: string }> = {
  Inter: () => loadInter("normal", { subsets: ["latin"], weights: ["700"] }),
  Roboto: () => loadRoboto("normal", { subsets: ["latin"], weights: ["700"] }),
  Oswald: () => loadOswald("normal", { subsets: ["latin"], weights: ["700"] }),
  "Bebas Neue": () =>
    loadBebasNeue("normal", { subsets: ["latin"], weights: ["400"] }),
  Montserrat: () =>
    loadMontserrat("normal", { subsets: ["latin"], weights: ["700"] }),
};

function splitText(
  text: string,
  type: "word" | "letter" | "line"
): string[] {
  if (type === "letter") return text.split("");
  if (type === "line") return text.split("\n").filter((l) => l.trim());
  return text.split(/\s+/).filter((w) => w);
}

export const KineticType: React.FC<KineticTypeProps> = ({
  text,
  speed,
  color,
  fontFamily,
  animationType,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const loaded = fontLoaders[fontFamily]?.();
  const resolvedFont = loaded?.fontFamily ?? fontFamily;

  const units = splitText(text, animationType);
  const framesPerUnit = Math.max(2, Math.floor((8 / speed)));

  // Exit fade
  const exitStart = durationInFrames - 15;
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const baseFontSize = animationType === "letter" ? 100 : animationType === "line" ? 60 : 80;

  return (
    <AbsoluteFill
      style={{
        backgroundColor:
          backgroundColor === "transparent" ? undefined : backgroundColor,
        justifyContent: "center",
        alignItems: "center",
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: animationType === "letter" ? 0 : animationType === "line" ? 12 : 16,
          padding: "0 80px",
          flexDirection: animationType === "line" ? "column" : "row",
          maxWidth: "90%",
        }}
      >
        {units.map((unit, i) => {
          const delay = i * framesPerUnit;
          const unitSpring = spring({
            fps,
            frame: frame - delay,
            config: { mass: 0.4, stiffness: 120, damping: 12 },
          });

          const opacity = interpolate(unitSpring, [0, 1], [0, 1]);
          const translateY = interpolate(unitSpring, [0, 1], [40, 0]);
          const scale = interpolate(unitSpring, [0, 1], [0.8, 1]);

          return (
            <span
              key={`${unit}-${i}`}
              style={{
                fontFamily: resolvedFont,
                fontSize: baseFontSize,
                fontWeight: "bold",
                color,
                opacity,
                transform: `translateY(${translateY}px) scale(${scale})`,
                display: "inline-block",
                whiteSpace: animationType === "letter" ? "pre" : undefined,
              }}
            >
              {unit}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
