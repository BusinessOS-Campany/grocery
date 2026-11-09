import { z } from "zod";

const hex = z.string().trim().regex(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Invalid hex color").optional().nullable().or(z.literal(""));

export const brandingSchema = z.object({
  systemName: z.string().trim().min(1).max(120).optional().nullable(),
  shortName: z.string().trim().min(1).max(40).optional().nullable(),
  description: z.string().trim().max(300).optional().nullable().or(z.literal("")),
  companyName: z.string().trim().max(150).optional().nullable().or(z.literal("")),
  footerText: z.string().trim().max(300).optional().nullable().or(z.literal("")),

  logoLightPath: z.string().trim().max(260).optional().nullable().or(z.literal("")),
  logoDarkPath: z.string().trim().max(260).optional().nullable().or(z.literal("")),
  faviconPath: z.string().trim().max(260).optional().nullable().or(z.literal("")),
  pwaIconPath: z.string().trim().max(260).optional().nullable().or(z.literal("")),

  primaryColor: hex,
  secondaryColor: hex,
  accentColor: hex,
  sidebarBgColor: hex,
  headerBgColor: hex,
  pageBgColor: hex,
  cardBgColor: hex,
  textColor: hex,
  buttonColor: hex,
  borderColor: hex,

  buttonRadius: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  cardRadius: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  inputRadius: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  modalRadius: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  dropdownRadius: z.coerce.number().int().min(0).max(9999).optional().nullable(),
  componentRadius: z.coerce.number().int().min(0).max(9999).optional().nullable(),

  pageBgImage: z.string().trim().max(260).optional().nullable().or(z.literal("")),
  pageBgImagePosition: z.string().trim().max(40).optional().nullable(),
  pageBgImageSize: z.string().trim().max(40).optional().nullable(),
  loginBgColor: hex,

  pwaName: z.string().trim().min(1).max(120).optional().nullable(),
  pwaShortName: z.string().trim().min(1).max(40).optional().nullable(),
  pwaDescription: z.string().trim().max(300).optional().nullable().or(z.literal("")),
  pwaThemeColor: hex,
  pwaBackgroundColor: hex,
});

export type BrandingInput = z.infer<typeof brandingSchema>;