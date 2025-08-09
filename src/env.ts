import { z } from "zod";

const envObject = z.object({});

const parsed = envObject.safeParse(process.env);
if (!parsed.success) {
  console.error("❌ Invalid environment variables!");
  throw z.treeifyError(parsed.error).properties;
}

console.log("✅ Environment variables parsed successfully...");

const env = parsed.data;
export default env;
