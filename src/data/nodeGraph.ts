import { NodeData } from "@/types/graph";

export const HERO_Y = -60;
export const DEFAULT_CAMERA_Z = 1880;
export const MIN_CAMERA_Z = 200;
export const MAX_CAMERA_Z = 2800;

export const WORLD_BOUNDS = {
  minX: -1850,
  maxX: 1850,
  minY: -950,
  maxY: 1100,
};

export const PRO_HINTS: string[] = [
  "Click any node card to smoothly zoom into the widescreen landscape architecture console",
  "Press 1 - 5 to jump between spatial clusters • Press 0 for Portal to Hero",
  "Hover cards for dynamic 3D tilt & holographic light reflection",
  "Scroll mouse wheel to fly-through depth • Drag to orbit & pan",
  "Click any coordinate on the RADAR MAP to warp camera position",
  "Press ESC or click outside card to return to high-angle system overview • Press ? for guide",
];

export const NODE_GRAPH: NodeData[] = [
  {
    id: "root",
    title: "Kwesi Ankomah-Koranteng",
    category: "DESIGN ENGINEER // CREATIVE TECHNOLOGIST",
    badge: "ROOT // ACTIVE",
    badgeColor: "lime",
    x: 0,
    y: HERO_Y,
    z: 0,
    camTarget: { x: 0, y: 80, z: DEFAULT_CAMERA_Z },
    cluster: "root",
    role: "Design Engineer & Creative Technologist",
    desc: "Ghanaian software engineer and startup co-founder (Arcfield Systems) crafting tactile, hardware-accelerated web experiences and scalable product architectures.",
  },
  // Cluster A: Systems & Client Work (Left Flank - 3 Distinct Non-Overlapping Columns)
  {
    id: "edge-gateway",
    title: "Nayak Furniture: Inventory & Retail ERP",
    category: "COMMERCIAL ERP // POS",
    badge: "PRODUCTION READY",
    badgeColor: "lime",
    subsystemType: "router",
    role: "Sole Software Engineer",
    desc: "Custom local inventory management and Point-of-Sale ERP built for Nayak Furniture showroom and factory. Manages dynamic product window cataloging, live profit/loss auditing, raw material cost tracking, and sales velocity analytics.",
    problem: "The physical furniture enterprise managed inventory across manual paper ledgers, causing delayed financial reconciliation, untracked raw timber and upholstery cost fluctuations, and zero automated insight into product turnover.",
    solution: "Architected a local-first, offline-resilient POS and inventory platform with instantaneous margin calculation, automated bill-of-materials (BOM) cost auditing, dynamic product window curation, and monthly profit breakdown visualizations.",
    impact: "Achieved 100% inventory accuracy across physical showroom stock, slashed monthly accounting audit turnaround from days to seconds, and identified high-margin furniture lines via sales velocity ratings.",
    x: -800,
    y: 230,
    z: 20,
    camTarget: { x: -800, y: 230, z: 520 },
    cluster: "arch",
    tags: ["TypeScript", "React", "Node.js", "Financial Analytics", "BOM Engine", "SQLite/Postgres"],
    metrics: [
      { label: "Inventory Accuracy", val: "100%" },
      { label: "Profit Auditing", val: "Instant" },
      { label: "Catalog SKUs", val: "500+" },
      { label: "Material Tracking", val: "Automated" },
    ],
    code: `// Nayak ERP: Real-time Unit Economics & Profit Calculation
export function calculateFurnitureMargin(item: FurnitureProduct): MarginAudit {
  const rawMaterialCost = item.lumberCost + item.fabricCost + item.hardwareCost;
  const directLaborCost = item.productionHours * item.laborRatePerHour;
  const totalCostBasis = rawMaterialCost + directLaborCost + item.overheadAllocation;
  
  const netProfit = item.retailPrice - totalCostBasis;
  const marginPercentage = (netProfit / item.retailPrice) * 100;
  
  return {
    totalCostBasis,
    netProfit,
    marginPercentage,
    isHighVelocity: item.monthlyUnitsSold > 20
  };
}`,
    screenshots: [
      {
        url: "/projects/nayak/nayak-dashboard-light.webp",
        title: "Active Production Builds & Catalog Window",
        caption: "Custom furniture production dashboard allowing staff to initiate builds, catalog product specs, and manage active workshop pipelines.",
        badge: "LIGHT UI",
      },
      {
        url: "/projects/nayak/nayak-dashboard-dark.webp",
        title: "Completed Builds & Archive Ledger",
        caption: "Historical build timeline organized by year and month, tracking completed furniture batches with folderized inventory status.",
        badge: "DARK UI",
      },
      {
        url: "/projects/nayak/nayak-reports-analytics.webp",
        title: "Financial Analytics & P&L Trends (GH₵)",
        caption: "Automated financial breakdown reporting total expected revenue, net profit, average margin, and monthly profit curve in Ghanaian Cedis (GH₵).",
        badge: "ANALYTICS ENGINE",
      },
    ],
  },
  {
    id: "event-stream",
    title: "Spatial Dimension: 120 FPS WebGL Engine",
    category: "CREATIVE TECHNOLOGIST // FLAGSHIP",
    badge: "120 FPS COMPOSITOR",
    badgeColor: "cyan",
    subsystemType: "stream",
    role: "Design Engineer & Creator",
    desc: "Hardware-accelerated 3D spatial canvas and interactive portfolio engine. Built with Three.js, React 19, and Next.js 15 adhering strictly to zero-reflow compositor standards and Web Audio spatial soundscapes.",
    problem: "Most 3D web portfolios degrade into stuttering 30 FPS experiences due to DOM layout thrashing, un-throttled scroll listeners, continuous un-culled render loops, and jarring responsive shifts.",
    solution: "Engineered a 5-phase hybrid flow where per-frame updates mutate only hardware-accelerated transform3d and opacity. Render tickers are culled via IntersectionObserver, DOM geometry is cached outside render loops, and audio haptics are synthesized in real time.",
    impact: "Maintains a rock-solid 60/120 FPS compositor standard across mobile, laptop, and 4K viewports with zero layout thrashing, sub-8ms input latency, and an interactive 3D perspective projection.",
    x: -1300,
    y: 220,
    z: 20,
    camTarget: { x: -1300, y: 220, z: 520 },
    cluster: "arch",
    tags: ["Three.js", "WebGL", "Next.js 15", "Web Audio API", "Compositor Standards", "GLSL"],
    metrics: [
      { label: "Compositor Target", val: "120 FPS" },
      { label: "Layout Reflow", val: "0 Reflows" },
      { label: "Input Response", val: "< 8ms" },
      { label: "Sound Engine", val: "Synthesized Web Audio" },
    ],
    code: `// Zero-Reflow Compositor Projection Ticker
function projectWorldToScreen(worldPos: Vector3, cam: PerspectiveCamera): ScreenCoord {
  const p = worldPos.clone().project(cam);
  // Transform normalized device coordinates (-1 to 1) to screen space
  const screenX = (p.x * 0.5 + 0.5) * window.innerWidth;
  const screenY = (-(p.y * 0.5) + 0.5) * window.innerHeight;
  // Apply exclusively via hardware-accelerated 3D transform without touching top/left
  return { transform: \`translate3d(\${screenX}px, \${screenY}px, 0)\` };
}`,
  },
  // Cluster B: Featured Case Studies & Production Systems (Right Flank - 4 Distinct Non-Overlapping Columns)
  {
    id: "hyperscale",
    title: "Arcfield Discover: Business & Service Discovery",
    category: "STARTUP MVP // CO-FOUNDER & CTO",
    badge: "ACTIVE MVP",
    badgeColor: "lime",
    subsystemType: "vectordb",
    role: "Co-Founder & CTO @ Arcfield Systems",
    desc: "Hyperlocal business and service discovery platform connecting neighborhood enterprises with consumers. Features business profile creation, dynamic service catalogs, interactive discovery feeds, and merchant verification.",
    problem: "Small local businesses and service providers in emerging markets are often excluded from high-cost digital platforms, missing out on local customer discovery, neighborhood footfall, and streamlined direct customer inquiries.",
    solution: "Architecting a mobile-first discovery progressive web app allowing local businesses to list their services, showcase their work, and engage consumers through lightweight, responsive feeds.",
    impact: "Successfully co-founded Arcfield Systems, designed the end-to-end product architecture, and currently piloting the live MVP with local merchants and service businesses.",
    x: 1300,
    y: 230,
    z: 20,
    camTarget: { x: 1300, y: 230, z: 520 },
    cluster: "projects",
    tags: ["Next.js", "TypeScript", "Startup Leadership", "Business Discovery", "Service Catalogs", "PostgreSQL", "PWA"],
    metrics: [
      { label: "Discovery Latency", val: "< 60ms" },
      { label: "Stage", val: "Active MVP" },
      { label: "Role", val: "Co-Founder / CTO" },
      { label: "Interface", val: "Mobile-First" },
    ],
    code: `// Arcfield Discover: Hyperlocal Search & Discovery Filter
export async function queryLocalMerchants(coords: GeoLocation, category?: string) {
  return await db.merchant.findMany({
    where: {
      isVerified: true,
      category: category ?? undefined,
      serviceRadiusKm: { gte: calculateDistance(coords, merchant.location) },
    },
    select: { id: true, businessName: true, services: true, ratings: true, storefrontCover: true },
    orderBy: { rankingScore: "desc" },
  });
}`,
  },
  {
    id: "omnisync",
    title: "CareSync: Digital Pet-Health Platform",
    category: "HEALTHCARE PLATFORM // FULL-STACK",
    badge: "CLINICAL & COMMERCE",
    badgeColor: "emerald",
    subsystemType: "crdt",
    role: "Full-Stack Software Contributor",
    desc: "Integrated pet healthcare and veterinary management platform. Powers longitudinal animal health profiles, automated vaccination compliance tracking, veterinary appointment pipelines, and specialized pet supply commerce.",
    problem: "Pet health records are overwhelmingly paper-based, causing missed vaccination timelines, forgotten booster shots, and disjointed veterinary care handoffs.",
    solution: "Contributed to building a centralized pet health platform with structured digital pet profiles, automated immunization notification pipelines, and integrated e-commerce for prescription nutrition.",
    impact: "Streamlined vaccination compliance workflows, reduced scheduling overhead for pet clinics, and delivered an intuitive multi-pet management dashboard for pet owners.",
    x: 1050,
    y: -160,
    z: -20,
    camTarget: { x: 1050, y: -160, z: 500 },
    cluster: "projects",
    tags: ["TypeScript", "Full-Stack", "Healthcare Records", "Appointment Engine", "E-Commerce"],
    metrics: [
      { label: "Vaccine Reminders", val: "Automated" },
      { label: "Booking Pipeline", val: "3 Clicks" },
      { label: "Record Durability", val: "Cloud Synced" },
      { label: "Catalog", val: "Pet Nutrition & Care" },
    ],
    code: `// Vaccination Protocol & Compliance Evaluator
export function evaluateImmunizationStatus(pet: PetProfile): VaccineCompliance {
  const now = new Date();
  const overdueAlerts = pet.vaccines.filter((v) => new Date(v.nextDueDate) < now);
  const upcomingBoosters = pet.vaccines.filter((v) => daysUntil(v.nextDueDate) <= 14);
  
  return {
    isFullyCompliant: overdueAlerts.length === 0,
    overdueCount: overdueAlerts.length,
    nextScheduledBooster: upcomingBoosters[0] ?? null,
  };
}`,
  },
  {
    id: "kerneltrace",
    title: "Arcfield Eats: Digital Food Ordering",
    category: "FOOD COMMERCE // ARCHITECTURE REVIEW",
    badge: "REAL-TIME DISPATCH",
    badgeColor: "cyan",
    subsystemType: "ebpf",
    role: "Engineering & Architecture Review",
    desc: "Real-time digital food-ordering system for restaurants and customers. Supports online customer ordering, live ticket dispatching to kitchen stations, and order status lifecycle tracking.",
    problem: "Traditional paper ticket kitchen workflows suffer from lost orders, delay in queue communication between front-of-house and back-of-house, and order status ambiguity.",
    solution: "Contributed to the engineering development and architectural technical review of low-latency order dispatch pipelines, responsive digital menus, and real-time kitchen status displays.",
    impact: "Enabled instantaneous order transmission from customer mobile devices directly to kitchen display stations, reducing order placement turnaround.",
    x: 1540,
    y: -160,
    z: -20,
    camTarget: { x: 1540, y: -160, z: 500 },
    cluster: "projects",
    tags: ["Real-Time Architecture", "Food Tech", "Kitchen Display", "Order Lifecycle", "Technical Review"],
    metrics: [
      { label: "Ticket Dispatch", val: "< 100ms" },
      { label: "Status Lifecycle", val: "Real-Time" },
      { label: "Operations", val: "Kitchen + Front" },
      { label: "Role", val: "Technical Review" },
    ],
    code: `// Arcfield Eats: Kitchen Display State Transition Machine
export function transitionOrderStatus(orderId: string, nextState: OrderLifecycle): OrderEvent {
  const validTransitions: Record<OrderLifecycle, OrderLifecycle[]> = {
    PLACED: ["ACCEPTED", "REJECTED"],
    ACCEPTED: ["IN_KITCHEN_PREP"],
    IN_KITCHEN_PREP: ["READY_FOR_PICKUP"],
    READY_FOR_PICKUP: ["FULFILLED"],
    REJECTED: [],
    FULFILLED: [],
  };
  return dispatchKitchenEvent({ orderId, nextState, timestamp: Date.now() });
}`,
  },
  // Cluster C: Infrastructure Stack (Deep in the foundation, hovering above floor)
  {
    id: "infra-compute",
    title: "Full-Stack & Systems Architecture",
    category: "CORE TECHNICAL STACK",
    badge: "PRODUCTION READY",
    badgeColor: "lime",
    subsystemType: "cluster",
    role: "Full-Stack Software Architecture",
    desc: "Core engineering foundation bridging design engineering and robust server-side state. Specialized in Next.js 15 App Router, TypeScript, React 19, Tailwind CSS, PostgreSQL, and Unix systems.",
    problem: "Design without engineering rigor creates brittle products; backend engineering without design sensitivity creates sterile, clunky user experiences.",
    solution: "Disciplined end-to-end full-stack development marrying type-safe API contracts, relational data schemas, and microsecond-level client rendering with high-taste typography and fluid motion.",
    impact: "Shipped commercial applications across retail ERP, social discovery, and healthcare with 100% type safety and zero client runtime exceptions.",
    x: -1050,
    y: -160,
    z: -20,
    camTarget: { x: -1050, y: -160, z: 500 },
    cluster: "stack",
    tags: ["TypeScript", "Next.js 15", "React 19", "PostgreSQL", "Tailwind CSS", "REST/GraphQL"],
    metrics: [
      { label: "Type Safety", val: "100% Strict" },
      { label: "Compositor Standard", val: "Zero-Reflow" },
      { label: "Accessibility", val: "WCAG Compliant" },
      { label: "Architecture", val: "Full-Stack" },
    ],
    code: `// Strict Type-Safe Domain Entity Definition
export interface ProductionSystem<TConfig> {
  readonly id: string;
  readonly domain: "commerce" | "social" | "health" | "spatial";
  readonly status: "active_mvp" | "production" | "research";
  deploy(config: TConfig): Promise<DeploymentResult>;
  verifySLA(latencyTargetMs: number): Promise<boolean>;
}`,
  },
  // Cluster D: Dossier & Terminal Uplink (Crown Flank, Clear of Center Hero Statement)
  {
    id: "dossier",
    title: "Kwesi Ankomah-Koranteng",
    category: "DESIGN ENGINEER // CREATIVE TECHNOLOGIST",
    badge: "AVAILABLE // GHANA",
    badgeColor: "lime",
    subsystemType: "identity",
    role: "Design Engineer & Co-Founder",
    desc: "Ghanaian software engineer and startup co-founder (Arcfield Systems). Crafts tactile, hardware-accelerated digital interfaces, 3D web experiences, and resilient business software.",
    problem: "Modern digital products often lack either visual craftsmanship or architectural resilience. Finding engineers who operate across both spatial design engineering and production backend systems is rare.",
    solution: "Pursuing deep mechanical sympathy: combining Three.js WebGL creative frontends, strict zero-reflow CSS physics, and robust full-stack systems that solve concrete problems for real businesses.",
    impact: "Co-founded Arcfield Systems (CTO), built production ERP for Nayak Furniture, contributed to digital healthcare and food ordering platforms, and built high-performance spatial web architectures.",
    x: 800,
    y: 230,
    z: 20,
    camTarget: { x: 800, y: 230, z: 520 },
    cluster: "dossier",
    tags: ["Design Engineering", "Three.js & WebGL", "Next.js 15", "TypeScript", "Startups & Co-Founder", "Ghana / Remote"],
    metrics: [
      { label: "Target Role", val: "Design Engineer" },
      { label: "Startup", val: "Arcfield Systems (CTO)" },
      { label: "Compositor", val: "120 FPS Mandate" },
      { label: "Location", val: "Ghana (Remote)" },
    ],
    code: `const engineer = {
  name: "Kwesi Ankomah-Koranteng",
  origin: "Ghana",
  role: "Design Engineer / Creative Technologist",
  startup: "Arcfield Systems (Co-Founder & CTO)",
  ethos: [
    "Mechanical sympathy with browser compositors",
    "High agency — from local ERPs to 3D spatial web canvases",
    "Tactile micro-interactions with zero layout reflow"
  ],
  links: {
    linkedin: "linkedin.com/in/kaykorant",
    whatsapp: "+233 20 456 3873",
    github: "github.com/KwesiKorant"
  }
};`,
  },
];
