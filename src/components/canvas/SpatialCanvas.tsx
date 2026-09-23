"use client";

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from "react";
import * as THREE from "three";
import {
  NODE_GRAPH,
  HERO_Y,
  DEFAULT_CAMERA_Z,
  MIN_CAMERA_Z,
  MAX_CAMERA_Z,
  WORLD_BOUNDS,
} from "@/data/nodeGraph";
import { SpatialNodeElement } from "@/components/nodes/SpatialNodeCard";
import {
  playWarpSound,
  playKeyClick,
  playSurgePulse,
} from "@/lib/soundEngine";

export interface SpatialCanvasHandle {
  focusNode: (nodeId: string) => void;
  triggerNetworkSurge: () => void;
  dollyBy: (deltaZ: number) => void;
  warpToCoords: (wx: number, wy: number) => void;
  highlightConnection: (nodeId: string, isHovered: boolean) => void;
}

interface SpatialCanvasProps {
  onNodeActivated: (nodeId: string) => void;
  onShowTemporaryHint: (msg: string) => void;
  statementRef: React.RefObject<HTMLDivElement | null>;
  heroBadgeRef: React.RefObject<HTMLDivElement | null>;
  telemetryRef: React.RefObject<HTMLDivElement | null>;
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  nodeRefs: React.RefObject<Map<string, SpatialNodeElement>>;
}

interface PacketMesh {
  mesh: THREE.Mesh;
  curve: THREE.CubicBezierCurve3;
  nodeId: string;
  t: number;
  baseSpeed: number;
  speed: number;
  targetPos: THREE.Vector3;
}

interface CurveInfo {
  curve: THREE.CubicBezierCurve3;
  nodeId: string;
  lineMesh: THREE.Line;
  defaultColor: number;
  highlightColor: number;
}

