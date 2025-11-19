// src/integrations/leAgentDiarySceneSchema.js
import { z } from 'zod';

export const LightingSchema = z.object({
  directional: z.object({
    intensity: z.number(),
    position: z.tuple([z.number(), z.number(), z.number()])
  }),
  rotatingPoints: z.array(
    z.object({
      radius: z.number(),
      height: z.number(),
      intensity: z.number()
    })
  ),
  spotlightGobo: z.object({
    enabled: z.boolean(),
    goboUrl: z.string().url().optional(),
    position: z.tuple([z.number(), z.number(), z.number()]),
    target: z.tuple([z.number(), z.number(), z.number()]),
    intensity: z.number(),
    angle: z.number(),
    penumbra: z.number()
  })
});

export const CameraSchema = z.object({
  preset: z.string(),
  fov: z.number(),
  position: z.tuple([z.number(), z.number(), z.number()]),
  target: z.tuple([z.number(), z.number(), z.number()])
});

export const EnvironmentSchema = z.object({
  hdrUrl: z.string().url().optional(),
  cubemapUrl: z.string().url().optional(),
  fog: z
    .object({
      color: z.string(),
      near: z.number(),
      far: z.number()
    })
    .optional()
});

export const MaterialsSchema = z.object({
  outerSphere: z.record(z.any()),
  innerSphere: z.record(z.any()),
  ground: z.record(z.any()),
  character: z.record(z.any())
});

export const UIConfigSchema = z.object({
  palette: z.string(),
  frameSvg: z.string(), // '001.svg' | '002.svg' from /public/svg/uiframe
  actionsBarPreset: z.string().default('default')
});

export const PostprocessingSchema = z.object({
  backend: z.enum(['webgl', 'webgpu']),
  bloom: z.object({
    enabled: z.boolean(),
    intensity: z.number()
  }),
  dof: z.object({
    enabled: z.boolean()
  }),
  fxaa: z.object({
    enabled: z.boolean()
  })
});

export const SceneSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  diaryEntryId: z.string().optional(),
  createdAt: z.string(),
  environment: EnvironmentSchema,
  camera: CameraSchema,
  lighting: LightingSchema,
  materials: MaterialsSchema,
  ui: UIConfigSchema,
  postprocessing: PostprocessingSchema,
  assets: z.object({
    characterModelUrl: z.string().url().optional(),
    videoTextureUrl: z.string().url().optional(),
    alphaMapUrl: z.string().url().optional()
  })
});

export function validateSceneJson(json) {
  return SceneSchema.parse(json);
}
