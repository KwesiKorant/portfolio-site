import { NodeData } from "@/types/graph";

export const HERO_Y = -60;
export const DEFAULT_CAMERA_Z = 1100;
export const MIN_CAMERA_Z = 300;
export const MAX_CAMERA_Z = 2400;

export const WORLD_BOUNDS = {
  minX: -1300,
  maxX: 1300,
  minY: -950,
  maxY: 1100,
};

export const PRO_HINTS: string[] = [
  "Press SPACE to pulse network surge • Scroll to 3D fly-through",
  "Press 1 - 5 on your keyboard to warp instantly between clusters",
  "Click any node card to dolly right into its architecture deep-dive",
  "Click any point on the bottom-right RADAR MAP to jump anywhere",
  "Hover over any project node to inspect holographic 3D tilt & live telemetry",
  "Press ESC to dismiss the deep-dive drawer • Press ? for guide",
];

export const NODE_GRAPH: NodeData[] = [
  {
    id: "root",
    title: "Client: User Session Gateway",
    category: "EDGE CLIENT",
    badge: "ROOT // LIVE",
    badgeColor: "lime",
    x: 0,
    y: HERO_Y,
    z: 0,
    camTarget: { x: 0, y: 40, z: DEFAULT_CAMERA_Z },
    cluster: "root",
  },
  // Cluster A: Systems Architecture (Recessed in 3D space)
  {
    id: "edge-gateway",
    title: "Edge Gateway & Anycast Proxy",
    category: "SYSTEM ROUTER",
    badge: "120k REQ/SEC",
    badgeColor: "lime",
    desc: "Sub-millisecond global ingress router built with Rust & Cloudflare Workers. Features custom JWT zero-trust auth and token-bucket rate limiting.",
    x: -940,
    y: 220,
    z: -90,
    camTarget: { x: -940, y: 220, z: 480 },
    cluster: "arch",
    tags: ["Rust", "Workers", "QUIC", "eBPF"],
    metrics: [
      { label: "p99 Ingress", val: "1.2ms" },
      { label: "Throughput", val: "120k req/s" },
      { label: "Uptime", val: "99.995%" },
      { label: "Protocol", val: "HTTP/3" },
    ],
    code: `// Ingress Router (Rust / Wasm)
pub async fn route_request(req: Request) -> Result<Response> {
    let client_ip = req.headers().get("cf-connecting-ip");
    rate_limiter.acquire(client_ip).await?;
    let target = load_balancer.select_peer().await;
    proxy_forward(target, req).await
}`,
  },
  {
    id: "event-stream",
    title: "Real-Time Telemetry & Pub/Sub",
    category: "EVENT STREAM",
    badge: "p99 < 3ms",
    badgeColor: "cyan",
    desc: "Distributed event stream broker managing multi-tenant bidirectional WebSocket pipelines with high-throughput Kafka topic fanout.",
    x: -980,
    y: -260,
    z: -140,
    camTarget: { x: -980, y: -260, z: 460 },
    cluster: "arch",
    tags: ["Go", "Kafka", "WebSockets", "Redis Cluster"],
    metrics: [
      { label: "Active Sockets", val: "48,000" },
      { label: "Packet Latency", val: "2.8ms" },
      { label: "Message Rate", val: "2.4M/min" },
      { label: "Buffer Saturation", val: "< 12%" },
    ],
    code: `// Pub/Sub Fanout Engine (Go)
func (b *Broker) Broadcast(topic string, payload []byte) {
    subs := b.registry.GetSubscribers(topic)
    for _, client := range subs {
        select {
        case client.SendChan <- payload:
        default:
            b.metrics.DroppedFrames.Inc()
        }
    }
}`,
  },
  // Cluster B: Featured Case Studies (Staggered forward into perspective)
  {
    id: "hyperscale",
    title: "HyperScale: Vector DB Engine",
    category: "PRODUCTION SYSTEM",
    badge: "10M+ VECTORS",
    badgeColor: "lime",
    desc: "High-dimensional similarity search engine in Rust & WebAssembly. HNSW indexing with AVX-512 SIMD vector quantization and sub-5ms search latency.",
    x: 940,
    y: 220,
    z: 60,
    camTarget: { x: 940, y: 220, z: 540 },
    cluster: "projects",
    tags: ["Rust", "SIMD", "Wasm", "gRPC", "HNSW"],
    metrics: [
      { label: "Index Scale", val: "10,000,000" },
      { label: "Recall @ 10", val: "98.4%" },
      { label: "Query P95", val: "4.1ms" },
      { label: "Memory Saving", val: "-38%" },
    ],
    code: `// SIMD Quantized Dot Product (Rust / AVX-512)
#[target_feature(enable = "avx512f")]
unsafe fn sim_dot_product(a: &[f32], b: &[f32]) -> f32 {
    let mut sum = _mm512_setzero_ps();
    for i in (0..a.len()).step_by(16) {
        let va = _mm512_loadu_ps(a.as_ptr().add(i));
        let vb = _mm512_loadu_ps(b.as_ptr().add(i));
        sum = _mm512_fmadd_ps(va, vb, sum);
    }
    _mm512_reduce_add_ps(sum)
}`,
  },
  {
    id: "omnisync",
    title: "OmniSync: Local-First CRDT",
    category: "COLLABORATION ENGINE",
    badge: "CONFLICT-FREE",
    badgeColor: "emerald",
    desc: "Peer-to-peer state synchronization kernel using Conflict-free Replicated Data Types (Automerge/Yjs) over WebRTC mesh with encrypted cloud fallback.",
    x: 980,
    y: -200,
    z: -30,
    camTarget: { x: 980, y: -200, z: 490 },
    cluster: "projects",
    tags: ["TypeScript", "CRDTs", "WebRTC", "IndexedDB"],
    metrics: [
      { label: "Sync Convergence", val: "18ms" },
      { label: "Offline Buffer", val: "100% Durability" },
      { label: "Peer Topology", val: "Full Mesh" },
      { label: "Data Integrity", val: "Zero Split-Brain" },
    ],
    code: `// CRDT State Reconciliation
export function applyRemoteUpdate(doc: AutomergeDoc, update: Uint8Array): SyncResult {
    const [nextDoc, patch] = Automerge.applyChanges(doc, [update]);
    indexedDBStorage.persistChanges(patch);
    meshNetwork.broadcastVectorClock(nextDoc);
    return { doc: nextDoc, patch };
}`,
  },
  {
    id: "kerneltrace",
    title: "KernelTrace: eBPF Profiler",
    category: "OBSERVABILITY",
    badge: "ZERO OVERHEAD",
    badgeColor: "cyan",
    desc: "Non-intrusive Linux kernel observability daemon tracing TCP socket lifecycle, block I/O bottlenecks, and container memory pressure via eBPF bytecode.",
    x: 960,
    y: -620,
    z: -160,
    camTarget: { x: 960, y: -620, z: 480 },
    cluster: "projects",
    tags: ["C", "Go", "Linux eBPF", "Prometheus"],
    metrics: [
      { label: "CPU Overhead", val: "< 0.8%" },
      { label: "Throughput", val: "100k ev/s" },
      { label: "Sampling Rate", val: "Continuous" },
      { label: "Kernel Safety", val: "Verifier Passed" },
    ],
    code: `SEC("kprobe/tcp_v4_connect")
int BPF_KPROBE(trace_tcp_v4_connect, struct sock *sk) {
    u32 pid = bpf_get_current_pid_tgid() >> 32;
    struct event ev = { .timestamp = bpf_ktime_get_ns(), .pid = pid };
    bpf_perf_event_output(ctx, &events, BPF_F_CURRENT_CPU, &ev, sizeof(ev));
    return 0;
}`,
  },
  // Cluster C: Infrastructure Stack (Deep in the foundation)
  {
    id: "infra-compute",
    title: "Core Compute & Storage Layer",
    category: "INFRASTRUCTURE",
    badge: "MULTI-REGION",
    badgeColor: "lime",
    desc: "Stateless container topology orchestrating microservices across AWS & Bare Metal Kubernetes with automated zero-downtime canary rollouts.",
    x: -860,
    y: -640,
    z: -200,
    camTarget: { x: -860, y: -640, z: 500 },
    cluster: "stack",
    tags: ["Kubernetes", "PostgreSQL", "Redis", "Terraform", "Envoy"],
    metrics: [
      { label: "Nodes Managed", val: "128 Pods" },
      { label: "Canary Rollout", val: "Automated" },
      { label: "Database P99", val: "1.4ms" },
      { label: "Cold Recovery", val: "< 14s" },
    ],
    code: `# Terraform Kubernetes Cluster Definition
module "edge_k8s_mesh" {
  source             = "terraform-aws-modules/eks/aws"
  cluster_name       = "edge-compute-prod"
  cluster_version    = "1.30"
  enable_irsa        = true
  vpc_cni_addon      = "true"
}`,
  },
  // Cluster D: Dossier & Terminal Uplink (Elevated in light)
  {
    id: "dossier",
    title: "Engineer Dossier & Identity",
    category: "IDENTITY // LEAD",
    badge: "AVAILABLE",
    badgeColor: "lime",
    desc: "Full-Stack & Systems Engineer specializing in distributed infrastructure, high-throughput pipelines, and hardware-accelerated interfaces.",
    x: 0,
    y: 800,
    z: 80,
    camTarget: { x: 0, y: 800, z: 580 },
    cluster: "dossier",
    tags: ["Distributed Systems", "WebGL", "Rust", "TypeScript", "Performance"],
    metrics: [
      { label: "Experience", val: "8+ Years" },
      { label: "Production SLA", val: "99.99%" },
      { label: "Stack Scope", val: "Frontend to Kernel" },
      { label: "Location", val: "Global / Remote" },
    ],
    code: `const engineer = {
  name: "Kwesi",
  role: "Senior Full-Stack & Systems Engineer",
  ethos: "Mechanical sympathy, zero layout bloat, resilient distributed state.",
  status: "Deploying high-impact systems."
};`,
  },
];
