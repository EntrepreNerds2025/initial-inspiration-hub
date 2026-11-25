import { it, expect } from "vitest";
import { createClient } from "@supabase/supabase-js";
import type { Backend } from "../../../../supabase/functions/gallery-media/handler";
it("accepts the actual Supabase client at the privileged adapter boundary", () => {
  const backend: Backend = createClient("https://test.supabase.co", "public-test-key", {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  expect(typeof backend.rpc).toBe("function");
});
