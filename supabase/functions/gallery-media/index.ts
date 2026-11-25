import { createClient } from "npm:@supabase/supabase-js@2.117.3";
import jpeg from "npm:jpeg-js@0.4.4";
import { createGalleryHandler } from "./handler.ts";
const url = Deno.env.get("SUPABASE_URL")!;
const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
// Available only in the Supabase Edge runtime. NEVER copy this key into the site environment.
const backend = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const publicClient = createClient(url, anon, {
  auth: { persistSession: false, autoRefreshToken: false },
});
Deno.serve(
  createGalleryHandler({
    backend,
    async admin(bearer) {
      if (!bearer.startsWith("Bearer ")) return null;
      const userClient = createClient(url, anon, {
        global: { headers: { Authorization: bearer } },
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { data, error } = await userClient.auth.getUser(bearer.slice(7));
      if (error || !data.user) return null;
      const role = await userClient.rpc("is_gallery_admin");
      return !role.error && role.data === true ? data.user.id : null;
    },
    async directory() {
      const { data, error } = await publicClient.rpc("gallery_directory");
      if (error) throw error;
      return data;
    },
    decode(bytes) {
      jpeg.decode(bytes, {
        useTArray: true,
        maxResolutionInMP: 5,
        maxMemoryUsageInMB: 64,
        tolerantDecoding: false,
      });
    },
  }),
);
