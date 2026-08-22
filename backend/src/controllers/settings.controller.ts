import type { Request, Response } from 'express';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../lib/ApiError.js';
import type { UpdateSettingsInput } from '../schemas/settings.schema.js';

/** Always the same row — there is exactly one shop. */
const SETTINGS_ID = 'singleton';

/**
 * Public — the storefront footer, checkout, and order pages all need to show
 * the shop's name, GST number, and contact details to anonymous visitors too.
 */
export const getSettings = async (_req: Request, res: Response) => {
  const settings = await prisma.shopSettings.findUnique({ where: { id: SETTINGS_ID } });

  if (!settings) {
    throw ApiError.notFound(
      'Shop settings have not been configured yet. An admin needs to set them from the dashboard.',
    );
  }

  res.json({ settings });
};

/** Admin-only. Upserts so the very first save works even before a row exists. */
export const updateSettings = async (req: Request, res: Response) => {
  const input = req.body as UpdateSettingsInput;

  const data = {
    shopName: input.shopName,
    gstNumber: input.gstNumber ?? null,
    phone: input.phone,
    email: input.email,
    addressLine1: input.addressLine1,
    city: input.city,
    state: input.state,
    pincode: input.pincode,
    district: input.district ?? null,
    landmark: input.landmark ?? null,
  };

  const settings = await prisma.shopSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });

  res.json({ settings });
};
