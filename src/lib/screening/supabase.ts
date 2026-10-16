import { createClient } from "@supabase/supabase-js";
// Dedicated screening project. Do not use generic site env keys or a service-role key.
export const SCREENING_URL = "https://pozmyqfosfaeheiqwioh.supabase.co";
const publicKey = "sb_publishable_Yy5dSUitW4YElDx4ZohEjg_YeCFvAP_";
export const configured = true;
// Never create a shared server-side Auth session or fetch private data during SSR.
export const supabase =
  typeof window === "undefined"
    ? null
    : createClient(SCREENING_URL, publicKey, {
        auth: {
          storageKey: "dept-screening-auth",
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
export const APP_NAME = "THE SCREENING ROOM";
