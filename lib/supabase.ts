import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const configured = Boolean(supabaseUrl && supabasePublishableKey);
// Null permits a helpful setup screen and a build without embedding fake credentials.
export const supabase = configured ? createClient(supabaseUrl!, supabasePublishableKey!) : null;
