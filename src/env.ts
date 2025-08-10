import { z } from "zod/v4";

const envObject = z.object({
  ENVIRONMENT: z.enum(["dev", "prod"]),
  ROUTE_PREFIX: z.string().optional(),
  PORT: z.coerce.number().min(1).max(65535),
});

const parsed = envObject.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables!");
  throw z.treeifyError(parsed.error).properties;
}

console.log("✅ Environment variables parsed successfully...");

const env = parsed.data;
export default env;
