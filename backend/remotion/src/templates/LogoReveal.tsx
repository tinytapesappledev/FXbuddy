import React, { useMemo } from "react";
import {
  AbsoluteFill,
  Img,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LogoRevealProps } from "../schemas";

export const LogoReveal: React.FC<LogoRevealProps> = ({
  logoUrl,
  revealStyle,
  backgroundColor,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const enterDuration = Math.min(30, durationInFrames - 10);

  // Exit fade
  const exitStart = durationInFrames - 15;
  const exitOpacity = interpolate(
    frame,
    [exitStart, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  const imageStyle = useMemo((): React.CSSProperties => {
    let transform = "";
    let opacity = 1;
    let filter = "";

    if (revealStyle === "fade") {
      opacity = interpolate(frame, [0, enterDuration], [0, 1], {
        extrapolateRight: "clamp",
      });
    } else if (revealStyle === "zoom") {
      const zoomSpring = spring({
        fps,
        frame,
        config: { mass: 0.5, stiffness: 80, damping: 12 },
        durationInFrames: enterDuration,
      });
      const scale = interpolate(zoomSpring, [0, 1], [0.2, 1]);
      opacity = interpolate(zoomSpring, [0, 0.3], [0, 1], {
        extrapolateRight: "clamp",
      });
      transform = `scale(${scale})`;
    } else if (revealStyle === "glitch") {
      // Glitch effect: rapid position/opacity jitter then settle
      const settleFrame = enterDuration * 0.7;

      if (frame < settleFrame) {
        const jitterX = Math.sin(frame * 13.7) * 20 * (1 - frame / settleFrame);
        const jitterY = Math.cos(frame * 17.3) * 15 * (1 - frame / settleFrame);
        const flickerOpacity =
          frame % 3 === 0 ? 0.4 : frame % 5 === 0 ? 0.7 : 1;
        transform = `translate(${jitterX}px, ${jitterY}px)`;
        opacity = flickerOpacity * interpolate(frame, [0, 8], [0, 1], {
          extrapolateRight: "clamp",
        });

        // RGB split effect via drop-shadow
        const splitAmount = 6 * (1 - frame / settleFrame);
        filter = `drop-shadow(${splitAmount}px 0 0 rgba(255,0,0,0.5)) drop-shadow(-${splitAmount}px 0 0 rgba(0,255,255,0.5))`;
      } else {
        const settleSpring = spring({
          fps,
          frame: frame - settleFrame,
          config: { mass: 0.3, stiffness: 200, damping: 20 },
        });
        opacity = interpolate(settleSpring, [0, 1], [0.8, 1]);
        transform = `scale(${interpolate(settleSpring, [0, 1], [1.02, 1])})`;
      }
    }

    return {
      maxWidth: 500,
      maxHeight: 500,
      objectFit: "contain" as const,
      transform,
      opacity: opacity * exitOpacity,
      filter: filter || undefined,
    };
  }, [revealStyle, frame, fps, enterDuration, exitOpacity]);

  return (
    <AbsoluteFill
      style={{
        backgroundColor,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Img src={logoUrl} style={imageStyle} />
    </AbsoluteFill>
  );
};
