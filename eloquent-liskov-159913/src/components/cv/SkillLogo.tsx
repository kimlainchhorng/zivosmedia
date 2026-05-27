/**
 * SkillLogo — local, reliable brand-style skill icons.
 * Uses inline SVG/badge rendering so logos always show without external CDN requests.
 */
import { useMemo } from "react";

export type PresetSkill = {
  name: string;
  slug: string;
  color: string;
};

export const PRESET_SKILLS: PresetSkill[] = [
  { name: "Microsoft Word", slug: "microsoftword", color: "2B579A" },
  { name: "Microsoft Excel", slug: "microsoftexcel", color: "217346" },
  { name: "Microsoft PowerPoint", slug: "microsoftpowerpoint", color: "B7472A" },
  { name: "Microsoft Outlook", slug: "microsoftoutlook", color: "0078D4" },
  { name: "Google Docs", slug: "googledocs", color: "4285F4" },
  { name: "Google Sheets", slug: "googlesheets", color: "34A853" },
  { name: "Photoshop", slug: "adobephotoshop", color: "31A8FF" },
  { name: "Illustrator", slug: "adobeillustrator", color: "FF9A00" },
  { name: "Figma", slug: "figma", color: "F24E1E" },
  { name: "Canva", slug: "canva", color: "00C4CC" },
  { name: "JavaScript", slug: "javascript", color: "F7DF1E" },
  { name: "TypeScript", slug: "typescript", color: "3178C6" },
  { name: "Python", slug: "python", color: "3776AB" },
  { name: "Java", slug: "openjdk", color: "ED8B00" },
  { name: "React", slug: "react", color: "61DAFB" },
  { name: "Node.js", slug: "nodedotjs", color: "5FA04E" },
  { name: "HTML", slug: "html5", color: "E34F26" },
  { name: "CSS", slug: "css", color: "663399" },
  { name: "SQL", slug: "mysql", color: "4479A1" },
  { name: "Git", slug: "git", color: "F05032" },
  { name: "Slack", slug: "slack", color: "4A154B" },
  { name: "Notion", slug: "notion", color: "000000" },
  { name: "Trello", slug: "trello", color: "0052CC" },
  { name: "Zoom", slug: "zoom", color: "0B5CFF" },
];

export function findPresetSkill(name: string): PresetSkill | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return (
    PRESET_SKILLS.find((p) => p.name.toLowerCase() === n) ||
    PRESET_SKILLS.find((p) => n.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(n)) ||
    null
  );
}

export function getSkillLogoUrl(): string {
  return "";
}

interface SkillLogoProps {
  name: string;
  size?: number;
  className?: string;
}

function AppTile({ size, color, letter, accent }: { size: number; color: string; letter: string; accent?: string }) {
  const radius = Math.max(3, Math.round(size * 0.2));
  const fontSize = Math.max(7, Math.round(size * 0.56));

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <rect x="5.5" y="3" width="14.5" height="18" rx={radius} fill={`#${color}`} opacity="0.18" />
      <rect x="2" y="5" width="12.5" height="14" rx={radius} fill={`#${color}`} />
      {accent ? <rect x="13.5" y="4.5" width="6.5" height="15" rx={radius - 1} fill={`#${accent}`} opacity="0.95" /> : null}
      <text x="8.2" y="15.1" textAnchor="middle" fontSize={fontSize} fontWeight="800" fill="#ffffff" fontFamily="Arial, sans-serif">
        {letter}
      </text>
    </svg>
  );
}

function BrandBadge({ size, color, text, darkText = false }: { size: number; color: string; text: string; darkText?: boolean }) {
  const radius = Math.max(4, Math.round(size * 0.24));
  const fontSize = Math.max(7, Math.round(size * 0.52));

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      <rect x="2" y="2" width="20" height="20" rx={radius} fill={`#${color}`} />
      <text x="12" y="15.2" textAnchor="middle" fontSize={fontSize} fontWeight="800" fill={darkText ? "#111111" : "#ffffff"} fontFamily="Arial, sans-serif">
        {text}
      </text>
    </svg>
  );
}

function LocalPresetIcon({ preset, size }: { preset: PresetSkill; size: number }) {
  switch (preset.slug) {
    case "microsoftword":
      return <AppTile size={size} color={preset.color} accent="3E7BCE" letter="W" />;
    case "microsoftexcel":
      return <AppTile size={size} color={preset.color} accent="2B8C59" letter="X" />;
    case "microsoftpowerpoint":
      return <AppTile size={size} color={preset.color} accent="D35230" letter="P" />;
    case "microsoftoutlook":
      return <AppTile size={size} color={preset.color} accent="2B88F0" letter="O" />;
    case "googledocs":
      return <BrandBadge size={size} color={preset.color} text="D" />;
    case "googlesheets":
      return <BrandBadge size={size} color={preset.color} text="S" />;
    case "adobephotoshop":
      return <BrandBadge size={size} color={preset.color} text="Ps" darkText />;
    case "adobeillustrator":
      return <BrandBadge size={size} color={preset.color} text="Ai" darkText />;
    case "figma":
      return <BrandBadge size={size} color={preset.color} text="F" />;
    case "canva":
      return <BrandBadge size={size} color={preset.color} text="C" />;
    case "javascript":
      return <BrandBadge size={size} color={preset.color} text="JS" darkText />;
    case "typescript":
      return <BrandBadge size={size} color={preset.color} text="TS" />;
    case "python":
      return <BrandBadge size={size} color={preset.color} text="Py" />;
    case "openjdk":
      return <BrandBadge size={size} color={preset.color} text="J" />;
    case "react":
      return <BrandBadge size={size} color={preset.color} text="R" darkText />;
    case "nodedotjs":
      return <BrandBadge size={size} color={preset.color} text="N" />;
    case "html5":
      return <BrandBadge size={size} color={preset.color} text="H" />;
    case "css":
      return <BrandBadge size={size} color={preset.color} text="C" />;
    case "mysql":
      return <BrandBadge size={size} color={preset.color} text="SQL" />;
    case "git":
      return <BrandBadge size={size} color={preset.color} text="G" />;
    case "slack":
      return <BrandBadge size={size} color={preset.color} text="S" />;
    case "notion":
      return <BrandBadge size={size} color={preset.color} text="N" />;
    case "trello":
      return <BrandBadge size={size} color={preset.color} text="T" />;
    case "zoom":
      return <BrandBadge size={size} color={preset.color} text="Z" />;
    default:
      return <BrandBadge size={size} color={preset.color} text={preset.name.slice(0, 1).toUpperCase()} />;
  }
}

export function SkillLogo({ name, size = 14, className }: SkillLogoProps) {
  const preset = useMemo(() => findPresetSkill(name), [name]);

  if (!preset) {
    return (
      <span className={className} style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ width: size * 0.42, height: size * 0.42, borderRadius: 9999, background: "currentColor", opacity: 0.45, display: "block" }} />
      </span>
    );
  }

  return (
    <span className={className} role="img" aria-label={preset.name} title={preset.name} style={{ width: size, height: size, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <LocalPresetIcon preset={preset} size={size} />
    </span>
  );
}

export default SkillLogo;
