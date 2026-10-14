/**
 * Resolves the profile avatar image URL from a Supabase Auth user object.
 * Checks user_metadata (OAuth providers like Google, GitHub),
 * app_metadata (ICMU Web account sync and administrative metadata),
 * and resolves Supabase Storage bucket paths when a storage client is supplied.
 */
export function resolveSupabaseAvatarUrl(user, supabaseClient) {
  if (!user || typeof user !== "object") return null;

  const candidate =
    user.user_metadata?.avatar_url ||
    user.user_metadata?.picture ||
    user.user_metadata?.profile_image_url ||
    user.user_metadata?.avatar ||
    user.app_metadata?.avatar_url ||
    user.app_metadata?.picture ||
    user.app_metadata?.profile_image_url ||
    user.avatar_url ||
    null;

  if (typeof candidate !== "string") return null;
  const trimmed = candidate.trim();
  if (!trimmed) return null;

  // Fully qualified web URLs or data URIs
  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // Supabase Storage path resolution: e.g. "avatars/my-profile.jpg"
  if (supabaseClient?.storage && trimmed.includes("/")) {
    try {
      const slashIndex = trimmed.indexOf("/");
      const bucket = trimmed.slice(0, slashIndex);
      const filePath = trimmed.slice(slashIndex + 1);
      if (bucket && filePath) {
        const { data } = supabaseClient.storage.from(bucket).getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Fallback to candidate string if storage client throws
    }
  }

  return trimmed;
}
