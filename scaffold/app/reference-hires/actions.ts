"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { referenceHires } from "@/lib/db/schema";

export async function deleteReferenceHire(id: string): Promise<void> {
  const db = getDb();
  await db.delete(referenceHires).where(eq(referenceHires.id, id));
  revalidatePath("/reference-hires");
}
