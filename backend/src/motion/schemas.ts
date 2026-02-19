/**
 * Re-export Remotion template schemas for use in backend routes.
 * This bridge file allows the backend TypeScript project to access
 * the Remotion schemas without extending rootDir.
 */

/* eslint-disable @typescript-eslint/no-var-requires */
const schemas = require('../../remotion/src/schemas');

export const TEMPLATE_IDS: string[] = schemas.TEMPLATE_IDS;

export const templateSchemas: Record<string, any> = schemas.templateSchemas;

export const templateDefaults: Record<string, Record<string, unknown>> =
  schemas.templateDefaults;

export const templateDescriptions: Record<string, string> =
  schemas.templateDescriptions;

export type TemplateId = string;
