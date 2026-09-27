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
  "Press ← → or 1 - 4 to navigate between project cards • Press 0 for Hero",
  "Hover cards for dynamic 3D tilt & holographic light reflection",
  "Scroll mouse wheel to fly-through depth • Drag to orbit & pan",
  "Click or drag RADAR MAP • D-Pad (↑ ↓ ← →) to pan • (↖ ↗ ↙ ↘) to orbit",
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
    x: -980,
    y: 250,
    z: 20,
    camTarget: { x: -980, y: 250, z: 520 },
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
    x: -1500,
    y: 230,
    z: 20,
    camTarget: { x: -1500, y: 230, z: 520 },
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
    screenshots: [
      {
        url: "/projects/spatial/portfolio-hero-wireframe.webp",
        title: "Stage 01: Hardware-Accelerated Interactive Hero & Wireframe",
        caption: "Tactile digital craft combining video scrub physics with an interactive 3D facial wireframe mesh, mouse parallax, and zero-reflow CSS compositor dynamics.",
        badge: "3D FACE MESH",
      },
      {
        url: "/projects/spatial/portfolio-spatial-deck.webp",
        title: "Stage 03: 3D Spatial Perspective Orbit Deck & Radar",
        caption: "Dynamic 3D coordinate projection mapping project cards across continuous depth over an infinite neon green vector grid with interactive telemetry.",
        badge: "SPATIAL 3D DECK",
      },
    ],
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
    desc: "Hyperlocal business and service discovery platform connecting neighborhood enterprises with consumers. Enables local businesses to list their business profiles and service offerings, while allowing users to discover and inspect local businesses.",
    problem: "Small local businesses and service providers in emerging markets often lack an accessible digital presence, missing out on neighborhood discovery, customer footfall, and direct service inquiries.",
    solution: "Architecting a mobile-first discovery PWA allowing local businesses to list their services and contact details, and empowering consumers to explore neighborhood services through an interactive, low-latency feed.",
    impact: "Co-founded Arcfield Systems as CTO, engineered the end-to-end platform architecture, and currently piloting the live MVP with local businesses and service providers.",
    x: 980,
    y: 250,
    z: 20,
    camTarget: { x: 980, y: 250, z: 520 },
    cluster: "projects",
    tags: ["Next.js", "TypeScript", "Startup Leadership", "Business Discovery", "Service Catalogs", "PostgreSQL", "PWA"],
    metrics: [
      { label: "Discovery Latency", val: "< 60ms" },
      { label: "Stage", val: "Active MVP" },
      { label: "Role", val: "Co-Founder / CTO" },
      { label: "Interface", val: "Mobile-First PWA" },
    ],
    code: `// Arcfield Discover: Business & Service Discovery Query Engine
export async function queryDiscoveredServices(coords: GeoLocation, category?: string) {
  return await db.businessProfile.findMany({
    where: {
      isPublished: true,
      category: category ?? undefined,
      serviceRadiusKm: { gte: calculateDistance(coords, business.location) },
    },
    select: { id: true, businessName: true, services: true, operatingHours: true, profileCover: true },
    orderBy: { engagementScore: "desc" },
  });
}`,
    screenshots: [
      {
        url: "/projects/arcfield/arcfield-admin-overview.webp",
        title: "Arcfield Discover: Admin Operations & Activity Ledger",
        caption: "Centralized administrative overview monitoring pending business listings, verified merchant reviews, media ingestion queues, and real-time operational audit logs.",
        badge: "ADMIN OVERVIEW",
      },
    ],
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
    x: 1240,
    y: -40,
    z: -20,
    camTarget: { x: 1240, y: -40, z: 500 },
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
    x: 1500,
    y: 230,
    z: 20,
    camTarget: { x: 1500, y: 230, z: 520 },
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
  // Cluster C: Technical Skills & Capabilities (Ground Flank, hovering above floor)
  {
    id: "infra-compute",
    title: "Technical Skills",
    category: "TECHNICAL PROFICIENCIES",
    badge: "12 CORE SKILLS",
    badgeColor: "lime",
    subsystemType: "skills",
    desc: "Core engineering proficiencies across 3D spatial graphics, mobile applications, backend services, and relational databases.",
    x: -1240,
    y: -40,
    z: -20,
    camTarget: { x: -1240, y: -40, z: 500 },
    cluster: "stack",
    tags: [
      "TypeScript",
      "React",
      "Three.js",
      "WebGL",
      "HTML5",
      "Tailwind CSS",
      "React Native",
      "Express.js",
      "PostgreSQL",
      "Database Design",
      "API Integration",
      "Google Stitch / Figma",
    ],
  },
];
