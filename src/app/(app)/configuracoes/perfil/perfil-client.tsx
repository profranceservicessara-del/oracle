"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/client";
import { validateUpload } from "@/lib/upload-validation";
import type { Profile } from "@/lib/types";

export function PerfilClient({ initialProfile, userId }: { initialProfile: Profile | null; userId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { showToast } = useToast();
  const [profile, setProfile] = useState(initialProfile);
  const [avatarSignedUrl, setAvatarSignedUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadAvatar() {
      if (!profile?.avatar_url) {
        setAvatarSignedUrl(null);
        return;
      }
      const { data } = await supabase.storage.from("logos").createSignedUrl(profile.avatar_url, 900);
      setAvatarSignedUrl(data?.signedUrl ?? null);
    }
    void loadAvatar();
  }, [profile?.avatar_url, supabase]);

  async function handleAvatarChange(file: File) {
    const validationError = validateUpload(file, "avatar");
    if (validationError) {
      showToast(validationError, "error");
      return;
    }
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "png";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage.from("logos").upload(path, file, { cacheControl: "3600", upsert: true });
      if (uploadError) throw uploadError;

      const { data, error } = await supabase.from("profiles").upsert({ id: userId, avatar_url: path }).select("*").single();
      if (error) throw error;

      setProfile(data as Profile);
      showToast("Foto do perfil atualizada.", "success");
      router.refresh();
    } catch {
      setAvatarPreview(null);
      showToast("Não foi possível atualizar a foto.", "error");
    } finally {
      setAvatarUploading(false);
    }
  }

  const companyName = [profile?.prenom, profile?.nome].filter(Boolean).join(" ");
  const shown = avatarPreview ?? avatarSignedUrl;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <p className="text-sm font-semibold text-brand">Configurações</p>
        <h1 className="mt-2 text-2xl font-semibold text-ink">Perfil</h1>
        <p className="mt-2 text-sm text-muted">Sua foto de perfil de usuário.</p>
      </div>

      <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-[#EAF0FF] text-2xl font-bold text-[#1D4ED8] ring-1 ring-black/5">
              {shown ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt="Foto do perfil" className="h-full w-full object-cover" src={shown} />
              ) : (
                (companyName.trim()[0] ?? "U").toUpperCase()
              )}
            </div>
            <button
              aria-label="Alterar foto do perfil"
              className="absolute -bottom-1 -right-1 inline-flex h-8 w-8 items-center justify-center rounded-full bg-[#002D72] text-white shadow-md ring-2 ring-white transition hover:bg-[#0140A6] disabled:opacity-60"
              disabled={avatarUploading}
              onClick={() => avatarInputRef.current?.click()}
              title="Alterar foto do perfil"
              type="button"
            >
              {avatarUploading ? (
                <svg className="animate-spin" fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24" width="15">
                  <path d="M21 12a9 9 0 1 1-6.2-8.5" />
                </svg>
              ) : (
                <svg fill="none" height="15" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" viewBox="0 0 24 24" width="15">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                </svg>
              )}
            </button>
            <input
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void handleAvatarChange(file);
                event.target.value = "";
              }}
              ref={avatarInputRef}
              type="file"
            />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">{companyName || "Meu perfil"}</p>
            <p className="text-sm text-muted">Foto do perfil de usuário</p>
          </div>
        </div>
      </section>
    </main>
  );
}
