export type ClusterType = "root" | "arch" | "projects" | "stack" | "dossier";

export type BadgeColor = "lime" | "cyan" | "emerald";

export interface MetricItem {
  label: string;
  val: string;
}

export interface NodeData {
  id: string;
  title: string;
  category: string;
  badge: string;
  badgeColor?: BadgeColor;
  desc?: string;
  x: number;
  y: number;
  z: number;
  camTarget?: {
    x: number;
    y: number;
    z: number;
  };
  cluster: ClusterType;
  tags?: string[];
  metrics?: MetricItem[];
  code?: string;
  externalLink?: string;
}

export interface ProjectedPosition {
  screenX: number;
  screenY: number;
  scale: number;
  isVisible: boolean;
}
