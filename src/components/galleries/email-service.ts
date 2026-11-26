import { supabase } from "@/lib/screening/supabase";
import { GALLERY_PUBLIC_KEY, GALLERY_SUPABASE_URL } from "@/lib/galleries/config";
import type { EmailDraft } from "../../../supabase/functions/_shared/gallery-email";
export interface EmailHistory {
  id: string;
  kind: string;
  recipient: string;
  status: string;
  due_at: string;
  deadline: string;
  created_at: string;
  attempts: number;
  reason: string | null;
  accepted_at: string | null;
}
export interface GalleryEmailState {
  settings: { draft: EmailDraft; revision: number } | null;
  controls: {
    enabled: boolean;
    verified_until: string | null;
    daily_limit: number;
    monthly_limit: number;
    blocked_until: string | null;
    last_run: string | null;
  };
  daily_used: number;
  monthly_used: number;
  history: EmailHistory[];
}
async function rpc<T>(name: string, args: Record<string, unknown>): Promise<T> {
  if (!supabase) throw new Error("Sign in to manage gallery emails.");
  const { data, error } = await supabase.rpc(name, args);
  if (error) {
    if (error.code === "PGRST202" || error.code === "42P01")
      throw new Error(
        "Email setup is pending approval. You can edit and preview locally; saving and sending need the new email database setup.",
      );
    throw new Error(error.message || "Email operation failed.");
  }
  return data as T;
}
export const galleryEmailService = {
  load: (id: string) => rpc<GalleryEmailState>("gallery_email_state", { p_gallery_id: id }),
  save: (id: string, draft: EmailDraft, revision: number) =>
    rpc<number>("gallery_email_save", { p_gallery_id: id, p_draft: draft, p_revision: revision }),
  enqueue: (id: string, revision: number) =>
    rpc<string>("gallery_email_enqueue", { p_gallery_id: id, p_revision: revision }),
  async dispatch(id: string) {
    const { data } = await supabase!.auth.getSession();
    if (!data.session) throw new Error("Sign in before sending.");
    const response = await fetch(
      `${GALLERY_SUPABASE_URL}/functions/v1/gallery-email?action=dispatch`,
      {
        method: "POST",
        headers: {
          apikey: GALLERY_PUBLIC_KEY,
          Authorization: `Bearer ${data.session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      },
    );
    if (!response.ok)
      throw new Error(
        "Your send request was saved. Check history before retrying; the email worker may still need setup.",
      );
  },
};
