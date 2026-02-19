import { z } from "zod";

// ─── TitleSlam ───────────────────────────────────────────────────────────────

export const titleSlamSchema = z.object({
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

export type TitleSlamProps = z.infer<typeof titleSlamSchema>;
export const titleSlamDefaults = titleSlamSchema.parse({});

// ─── LowerThird ──────────────────────────────────────────────────────────────

export const lowerThirdSchema = z.object({
  name: z.string().default("John Doe"),
  title: z.string().default("Creative Director"),
  barColor: z.string().default("#FFFFFF"),
  textColor: z.string().default("#FFFFFF"),
  nameColor: z.string().default("#FFFFFF"),
  position: z.enum(["bottom-left", "bottom-right"]).default("bottom-left"),
  backgroundColor: z.string().default("transparent"),
  durationInSeconds: z.number().min(1).max(10).default(4),
});

export type LowerThirdProps = z.infer<typeof lowerThirdSchema>;
export const lowerThirdDefaults = lowerThirdSchema.parse({});

// ─── LogoReveal ──────────────────────────────────────────────────────────────

export const logoRevealSchema = z.object({
  logoUrl: z.string().default("https://placehold.co/400x400/000/fff?text=LOGO"),
  revealStyle: z.enum(["fade", "zoom", "glitch"]).default("zoom"),
  backgroundColor: z.string().default("#000000"),
  durationInSeconds: z.number().min(1).max(10).default(3),
});

export type LogoRevealProps = z.infer<typeof logoRevealSchema>;
export const logoRevealDefaults = logoRevealSchema.parse({});

// ─── KineticType ─────────────────────────────────────────────────────────────

export const kineticTypeSchema = z.object({
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

export type KineticTypeProps = z.infer<typeof kineticTypeSchema>;
export const kineticTypeDefaults = kineticTypeSchema.parse({});

// ─── SimpleTransition ────────────────────────────────────────────────────────

export const simpleTransitionSchema = z.object({
  transitionType: z.enum(["wipe", "fade", "zoom", "slide"]).default("wipe"),
  color1: z.string().default("#000000"),
  color2: z.string().default("#FFFFFF"),
  durationInSeconds: z.number().min(0.5).max(5).default(1.5),
});

export type SimpleTransitionProps = z.infer<typeof simpleTransitionSchema>;
export const simpleTransitionDefaults = simpleTransitionSchema.parse({});

// ─── Template Registry ──────────────────────────────────────────────────────

export const TEMPLATE_IDS = [
  "TitleSlam",
  "LowerThird",
  "LogoReveal",
  "KineticType",
  "SimpleTransition",
] as const;

export type TemplateId = (typeof TEMPLATE_IDS)[number];

export const templateSchemas: Record<TemplateId, z.ZodObject<any>> = {
  TitleSlam: titleSlamSchema,
  LowerThird: lowerThirdSchema,
  LogoReveal: logoRevealSchema,
  KineticType: kineticTypeSchema,
  SimpleTransition: simpleTransitionSchema,
};

export const templateDefaults: Record<TemplateId, Record<string, unknown>> = {
  TitleSlam: titleSlamDefaults,
  LowerThird: lowerThirdDefaults,
  LogoReveal: logoRevealDefaults,
  KineticType: kineticTypeDefaults,
  SimpleTransition: simpleTransitionDefaults,
};

export const templateDescriptions: Record<TemplateId, string> = {
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
