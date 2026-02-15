"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { applyThemePreview, clearThemePreview } from "@/components/theme/applyThemePreview";
import { Image as ImageIcon, Palette, Eye, Save } from "lucide-react";

type TenantInfo = {
  id: string;
  name: string;
  subdomain: string;
  domain: string;
};

type Preset = {
  key: string;
  label: string;
  accent: string;
  accent2: string;
  accent3: string;
  bg: string;
  card: string;
  topbar?: string;
  glow1: number;
  glow2: number;
  glow3: number;
};

const PRESETS: Preset[] = [
  { key: "hi5-default", label: "Hi5Tech (Default)", accent: "#00c1ff", accent2: "#ff4fe1", accent3: "#ffc42d", bg: "#f8fafc", card: "#ffffff", topbar: "", glow1: 0.18, glow2: 0.14, glow3: 0.1 },
  { key: "midnight-neon", label: "Midnight Neon", accent: "#7C5CFF", accent2: "#38BDF8", accent3: "#FDE047", bg: "#0B1020", card: "#0F172A", topbar: "#0B1224", glow1: 0.22, glow2: 0.18, glow3: 0.14 },
  { key: "emerald-glow", label: "Emerald Glow", accent: "#34D399", accent2: "#22D3EE", accent3: "#FBBF24", bg: "#F8FAFC", card: "#FFFFFF", topbar: "", glow1: 0.16, glow2: 0.12, glow3: 0.1 },
  { key: "rose-graphite", label: "Rose + Graphite", accent: "#FB7185", accent2: "#A78BFA", accent3: "#FBBF24", bg: "#0B0D12", card: "#111827", topbar: "#0B0D12", glow1: 0.22, glow2: 0.18, glow3: 0.14 },
  { key: "ocean-glass", label: "Ocean Glass", accent: "#0EA5E9", accent2: "#22C55E", accent3: "#F97316", bg: "#F1F5F9", card: "#FFFFFF", topbar: "", glow1: 0.17, glow2: 0.13, glow3: 0.1 },
  { key: "neutral-light", label: "Neutral (Light) — White / Grey / Blue", accent: "#2563EB", accent2: "#2563EB", accent3: "#2563EB", bg: "#FFFFFF", card: "#F3F4F6", topbar: "#FFFFFF", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-dark", label: "Neutral (Dark) — Charcoal / Slate / Blue", accent: "#3B82F6", accent2: "#3B82F6", accent3: "#3B82F6", bg: "#0B0D12", card: "#111827", topbar: "#0B0D12", glow1: 0, glow2: 0, glow3: 0 },
  { key: "minimal-grey", label: "Minimal Grey — Soft UI", accent: "#1D4ED8", accent2: "#1D4ED8", accent3: "#1D4ED8", bg: "#F8FAFC", card: "#E5E7EB", topbar: "#F8FAFC", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-light-blue", label: "Neutral Light — White / Grey / Blue (No gradients)", accent: "#2563EB", accent2: "#2563EB", accent3: "#2563EB", bg: "#FFFFFF", card: "#F3F4F6", topbar: "#FFFFFF", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-light-teal", label: "Neutral Light — White / Grey / Teal (No gradients)", accent: "#0D9488", accent2: "#0D9488", accent3: "#0D9488", bg: "#FFFFFF", card: "#F3F4F6", topbar: "#FFFFFF", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-light-purple", label: "Neutral Light — White / Grey / Purple (No gradients)", accent: "#7C3AED", accent2: "#7C3AED", accent3: "#7C3AED", bg: "#FFFFFF", card: "#F3F4F6", topbar: "#FFFFFF", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-dark-blue", label: "Neutral Dark — Black / Slate / Blue (No gradients)", accent: "#3B82F6", accent2: "#3B82F6", accent3: "#3B82F6", bg: "#000000", card: "#111827", topbar: "#000000", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-dark-emerald", label: "Neutral Dark — Black / Slate / Emerald (No gradients)", accent: "#10B981", accent2: "#10B981", accent3: "#10B981", bg: "#000000", card: "#111827", topbar: "#000000", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-dark-amber", label: "Neutral Dark — Black / Slate / Amber (No gradients)", accent: "#F59E0B", accent2: "#F59E0B", accent3: "#F59E0B", bg: "#000000", card: "#111827", topbar: "#000000", glow1: 0, glow2: 0, glow3: 0 },
  { key: "neutral-soft-grey", label: "Neutral Soft — Off-white / Grey / Blue (No gradients)", accent: "#1D4ED8", accent2: "#1D4ED8", accent3: "#1D4ED8", bg: "#F8FAFC", card: "#E5E7EB", topbar: "#F8FAFC", glow1: 0, glow2: 0, glow3: 0 },
];

function cn(...s: Array<string | false | null | undefined>) {
  return s.filter(Boolean).join(" ");
}

function ColorField({ label, value, onChange, hint }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs opacity-70">{label}</div>
        {hint ? <div className="text-[11px] opacity-60">{hint}</div> : null}
      </div>
      <div className="flex items-center gap-3">
        <input className="h-11 w-14 rounded-2xl border hi5-border hi5-card px-2" type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={label} />
        <input className="flex-1 rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none" value={value} onChange={(e) => onChange(e.target.value)} placeholder="#00c1ff" />
      </div>
    </label>
  );
}

function RangeField({ label, value, onChange, min = 0, max = 1, step = 0.01, hint }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; hint?: string }) {
  return (
    <label className="block">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div className="text-xs opacity-70">{label}</div>
        <div className="text-[11px] opacity-60">{hint ? `${hint} • ` : ""}{value.toFixed(2)}</div>
      </div>
      <input className="w-full" type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

function safeFileExt(name: string) {
  const base = (name || "").toLowerCase();
  const dot = base.lastIndexOf(".");
  const ext = dot >= 0 ? base.slice(dot + 1) : "";
  if (["png", "jpg", "jpeg", "webp", "svg"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "png";
}

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  return { url, anon };
}

type CropResult = { blob: Blob };

function CropModal({
  file,
  open,
  onClose,
  onConfirm,
}: {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (res: CropResult) => Promise<void> | void;
}) {
  const [err, setErr] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1.2);
  const [dx, setDx] = useState(0);
  const [dy, setDy] = useState(0);
  const [busy, setBusy] = useState(false);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  const url = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  useEffect(() => {
    if (!open) return;
    setErr(null);
    setBusy(false);
    setZoom(1.2);
    setDx(0);
    setDy(0);
  }, [open, file]);

  useEffect(() => {
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [url]);

  function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
  }

  async function exportCroppedPng(): Promise<CropResult> {
    const img = imgRef.current;
    const box = boxRef.current;
    if (!img || !box) throw new Error("Cropper not ready");

    const bw = box.clientWidth;
    const bh = box.clientHeight;
    const iw = img.naturalWidth;
    const ih = img.naturalHeight;
    if (!bw || !bh || !iw || !ih) throw new Error("Invalid image");

    const baseScale = Math.max(bw / iw, bh / ih);
    const scale = baseScale * zoom;

    const drawW = iw * scale;
    const drawH = ih * scale;
    const drawX = (bw - drawW) / 2 + dx;
    const drawY = (bh - drawH) / 2 + dy;

    const out = 512;
    const outCanvas = document.createElement("canvas");
    outCanvas.width = out;
    outCanvas.height = out;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) throw new Error("Canvas unsupported");

    const s = out / bw;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.clearRect(0, 0, out, out);
    ctx.drawImage(img, drawX * s, drawY * s, drawW * s, drawH * s);

    const blob: Blob = await new Promise((resolve, reject) => {
      outCanvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), "image/png", 0.92);
    });

    return { blob };
  }

  const drag = useRef<{ on: boolean; x: number; y: number; dx: number; dy: number }>({
    on: false,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
  });

  function onPointerDown(e: React.PointerEvent) {
    if (!open) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { on: true, x: e.clientX, y: e.clientY, dx, dy };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.on) return;
    const nx = drag.current.dx + (e.clientX - drag.current.x);
    const ny = drag.current.dy + (e.clientY - drag.current.y);
    setDx(clamp(nx, -400, 400));
    setDy(clamp(ny, -400, 400));
  }
  function onPointerUp(e: React.PointerEvent) {
    drag.current.on = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  }

  if (!open || !file) return null;

  return (
    <>
      <div className="hi5-overlay z-40" onClick={busy ? undefined : onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3">
        <div className="hi5-panel w-full max-w-xl p-0 overflow-hidden">
          <div className="px-5 py-4 border-b hi5-divider flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold">Crop logo</div>
              <div className="text-xs opacity-70">Drag • Zoom • Exports 512×512 PNG</div>
            </div>
            <button className="hi5-btn-ghost text-sm w-auto" onClick={onClose} disabled={busy}>
              Close
            </button>
          </div>

          <div className="p-5 space-y-4">
            {err ? <div className="text-sm text-red-500">{err}</div> : null}

            <div
              ref={boxRef}
              className="mx-auto w-[320px] h-[320px] rounded-3xl border hi5-border overflow-hidden bg-black/5 dark:bg-white/5 select-none touch-none"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imgRef}
                src={url}
                alt="Crop"
                className="w-full h-full object-cover"
                style={{
                  transform: `translate(${dx}px, ${dy}px) scale(${zoom})`,
                  transformOrigin: "center",
                }}
                draggable={false}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2 items-center">
              <label className="block">
                <div className="text-xs opacity-70 mb-1">Zoom</div>
                <input className="w-full" type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} disabled={busy} />
              </label>

              <div className="flex gap-2 justify-end">
                <button
                  className="hi5-btn-ghost text-sm w-auto"
                  onClick={() => {
                    setZoom(1.2);
                    setDx(0);
                    setDy(0);
                  }}
                  disabled={busy}
                >
                  Reset
                </button>
                <button
                  className="hi5-btn-primary text-sm w-auto"
                  disabled={busy}
                  onClick={async () => {
                    setBusy(true);
                    setErr(null);
                    try {
                      const res = await exportCroppedPng();
                      await onConfirm(res);
                      onClose();
                    } catch (e: any) {
                      setErr(e?.message || "Crop failed");
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {busy ? "Exporting…" : "Use cropped logo"}
                </button>
              </div>
            </div>

            <div className="text-[11px] opacity-60">Tip: transparent PNGs look best.</div>
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * Auto-generate a dark variant from a light PNG:
 * - invert RGB
 * - boost contrast a touch
 * Keeps alpha as-is.
 */
async function makeDarkVariantPng(lightPng: Blob): Promise<Blob> {
  const bmp = await createImageBitmap(lightPng);
  const c = document.createElement("canvas");
  c.width = bmp.width;
  c.height = bmp.height;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("Canvas unsupported");

  ctx.drawImage(bmp, 0, 0);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const d = img.data;

  // simple contrast function around mid
  const contrast = 1.08;
  const adj = (x: number) => clampToByte((x - 128) * contrast + 128);

  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3];
    if (a === 0) continue;

    // invert
    let r = 255 - d[i];
    let g = 255 - d[i + 1];
    let b = 255 - d[i + 2];

    // slight contrast boost
    d[i] = adj(r);
    d[i + 1] = adj(g);
    d[i + 2] = adj(b);
  }

  ctx.putImageData(img, 0, 0);

  const out: Blob = await new Promise((resolve, reject) => {
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Failed to create dark variant"))), "image/png", 0.92);
  });
  return out;
}

function clampToByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function Tabs({
  value,
  onChange,
}: {
  value: "logo" | "theme" | "preview";
  onChange: (v: "logo" | "theme" | "preview") => void;
}) {
  const base = "flex-1 rounded-2xl px-3 py-2 text-sm border hi5-border transition";
  const active = "hi5-card";
  const idle = "opacity-80 hover:opacity-100";

  return (
    <div className="hi5-panel p-2 flex gap-2 lg:hidden">
      <button className={cn(base, value === "logo" ? active : idle)} onClick={() => onChange("logo")} type="button">
        <span className="inline-flex items-center gap-2"><ImageIcon size={16} /> Logo</span>
      </button>
      <button className={cn(base, value === "theme" ? active : idle)} onClick={() => onChange("theme")} type="button">
        <span className="inline-flex items-center gap-2"><Palette size={16} /> Theme</span>
      </button>
      <button className={cn(base, value === "preview" ? active : idle)} onClick={() => onChange("preview")} type="button">
        <span className="inline-flex items-center gap-2"><Eye size={16} /> Preview</span>
      </button>
    </div>
  );
}

export default function BrandingEditorClient({
  tenant,
  initial,
}: {
  tenant: TenantInfo;
  initial: {
    logo_light_url: string;
    logo_dark_url: string;

    accent_hex: string;
    accent_2_hex: string;
    accent_3_hex: string;
    bg_hex: string;
    card_hex: string;
    topbar_hex: string;
    glow_1: number;
    glow_2: number;
    glow_3: number;
  };
}) {
  const init = useMemo(() => initial, [initial]);

  const [tab, setTab] = useState<"logo" | "theme" | "preview">("logo");

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [presetKey, setPresetKey] = useState<string>("");

  const [logoLightUrl, setLogoLightUrl] = useState(init.logo_light_url || "");
  const [logoDarkUrl, setLogoDarkUrl] = useState(init.logo_dark_url || "");
  const [logoUploading, setLogoUploading] = useState(false);

  // local preview urls (so you see the variants instantly even before save finishes)
  const [logoLightPreview, setLogoLightPreview] = useState<string>("");
  const [logoDarkPreview, setLogoDarkPreview] = useState<string>("");

  const [cropOpen, setCropOpen] = useState(false);
  const [cropFile, setCropFile] = useState<File | null>(null);

  const [accent, setAccent] = useState(init.accent_hex);
  const [accent2, setAccent2] = useState(init.accent_2_hex);
  const [accent3, setAccent3] = useState(init.accent_3_hex);

  const [bg, setBg] = useState(init.bg_hex);
  const [card, setCard] = useState(init.card_hex);
  const [topbar, setTopbar] = useState(init.topbar_hex || "");

  const [glow1, setGlow1] = useState(init.glow_1);
  const [glow2, setGlow2] = useState(init.glow_2);
  const [glow3, setGlow3] = useState(init.glow_3);

  // live theme preview while editing
  useEffect(() => {
    applyThemePreview({
      accent_hex: accent,
      accent_2_hex: accent2,
      accent_3_hex: accent3,
      bg_hex: bg,
      card_hex: card,
      topbar_hex: topbar || card,
      glow_1: glow1,
      glow_2: glow2,
      glow_3: glow3,
    });
    return () => clearThemePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent, accent2, accent3, bg, card, topbar, glow1, glow2, glow3]);

  useEffect(() => {
    return () => {
      if (logoLightPreview) URL.revokeObjectURL(logoLightPreview);
      if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
    };
  }, [logoLightPreview, logoDarkPreview]);

  function applyPreset(p: Preset) {
    setAccent(p.accent);
    setAccent2(p.accent2);
    setAccent3(p.accent3);
    setBg(p.bg);
    setCard(p.card);
    setTopbar(p.topbar ?? "");
    setGlow1(p.glow1);
    setGlow2(p.glow2);
    setGlow3(p.glow3);
  }

  async function saveTheme(partial?: Record<string, any>) {
    setSaving(true);
    setErr(null);
    setOk(null);

    try {
      const payload = {
        // logo variants
        logo_light_url: logoLightUrl.trim() || null,
        logo_dark_url: logoDarkUrl.trim() || null,
        // legacy sync
        logo_url: logoLightUrl.trim() || null,

        // theme
        accent_hex: accent.trim() || null,
        accent_2_hex: accent2.trim() || null,
        accent_3_hex: accent3.trim() || null,
        bg_hex: bg.trim() || null,
        card_hex: card.trim() || null,
        topbar_hex: topbar && topbar.trim() ? topbar.trim() : card.trim() || "#ffffff",
        glow_1: glow1,
        glow_2: glow2,
        glow_3: glow3,

        ...partial,
      };

      const res = await fetch("/api/admin/setup/save", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Save failed (${res.status})`);
      }

      setOk("Saved");
    } catch (e: any) {
      setErr(e?.message || "Failed to save");
    } finally {
      setSaving(false);
      setTimeout(() => setOk(null), 1200);
    }
  }

  async function uploadToStorage(blobOrFile: Blob, path: string, contentType: string) {
    const { url, anon } = requireSupabaseEnv();
    const supabase = createBrowserClient(url, anon);

    const { error: upErr } = await supabase.storage.from("tenant-assets").upload(path, blobOrFile, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

    if (upErr) throw upErr;

    const { data } = supabase.storage.from("tenant-assets").getPublicUrl(path);
    const publicUrl = data?.publicUrl;
    if (!publicUrl) throw new Error("Could not get public URL for uploaded logo");

    return publicUrl;
  }

  async function uploadOneLogoAutoVariantsFromPng(png: Blob) {
    setLogoUploading(true);
    setErr(null);
    setOk(null);

    try {
      // create dark variant blob
      const darkPng = await makeDarkVariantPng(png);

      // instant previews while upload happens
      if (logoLightPreview) URL.revokeObjectURL(logoLightPreview);
      if (logoDarkPreview) URL.revokeObjectURL(logoDarkPreview);
      setLogoLightPreview(URL.createObjectURL(png));
      setLogoDarkPreview(URL.createObjectURL(darkPng));

      const lightPath = `tenants/${tenant.id}/logo-light.png`;
      const darkPath = `tenants/${tenant.id}/logo-dark.png`;

      const lightUrl = await uploadToStorage(png, lightPath, "image/png");
      const darkUrl = await uploadToStorage(darkPng, darkPath, "image/png");

      setLogoLightUrl(lightUrl);
      setLogoDarkUrl(darkUrl);

      // save both urls + legacy sync
      await saveTheme({ logo_light_url: lightUrl, logo_dark_url: darkUrl, logo_url: lightUrl });

      setOk("Logo uploaded (auto light/dark)");
    } catch (e: any) {
      setErr(e?.message || "Logo upload failed");
    } finally {
      setLogoUploading(false);
      setTimeout(() => setOk(null), 1200);
    }
  }

  async function onPickLogo(file: File) {
    const ext = safeFileExt(file.name);

    // SVG: store the same file as both light & dark (no recolor)
    if (ext === "svg") {
      setLogoUploading(true);
      setErr(null);
      setOk(null);

      try {
        const lightPath = `tenants/${tenant.id}/logo-light.svg`;
        const darkPath = `tenants/${tenant.id}/logo-dark.svg`;

        const lightUrl = await uploadToStorage(file, lightPath, file.type || "image/svg+xml");
        const darkUrl = await uploadToStorage(file, darkPath, file.type || "image/svg+xml");

        setLogoLightUrl(lightUrl);
        setLogoDarkUrl(darkUrl);

        // previews from URL
        setLogoLightPreview("");
        setLogoDarkPreview("");

        await saveTheme({ logo_light_url: lightUrl, logo_dark_url: darkUrl, logo_url: lightUrl });
        setOk("SVG logo uploaded");
      } catch (e: any) {
        setErr(e?.message || "Logo upload failed");
      } finally {
        setLogoUploading(false);
        setTimeout(() => setOk(null), 1200);
      }
      return;
    }

    // raster: crop first, then we auto-generate dark variant
    setCropFile(file);
    setCropOpen(true);
  }

  return (
    <div className="space-y-4">
      {/* Mobile tabs */}
      <Tabs value={tab} onChange={setTab} />

      {/* Messages */}
      {err ? <div className="hi5-panel p-4 text-sm text-red-500">{err}</div> : null}
      {ok ? <div className="hi5-panel p-4 text-sm text-emerald-500">{ok}</div> : null}

      {/* Crop */}
      <CropModal
        open={cropOpen}
        file={cropFile}
        onClose={() => {
          setCropOpen(false);
          setCropFile(null);
        }}
        onConfirm={async (res) => {
          await uploadOneLogoAutoVariantsFromPng(res.blob);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr,420px]">
        {/* Left column: Logo + Theme (desktop) */}
        <div className="space-y-4">
          {/* Logo module */}
          <div className={cn("hi5-panel p-6", tab !== "logo" && "lg:block hidden")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ImageIcon size={18} className="opacity-80" />
                <div>
                  <div className="text-lg font-semibold">Logo</div>
                  <div className="text-xs opacity-70">Upload once — auto light/dark variants generated.</div>
                </div>
              </div>

              <label className="hi5-btn-primary text-sm w-auto cursor-pointer">
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onPickLogo(f);
                    e.currentTarget.value = "";
                  }}
                  disabled={logoUploading || saving}
                />
                {logoUploading ? "Uploading…" : "Upload logo"}
              </label>
            </div>

            {/* Light/Dark preview strip */}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border hi5-border p-4">
                <div className="text-sm font-semibold">Light preview</div>
                <div className="text-xs opacity-70 mt-1">Used on light surfaces</div>
                <div className="mt-3 rounded-2xl border hi5-border bg-white p-4 flex items-center justify-center">
                  {logoLightPreview || logoLightUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoLightPreview || logoLightUrl}
                      alt="Light logo preview"
                      className="h-16 w-auto object-contain"
                    />
                  ) : (
                    <div className="text-xs opacity-60">No logo</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border hi5-border p-4">
                <div className="text-sm font-semibold">Dark preview</div>
                <div className="text-xs opacity-70 mt-1">Used on dark surfaces</div>
                <div className="mt-3 rounded-2xl border hi5-border bg-[#0b0d12] p-4 flex items-center justify-center">
                  {logoDarkPreview || logoDarkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={logoDarkPreview || logoDarkUrl}
                      alt="Dark logo preview"
                      className="h-16 w-auto object-contain"
                    />
                  ) : (
                    <div className="text-xs text-white/60">No logo</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(logoLightUrl || logoDarkUrl) ? (
                <button
                  type="button"
                  className="hi5-btn-ghost text-sm w-auto"
                  disabled={logoUploading || saving}
                  onClick={() => {
                    setLogoLightUrl("");
                    setLogoDarkUrl("");
                    setLogoLightPreview("");
                    setLogoDarkPreview("");
                    saveTheme({ logo_light_url: null, logo_dark_url: null, logo_url: null });
                  }}
                >
                  Remove logo
                </button>
              ) : null}

              <div className="text-[11px] opacity-60 flex items-center">
                Stored in <span className="ml-1 font-mono">tenant-assets</span> • light syncs legacy{" "}
                <span className="ml-1 font-mono">logo_url</span>
              </div>
            </div>
          </div>

          {/* Theme module */}
          <div className={cn("hi5-panel p-6", tab !== "theme" && "lg:block hidden")}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Palette size={18} className="opacity-80" />
                <div>
                  <div className="text-lg font-semibold">Theme</div>
                  <div className="text-xs opacity-70">Presets, colors and glow. Live preview while editing.</div>
                </div>
              </div>

              <button
                type="button"
                className="hi5-btn-primary text-sm w-auto"
                disabled={saving || logoUploading}
                onClick={() => saveTheme()}
              >
                <span className="inline-flex items-center gap-2">
                  <Save size={16} />
                  {saving ? "Saving…" : "Save"}
                </span>
              </button>
            </div>

            <div className="mt-4 rounded-2xl border hi5-border p-4">
              <div className="text-xs opacity-70">Preset themes</div>
              <div className="mt-3 flex flex-col sm:flex-row gap-3 sm:items-center">
                <select
                  className="rounded-2xl border hi5-border hi5-card px-4 py-3 text-sm outline-none"
                  value={presetKey}
                  onChange={(e) => {
                    const key = e.target.value;
                    setPresetKey(key);
                    const p = PRESETS.find((x) => x.key === key);
                    if (p) applyPreset(p);
                  }}
                >
                  <option value="">Choose a preset…</option>
                  {PRESETS.map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.label}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  className="hi5-btn-ghost text-sm w-auto"
                  onClick={() => {
                    setPresetKey("");
                    applyPreset(PRESETS[0]);
                  }}
                  disabled={saving || logoUploading}
                >
                  Reset to default
                </button>
              </div>
              <div className="mt-2 text-[11px] opacity-60">Presets just fill the fields — tweak anything after.</div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <ColorField label="Accent" value={accent} onChange={setAccent} hint="Buttons + highlights" />
              <ColorField label="Accent 2" value={accent2} onChange={setAccent2} hint="Gradients" />
              <ColorField label="Accent 3" value={accent3} onChange={setAccent3} hint="Highlights" />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <ColorField label="Background" value={bg} onChange={setBg} hint="Base bg token" />
              <ColorField label="Card" value={card} onChange={setCard} hint="Surfaces" />
              <ColorField label="Topbar" value={topbar || card} onChange={setTopbar} hint="Empty = card" />
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <RangeField label="Glow 1" value={glow1} onChange={setGlow1} hint="Sphere strength" />
              <RangeField label="Glow 2" value={glow2} onChange={setGlow2} hint="Sphere strength" />
              <RangeField label="Glow 3" value={glow3} onChange={setGlow3} hint="Sphere strength" />
            </div>
          </div>
        </div>

        {/* Right column: Preview (desktop) */}
        <div className={cn("space-y-4", tab !== "preview" && "lg:block hidden")}>
          <div className="hi5-panel p-6">
            <div className="text-xs opacity-70">Tenant</div>
            <div className="text-xl font-extrabold mt-1">{tenant.name}</div>
            <div className="text-xs opacity-70 mt-1">
              {tenant.subdomain}.{tenant.domain}
            </div>
          </div>

          <div className="hi5-card rounded-2xl border hi5-border p-5">
            <div className="flex items-center justify-between">
              <div className="text-xs opacity-70">Live preview</div>
              <div className="text-[11px] opacity-60">updates while editing</div>
            </div>

            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border hi5-border p-4 hi5-card">
                <div className="text-sm font-semibold">Card example</div>
                <div className="text-sm opacity-80 mt-1">Theme preview updates live.</div>
                <button type="button" className="hi5-btn-primary text-sm mt-3">
                  Primary Button
                </button>
              </div>

              <div className="rounded-2xl border hi5-border p-4 hi5-panel">
                <div className="text-sm font-semibold">Panel example</div>
                <div className="text-sm opacity-80 mt-1">Readable surfaces.</div>
                <button type="button" className="hi5-btn-ghost text-sm mt-3 w-auto">
                  Ghost button
                </button>
              </div>

              <div className="rounded-2xl border hi5-border p-4 hi5-panel">
                <div className="text-xs opacity-70">Logo preview</div>
                <div className="mt-3 grid gap-2">
                  <div className="rounded-2xl border hi5-border bg-white p-3 flex items-center justify-center">
                    {(logoLightPreview || logoLightUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoLightPreview || logoLightUrl} alt="Light logo" className="h-12 w-auto object-contain" />
                    ) : (
                      <div className="text-xs opacity-60">No light logo</div>
                    )}
                  </div>
                  <div className="rounded-2xl border hi5-border bg-[#0b0d12] p-3 flex items-center justify-center">
                    {(logoDarkPreview || logoDarkUrl) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={logoDarkPreview || logoDarkUrl} alt="Dark logo" className="h-12 w-auto object-contain" />
                    ) : (
                      <div className="text-xs text-white/60">No dark logo</div>
                    )}
                  </div>
                </div>

                <div className="mt-2 text-[11px] opacity-60">
                  One upload generates both variants automatically.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> {/* grid */}
    </div>
  );
}
