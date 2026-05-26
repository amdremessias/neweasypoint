import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, integrationsTable, locationSettingsTable } from "@workspace/db";
import { requireAdmin } from "../middlewares/requireAuth";
import { z } from "zod";

const router: IRouter = Router();

const IntegrationBody = z.object({
  name: z.string().min(1),
  type: z.enum(["geolocation", "calendar", "api"]),
  config: z.record(z.any()).optional(),
  isActive: z.boolean().optional(),
});

const LocationBody = z.object({
  name: z.string().min(1).optional(),
  latitude: z.string().regex(/^-?\d+(\.\d+)?$/),
  longitude: z.string().regex(/^-?\d+(\.\d+)?$/),
  radiusMeters: z.number().int().min(1).max(10000).optional(),
  isActive: z.boolean().optional(),
});

router.get("/integrations", requireAdmin, async (req, res): Promise<void> => {
  const integrations = await db.select().from(integrationsTable).orderBy(integrationsTable.id);
  const locations = await db.select().from(locationSettingsTable).orderBy(locationSettingsTable.id);
  res.json({ integrations, locations });
});

router.post("/integrations", requireAdmin, async (req, res): Promise<void> => {
  const parsed = IntegrationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [integration] = await db
    .insert(integrationsTable)
    .values({
      name: parsed.data.name,
      type: parsed.data.type,
      config: JSON.stringify(parsed.data.config ?? {}),
      isActive: parsed.data.isActive ?? false,
    })
    .returning();

  res.status(201).json(integration);
});

router.put("/integrations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalido." });
    return;
  }

  const parsed = IntegrationBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.type !== undefined) updateData.type = parsed.data.type;
  if (parsed.data.config !== undefined) updateData.config = JSON.stringify(parsed.data.config);
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [updated] = await db
    .update(integrationsTable)
    .set(updateData)
    .where(eq(integrationsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Integracao nao encontrada." });
    return;
  }

  res.json(updated);
});

router.delete("/integrations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalido." });
    return;
  }

  const [deleted] = await db
    .delete(integrationsTable)
    .where(eq(integrationsTable.id, id))
    .returning({ id: integrationsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Integracao nao encontrada." });
    return;
  }

  res.json({ ok: true });
});

// Location settings endpoints
router.get("/integrations/locations", requireAdmin, async (req, res): Promise<void> => {
  const locations = await db.select().from(locationSettingsTable).orderBy(locationSettingsTable.id);
  res.json(locations);
});

router.post("/integrations/locations", requireAdmin, async (req, res): Promise<void> => {
  const parsed = LocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [location] = await db
    .insert(locationSettingsTable)
    .values({
      name: parsed.data.name ?? "Local Principal",
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      radiusMeters: parsed.data.radiusMeters ?? 100,
      isActive: parsed.data.isActive ?? true,
    })
    .returning();

  res.status(201).json(location);
});

router.put("/integrations/locations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalido." });
    return;
  }

  const parsed = LocationBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.latitude !== undefined) updateData.latitude = parsed.data.latitude;
  if (parsed.data.longitude !== undefined) updateData.longitude = parsed.data.longitude;
  if (parsed.data.radiusMeters !== undefined) updateData.radiusMeters = parsed.data.radiusMeters;
  if (parsed.data.isActive !== undefined) updateData.isActive = parsed.data.isActive;

  const [updated] = await db
    .update(locationSettingsTable)
    .set(updateData)
    .where(eq(locationSettingsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Local nao encontrado." });
    return;
  }

  res.json(updated);
});

router.delete("/integrations/locations/:id", requireAdmin, async (req, res): Promise<void> => {
  const id = Number(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "ID invalido." });
    return;
  }

  const [deleted] = await db
    .delete(locationSettingsTable)
    .where(eq(locationSettingsTable.id, id))
    .returning({ id: locationSettingsTable.id });

  if (!deleted) {
    res.status(404).json({ error: "Local nao encontrado." });
    return;
  }

  res.json({ ok: true });
});

export default router;
