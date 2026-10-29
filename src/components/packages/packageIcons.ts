import {
  Box, Cable, Layers, Lightbulb, Music, Package, Star, Wrench, Zap, type LucideIcon,
} from "lucide-react";

/** Stored as hex in `packages.color`; used only as a small identification mark. */
export const PACKAGE_COLORS = [
  "#34d399", "#f59e0b", "#3b82f6", "#ef4444",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
] as const;

export const DEFAULT_PACKAGE_COLOR = PACKAGE_COLORS[0];
export const DEFAULT_PACKAGE_ICON = "package";

export const PACKAGE_ICONS: { value: string; Icon: LucideIcon }[] = [
  { value: "package",   Icon: Package   },
  { value: "music",     Icon: Music     },
  { value: "lightbulb", Icon: Lightbulb },
  { value: "zap",       Icon: Zap       },
  { value: "wrench",    Icon: Wrench    },
  { value: "cable",     Icon: Cable     },
  { value: "star",      Icon: Star      },
  { value: "box",       Icon: Box       },
  { value: "layers",    Icon: Layers    },
];

export function getPackageIcon(name: string | null | undefined): LucideIcon {
  return PACKAGE_ICONS.find(i => i.value === name)?.Icon ?? Package;
}
