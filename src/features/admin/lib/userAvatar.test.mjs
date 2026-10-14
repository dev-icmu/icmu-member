import test from "node:test";
import assert from "node:assert/strict";
import { resolveSupabaseAvatarUrl } from "./userAvatar.js";

test("returns null for null, undefined or non-object users", () => {
  assert.equal(resolveSupabaseAvatarUrl(null), null);
  assert.equal(resolveSupabaseAvatarUrl(undefined), null);
  assert.equal(resolveSupabaseAvatarUrl("not-a-user"), null);
  assert.equal(resolveSupabaseAvatarUrl({}), null);
});

test("resolves avatar_url from user_metadata (OAuth / Supabase)", () => {
  const user = {
    user_metadata: {
      avatar_url: "https://lh3.googleusercontent.com/a/ACg8ocLexample",
    },
  };
  assert.equal(
    resolveSupabaseAvatarUrl(user),
    "https://lh3.googleusercontent.com/a/ACg8ocLexample"
  );
});

test("resolves picture from Google Auth user_metadata", () => {
  const user = {
    user_metadata: {
      picture: "https://lh3.googleusercontent.com/a/google-profile-pic",
    },
  };
  assert.equal(
    resolveSupabaseAvatarUrl(user),
    "https://lh3.googleusercontent.com/a/google-profile-pic"
  );
});

test("resolves avatar_url from app_metadata (ICMU Web sync)", () => {
  const user = {
    app_metadata: {
      avatar_url: "https://isipathanamedia.online/storage/v1/object/public/avatars/admin.png",
    },
  };
  assert.equal(
    resolveSupabaseAvatarUrl(user),
    "https://isipathanamedia.online/storage/v1/object/public/avatars/admin.png"
  );
});

test("resolves Supabase storage paths using storage client", () => {
  const mockSupabase = {
    storage: {
      from(bucket) {
        return {
          getPublicUrl(path) {
            return { data: { publicUrl: `https://project.supabase.co/storage/v1/object/public/${bucket}/${path}` } };
          },
        };
      },
    },
  };
  const user = {
    user_metadata: {
      avatar_url: "avatars/2026/profile.webp",
    },
  };
  assert.equal(
    resolveSupabaseAvatarUrl(user, mockSupabase),
    "https://project.supabase.co/storage/v1/object/public/avatars/2026/profile.webp"
  );
});

test("handles empty or whitespace strings gracefully", () => {
  const user = {
    user_metadata: {
      avatar_url: "   ",
    },
  };
  assert.equal(resolveSupabaseAvatarUrl(user), null);
});
