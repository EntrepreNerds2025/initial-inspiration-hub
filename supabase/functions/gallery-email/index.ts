import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import { createEmailHandler } from "./handler.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(
  createEmailHandler({
    // Two independent gates: approved Edge configuration AND disabled-by-default SQL controls.
    enabled:
      Deno.env.get("GALLERY_EMAIL_ENABLED") === "true" &&
      Deno.env.get("GALLERY_EMAIL_FREE_PLANS_CONFIRMED") === "true" &&
      !!Deno.env.get("RESEND_API_KEY"),
    cronSecret: Deno.env.get("GALLERY_EMAIL_CRON_SECRET") || "",
    webhookSecret: Deno.env.get("RESEND_WEBHOOK_SECRET") || "",
    async rpc(name, args) {
      const { data, error } = await service.rpc(name, args);
      if (error) throw new Error("Email database operation failed");
      return data;
    },
    async admin(bearer) {
      if (!bearer.startsWith("Bearer ")) return false;
      const client = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: bearer } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await client.auth.getUser(bearer.slice(7));
      if (error || !data.user) return false;
      const role = await client.rpc("is_gallery_admin");
      return !role.error && role.data === true;
    },
    async send(message, key) {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          Authorization: "Bearer " + Deno.env.get("RESEND_API_KEY"),
          "Content-Type": "application/json",
          "Idempotency-Key": key,
        },
        body: JSON.stringify(message),
      });
      const data = await response.json().catch(() => ({}));
      return { status: response.status, ...(typeof data.id === "string" ? { id: data.id } : {}) };
    },
    pause: () => new Promise((resolve) => setTimeout(resolve, 1100)),
  }),
);
