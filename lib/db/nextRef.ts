import { db } from "@/lib/db"
import { sequences } from "@/lib/db/schema"
import { sql } from "drizzle-orm"

export async function nextRef(prefix: string, seqName: string): Promise<string> {
  const [seq] = await db
    .insert(sequences)
    .values({ name: seqName, value: 1 })
    .onConflictDoUpdate({
      target: sequences.name,
      set: { value: sql`${sequences.value} + 1` },
    })
    .returning({ value: sequences.value })

  return `${prefix}-${String(seq.value).padStart(3, "0")}`
}