export const SpatialCanvas = forwardRef<SpatialCanvasHandle, SpatialCanvasProps>(
  (
    {
      onNodeActivated,
      onShowTemporaryHint,
      statementRef,
      heroBadgeRef,
      telemetryRef,
      radarCanvasRef,
      nodeRefs,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);

    // Camera & state refs to avoid React re-renders in RAF
    const targetCamRef = useRef({ x: 0, y: 40, z: DEFAULT_CAMERA_Z });
    const currentCamRef = useRef({ x: 0, y: 40, z: DEFAULT_CAMERA_Z });
    const activeNodeIdRef = useRef<string>("root");
    const networkSurgeRef = useRef<(() => void) | null>(null);
    const highlightConnRef = useRef<
      ((nodeId: string, isHovered: boolean) => void) | null
    >(null);

    const focusNodeInternal = useCallback(
      (nodeId: string) => {
        const node = NODE_GRAPH.find((n) => n.id === nodeId);
        if (!node) return;

        activeNodeIdRef.current = nodeId;
        onNodeActivated(nodeId);
        playWarpSound();

        if (nodeId === "root") {
          targetCamRef.current.x = 0;
          targetCamRef.current.y = 40;
          targetCamRef.current.z = DEFAULT_CAMERA_Z;
        } else {
          // Offset camera X (+180 in world coords on desktop) so focused node sits at center of unobstructed viewport
          const xOffset = typeof window !== "undefined" && window.innerWidth > 900 ? 180 : 0;
          targetCamRef.current.x = (node.camTarget ? node.camTarget.x : node.x) + xOffset;
          targetCamRef.current.y = node.camTarget ? node.camTarget.y : node.y;
          targetCamRef.current.z = node.camTarget ? node.camTarget.z : 520;
        }
      },
      [onNodeActivated]
    );

    useImperativeHandle(
      ref,
      () => ({
        focusNode: (nodeId: string) => {
          focusNodeInternal(nodeId);
        },
        triggerNetworkSurge: () => {
          if (networkSurgeRef.current) networkSurgeRef.current();
        },
        dollyBy: (deltaZ: number) => {
          playKeyClick();
          targetCamRef.current.z = Math.min(
            Math.max(targetCamRef.current.z + deltaZ, MIN_CAMERA_Z),
            MAX_CAMERA_Z
          );
        },
        warpToCoords: (wx: number, wy: number) => {
          targetCamRef.current.x = wx;
          targetCamRef.current.y = wy;
        },
        highlightConnection: (nodeId: string, isHovered: boolean) => {
          if (highlightConnRef.current)
            highlightConnRef.current(nodeId, isHovered);
        },
      }),
      [focusNodeInternal]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      let width = window.innerWidth;
      let height = window.innerHeight;

      // Scene setup
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050508, 0.00042);

      const camera = new THREE.PerspectiveCamera(50, width / height, 1, 6000);
      camera.position.set(0, 40, DEFAULT_CAMERA_Z);

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Multi-layer depth grids
      const gridDeep = new THREE.GridHelper(7000, 140, 0x181822, 0x09090e);
      gridDeep.rotation.x = Math.PI / 2;
      gridDeep.position.z = -350;
      scene.add(gridDeep);

      const gridBase = new THREE.GridHelper(5000, 100, 0x222230, 0x0f0f15);
      gridBase.rotation.x = Math.PI / 2;
      gridBase.position.z = -80;
      const gridBaseMat = gridBase.material as THREE.LineBasicMaterial;
      gridBaseMat.transparent = true;
      gridBaseMat.opacity = 0.5;
      scene.add(gridBase);

      // Atmospheric starfield (1,800 points)
      const particleCount = 1800;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(particleCount * 3);
      const starColors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 4500;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 3200;
        starPos[i * 3 + 2] = (Math.random() - 0.5) * 2000;

        const r = Math.random();
        if (r > 0.82) {
          starColors[i * 3] = 0.8;
          starColors[i * 3 + 1] = 1.0;
          starColors[i * 3 + 2] = 0.0; // Electric Lime
        } else if (r > 0.7) {
          starColors[i * 3] = 0.02;
          starColors[i * 3 + 1] = 0.71;
          starColors[i * 3 + 2] = 0.83; // Cyan
        } else {
          starColors[i * 3] = 0.65;
          starColors[i * 3 + 1] = 0.65;
          starColors[i * 3 + 2] = 0.75;
        }
      }
      starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
      starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

      const starMat = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const starField = new THREE.Points(starGeo, starMat);
      scene.add(starField);

      // Video texture and shader material
      video.play().catch((err) => {
        console.warn("Autoplay blocked, waiting for user gesture:", err);
        const playOnGesture = () => {
          video.play().catch(() => {});
          window.removeEventListener("click", playOnGesture);
          window.removeEventListener("keydown", playOnGesture);
        };
        window.addEventListener("click", playOnGesture, { once: true });
        window.addEventListener("keydown", playOnGesture, { once: true });
      });

      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.minFilter = THREE.LinearFilter;
      videoTexture.magFilter = THREE.LinearFilter;

      const nodeVertexShader = `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `;

      const nodeFragmentShader = `
        uniform sampler2D uTexture;
        uniform float uDist;
        uniform float uTime;
        varying vec2 vUv;

        void main() {
          vec4 texColor = texture2D(uTexture, vUv);
          float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

          // Soft luma key to dissolve dark background
          float alpha = smoothstep(0.04, 0.26, luma);

          // Edge falloff mask: dissolves the harsh rectangular boundary into the void
          float edgeX = smoothstep(0.0, 0.10, vUv.x) * smoothstep(1.0, 0.90, vUv.x);
          float edgeY = smoothstep(0.0, 0.26, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
          alpha *= edgeX * edgeY;

          // Perspective scanline CRT phosphor effect
          float scanlineFactor = clamp((uDist - 700.0) / 1200.0, 0.0, 1.0);
          float scanline = sin(vUv.y * 550.0 + uTime * 4.0) * 0.14 * scanlineFactor;
          
          vec3 finalColor = texColor.rgb - vec3(scanline);
          finalColor.g += scanlineFactor * 0.06;
          finalColor.r += scanlineFactor * 0.03;

          // Cybernetic rim contour glow on midtone silhouette edges
          float rim = smoothstep(0.12, 0.38, luma) * (1.0 - smoothstep(0.38, 0.72, luma));
          finalColor += vec3(0.8, 1.0, 0.0) * rim * 0.09;

          gl_FragColor = vec4(finalColor, alpha);
        }
      `;

      const videoMaterial = new THREE.ShaderMaterial({
        vertexShader: nodeVertexShader,
        fragmentShader: nodeFragmentShader,
        uniforms: {
          uTexture: { value: videoTexture },
          uDist: { value: DEFAULT_CAMERA_Z },
          uTime: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
      });

      let currentAspect = 1080 / 608;
      let cardWidth = Math.min(window.innerWidth * 0.82, 920);
      let cardHeight = cardWidth / currentAspect;

      let heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
      const heroMesh = new THREE.Mesh(heroMeshGeometry, videoMaterial);
      heroMesh.position.set(0, HERO_Y, 0);
      scene.add(heroMesh);

      // Volumetric aura texture helper
      function createGlowTexture(coreColor: string, haloColor: string) {
        const gCanvas = document.createElement("canvas");
        gCanvas.width = 256;
        gCanvas.height = 256;
        const ctx = gCanvas.getContext("2d");
        if (ctx) {
          const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
          grad.addColorStop(0, coreColor);
          grad.addColorStop(0.35, haloColor);
          grad.addColorStop(0.7, "rgba(9, 9, 20, 0.04)");
          grad.addColorStop(1, "rgba(0, 0, 0, 0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 256, 256);
        }
        return new THREE.CanvasTexture(gCanvas);
      }

      // Soft volumetric aura plane directly behind the hero portrait to eliminate square edges
      const heroAuraTex = createGlowTexture("rgba(6, 182, 212, 0.25)", "rgba(204, 255, 0, 0.12)");
      const heroAuraMat = new THREE.MeshBasicMaterial({
        map: heroAuraTex,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      let heroAuraGeo = new THREE.PlaneGeometry(cardWidth * 1.5, cardHeight * 1.5);
      const heroAuraMesh = new THREE.Mesh(heroAuraGeo, heroAuraMat);
      heroAuraMesh.position.set(0, HERO_Y, -25);
      scene.add(heroAuraMesh);

      // Volumetric cluster nebulas (ambient depth glow behind major node clusters)
      const clusterNebulaGroup = new THREE.Group();
      scene.add(clusterNebulaGroup);

      const clusterCenters = [
        { x: -600, y: 180, color: "rgba(6, 182, 212, 0.14)", halo: "rgba(6, 182, 212, 0.04)", size: 700 }, // Ingress / Edge
        { x: 620, y: 200, color: "rgba(204, 255, 0, 0.12)", halo: "rgba(204, 255, 0, 0.03)", size: 680 }, // Consensus / DB
        { x: -540, y: -260, color: "rgba(6, 182, 212, 0.12)", halo: "rgba(6, 182, 212, 0.03)", size: 650 }, // Observability / Kernel
        { x: 580, y: -240, color: "rgba(204, 255, 0, 0.13)", halo: "rgba(204, 255, 0, 0.04)", size: 660 }, // Compute / Dossier
      ];

      const clusterNebulaGeos: THREE.BufferGeometry[] = [];
      const clusterNebulaMats: THREE.Material[] = [];

      clusterCenters.forEach((c) => {
        const tex = createGlowTexture(c.color, c.halo);
        const mat = new THREE.MeshBasicMaterial({
          map: tex,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        const geo = new THREE.PlaneGeometry(c.size, c.size);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(c.x, c.y, -60);
        clusterNebulaGroup.add(mesh);
        clusterNebulaGeos.push(geo);
        clusterNebulaMats.push(mat);
      });

      // Packet radial gradient texture helper
      function createPacketTexture(colorHex: string) {
        const pCanvas = document.createElement("canvas");
        pCanvas.width = 64;
        pCanvas.height = 64;
        const ctx = pCanvas.getContext("2d");
        if (ctx) {
          const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
          grad.addColorStop(0, colorHex);
          grad.addColorStop(0.35, colorHex);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 64, 64);
        }
        return new THREE.CanvasTexture(pCanvas);
      }

      const limePacketTex = createPacketTexture("#ccff00");
      const cyanPacketTex = createPacketTexture("#06b6d4");

      // Connection pipelines & packet meshes
      const connectionGroup = new THREE.Group();
      scene.add(connectionGroup);

      let curvesList: CurveInfo[] = [];
      let packetMeshes: PacketMesh[] = [];

      function rebuildCurves() {
        while (connectionGroup.children.length > 0) {
          const obj = connectionGroup.children[0];
          connectionGroup.remove(obj);
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
        }
        curvesList = [];
        packetMeshes = [];

        NODE_GRAPH.forEach((node) => {
          if (node.id === "root") return;

          const startX = node.x > 0 ? cardWidth * 0.48 : -cardWidth * 0.48;
          const startY = HERO_Y;
          const startZ = 0;
          const start = new THREE.Vector3(startX, startY, startZ);
          const end = new THREE.Vector3(node.x, node.y, node.z);

          const dx = end.x - start.x;
          const dy = end.y - start.y;
          const cp1 = new THREE.Vector3(
            start.x + dx * 0.4,
            start.y + dy * 0.2,
            start.z + 100
          );
          const cp2 = new THREE.Vector3(
            start.x + dx * 0.65,
            end.y,
            end.z + 60
          );

          const curve = new THREE.CubicBezierCurve3(start, cp1, cp2, end);
          const points = curve.getPoints(50);
          const curveGeo = new THREE.BufferGeometry().setFromPoints(points);

          const curveMat = new THREE.LineBasicMaterial({
            color: 0x222230,
            transparent: true,
            opacity: 0.55,
          });
          const lineMesh = new THREE.Line(curveGeo, curveMat);
          connectionGroup.add(lineMesh);

          curvesList.push({
            curve,
            nodeId: node.id,
            lineMesh,
            defaultColor: 0x222230,
            highlightColor: node.badgeColor === "cyan" ? 0x06b6d4 : 0xccff00,
          });

          for (let p = 0; p < 2; p++) {
            const pGeo = new THREE.PlaneGeometry(16, 16);
            const pMat = new THREE.MeshBasicMaterial({
              map: node.badgeColor === "cyan" ? cyanPacketTex : limePacketTex,
              transparent: true,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            });
            const pMesh = new THREE.Mesh(pGeo, pMat);
            connectionGroup.add(pMesh);

            const baseSpeed = 0.0035 + Math.random() * 0.002;
            packetMeshes.push({
              mesh: pMesh,
              curve,
              nodeId: node.id,
              t: p * 0.5,
              baseSpeed,
              speed: baseSpeed,
              targetPos: new THREE.Vector3(),
            });
          }
        });
      }

      function calibrateVideoDimensions() {
        if (video && video.videoWidth && video.videoHeight) {
          currentAspect = video.videoWidth / video.videoHeight;
        } else {
          currentAspect = 1080 / 608;
        }
        cardWidth = Math.min(window.innerWidth * 0.82, 920);
        cardHeight = cardWidth / currentAspect;

        heroMeshGeometry.dispose();
        heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
        heroMesh.geometry = heroMeshGeometry;
        heroMesh.position.set(0, HERO_Y, 0);

        heroAuraGeo.dispose();
        heroAuraGeo = new THREE.PlaneGeometry(cardWidth * 1.5, cardHeight * 1.5);
        heroAuraMesh.geometry = heroAuraGeo;
        heroAuraMesh.position.set(0, HERO_Y, -25);

        rebuildCurves();
      }

      video.addEventListener("loadedmetadata", calibrateVideoDimensions);
      calibrateVideoDimensions();

      // Network surge trigger
      const triggerNetworkSurge = () => {
        playSurgePulse();
        cameraShakeAmount = 3.8;

        packetMeshes.forEach((p) => {
          p.speed = p.baseSpeed * 3.4;
          setTimeout(() => (p.speed = p.baseSpeed), 1100);
        });

        gridBaseMat.opacity = 0.95;
        setTimeout(() => (gridBaseMat.opacity = 0.5), 400);

        onShowTemporaryHint(
          "⚡ NETWORK SURGE ACTIVE • 8 CLUSTERS SYNCHRONIZED"
        );
      };
      networkSurgeRef.current = triggerNetworkSurge;

      // Highlight connection trigger
      const highlightConnection = (nodeId: string, isHovered: boolean) => {
        curvesList.forEach((c) => {
          if (c.nodeId === nodeId) {
            (c.lineMesh.material as THREE.LineBasicMaterial).color.setHex(
              isHovered ? c.highlightColor : c.defaultColor
            );
            (c.lineMesh.material as THREE.LineBasicMaterial).opacity = isHovered
              ? 1.0
              : 0.55;
          }
        });
      };
      highlightConnRef.current = highlightConnection;

      // Zero-allocation projection vector buffers
      const tempProjVec = new THREE.Vector3();
      const tempNodeVec = new THREE.Vector3();

      function projectToScreen(wx: number, wy: number, wz: number) {
        tempProjVec.set(wx, wy, wz);
        tempProjVec.project(camera);

        const isVisible = tempProjVec.z < 1;
        const screenX = (tempProjVec.x * 0.5 + 0.5) * width;
        const screenY = (-(tempProjVec.y * 0.5) + 0.5) * height;

        tempNodeVec.set(wx, wy, wz);
        const dist = camera.position.distanceTo(tempNodeVec);
        const rawScale = DEFAULT_CAMERA_Z / Math.max(dist, 100);
        const scale = Math.max(0.45, Math.min(rawScale, 1.0));

        return { screenX, screenY, scale, isVisible };
      }

      // Input interactions: Wheel dolly along Z-axis
      const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const dollySpeed =
          (currentCamRef.current.z / DEFAULT_CAMERA_Z) * 80;
        targetCamRef.current.z += (e.deltaY > 0 ? 1 : -1) * dollySpeed;
        targetCamRef.current.z = Math.min(
          Math.max(targetCamRef.current.z, MIN_CAMERA_Z),
          MAX_CAMERA_Z
        );
      };
      window.addEventListener("wheel", handleWheel, { passive: false });

      // Input interactions: Mouse drag pan
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };

      const isInteractiveTarget = (target: HTMLElement | null) => {
        if (!target) return true;
        return (
          target.closest("#project-drawer") ||
          target.closest(".hud-controls") ||
          target.closest("header") ||
          target.closest("footer") ||
          target.closest("nav") ||
          target.closest("#shortcuts-modal") ||
          target.closest("#pro-hint-banner") ||
          target.closest("#radar-container") ||
          target.closest(".spatial-node") ||
          target.closest("button") ||
          target.closest("a") ||
          target.closest("input") ||
          target.closest("textarea")
        );
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (e.button !== 0) return;
        const target = e.target as HTMLElement | null;
        if (isInteractiveTarget(target)) {
          return;
        }
        isDragging = true;
        dragStart = { x: e.clientX, y: e.clientY };
      };

      const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        const depthFactor = currentCamRef.current.z / DEFAULT_CAMERA_Z;
        const dx = (e.clientX - dragStart.x) * depthFactor;
        const dy = (e.clientY - dragStart.y) * depthFactor;
        targetCamRef.current.x -= dx;
        targetCamRef.current.y += dy;
        dragStart = { x: e.clientX, y: e.clientY };
      };

      const handleMouseUp = () => {
        isDragging = false;
      };

      window.addEventListener("mousedown", handleMouseDown);
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);

      // Ambient mouse parallax tracking (Zero Reflow: normalized -1 to +1)
      let mouseNormX = 0;
      let mouseNormY = 0;
      let ambientParallaxX = 0;
      let ambientParallaxY = 0;
      let cameraShakeAmount = 0;

      const handlePointerMoveAmbient = (e: MouseEvent) => {
        mouseNormX = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        mouseNormY = -(e.clientY / window.innerHeight) * 2.0 + 1.0;
      };
      window.addEventListener("mousemove", handlePointerMoveAmbient, { passive: true });

      // Touch interactions (Pinch dolly + touch drag pan)
      let touchStartDist = 0;
      const handleTouchStart = (e: TouchEvent) => {
        const target = e.target as HTMLElement | null;
        if (isInteractiveTarget(target)) {
          return;
        }
        if (e.touches.length === 1) {
          isDragging = true;
          dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          isDragging = false;
          touchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (isDragging && e.touches.length === 1) {
          const depthFactor = currentCamRef.current.z / DEFAULT_CAMERA_Z;
          const dx = (e.touches[0].clientX - dragStart.x) * depthFactor;
          const dy = (e.touches[0].clientY - dragStart.y) * depthFactor;
          targetCamRef.current.x -= dx;
          targetCamRef.current.y += dy;
          dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const delta = touchStartDist - dist;
          targetCamRef.current.z += delta * 2;
          targetCamRef.current.z = Math.min(
            Math.max(targetCamRef.current.z, MIN_CAMERA_Z),
            MAX_CAMERA_Z
          );
          touchStartDist = dist;
        }
      };

      const handleTouchEnd = () => {
        isDragging = false;
      };

      window.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
      window.addEventListener("touchmove", handleTouchMove, { passive: true });
      window.addEventListener("touchend", handleTouchEnd);

      // Radar helper
      function worldToRadar(wx: number, wy: number, rw: number, rh: number) {
        const rx =
          ((wx - WORLD_BOUNDS.minX) /
            (WORLD_BOUNDS.maxX - WORLD_BOUNDS.minX)) *
          rw;
        const ry =
          ((WORLD_BOUNDS.maxY - wy) /
            (WORLD_BOUNDS.maxY - WORLD_BOUNDS.minY)) *
          rh;
        return { rx, ry };
      }

      function drawRadar() {
        const radarCanvas = radarCanvasRef.current;
        if (!radarCanvas) return;
        const radarCtx = radarCanvas.getContext("2d");
        if (!radarCtx) return;

        const rw = radarCanvas.width;
        const rh = radarCanvas.height;

        radarCtx.clearRect(0, 0, rw, rh);

        radarCtx.strokeStyle = "rgba(255, 255, 255, 0.05)";
        radarCtx.lineWidth = 1;
        radarCtx.beginPath();
        radarCtx.moveTo(rw / 2, 0);
        radarCtx.lineTo(rw / 2, rh);
        radarCtx.moveTo(0, rh / 2);
        radarCtx.lineTo(rw, rh / 2);
        radarCtx.stroke();

        NODE_GRAPH.forEach((n) => {
          const { rx, ry } = worldToRadar(n.x, n.y, rw, rh);
          radarCtx.fillStyle =
            n.id === activeNodeIdRef.current
              ? "#ccff00"
              : "rgba(255, 255, 255, 0.4)";
          radarCtx.beginPath();
          radarCtx.arc(rx, ry, n.id === "root" ? 3.5 : 2, 0, Math.PI * 2);
          radarCtx.fill();
        });

        const fovRad = (camera.fov * Math.PI) / 180;
        const frustumH =
          2 * Math.tan(fovRad / 2) * currentCamRef.current.z;
        const frustumW = frustumH * (width / height);

        const topLeft = worldToRadar(
          currentCamRef.current.x - frustumW / 2,
          currentCamRef.current.y + frustumH / 2,
          rw,
          rh
        );
        const botRight = worldToRadar(
          currentCamRef.current.x + frustumW / 2,
          currentCamRef.current.y - frustumH / 2,
          rw,
          rh
        );

        radarCtx.strokeStyle = "rgba(204, 255, 0, 0.75)";
        radarCtx.lineWidth = 1.2;
        radarCtx.strokeRect(
          topLeft.rx,
          topLeft.ry,
          botRight.rx - topLeft.rx,
          botRight.ry - topLeft.ry
        );
      }

      // Resize listener
      const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        calibrateVideoDimensions();
      };
      window.addEventListener("resize", handleResize);

      // High-performance 120 FPS render loop
      let animFrameId: number;
      let lastTime = performance.now();
      let lastFrameTime = performance.now();
      let startTime = performance.now();
      let frameCount = 0;
      let fps = 120;
      let radarFrameCounter = 0;

      const animate = () => {
        animFrameId = requestAnimationFrame(animate);

        const now = performance.now();
        const delta = Math.min((now - lastFrameTime) / 1000, 0.05);
        lastFrameTime = now;
        const elapsedTime = (now - startTime) / 1000;

        frameCount++;
        if (now - lastTime >= 1000) {
          fps = frameCount;
          frameCount = 0;
          lastTime = now;
        }

        // Critically damped camera lerp (framerate-independent)
        const lerpFactor = 1.0 - Math.exp(-7.0 * delta);

        // Critically damped camera lerp
        const dx = targetCamRef.current.x - currentCamRef.current.x;
        const dy = targetCamRef.current.y - currentCamRef.current.y;
        const dz = targetCamRef.current.z - currentCamRef.current.z;

        currentCamRef.current.x += Math.abs(dx) < 0.04 ? dx : dx * lerpFactor;
        currentCamRef.current.y += Math.abs(dy) < 0.04 ? dy : dy * lerpFactor;
        currentCamRef.current.z += Math.abs(dz) < 0.04 ? dz : dz * lerpFactor;

        // Ambient mouse parallax interpolation (smooth 3D inertia)
        const targetParallaxX = mouseNormX * 32;
        const targetParallaxY = mouseNormY * 20;
        ambientParallaxX += (targetParallaxX - ambientParallaxX) * lerpFactor;
        ambientParallaxY += (targetParallaxY - ambientParallaxY) * lerpFactor;

        // Camera shake decay (impulse on surge)
        let shakeX = 0;
        let shakeY = 0;
        if (cameraShakeAmount > 0.02) {
          shakeX = (Math.random() - 0.5) * cameraShakeAmount;
          shakeY = (Math.random() - 0.5) * cameraShakeAmount;
          cameraShakeAmount *= 0.91;
        }

        camera.position.set(
          currentCamRef.current.x + ambientParallaxX + shakeX,
          currentCamRef.current.y + ambientParallaxY + shakeY,
          currentCamRef.current.z
        );
        camera.lookAt(
          currentCamRef.current.x + ambientParallaxX * 0.35,
          currentCamRef.current.y + ambientParallaxY * 0.35,
          0
        );

        // Drifting starfield through 3D space
        const posAttr = starGeo.attributes.position as THREE.BufferAttribute;
        const posArray = posAttr.array as Float32Array;
        for (let i = 0; i < particleCount; i++) {
          posArray[i * 3 + 2] += 0.45;
          if (posArray[i * 3 + 2] > 1100) {
            posArray[i * 3 + 2] = -1100;
          }
        }
        posAttr.needsUpdate = true;

        // Update shader uniforms
        videoMaterial.uniforms.uDist.value = currentCamRef.current.z;
        videoMaterial.uniforms.uTime.value = elapsedTime;

        // Animate packets along 3D Bézier curves without allocations
        packetMeshes.forEach((p) => {
          p.t = (p.t + p.speed) % 1.0;
          p.curve.getPoint(p.t, p.targetPos);
          p.mesh.position.set(
            p.targetPos.x,
            p.targetPos.y,
            p.targetPos.z + 4
          );
        });

        // Perspective-project DOM statement: Anchored 55px above top of video
        const stmtEl = statementRef.current;
        if (stmtEl) {
          const statementWorldY = HERO_Y + cardHeight * 0.5 + 170;
          const stmtProj = projectToScreen(0, statementWorldY, 40);
          if (stmtProj.isVisible) {
            stmtEl.style.opacity = "1";
            stmtEl.style.transform = `translate3d(calc(${stmtProj.screenX.toFixed(1)}px - 50%), calc(${stmtProj.screenY.toFixed(1)}px - 50%), 0) scale3d(${stmtProj.scale.toFixed(3)}, ${stmtProj.scale.toFixed(3)}, 1)`;
          } else {
            stmtEl.style.opacity = "0";
          }
        }

        // Perspective-project Hero Status Badge: 24px below bottom of video
        const badgeEl = heroBadgeRef.current;
        if (badgeEl) {
          const badgeWorldY = HERO_Y - cardHeight * 0.5 - 28;
          const badgeProj = projectToScreen(0, badgeWorldY, 10);
          if (badgeProj.isVisible) {
            badgeEl.style.opacity = "1";
            badgeEl.style.transform = `translate3d(calc(${badgeProj.screenX.toFixed(1)}px - 50%), calc(${badgeProj.screenY.toFixed(1)}px - 50%), 0) scale3d(${badgeProj.scale.toFixed(3)}, ${badgeProj.scale.toFixed(3)}, 1)`;
          } else {
            badgeEl.style.opacity = "0";
          }
        }

        // Perspective-project all spatial node cards
        if (nodeRefs.current) {
          NODE_GRAPH.forEach((node) => {
            if (node.id === "root") return;
            const el = nodeRefs.current?.get(node.id);
            if (!el) return;

            const proj = projectToScreen(node.x, node.y, node.z);
            el._screenX = proj.screenX;
            el._screenY = proj.screenY;
            el._scale = proj.scale;

            if (proj.isVisible) {
              el.style.opacity = "1";
              el.style.pointerEvents = "auto";
              el.style.transform = `translate3d(calc(${proj.screenX.toFixed(1)}px - 50%), calc(${proj.screenY.toFixed(1)}px - 50%), 0) scale3d(${proj.scale.toFixed(3)}, ${proj.scale.toFixed(3)}, 1)`;
            } else {
              el.style.opacity = "0";
              el.style.pointerEvents = "none";
            }
          });
        }

        // Update telemetry
        const telEl = telemetryRef.current;
        if (telEl) {
          telEl.textContent = `POS: [${currentCamRef.current.x.toFixed(0)}, ${currentCamRef.current.y.toFixed(0)}, ${currentCamRef.current.z.toFixed(0)}] | ${fps} FPS`;
        }

        // Throttle radar render to 40 FPS
        radarFrameCounter++;
        if (radarFrameCounter % 3 === 0) {
          drawRadar();
        }

        renderer.render(scene, camera);
      };

      animate();

      return () => {
        cancelAnimationFrame(animFrameId);
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("mousemove", handlePointerMoveAmbient);
        video.removeEventListener("loadedmetadata", calibrateVideoDimensions);

        // Dispose Three.js objects
        heroMeshGeometry.dispose();
        heroAuraGeo.dispose();
        heroAuraMat.dispose();
        heroAuraTex.dispose();
        clusterNebulaGeos.forEach((g) => g.dispose());
        clusterNebulaMats.forEach((m) => m.dispose());
        videoMaterial.dispose();
        videoTexture.dispose();
        starGeo.dispose();
        starMat.dispose();
        gridDeep.geometry.dispose();
        gridBase.geometry.dispose();
        limePacketTex.dispose();
        cyanPacketTex.dispose();
        renderer.dispose();
      };
    }, [
      onNodeActivated,
      onShowTemporaryHint,
      statementRef,
      heroBadgeRef,
      telemetryRef,
      radarCanvasRef,
      nodeRefs,
    ]);

    return (
      <>
        {/* Hidden video source element for Three.js texture */}
        <video
          ref={videoRef}
          id="hero-video"
          loop
          muted
          playsInline
          autoPlay
          crossOrigin="anonymous"
          style={{ display: "none" }}
        >
          <source src="/hero_loop.webm" type="video/webm" />
          <source src="/hero_loop.mp4" type="video/mp4" />
        </video>

        {/* WebGL Canvas */}
        <canvas ref={canvasRef} id="gl-canvas" />
      </>
    );
  }
);

SpatialCanvas.displayName = "SpatialCanvas";
