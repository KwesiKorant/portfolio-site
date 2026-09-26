export type ClusterType = "root" | "arch" | "projects" | "stack" | "dossier";

export type BadgeColor = "lime" | "cyan" | "emerald";

export interface MetricItem {
  label: string;
  val: string;
}

export type SubsystemType =
  | "router"
  | "stream"
  | "vectordb"
  | "crdt"
  | "ebpf"
  | "cluster"
  | "identity";

export interface NodeData {
  id: string;
  title: string;
  category: string;
  badge: string;
  badgeColor?: BadgeColor;
  subsystemType?: SubsystemType;
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
  role?: string;
  problem?: string;
  solution?: string;
  impact?: string;
  tags?: string[];
  metrics?: MetricItem[];
  code?: string;
  screenshots?: {
    url: string;
    title: string;
    caption: string;
    badge?: string;
  }[];
  externalLink?: string;
  liveUrl?: string;
  githubUrl?: string;
}

export interface ProjectedPosition {
  screenX: number;
  screenY: number;
  scale: number;
  isVisible: boolean;
}
