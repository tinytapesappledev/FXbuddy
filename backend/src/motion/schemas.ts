/**
 * Template schemas for motion compositions.
 * Kept in sync with backend/remotion/src/schemas/index.ts
 */

import { z } from "zod";

// ─── TitleSlam ───────────────────────────────────────────────────────────────

const titleSlamSchema = z.object({
  text: z.string().default("YOUR TITLE"),
  color: z.string().default("#FFFFFF"),
  fontSize: z.number().min(20).max(300).default(120),
  fontFamily: z
    .enum(["Inter", "Roboto", "Oswald", "Bebas Neue", "Montserrat"])
    .default("Inter"),
  animationStyle: z.enum(["slam", "fade", "slide"]).default("slam"),
  backgroundColor: z.string().default("transparent"),
  durationInSeconds: z.number().min(1).max(10).default(3),
});
const titleSlamDefaults = titleSlamSchema.parse({});

// ─── LowerThird ──────────────────────────────────────────────────────────────

const lowerThirdSchema = z.object({
  name: z.string().default("John Doe"),
  title: z.string().default("Creative Director"),
  barColor: z.string().default("#FFFFFF"),
  textColor: z.string().default("#FFFFFF"),
  nameColor: z.string().default("#FFFFFF"),
  position: z.enum(["bottom-left", "bottom-right"]).default("bottom-left"),
  backgroundColor: z.string().default("transparent"),
  durationInSeconds: z.number().min(1).max(10).default(4),
});
const lowerThirdDefaults = lowerThirdSchema.parse({});

// ─── LogoReveal ──────────────────────────────────────────────────────────────

const logoRevealSchema = z.object({
  logoUrl: z.string().default("https://placehold.co/400x400/000/fff?text=LOGO"),
  revealStyle: z.enum(["fade", "zoom", "glitch"]).default("zoom"),
  backgroundColor: z.string().default("#000000"),
  durationInSeconds: z.number().min(1).max(10).default(3),
});
const logoRevealDefaults = logoRevealSchema.parse({});

// ─── KineticType ─────────────────────────────────────────────────────────────

const kineticTypeSchema = z.object({
  text: z.string().default("Motion graphics made simple"),
  speed: z.number().min(0.5).max(3).default(1),
  color: z.string().default("#FFFFFF"),
  fontFamily: z
    .enum(["Inter", "Roboto", "Oswald", "Bebas Neue", "Montserrat"])
    .default("Inter"),
  animationType: z.enum(["word", "letter", "line"]).default("word"),
  backgroundColor: z.string().default("transparent"),
  durationInSeconds: z.number().min(1).max(15).default(4),
});
const kineticTypeDefaults = kineticTypeSchema.parse({});

// ─── SimpleTransition ────────────────────────────────────────────────────────

const simpleTransitionSchema = z.object({
  transitionType: z.enum(["wipe", "fade", "zoom", "slide"]).default("wipe"),
  color1: z.string().default("#000000"),
  color2: z.string().default("#FFFFFF"),
  durationInSeconds: z.number().min(0.5).max(5).default(1.5),
});
const simpleTransitionDefaults = simpleTransitionSchema.parse({});

// ─── Template Registry ──────────────────────────────────────────────────────

export const TEMPLATE_IDS = [
  "TitleSlam",
  "LowerThird",
  "LogoReveal",
  "KineticType",
  "SimpleTransition",
] as const;

export type TemplateId = string;

export const templateSchemas: Record<string, z.ZodObject<any>> = {
  TitleSlam: titleSlamSchema,
  LowerThird: lowerThirdSchema,
  LogoReveal: logoRevealSchema,
  KineticType: kineticTypeSchema,
  SimpleTransition: simpleTransitionSchema,
};

export const templateDefaults: Record<string, Record<string, unknown>> = {
  TitleSlam: titleSlamDefaults,
  LowerThird: lowerThirdDefaults,
  LogoReveal: logoRevealDefaults,
  KineticType: kineticTypeDefaults,
  SimpleTransition: simpleTransitionDefaults,
};

export const templateDescriptions: Record<string, string> = {
  TitleSlam:
    "Bold title text that scales/slams into the frame with spring physics. Great for intro titles, chapter headings, and impact text.",
  LowerThird:
    "Professional name + title bar that slides in from the side. Used for identifying speakers, locations, or adding context.",
  LogoReveal:
    "Logo image that fades, zooms, or glitches into view. Perfect for brand intros, outros, and watermarks.",
  KineticType:
    "Text that animates word-by-word, letter-by-letter, or line-by-line. Great for quotes, lyrics, and emphasizing key messages.",
  SimpleTransition:
    "Clean wipe, fade, zoom, or slide transition between two colors. Use as intro/outro bumpers or scene dividers.",
};
