import { createClient } from "@/lib/supabase/server";

export type ContactEmailKey =
  | "legal_contact_emails"
  | "credits_contact_emails";

// Lee un setting *_contact_emails y devuelve el array de mails.
// Si la key no existe o el valor no es array, devuelve [].
export async function loadContactEmails(
  key: ContactEmailKey
): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  const value = data?.value;
  return Array.isArray(value) ? (value as string[]) : [];
}
