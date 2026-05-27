import { useMemo, useState } from "react";
import { Images, ArrowRight, BedDouble, Building2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLodgeRooms } from "@/hooks/lodging/useLodgeRooms";
import { LoadingPanel, NextActions, SectionShell, StatCard } from "./LodgingOperationsShared";
import LodgingQuickJump from "./LodgingQuickJump";
import LodgingSectionStatusBanner from "./LodgingSectionStatusBanner";
import { cn } from "@/lib/utils";

const goTab = (tab: string) => window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab } }));

interface PhotoItem {
  url: string;
  source: "property" | "room";
  label: string;
  isCover: boolean;
  roomId?: string;
}

const TABS = [
  { key: "all", label: "All" },
  { key: "property", label: "Property" },
  { key: "rooms", label: "Per-room" },
] as const;

export default function LodgingGallerySection({ storeId }: { storeId: string }) {
  const roomsQuery = useLodgeRooms(storeId);
  const storeQuery = useQuery({
    queryKey: ["lodging-gallery-store", storeId],
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("store_profiles")
        .select("id,name,gallery_images,gallery_positions,logo_url,cover_url")
        .eq("id", storeId)
        .maybeSingle();
      return data || null;
    },
  });
  const [tab, setTab] = useState<typeof TABS[number]["key"]>("all");

  const photos = useMemo<PhotoItem[]>(() => {
    const out: PhotoItem[] = [];
    const galleryImages: any = storeQuery.data?.gallery_images;
    const positions: any = storeQuery.data?.gallery_positions || [];
    const coverPos = Array.isArray(positions) ? positions[0] : null;

    if (Array.isArray(galleryImages)) {
      galleryImages.forEach((entry: any, i: number) => {
        const url = typeof entry === "string" ? entry : entry?.url || entry?.src;
        if (!url) return;
        out.push({
          url,
          source: "property",
          label: "Property gallery",
          isCover: i === 0 || (coverPos && coverPos === i),
        });
      });
    } else if (galleryImages && typeof galleryImages === "object") {
      Object.values(galleryImages).forEach((entry: any, i: number) => {
        const url = typeof entry === "string" ? entry : entry?.url || entry?.src;
        if (url) out.push({ url, source: "property", label: "Property gallery", isCover: i === 0 });
      });
    }

    (roomsQuery.data || []).forEach((room: any) => {
      const roomPhotos: any[] = Array.isArray(room.photos) ? room.photos : [];
      const coverIdx = typeof room.cover_photo_index === "number" ? room.cover_photo_index : 0;
      roomPhotos.forEach((entry: any, i: number) => {
        const url = typeof entry === "string" ? entry : entry?.url || entry?.src;
        if (!url) return;
        out.push({
          url,
          source: "room",
          label: room.name || "Room",
          isCover: i === coverIdx,
          roomId: room.id,
        });
      });
    });

    return out;
  }, [storeQuery.data, roomsQuery.data]);

  const propertyPhotos = photos.filter((p) => p.source === "property");
  const roomPhotos = photos.filter((p) => p.source === "room");
  const visible = tab === "property" ? propertyPhotos : tab === "rooms" ? roomPhotos : photos;
  const isLoading = roomsQuery.isLoading || storeQuery.isLoading;
  const hasCover = propertyPhotos.some((p) => p.isCover) || Boolean(storeQuery.data?.cover_url);

  return (
    <SectionShell
      title="Photos & Gallery"
      subtitle="Manage property and per-room imagery — what guests see first when discovering your hotel."
      icon={Images}
      actions={<Button size="sm" onClick={() => goTab("lodge-property")} className="gap-1.5">Edit property photos <ArrowRight className="h-3.5 w-3.5" /></Button>}
    >
      <LodgingQuickJump active="lodge-gallery" />
      <LodgingSectionStatusBanner title="Photos & Gallery" icon={Images} countLabel="Uploaded photos" countValue={photos.length} fixLabel="Edit Property Profile" fixTab="lodge-property" />
      {isLoading ? <LoadingPanel /> : <>
        <div className="grid gap-3 sm:grid-cols-4">
          <StatCard label="Total photos" value={String(photos.length)} icon={Images} />
          <StatCard label="Property gallery" value={String(propertyPhotos.length)} icon={Building2} />
          <StatCard label="Room photos" value={String(roomPhotos.length)} icon={BedDouble} />
          <StatCard label="Cover photo" value={hasCover ? "Set" : "Missing"} icon={hasCover ? CheckCircle2 : AlertCircle} />
        </div>

        <div className="-mx-1 flex flex-wrap gap-1.5 px-1">
          {TABS.map((t) => {
            const count = t.key === "all" ? photos.length : t.key === "property" ? propertyPhotos.length : roomPhotos.length;
            return (
              <button type="button"
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                  tab === t.key ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-card text-foreground/70 hover:border-primary/30",
                )}
              >
                {t.label} <span className="opacity-60">({count})</span>
              </button>
            );
          })}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <Images className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              {tab === "rooms" ? "No room photos yet" : tab === "property" ? "No property photos yet" : "Your gallery is empty"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Strong photos directly increase booking conversion. Add high-resolution images of rooms, exterior, restaurant, and amenities.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button size="sm" onClick={() => goTab("lodge-property")}><Building2 className="mr-1.5 h-3.5 w-3.5" /> Add property photos</Button>
              <Button size="sm" variant="outline" onClick={() => goTab("lodge-rooms")}><BedDouble className="mr-1.5 h-3.5 w-3.5" /> Add room photos</Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visible.map((p, i) => (
              <button type="button"
                key={`${p.url}-${i}`}
                onClick={() => goTab(p.source === "room" ? "lodge-rooms" : "lodge-property")}
                className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted text-left transition hover:border-primary/40"
              >
	                <img
	                  src={p.url}
	                  alt={p.label}
	                  className="h-full w-full object-cover transition group-hover:scale-105"
	                  loading="lazy"
	                  decoding="async"
	                />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent px-1.5 py-1">
                  <Badge variant={p.source === "property" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 leading-tight">
                    {p.source === "property" ? <Building2 className="mr-0.5 h-2.5 w-2.5" /> : <BedDouble className="mr-0.5 h-2.5 w-2.5" />}
                    {p.label}
                  </Badge>
                  {p.isCover && <span className="rounded-full bg-primary px-1.5 py-0 text-[9px] font-bold text-primary-foreground">Cover</span>}
                </div>
              </button>
            ))}
          </div>
        )}

        <NextActions actions={[
          { label: "Edit property profile", tab: "lodge-property", hint: "Update gallery and cover from the property profile editor." },
          { label: "Refine room photos", tab: "lodge-rooms", hint: "Each room type can have its own gallery + cover photo." },
          { label: "Highlight in promotions", tab: "lodge-promos", hint: "Pair signature photos with seasonal offers." },
        ]} />
      </>}
    </SectionShell>
  );
}
