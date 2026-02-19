import React from "react";
import { Composition } from "remotion";

import { TitleSlam } from "./templates/TitleSlam";
import { LowerThird } from "./templates/LowerThird";
import { LogoReveal } from "./templates/LogoReveal";
import { KineticType } from "./templates/KineticType";
import { SimpleTransition } from "./templates/SimpleTransition";

import {
  titleSlamSchema,
  titleSlamDefaults,
  lowerThirdSchema,
  lowerThirdDefaults,
  logoRevealSchema,
  logoRevealDefaults,
  kineticTypeSchema,
  kineticTypeDefaults,
  simpleTransitionSchema,
  simpleTransitionDefaults,
} from "./schemas";

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="TitleSlam"
        component={TitleSlam}
        durationInFrames={FPS * titleSlamDefaults.durationInSeconds}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={titleSlamDefaults}
        schema={titleSlamSchema}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(FPS * props.durationInSeconds),
        })}
      />

      <Composition
        id="LowerThird"
        component={LowerThird}
        durationInFrames={FPS * lowerThirdDefaults.durationInSeconds}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={lowerThirdDefaults}
        schema={lowerThirdSchema}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(FPS * props.durationInSeconds),
        })}
      />

      <Composition
        id="LogoReveal"
        component={LogoReveal}
        durationInFrames={FPS * logoRevealDefaults.durationInSeconds}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={logoRevealDefaults}
        schema={logoRevealSchema}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(FPS * props.durationInSeconds),
        })}
      />

      <Composition
        id="KineticType"
        component={KineticType}
        durationInFrames={FPS * kineticTypeDefaults.durationInSeconds}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={kineticTypeDefaults}
        schema={kineticTypeSchema}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(FPS * props.durationInSeconds),
        })}
      />

      <Composition
        id="SimpleTransition"
        component={SimpleTransition}
        durationInFrames={FPS * simpleTransitionDefaults.durationInSeconds}
        fps={FPS}
        width={WIDTH}
        height={HEIGHT}
        defaultProps={simpleTransitionDefaults}
        schema={simpleTransitionSchema}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.round(FPS * props.durationInSeconds),
        })}
      />
    </>
  );
};
