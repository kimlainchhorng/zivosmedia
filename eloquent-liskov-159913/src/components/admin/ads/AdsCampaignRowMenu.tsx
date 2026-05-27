/**
 * AdsCampaignRowMenu — contextual overflow menu (Edit/Duplicate/Pause/Resume/Archive/Delete).
 */
import { MoreHorizontal, Edit, Copy, Pause, Play, Archive, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AdCampaign } from "@/hooks/useStoreAdsOverview";

interface Props {
  campaign: AdCampaign;
  onEdit: (c: AdCampaign) => void;
  onDuplicate: (c: AdCampaign) => void;
  onPause: (c: AdCampaign) => void;
  onResume: (c: AdCampaign) => void;
  onArchive: (c: AdCampaign) => void;
  onDelete: (c: AdCampaign) => void;
}

export default function AdsCampaignRowMenu({
  campaign: c,
  onEdit,
  onDuplicate,
  onPause,
  onResume,
  onArchive,
  onDelete,
}: Props) {
  const canPause = c.status === "active" || c.status === "pending_review";
  const canResume = c.status === "paused";
  const canArchive = c.status !== "archived";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 p-0"
          aria-label="Campaign actions"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 z-50 bg-popover">
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(c); }}>
          <Edit className="w-3.5 h-3.5 mr-2" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onDuplicate(c); }}>
          <Copy className="w-3.5 h-3.5 mr-2" /> Duplicate
        </DropdownMenuItem>
        {canPause && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onPause(c); }}>
            <Pause className="w-3.5 h-3.5 mr-2" /> Pause
          </DropdownMenuItem>
        )}
        {canResume && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onResume(c); }}>
            <Play className="w-3.5 h-3.5 mr-2" /> Resume
          </DropdownMenuItem>
        )}
        {canArchive && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(c); }}>
            <Archive className="w-3.5 h-3.5 mr-2" /> Archive
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={(e) => { e.stopPropagation(); onDelete(c); }}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
