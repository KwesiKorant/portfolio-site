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
import { NodeData } from "@/types/graph";
import { SpatialNodeElement } from "@/components/nodes/SpatialNodeCard";
import {
  playWarpSound,
  playKeyClick,
} from "@/lib/soundEngine";

export interface SpatialCanvasHandle {
  focusNode: (nodeId: string) => void;
  dollyBy: (deltaZ: number) => void;
  warpToCoords: (wx: number, wy: number) => void;
  panBy: (deltaX: number, deltaY: number) => void;
  rotateBy: (deltaYaw: number, deltaPitch: number) => void;
  resetCamera: () => void;
  highlightConnection: (nodeId: string, isHovered: boolean) => void;
  triggerDimensionalBreach: (direction?: "enter" | "exit") => void;
  stepMobileOrbit: (step: 1 | -1) => void;
}

interface SpatialCanvasProps {
  onNodeActivated: (nodeId: string) => void;
  onShowTemporaryHint: (msg: string) => void;
  statementRef: React.RefObject<HTMLDivElement | null>;
  heroBadgeRef?: React.RefObject<HTMLDivElement | null>;
  telemetryRef: React.RefObject<HTMLDivElement | null>;
  radarCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  nodeRefs: React.RefObject<Map<string, SpatialNodeElement>>;
  onExitToPortal?: () => void;
  isWarping?: boolean;
  onStepMobileOrbit?: (step: 1 | -1) => void;
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

export const MOBILE_DEFAULT_CAMERA_Z = 1620; // ~8% closer overview zoom on mobile (was 1750; 1750 / 1620 = +8.0%)

export const MOBILE_NODE_ORDER = [
  "edge-gateway",
  "hyperscale",
  "event-stream",
  "omnisync",
  "kerneltrace",
  "infra-compute",
];

export function getNodeCoordinates(
  node: NodeData,
  isMobile: boolean,
  mobileAngle: number = 0
): { x: number; y: number; z: number } {
  if (!isMobile) return { x: node.x, y: node.y, z: node.z };
  const idx = MOBILE_NODE_ORDER.indexOf(node.id);
  if (idx === -1) return { x: node.x, y: node.y, z: node.z };

  // 3D cylindrical carousel arc (Radius 205, Center Y: -220)
  const baseAngle = idx * ((2 * Math.PI) / 6) + mobileAngle;
  const R = 205;
  const x = Math.sin(baseAngle) * R;
  const z = Math.cos(baseAngle) * R * 0.65;
  return { x, y: -220, z };
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
      onExitToPortal,
      isWarping = false,
      onStepMobileOrbit,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const isWarpingRef = useRef(isWarping);

    useEffect(() => {
      isWarpingRef.current = isWarping;
    }, [isWarping]);

    // Camera & state refs to avoid React re-renders in RAF
    const targetCamRef = useRef({ x: 0, y: 75, z: DEFAULT_CAMERA_Z });
    const currentCamRef = useRef({ x: 0, y: 75, z: DEFAULT_CAMERA_Z });
    const targetLookAtRef = useRef({ x: 0, y: -60, z: 0 });
    const currentLookAtRef = useRef({ x: 0, y: -60, z: 0 });
    const targetOrbitAngleRef = useRef({ yaw: 0, pitch: 0 });
    const currentOrbitAngleRef = useRef({ yaw: 0, pitch: 0 });
    const activeNodeIdRef = useRef<string>("root");
    const hoveredNodeIdRef = useRef<string | null>(null);
    const targetCarouselAngleRef = useRef(0);
    const currentCarouselAngleRef = useRef(0);
    const highlightConnRef = useRef<
      ((nodeId: string, isHovered: boolean) => void) | null
    >(null);

    const focusNodeInternal = useCallback(
      (nodeId: string) => {
        const node = NODE_GRAPH.find((n) => n.id === nodeId);
        if (!node) return;

        activeNodeIdRef.current = nodeId;
        hoveredNodeIdRef.current = null;
        onNodeActivated(nodeId);
        playWarpSound();

        const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
        const defaultZ = isMobile ? MOBILE_DEFAULT_CAMERA_Z : DEFAULT_CAMERA_Z;

        if (nodeId === "root") {
          targetOrbitAngleRef.current.yaw = 0;
          targetOrbitAngleRef.current.pitch = 0;
          targetCamRef.current.x = 0;
          targetCamRef.current.y = isMobile ? 20 : 75;
          targetCamRef.current.z = defaultZ;
          targetLookAtRef.current.x = 0;
          targetLookAtRef.current.y = isMobile ? -20 : -60;
          targetLookAtRef.current.z = 0;
        } else {
          if (isMobile) {
            const idx = MOBILE_NODE_ORDER.indexOf(nodeId);
            if (idx !== -1) {
              targetCarouselAngleRef.current = -idx * ((2 * Math.PI) / 6);
              currentCarouselAngleRef.current = targetCarouselAngleRef.current;
            }
          }
          // Center camera directly on focused card with comfortable framing
          const coords = getNodeCoordinates(node, isMobile, currentCarouselAngleRef.current);
          targetCamRef.current.x = isMobile ? 0 : coords.x;
          targetCamRef.current.y = coords.y;
          targetCamRef.current.z = isMobile
            ? coords.z + 620
            : node.camTarget
            ? node.camTarget.z
            : node.z + 520;
          targetLookAtRef.current.x = isMobile ? 0 : coords.x;
          targetLookAtRef.current.y = coords.y;
          targetLookAtRef.current.z = coords.z;
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
        dollyBy: (deltaZ: number) => {
          targetCamRef.current.z = Math.min(
            Math.max(targetCamRef.current.z + deltaZ, MIN_CAMERA_Z),
            MAX_CAMERA_Z
          );
        },
        warpToCoords: (wx: number, wy: number) => {
          targetCamRef.current.x = Math.max(
            WORLD_BOUNDS.minX,
            Math.min(wx, WORLD_BOUNDS.maxX)
          );
          targetCamRef.current.y = Math.max(
            WORLD_BOUNDS.minY,
            Math.min(wy, WORLD_BOUNDS.maxY)
          );
          targetLookAtRef.current.x = targetCamRef.current.x;
          targetLookAtRef.current.y = targetCamRef.current.y - 135;
        },
        panBy: (deltaX: number, deltaY: number) => {
          const depthFactor = currentCamRef.current.z / DEFAULT_CAMERA_Z;
          targetCamRef.current.x = Math.max(
            WORLD_BOUNDS.minX,
            Math.min(targetCamRef.current.x + deltaX * depthFactor, WORLD_BOUNDS.maxX)
          );
          targetCamRef.current.y = Math.max(
            WORLD_BOUNDS.minY,
            Math.min(targetCamRef.current.y + deltaY * depthFactor, WORLD_BOUNDS.maxY)
          );
          targetLookAtRef.current.x = targetCamRef.current.x;
          targetLookAtRef.current.y = targetCamRef.current.y - 135;
        },
        rotateBy: (deltaYaw: number, deltaPitch: number) => {
          targetOrbitAngleRef.current.yaw = Math.max(
            -0.58,
            Math.min(targetOrbitAngleRef.current.yaw + deltaYaw, 0.58)
          );
          targetOrbitAngleRef.current.pitch = Math.max(
            -0.32,
            Math.min(targetOrbitAngleRef.current.pitch + deltaPitch, 0.32)
          );
        },
        resetCamera: () => {
          const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
          const defaultZ = isMobile ? MOBILE_DEFAULT_CAMERA_Z : DEFAULT_CAMERA_Z;
          targetOrbitAngleRef.current.yaw = 0;
          targetOrbitAngleRef.current.pitch = 0;
          targetCamRef.current.x = 0;
          targetCamRef.current.y = isMobile ? 20 : 75;
          targetCamRef.current.z = defaultZ;
          targetLookAtRef.current.x = 0;
          targetLookAtRef.current.y = isMobile ? -20 : -60;
          targetLookAtRef.current.z = 0;
          focusNodeInternal("root");
        },
        highlightConnection: (nodeId: string, isHovered: boolean) => {
          if (highlightConnRef.current)
            highlightConnRef.current(nodeId, isHovered);
        },
        triggerDimensionalBreach: (direction: "enter" | "exit" = "enter") => {
          const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
          const defaultZ = isMobile ? MOBILE_DEFAULT_CAMERA_Z : DEFAULT_CAMERA_Z;
          if (direction === "enter") {
            // Camera swoops forward from hyperspace depth into elevated perspective
            currentCamRef.current.z = isMobile ? 1900 : 2100;
            currentCamRef.current.x = 0;
            currentCamRef.current.y = isMobile ? 20 : 75;
            targetCamRef.current.x = 0;
            targetCamRef.current.y = isMobile ? 20 : 75;
            targetCamRef.current.z = defaultZ;
            targetLookAtRef.current.x = 0;
            targetLookAtRef.current.y = isMobile ? -20 : -60;
            targetLookAtRef.current.z = 0;
            currentLookAtRef.current.x = 0;
            currentLookAtRef.current.y = isMobile ? -20 : -60;
            currentLookAtRef.current.z = 0;
            activeNodeIdRef.current = "root";
            onNodeActivated("root");
          } else {
            // Symmetrical reverse warp pull
            targetCamRef.current.z = 2400;
          }
        },
        stepMobileOrbit: (step: 1 | -1) => {
          targetCarouselAngleRef.current -= step * ((2 * Math.PI) / 6);
          playKeyClick();
        },
      }),
      [focusNodeInternal, onNodeActivated]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas) return;

      let width = window.innerWidth;
      let height = window.innerHeight;
      const isMobile = width < 768;
      const defaultZ = isMobile ? MOBILE_DEFAULT_CAMERA_Z : DEFAULT_CAMERA_Z;

      // Scene setup
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050508, 0.00042);

      const initialAspect = width / height;
      const initialFov = initialAspect < 1.0 ? Math.min(74, (50 / initialAspect) * 0.68) : 50;
      const camera = new THREE.PerspectiveCamera(initialFov, initialAspect, 1, 6000);
      camera.position.set(0, isMobile ? 20 : 180, defaultZ);
      camera.lookAt(0, isMobile ? -20 : -70, 0);
      currentCamRef.current.z = defaultZ;
      targetCamRef.current.z = defaultZ;
      currentCamRef.current.y = isMobile ? 20 : 75;
      targetCamRef.current.y = isMobile ? 20 : 75;
      currentLookAtRef.current.y = isMobile ? -20 : -60;
      targetLookAtRef.current.y = isMobile ? -20 : -60;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : 2));

      // Cybernetic Ground Floor Plane (Perspective floor on X-Z axis at Y_FLOOR = -500)
      const Y_FLOOR = -500;

      const floorVertexShader = `
        varying vec3 vWorldPos;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPos = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `;

      // Mobile: stripped shader (no fine grid, no rings, no wave pulse, 750 radius) strictly isolated for mobile GPU performance
      const floorFragmentShader = isMobile ? `
        varying vec3 vWorldPos;
        uniform float uTime;

        float getGrid(vec2 coord, float stepSize, float lineWidth) {
          vec2 grid = abs(fract(coord / stepSize - 0.5) - 0.5) / fwidth(coord / stepSize);
          float line = min(grid.x, grid.y);
          return 1.0 - min(line / lineWidth, 1.0);
        }

        void main() {
          vec2 p = vWorldPos.xz;
          float dist = length(p);
          if (dist > 750.0) { gl_FragColor = vec4(0.0); return; }
          float alpha = smoothstep(750.0, 200.0, dist);
          float majorGrid = getGrid(p, 250.0, 1.2) * 0.7;
          float axisX = 1.0 - min(abs(p.y) / (fwidth(p.y) * 1.5), 1.0);
          float axisZ = 1.0 - min(abs(p.x) / (fwidth(p.x) * 1.5), 1.0);
          float axes = max(axisX, axisZ) * 0.4;
          float centerSpot = smoothstep(350.0, 40.0, dist) * 0.1;
          vec3 col = vec3(0.02, 0.04, 0.06);
          col += vec3(0.8, 1.0, 0.0) * (majorGrid * 0.4);
          col += vec3(0.06, 0.75, 0.85) * axes;
          col += vec3(0.8, 1.0, 0.0) * centerSpot;
          float finalAlpha = clamp((majorGrid + axes + centerSpot) * alpha, 0.0, 0.88);
          gl_FragColor = vec4(col, finalAlpha);
        }
      ` : `
        varying vec3 vWorldPos;
        uniform float uTime;

        // Anti-aliased dual-scale grid
        float getGrid(vec2 coord, float stepSize, float lineWidth) {
          vec2 grid = abs(fract(coord / stepSize - 0.5) - 0.5) / fwidth(coord / stepSize);
          float line = min(grid.x, grid.y);
          return 1.0 - min(line / lineWidth, 1.0);
        }

        void main() {
          vec2 p = vWorldPos.xz;
          float dist = length(p);

          // Fast early return for pixels beyond visible floor radius
          if (dist > 1950.0) {
            gl_FragColor = vec4(0.0);
            return;
          }

          // Radial falloff: dissolve cleanly into the void without hard borders
          float alpha = smoothstep(1950.0, 320.0, dist);
          if (alpha <= 0.001) {
            gl_FragColor = vec4(0.0);
            return;
          }

          // Major perspective cyber-grid (250 unit step)
          float majorGrid = getGrid(p, 250.0, 1.2) * 0.7;

          // High-performance optimization: evaluate fineGrid (50 unit step) ONLY within 800 units,
          // smoothly fading out to eliminate sub-pixel moiré and save 80% fill-rate math
          float fineGrid = dist < 800.0 ? getGrid(p, 50.0, 0.8) * 0.24 * smoothstep(800.0, 400.0, dist) : 0.0;
          float grid = fineGrid + majorGrid;

          // Glowing coordinate axes
          float axisX = 1.0 - min(abs(p.y) / (fwidth(p.y) * 1.5), 1.0);
          float axisZ = 1.0 - min(abs(p.x) / (fwidth(p.x) * 1.5), 1.0);
          float axes = max(axisX, axisZ) * 0.45;

          // High-performance optimization: rings only calculated within active radius (dist < 400.0)
          float rings = 0.0;
          if (dist < 400.0) {
            float r1 = abs(dist - 140.0);
            float r2 = abs(dist - 260.0);
            float r3 = abs(dist - 380.0);
            rings = (
              smoothstep(3.0, 0.0, r1) * 0.6 +
              smoothstep(2.5, 0.0, r2) * 0.45 +
              smoothstep(2.0, 0.0, r3) * 0.35
            );
          }

          // High-performance optimization: outward radiating energy pulse only evaluated when dist < 550.0
          float waveGlow = 0.0;
          if (dist < 550.0) {
            float wave = sin(dist * 0.035 - uTime * 2.2);
            waveGlow = smoothstep(0.92, 1.0, wave) * smoothstep(550.0, 50.0, dist) * 0.25;
          }

          // Soft spotlight pool under the center stage (dist < 450.0)
          float centerSpot = dist < 450.0 ? smoothstep(450.0, 40.0, dist) * 0.14 : 0.0;

          vec3 col = vec3(0.02, 0.04, 0.06);
          col += vec3(0.04, 0.15, 0.22) * fineGrid;
          col += vec3(0.8, 1.0, 0.0) * (majorGrid * 0.45);
          col += vec3(0.06, 0.75, 0.85) * (axes + rings + waveGlow);
          col += vec3(0.8, 1.0, 0.0) * centerSpot;

          float finalAlpha = clamp((grid + axes + rings + waveGlow + centerSpot) * alpha, 0.0, 0.88);
          gl_FragColor = vec4(col, finalAlpha);
        }
      `;

      const floorMat = new THREE.ShaderMaterial({
        vertexShader: floorVertexShader,
        fragmentShader: floorFragmentShader,
        uniforms: {
          uTime: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
      });

      const floorSize = isMobile ? 1200 : 3900;
      const floorGeo = new THREE.PlaneGeometry(floorSize, floorSize, 1, 1);
      const floorMesh = new THREE.Mesh(floorGeo, floorMat);
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.position.set(0, Y_FLOOR, 0);
      floorMesh.renderOrder = 0;
      scene.add(floorMesh);

      // Packet radial gradient texture helper (for curves between avatar and cards)
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

      // Vertical connecting beam texture helper
      function createBeamTexture(colorHex: string) {
        const pCanvas = document.createElement("canvas");
        pCanvas.width = 64;
        pCanvas.height = 256;
        const ctx = pCanvas.getContext("2d");
        if (ctx) {
          const grad = ctx.createLinearGradient(0, 0, 64, 0);
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(0.2, "rgba(0,0,0,0)");
          grad.addColorStop(0.38, colorHex);
          grad.addColorStop(0.5, "#ffffff");
          grad.addColorStop(0.62, colorHex);
          grad.addColorStop(0.8, "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 64, 256);
        }
        return new THREE.CanvasTexture(pCanvas);
      }

      // Descending light pulse texture helper
      function createPulseTexture(colorHex: string) {
        const pCanvas = document.createElement("canvas");
        pCanvas.width = 64;
        pCanvas.height = 128;
        const ctx = pCanvas.getContext("2d");
        if (ctx) {
          const grad = ctx.createRadialGradient(32, 64, 2, 32, 64, 30);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.25, colorHex);
          grad.addColorStop(0.65, colorHex);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 64, 128);
        }
        return new THREE.CanvasTexture(pCanvas);
      }

      // Contact flare impact texture helper
      function createFlareTexture(colorHex: string) {
        const pCanvas = document.createElement("canvas");
        pCanvas.width = 128;
        pCanvas.height = 128;
        const ctx = pCanvas.getContext("2d");
        if (ctx) {
          const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
          grad.addColorStop(0, "#ffffff");
          grad.addColorStop(0.2, colorHex);
          grad.addColorStop(0.55, colorHex);
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, 128, 128);
        }
        return new THREE.CanvasTexture(pCanvas);
      }

      const limePacketTex = createPacketTexture("#ccff00");
      const cyanPacketTex = createPacketTexture("#06b6d4");
      const emeraldPacketTex = createPacketTexture("#10b981");

      const limeBeamTex = createBeamTexture("#ccff00");
      const cyanBeamTex = createBeamTexture("#06b6d4");
      const emeraldBeamTex = createBeamTexture("#10b981");

      const limePulseTex = createPulseTexture("#ccff00");
      const cyanPulseTex = createPulseTexture("#06b6d4");
      const emeraldPulseTex = createPulseTexture("#10b981");

      const limeFlareTex = createFlareTexture("#ccff00");
      const cyanFlareTex = createFlareTexture("#06b6d4");
      const emeraldFlareTex = createFlareTexture("#10b981");

      // Floor Beacons: Ground footprint rings, vertical light plumb-beams & dynamic contact pings beneath hovering cards
      const floorBeaconGroup = new THREE.Group();
      scene.add(floorBeaconGroup);

      interface FloorBeacon {
        nodeId: string;
        baseOuterRingMesh: THREE.Mesh;
        baseInnerRingMesh: THREE.Mesh;
        coreDiscMesh: THREE.Mesh;
        pingRingMesh1: THREE.Mesh;
        pingRingMesh2: THREE.Mesh;
        beamMesh: THREE.Mesh;
        lineMesh: THREE.Line;
        portMesh: THREE.Mesh;
        pulseMesh: THREE.Mesh;
        cardBottomY: number;
        floorY: number;
        isHovered: boolean;
        settledIdle?: boolean;
        beamExtendProgress: number; // 0.0 to 1.0 (shooting down from card on hover)
        pulseProgress: number; // 0.0 to 1.0 (traveling downwards from card to floor)
        pingProgress1: number; // 0.0 to 1.0 (ground shockwave ripple)
        pingProgress2: number; // 0.0 to 1.0 (staggered second ripple)
        pingIntensity: number; // 1.0 down to 0.0 bloom intensity
      }
      const floorBeacons: FloorBeacon[] = [];

      function rebuildFloorBeacons() {
        while (floorBeaconGroup.children.length > 0) {
          const obj = floorBeaconGroup.children[0];
          floorBeaconGroup.remove(obj);
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
        }
        floorBeacons.length = 0;

        const isMobileView = width < 768;
        NODE_GRAPH.forEach((node) => {
          if (node.id === "root") return;

          const coords = getNodeCoordinates(node, isMobileView);
          const nodeX = coords.x;
          const nodeY = coords.y;
          const nodeZ = coords.z;

          // Exact physical bottom edge of each card for vertical conduit beam
          const cardHalfHeight = isMobileView
            ? 115
            : (node.id === "edge-gateway" || node.id === "event-stream" ? 175 : 165);
          const cardBottomY = nodeY - cardHalfHeight;
          const floorY = Y_FLOOR + 1;
          const beaconColor =
            node.badgeColor === "cyan"
              ? 0x06b6d4
              : node.badgeColor === "emerald"
              ? 0x10b981
              : 0xccff00;
          const beamTex =
            node.badgeColor === "cyan"
              ? cyanBeamTex
              : node.badgeColor === "emerald"
              ? emeraldBeamTex
              : limeBeamTex;
          const pulseTex =
            node.badgeColor === "cyan"
              ? cyanPulseTex
              : node.badgeColor === "emerald"
              ? emeraldPulseTex
              : limePulseTex;
          const flareTex =
            node.badgeColor === "cyan"
              ? cyanFlareTex
              : node.badgeColor === "emerald"
              ? emeraldFlareTex
              : limeFlareTex;

          // Base static outer reticle ring on the floor at (nodeX, floorY, nodeZ)
          const baseOuterRingGeo = new THREE.RingGeometry(38, 48, 48);
          const baseOuterRingMat = new THREE.MeshBasicMaterial({
            color: beaconColor,
            transparent: true,
            opacity: 0.28,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const baseOuterRingMesh = new THREE.Mesh(baseOuterRingGeo, baseOuterRingMat);
          baseOuterRingMesh.rotation.x = -Math.PI / 2;
          baseOuterRingMesh.position.set(nodeX, floorY + 0.1, nodeZ);
          baseOuterRingMesh.renderOrder = 10;
          floorBeaconGroup.add(baseOuterRingMesh);

          // Base static inner reticle ring on the floor
          const baseInnerRingGeo = new THREE.RingGeometry(16, 24, 32);
          const baseInnerRingMat = new THREE.MeshBasicMaterial({
            color: beaconColor,
            transparent: true,
            opacity: 0.32,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const baseInnerRingMesh = new THREE.Mesh(baseInnerRingGeo, baseInnerRingMat);
          baseInnerRingMesh.rotation.x = -Math.PI / 2;
          baseInnerRingMesh.position.set(nodeX, floorY + 0.15, nodeZ);
          baseInnerRingMesh.renderOrder = 10;
          floorBeaconGroup.add(baseInnerRingMesh);

          // Core contact flare disc (blooms when string strikes ground)
          const coreDiscGeo = new THREE.CircleGeometry(22, 32);
          const coreDiscMat = new THREE.MeshBasicMaterial({
            map: flareTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.22,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const coreDiscMesh = new THREE.Mesh(coreDiscGeo, coreDiscMat);
          coreDiscMesh.rotation.x = -Math.PI / 2;
          coreDiscMesh.position.set(nodeX, floorY + 0.2, nodeZ);
          coreDiscMesh.renderOrder = 11;
          floorBeaconGroup.add(coreDiscMesh);

          // Dynamic round contact ping ripple rings (shockwaves expanding on ground plane)
          const pingRingGeo1 = new THREE.RingGeometry(22, 42, 48);
          const pingRingMat1 = new THREE.MeshBasicMaterial({
            color: beaconColor,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const pingRingMesh1 = new THREE.Mesh(pingRingGeo1, pingRingMat1);
          pingRingMesh1.rotation.x = -Math.PI / 2;
          pingRingMesh1.position.set(nodeX, floorY + 0.3, nodeZ);
          pingRingMesh1.renderOrder = 12;
          pingRingMesh1.visible = false;
          floorBeaconGroup.add(pingRingMesh1);

          const pingRingGeo2 = new THREE.RingGeometry(22, 42, 48);
          const pingRingMat2 = new THREE.MeshBasicMaterial({
            color: beaconColor,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: 0.0,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const pingRingMesh2 = new THREE.Mesh(pingRingGeo2, pingRingMat2);
          pingRingMesh2.rotation.x = -Math.PI / 2;
          pingRingMesh2.position.set(nodeX, floorY + 0.35, nodeZ);
          pingRingMesh2.renderOrder = 12;
          pingRingMesh2.visible = false;
          floorBeaconGroup.add(pingRingMesh2);

          // Vertical luminous light conduit beam (anchored at card bottom and extending down to floor)
          const beamHeight = Math.max(10, cardBottomY - floorY);
          const beamGeo = new THREE.PlaneGeometry(28, beamHeight);
          // Translate so geometry origin is at top (card emitter) for top-down extension
          beamGeo.translate(0, -beamHeight / 2, 0);
          const beamMat = new THREE.MeshBasicMaterial({
            map: beamTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.18,
            side: THREE.DoubleSide,
          });
          const beamMesh = new THREE.Mesh(beamGeo, beamMat);
          beamMesh.position.set(nodeX, cardBottomY, nodeZ);
          beamMesh.renderOrder = 15;
          floorBeaconGroup.add(beamMesh);

          // Central core laser filament line
          const linePoints = [
            new THREE.Vector3(nodeX, floorY, nodeZ),
            new THREE.Vector3(nodeX, cardBottomY, nodeZ),
          ];
          const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints);
          const lineMat = new THREE.LineBasicMaterial({
            color: beaconColor,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
          });
          const lineMesh = new THREE.Line(lineGeo, lineMat);
          lineMesh.renderOrder = 14;
          floorBeaconGroup.add(lineMesh);

          // Card bottom emitter ingress port
          const portGeo = new THREE.RingGeometry(3, 7, 24);
          const portMat = new THREE.MeshBasicMaterial({
            color: beaconColor,
            transparent: true,
            opacity: 0.45,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const portMesh = new THREE.Mesh(portGeo, portMat);
          portMesh.position.set(nodeX, cardBottomY, nodeZ + 1);
          portMesh.renderOrder = 16;
          floorBeaconGroup.add(portMesh);

          // Descending energy pulse: travels down string from card to ground on hover
          const pulseGeo = new THREE.PlaneGeometry(38, 76);
          const pulseMat = new THREE.MeshBasicMaterial({
            map: pulseTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 0.0,
          });
          const pulseMesh = new THREE.Mesh(pulseGeo, pulseMat);
          pulseMesh.position.set(nodeX, cardBottomY, nodeZ + 2);
          pulseMesh.renderOrder = 20;
          pulseMesh.visible = false;
          floorBeaconGroup.add(pulseMesh);

          floorBeacons.push({
            nodeId: node.id,
            baseOuterRingMesh,
            baseInnerRingMesh,
            coreDiscMesh,
            pingRingMesh1,
            pingRingMesh2,
            beamMesh,
            lineMesh,
            portMesh,
            pulseMesh,
            cardBottomY,
            floorY,
            isHovered: false,
            beamExtendProgress: 1.0,
            pulseProgress: 0.0,
            pingProgress1: 0.0,
            pingProgress2: 0.45,
            pingIntensity: 0.0,
          });
        });
      }
      rebuildFloorBeacons();

      // Atmospheric starfield (desktop: 1,800 points, mobile: 400 to reduce fill-rate pressure from additive blending)
      const particleCount = isMobile ? 400 : 1800;
      const starGeo = new THREE.BufferGeometry();
      const starPos = new Float32Array(particleCount * 3);
      const starColors = new Float32Array(particleCount * 3);

      for (let i = 0; i < particleCount; i++) {
        starPos[i * 3] = (Math.random() - 0.5) * 4500;
        starPos[i * 3 + 1] = (Math.random() - 0.5) * 3200;
        starPos[i * 3 + 2] = -1200 + Math.random() * 2000;

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

      // Hero avatar texture: on mobile, load optimized static texture to eliminate severe WebGL texImage2D video buffer stalls
      let heroTexture: THREE.Texture;
      if (isMobile) {
        heroTexture = new THREE.TextureLoader().load("/hero-front.webp");
        heroTexture.minFilter = THREE.LinearFilter;
        heroTexture.magFilter = THREE.LinearFilter;
      } else if (video) {
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

        const vTex = new THREE.VideoTexture(video);
        vTex.minFilter = THREE.LinearFilter;
        vTex.magFilter = THREE.LinearFilter;
        heroTexture = vTex;
      } else {
        heroTexture = new THREE.TextureLoader().load("/hero-front.webp");
      }

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
          uTexture: { value: heroTexture },
          uDist: { value: DEFAULT_CAMERA_Z },
          uTime: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
      });

      let currentAspect = 1080 / 608;
      const isMobileInit = window.innerWidth < 768;
      let cardWidth = isMobileInit
        ? Math.min(Math.max(window.innerWidth * 1.15, 420), 540)
        : Math.min(window.innerWidth * 0.82, 920);
      let cardHeight = cardWidth / currentAspect;

      let heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
      const heroMesh = new THREE.Mesh(heroMeshGeometry, videoMaterial);
      const heroMeshInitY = isMobileInit ? 260 : HERO_Y;
      heroMesh.position.set(0, heroMeshInitY, 0);
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
      let heroAuraGeo = new THREE.PlaneGeometry(cardWidth * 1.4, cardHeight * 1.4);
      const heroAuraMesh = new THREE.Mesh(heroAuraGeo, heroAuraMat);
      heroAuraMesh.position.set(0, heroMeshInitY, -80);
      scene.add(heroAuraMesh);

      // Volumetric cluster nebulas (ambient depth glow behind major node clusters)
      const clusterNebulaGroup = new THREE.Group();
      scene.add(clusterNebulaGroup);

      const clusterCenters = [
        { x: -1240, y: 140, z: -160, color: "rgba(6, 182, 212, 0.14)", halo: "rgba(6, 182, 212, 0.04)", size: 850 }, // Left / Systems & Tech
        { x: 1240, y: 140, z: -80, color: "rgba(204, 255, 0, 0.12)", halo: "rgba(204, 255, 0, 0.03)", size: 850 }, // Right / Production Projects
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
        mesh.position.set(c.x, c.y, c.z);
        clusterNebulaGroup.add(mesh);
        clusterNebulaGeos.push(geo);
        clusterNebulaMats.push(mat);
      });

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

          const isMobileView = width < 768;
          const coords = getNodeCoordinates(node, isMobileView);
          const nodeX = coords.x;
          const nodeY = coords.y;
          const nodeZ = coords.z;

          // Vector from avatar head center (0, 30) towards node
          const avatarCenterX = 0;
          const avatarCenterY = 30;
          const dirX = nodeX - avatarCenterX;
          const dirY = nodeY - avatarCenterY;
          const angle = Math.atan2(dirY, dirX);

          // Visible avatar outer boundary in 3D world units (silhouette perimeter)
          const avatarRadX = isMobileView ? 165 : 185;
          const avatarRadY = isMobileView ? 195 : 220;
          const startX = avatarCenterX + Math.cos(angle) * avatarRadX;
          const startY = avatarCenterY + Math.sin(angle) * avatarRadY;
          const startZ = -10;
          const start = new THREE.Vector3(startX, startY, startZ);

          // Card ingress port
          let endX = nodeX;
          let endY = nodeY;
          let endZ = nodeZ;

          if (nodeX > 50) {
            endX = nodeX - (isMobileView ? 75 : 165); // left edge of right-hand cards
          } else if (nodeX < -50) {
            endX = nodeX + (isMobileView ? 75 : 165); // right edge of left-hand cards
          } else if (nodeY > avatarCenterY) {
            endY = nodeY - (isMobileView ? 65 : 110);
          } else {
            endY = nodeY + (isMobileView ? 65 : 110);
          }
          const end = new THREE.Vector3(endX, endY, endZ);

          // Smooth 3D cubic bezier control points
          const cp1 = new THREE.Vector3(
            start.x + Math.cos(angle) * (isMobileView ? 90 : 140),
            start.y + Math.sin(angle) * (isMobileView ? 90 : 140),
            start.z + 20
          );
          const cp2 = new THREE.Vector3(
            end.x - (nodeX > 50 ? (isMobileView ? 50 : 100) : nodeX < -50 ? (isMobileView ? -50 : -100) : 0),
            end.y - (Math.abs(nodeX) <= 50 ? (nodeY > avatarCenterY ? 40 : -40) : 0),
            end.z + 15
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

          // Subtle glowing ingress port on card edge
          const portGeo = new THREE.RingGeometry(2.5, 4.5, 16);
          const portMat = new THREE.MeshBasicMaterial({
            color: node.badgeColor === "cyan" ? 0x06b6d4 : 0xccff00,
            transparent: true,
            opacity: 0.75,
            side: THREE.DoubleSide,
          });
          const portMesh = new THREE.Mesh(portGeo, portMat);
          portMesh.position.copy(end);
          connectionGroup.add(portMesh);

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

            const baseSpeed = 0.0032 + Math.random() * 0.0018;
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
        const isMobileNow = window.innerWidth < 768;
        cardWidth = isMobileNow
          ? Math.min(Math.max(window.innerWidth * 1.15, 420), 540)
          : Math.min(window.innerWidth * 0.82, 920);
        cardHeight = cardWidth / currentAspect;

        const heroMeshCalibY = isMobileNow ? 260 : HERO_Y;
        heroMeshGeometry.dispose();
        heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
        heroMesh.geometry = heroMeshGeometry;
        heroMesh.position.set(0, heroMeshCalibY, 0);

        heroAuraGeo.dispose();
        heroAuraGeo = new THREE.PlaneGeometry(cardWidth * 1.4, cardHeight * 1.4);
        heroAuraMesh.geometry = heroAuraGeo;
        heroAuraMesh.position.set(0, heroMeshCalibY, -80);

        rebuildCurves();
        rebuildFloorBeacons();
      }

      if (video) {
        video.addEventListener("loadedmetadata", calibrateVideoDimensions);
      }
      calibrateVideoDimensions();

      // Highlight connection & depth-peeking trigger
      const highlightConnection = (nodeId: string, isHovered: boolean) => {
        if (isHovered) {
          hoveredNodeIdRef.current = nodeId;
        } else if (hoveredNodeIdRef.current === nodeId) {
          hoveredNodeIdRef.current = null;
        }

        // Instantaneous 0ms DOM styling update (Option B: Z-index elevation + sibling dimming)
        if (activeNodeIdRef.current === "root" && nodeRefs.current) {
          const activeHoverId = hoveredNodeIdRef.current;
          nodeRefs.current.forEach((el, id) => {
            if (activeHoverId) {
              if (id === activeHoverId) {
                el.style.zIndex = "45";
                el.style.opacity = "1";
              } else {
                el.style.zIndex = "20";
                el.style.opacity = "0.35";
              }
            } else {
              el.style.zIndex = "20";
              el.style.opacity = "1";
            }
          });
        }

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
        floorBeacons.forEach((b) => {
          if (b.nodeId === nodeId) {
            b.isHovered = isHovered;
            if (isHovered) {
              b.beamExtendProgress = 0.15; // Initiate string shoot-down from card to floor
              b.pulseProgress = 0.0;
              b.pingProgress1 = 0.0;
              b.pingProgress2 = 0.45;
              b.pingIntensity = 1.0;
            }
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
        const effectiveBaseZ = width < 768 ? MOBILE_DEFAULT_CAMERA_Z : DEFAULT_CAMERA_Z;
        const rawScale = effectiveBaseZ / Math.max(dist, 100);
        const minScale = width < 768 ? 0.35 : 0.45;
        const scale = Math.max(minScale, Math.min(rawScale, 1.0));

        return { screenX, screenY, scale, isVisible };
      }

      // State for boundary overscroll transitions between stages
      let overscrollDown = 0;
      let overscrollUp = 0;
      let isNavigatingStage = false;
      let overscrollTimer: NodeJS.Timeout | null = null;

      // Input interactions: Wheel dolly along Z-axis (Natural 3D camera flight within Stage 03, seamless handoff at bounds)
      const handleWheel = (e: WheelEvent) => {
        // If not actively looking at Stage 03, do not intercept wheel
        const spatialEl = document.getElementById("section-spatial");
        if (!spatialEl) return;
        const rect = spatialEl.getBoundingClientRect();
        const isInSpatialFocus =
          rect.top <= window.innerHeight * 0.45 &&
          rect.bottom >= window.innerHeight * 0.55;

        if (!isInSpatialFocus) {
          return;
        }

        const target = e.target as HTMLElement | null;
        if (isInteractiveTarget(target)) {
          return;
        }

        // Always prevent native free-scroll leak when focused on Stage 03
        e.preventDefault();

        const isNodeFocused = activeNodeIdRef.current !== "root";

        // Symmetrical transition boundaries: exactly 890 units from DEFAULT_CAMERA_Z (1880)
        const BOUNDARY_DOWN_Z = MAX_CAMERA_Z - 30; // 2770
        const BOUNDARY_UP_Z = DEFAULT_CAMERA_Z - (MAX_CAMERA_Z - 30 - DEFAULT_CAMERA_Z); // 990

        const distFromCenter = Math.abs(currentCamRef.current.z - DEFAULT_CAMERA_Z);
        const speedFactor = Math.min(1.0, distFromCenter / 890);
        const dollySpeed = 165 + speedFactor * 65;

        // User scrolling DOWN (dollying back/out towards Stage 04)
        if (e.deltaY > 0) {
          if (targetCamRef.current.z < BOUNDARY_DOWN_Z) {
            targetCamRef.current.z = Math.min(
              MAX_CAMERA_Z,
              targetCamRef.current.z + dollySpeed
            );
            overscrollDown = 0;
          } else {
            // Reached outer camera boundary -> smooth scroll transition to Stage 04
            overscrollDown += Math.abs(e.deltaY);
            if (overscrollDown > 75 && !isNavigatingStage) {
              isNavigatingStage = true;
              document
                .getElementById("section-scrub")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => {
                isNavigatingStage = false;
                overscrollDown = 0;
              }, 1200);
            }
          }
        } else if (e.deltaY < 0) {
          // User scrolling UP (dollying in towards Stage 01)
          if (isNodeFocused) {
            // If zoomed into a card, scrolling up or back returns to overview
            focusNodeInternal("root");
            overscrollUp = 0;
          } else if (targetCamRef.current.z > BOUNDARY_UP_Z) {
            // Smoothly dolly in towards inner stage boundary with symmetrical speed
            targetCamRef.current.z = Math.max(
              BOUNDARY_UP_Z,
              targetCamRef.current.z - dollySpeed
            );
            overscrollUp = 0;
          } else {
            // Reached inner camera boundary -> smooth transition back to Stage 01 via portal reverse
            overscrollUp += Math.abs(e.deltaY);
            if (overscrollUp > 75 && !isNavigatingStage) {
              isNavigatingStage = true;
              if (onExitToPortal) {
                onExitToPortal();
              } else {
                document
                  .getElementById("section-hero")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
              setTimeout(() => {
                isNavigatingStage = false;
                overscrollUp = 0;
              }, 1200);
            }
          }
        }

        if (overscrollTimer) clearTimeout(overscrollTimer);
        overscrollTimer = setTimeout(() => {
          overscrollDown = 0;
          overscrollUp = 0;
        }, 400);
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

      // Stage focus verification: ensures Stage 03 never intercepts interactions when the user is scrolled to other stages
      const isSpatialInFocus = () => {
        const spatialEl = document.getElementById("section-spatial");
        if (!spatialEl) return false;
        const rect = spatialEl.getBoundingClientRect();
        return (
          rect.top <= window.innerHeight * 0.45 &&
          rect.bottom >= window.innerHeight * 0.55
        );
      };

      const handleMouseDown = (e: MouseEvent) => {
        if (!isSpatialInFocus()) return;
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
        if (!isSpatialInFocus()) {
          isDragging = false;
          return;
        }
        const depthFactor = currentCamRef.current.z / DEFAULT_CAMERA_Z;
        const dx = (e.clientX - dragStart.x) * depthFactor * 1.85;
        const dy = (e.clientY - dragStart.y) * depthFactor * 1.85;
        targetCamRef.current.x = Math.max(
          WORLD_BOUNDS.minX,
          Math.min(targetCamRef.current.x - dx, WORLD_BOUNDS.maxX)
        );
        targetCamRef.current.y = Math.max(
          WORLD_BOUNDS.minY,
          Math.min(targetCamRef.current.y + dy, WORLD_BOUNDS.maxY)
        );
        if (activeNodeIdRef.current === "root") {
          targetLookAtRef.current.x = targetCamRef.current.x;
          targetLookAtRef.current.y = targetCamRef.current.y - 135;
        }
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
        if (!isSpatialInFocus()) return;
        mouseNormX = (e.clientX / window.innerWidth) * 2.0 - 1.0;
        mouseNormY = -(e.clientY / window.innerHeight) * 2.0 + 1.0;
      };
      window.addEventListener("mousemove", handlePointerMoveAmbient, { passive: true });

      // Touch interactions (Pinch dolly + touch drag pan + swipe orbit)
      let touchStartDist = 0;
      let touchStartX = 0;
      let touchStartY = 0;
      let touchStartTime = 0;

      const handleTouchStart = (e: TouchEvent) => {
        if (!isSpatialInFocus()) return;
        const target = e.target as HTMLElement | null;
        if (isInteractiveTarget(target)) {
          return;
        }
        if (e.touches.length === 1) {
          isDragging = true;
          dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
          touchStartTime = performance.now();
        } else if (e.touches.length === 2) {
          isDragging = false;
          touchStartDist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
        }
      };

      const handleTouchMove = (e: TouchEvent) => {
        if (!isSpatialInFocus()) {
          isDragging = false;
          return;
        }
        if (isDragging && e.touches.length === 1) {
          if (!isMobile) {
            const depthFactor = currentCamRef.current.z / DEFAULT_CAMERA_Z;
            const dx = (e.touches[0].clientX - dragStart.x) * depthFactor * 1.85;
            const dy = (e.touches[0].clientY - dragStart.y) * depthFactor * 1.85;
            targetCamRef.current.x = Math.max(
              WORLD_BOUNDS.minX,
              Math.min(targetCamRef.current.x - dx, WORLD_BOUNDS.maxX)
            );
            targetCamRef.current.y = Math.max(
              WORLD_BOUNDS.minY,
              Math.min(targetCamRef.current.y + dy, WORLD_BOUNDS.maxY)
            );
            if (activeNodeIdRef.current === "root") {
              targetLookAtRef.current.x = targetCamRef.current.x;
              targetLookAtRef.current.y = targetCamRef.current.y - 135;
            }
            dragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
          // On mobile: keep 3D carousel centered and stable; gesture intent evaluated cleanly on touchend
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

      const handleTouchEnd = (e: TouchEvent) => {
        if (!isSpatialInFocus()) {
          isDragging = false;
          return;
        }
        if (isMobile && e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const absDx = Math.abs(deltaX);
          const absDy = Math.abs(deltaY);
          const duration = performance.now() - touchStartTime;

          if (activeNodeIdRef.current === "root") {
            // Vertical swipe UP (finger dragged upward): Cleanly scroll down to Stage 04 (#section-scrub)
            if (deltaY < -50 && absDy > absDx * 1.15 && duration < 750 && !isNavigatingStage) {
              isNavigatingStage = true;
              document
                .getElementById("section-scrub")
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
              setTimeout(() => {
                isNavigatingStage = false;
              }, 1100);
            }
            // Vertical swipe DOWN (finger dragged downward): Cleanly return to Stage 01 (#section-hero / Portal)
            else if (deltaY > 50 && absDy > absDx * 1.15 && duration < 750 && !isNavigatingStage) {
              isNavigatingStage = true;
              if (onExitToPortal) {
                onExitToPortal();
              } else {
                document
                  .getElementById("section-hero")
                  ?.scrollIntoView({ behavior: "smooth", block: "start" });
              }
              setTimeout(() => {
                isNavigatingStage = false;
              }, 1100);
            }
            // Clean horizontal swipe: step 3D cylindrical carousel
            else if (absDx > 40 && absDy < 50 && duration < 650) {
              if (deltaX < 0) {
                targetCarouselAngleRef.current -= (2 * Math.PI) / 6;
                playKeyClick();
                onStepMobileOrbit?.(1);
              } else {
                targetCarouselAngleRef.current += (2 * Math.PI) / 6;
                playKeyClick();
                onStepMobileOrbit?.(-1);
              }
            }
          } else {
            // When a node card is focused on mobile: swipe down or away returns to overview root
            if (deltaY > 60 && absDy > absDx * 1.15 && duration < 700) {
              focusNodeInternal("root");
            }
          }
        }
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
        if (!radarCanvas || radarCanvas.offsetParent === null) return;
        const radarCtx = radarCanvas.getContext("2d");
        if (!radarCtx) return;

        const rw = radarCanvas.width;
        const rh = radarCanvas.height;

        radarCtx.clearRect(0, 0, rw, rh);

        // Tactical radar background tint
        radarCtx.fillStyle = "#07080e";
        radarCtx.fillRect(0, 0, rw, rh);

        // Tactical crosshair
        radarCtx.strokeStyle = "rgba(204, 255, 0, 0.22)";
        radarCtx.lineWidth = 1;
        radarCtx.beginPath();
        radarCtx.moveTo(rw / 2, 0);
        radarCtx.lineTo(rw / 2, rh);
        radarCtx.moveTo(0, rh / 2);
        radarCtx.lineTo(rw, rh / 2);
        radarCtx.stroke();

        // Concentric tactical range rings
        radarCtx.strokeStyle = "rgba(255, 255, 255, 0.12)";
        radarCtx.beginPath();
        radarCtx.arc(rw / 2, rh / 2, rh * 0.38, 0, Math.PI * 2);
        radarCtx.stroke();

        // Network connection lines between root and nodes
        const heroMeshRadarY = isMobile ? 260 : HERO_Y;
        const rootRadar = worldToRadar(0, heroMeshRadarY, rw, rh);
        radarCtx.strokeStyle = "rgba(204, 255, 0, 0.25)";
        radarCtx.lineWidth = 1;
        NODE_GRAPH.forEach((n) => {
          if (n.id === "root") return;
          const coords = getNodeCoordinates(n, isMobile);
          const { rx, ry } = worldToRadar(coords.x, coords.y, rw, rh);
          radarCtx.beginPath();
          radarCtx.moveTo(rootRadar.rx, rootRadar.ry);
          radarCtx.lineTo(rx, ry);
          radarCtx.stroke();
        });

        // Node blips
        NODE_GRAPH.forEach((n) => {
          const coords = getNodeCoordinates(n, isMobile);
          const { rx, ry } = worldToRadar(coords.x, coords.y, rw, rh);
          const isActive = n.id === activeNodeIdRef.current;
          if (isActive) {
            radarCtx.fillStyle = "rgba(204, 255, 0, 0.35)";
            radarCtx.beginPath();
            radarCtx.arc(rx, ry, 7, 0, Math.PI * 2);
            radarCtx.fill();

            radarCtx.fillStyle = "#ccff00";
            if (!isMobile) {
              radarCtx.shadowColor = "#ccff00";
              radarCtx.shadowBlur = 8;
            }
            radarCtx.beginPath();
            radarCtx.arc(rx, ry, 3.5, 0, Math.PI * 2);
            radarCtx.fill();
            if (!isMobile) radarCtx.shadowBlur = 0;
          } else if (n.id === "root") {
            radarCtx.fillStyle = "#ffffff";
            if (!isMobile) {
              radarCtx.shadowColor = "#ffffff";
              radarCtx.shadowBlur = 6;
            }
            radarCtx.beginPath();
            radarCtx.arc(rx, ry, 4, 0, Math.PI * 2);
            radarCtx.fill();
            if (!isMobile) radarCtx.shadowBlur = 0;
          } else {
            radarCtx.fillStyle = n.badgeColor === "cyan" ? "#38bdf8" : "#ccff00";
            if (!isMobile) {
              radarCtx.shadowColor = n.badgeColor === "cyan" ? "#38bdf8" : "#ccff00";
              radarCtx.shadowBlur = 4;
            }
            radarCtx.beginPath();
            radarCtx.arc(rx, ry, 2.5, 0, Math.PI * 2);
            radarCtx.fill();
            if (!isMobile) radarCtx.shadowBlur = 0;
          }
        });

        // Frustum Viewport Rectangle
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

        const fw = botRight.rx - topLeft.rx;
        const fh = botRight.ry - topLeft.ry;

        radarCtx.fillStyle = "rgba(204, 255, 0, 0.1)";
        radarCtx.fillRect(topLeft.rx, topLeft.ry, fw, fh);

        radarCtx.strokeStyle = "#ccff00";
        radarCtx.lineWidth = 1.6;
        if (!isMobile) {
          radarCtx.shadowColor = "#ccff00";
          radarCtx.shadowBlur = 6;
        }
        radarCtx.strokeRect(topLeft.rx, topLeft.ry, fw, fh);
        if (!isMobile) radarCtx.shadowBlur = 0;
      }

      // Resize listener
      const handleResize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        const aspect = width / height;
        camera.aspect = aspect;
        camera.fov = aspect < 1.0 ? Math.min(74, (50 / aspect) * 0.68) : 50;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 768 ? 1.0 : 2));
        calibrateVideoDimensions();
        cachedActiveDims = null;
      };
      window.addEventListener("resize", handleResize);

      // High-performance 120 FPS render loop with Viewport Culling
      let animFrameId: number | null = null;
      let isVisible = true;
      let lastTime = performance.now();
      let lastFrameTime = performance.now();
      let startTime = performance.now();
      let frameCount = 0;
      let fps = 120;
      let radarFrameCounter = 0;
      let cachedActiveDims: { id: string; w: number; h: number } | null = null;
      let lastTelUpdate = 0;
      let lastStmtX = -999, lastStmtY = -999, lastStmtS = -999, lastStmtVis = false;
      let lastBadgeX = -999, lastBadgeY = -999, lastBadgeS = -999, lastBadgeVis = false;
      let cardsSettledCount = 0;
      let lastActiveNodeForProj = "root";

      const animate = () => {
        if (!isVisible) {
          animFrameId = null;
          return;
        }
        animFrameId = requestAnimationFrame(animate);

        // While warp video is active in Stage 2, pause 3D render loop to yield 100% GPU to video decoder
        if (isWarpingRef.current) {
          return;
        }

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

        // Snappy critically damped camera & lookAt lerp (framerate-independent)
        const lerpFactor = 1.0 - Math.exp(-15.5 * delta);

        const dx = targetCamRef.current.x - currentCamRef.current.x;
        const dy = targetCamRef.current.y - currentCamRef.current.y;
        const dz = targetCamRef.current.z - currentCamRef.current.z;

        currentCamRef.current.x += Math.abs(dx) < 0.04 ? dx : dx * lerpFactor;
        currentCamRef.current.y += Math.abs(dy) < 0.04 ? dy : dy * lerpFactor;
        currentCamRef.current.z += Math.abs(dz) < 0.04 ? dz : dz * lerpFactor;

        const lx = targetLookAtRef.current.x - currentLookAtRef.current.x;
        const ly = targetLookAtRef.current.y - currentLookAtRef.current.y;
        const lz = targetLookAtRef.current.z - currentLookAtRef.current.z;

        currentLookAtRef.current.x += Math.abs(lx) < 0.04 ? lx : lx * lerpFactor;
        currentLookAtRef.current.y += Math.abs(ly) < 0.04 ? ly : ly * lerpFactor;
        currentLookAtRef.current.z += Math.abs(lz) < 0.04 ? lz : lz * lerpFactor;

        // Ambient mouse parallax interpolation (smooth 3D inertia)
        const targetParallaxX = mouseNormX * 28;
        const targetParallaxY = mouseNormY * 18;
        ambientParallaxX += (targetParallaxX - ambientParallaxX) * lerpFactor;
        ambientParallaxY += (targetParallaxY - ambientParallaxY) * lerpFactor;

        // Camera orbit angle lerp (critically damped)
        const dyaw = targetOrbitAngleRef.current.yaw - currentOrbitAngleRef.current.yaw;
        const dpitch = targetOrbitAngleRef.current.pitch - currentOrbitAngleRef.current.pitch;
        currentOrbitAngleRef.current.yaw += Math.abs(dyaw) < 0.0005 ? dyaw : dyaw * lerpFactor;
        currentOrbitAngleRef.current.pitch += Math.abs(dpitch) < 0.0005 ? dpitch : dpitch * lerpFactor;

        // Orbit rotation around lookAt target focus point
        const vx = currentCamRef.current.x - currentLookAtRef.current.x;
        const vy = currentCamRef.current.y - currentLookAtRef.current.y;
        const vz = currentCamRef.current.z - currentLookAtRef.current.z;

        const cyaw = Math.cos(currentOrbitAngleRef.current.yaw);
        const syaw = Math.sin(currentOrbitAngleRef.current.yaw);
        const cpitch = Math.cos(currentOrbitAngleRef.current.pitch);
        const spitch = Math.sin(currentOrbitAngleRef.current.pitch);

        // Yaw rotation around Y axis
        const rotY_x = vx * cyaw + vz * syaw;
        const rotY_z = -vx * syaw + vz * cyaw;
        const rotY_y = vy;

        // Pitch rotation around local X axis
        const rot_x = rotY_x;
        const rot_y = rotY_y * cpitch + rotY_z * spitch;
        const rot_z = -rotY_y * spitch + rotY_z * cpitch;

        camera.position.set(
          currentLookAtRef.current.x + rot_x + ambientParallaxX,
          currentLookAtRef.current.y + rot_y + ambientParallaxY,
          currentLookAtRef.current.z + rot_z
        );
        camera.lookAt(
          currentLookAtRef.current.x + ambientParallaxX * 0.35,
          currentLookAtRef.current.y + ambientParallaxY * 0.35,
          currentLookAtRef.current.z
        );

        // Drifting starfield through 3D space (Zero CPU allocation & zero GPU buffer re-upload)
        starField.position.z += 0.85;
        if (starField.position.z > 1000) {
          starField.position.z = -1000;
        }

        // Update shader uniforms
        videoMaterial.uniforms.uDist.value = currentCamRef.current.z;
        videoMaterial.uniforms.uTime.value = elapsedTime;
        floorMat.uniforms.uTime.value = elapsedTime;

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

        const isNodeFocused = activeNodeIdRef.current !== "root";
        connectionGroup.visible = !isNodeFocused;
        // Hide floor beacons and cluster nebulas on mobile to save ~54 draw calls and 1.5M fill-rate pixels
        floorBeaconGroup.visible = isMobile ? false : !isNodeFocused;
        clusterNebulaGroup.visible = isMobile ? false : true;

        // Animate dynamic floor beacons & descending contact pings on hover (desktop only)
        if (!isMobile) {
          floorBeacons.forEach((b) => {
          if (b.isHovered) {
            b.settledIdle = false;
            // 1. String shoot-down & extension animation (moves down from card)
            b.beamExtendProgress = Math.min(1.0, b.beamExtendProgress + 0.08);
            b.beamMesh.scale.y = b.beamExtendProgress;

            // 2. Advance descending pulse along vertical string
            b.pulseProgress += 0.038;
            if (b.pulseProgress >= 1.0) {
              b.pulseProgress = 0.0;
              b.pingIntensity = 1.0; // Trigger impact flash bloom upon striking floor!
            }

            // Position pulse along vertical light conduit string
            const py = b.cardBottomY + (b.floorY - b.cardBottomY) * b.pulseProgress;
            b.pulseMesh.position.y = py;
            b.pulseMesh.visible = true;
            const pulseFade = Math.min(1.0, b.pulseProgress * 3.5);
            (b.pulseMesh.material as THREE.MeshBasicMaterial).opacity = pulseFade * 0.96;
            const pulseScale = 1.0 + Math.sin(b.pulseProgress * Math.PI) * 0.25;
            b.pulseMesh.scale.set(pulseScale, pulseScale, 1);

            // 3. Animate ground contact ping shockwave ripples
            b.pingProgress1 = (b.pingProgress1 + 0.024) % 1.0;
            b.pingProgress2 = (b.pingProgress2 + 0.024) % 1.0;

            // Wave 1: expanding shockwave on ground plane
            const s1 = 0.35 + b.pingProgress1 * 4.2;
            b.pingRingMesh1.scale.set(s1, s1, 1);
            (b.pingRingMesh1.material as THREE.MeshBasicMaterial).opacity =
              Math.pow(1.0 - b.pingProgress1, 1.4) * 0.95;
            b.pingRingMesh1.visible = true;

            // Wave 2: staggered phase shockwave
            const s2 = 0.35 + b.pingProgress2 * 4.2;
            b.pingRingMesh2.scale.set(s2, s2, 1);
            (b.pingRingMesh2.material as THREE.MeshBasicMaterial).opacity =
              Math.pow(1.0 - b.pingProgress2, 1.4) * 0.95;
            b.pingRingMesh2.visible = true;

            // 4. Central contact flare bloom & decay
            b.pingIntensity *= 0.92;
            (b.coreDiscMesh.material as THREE.MeshBasicMaterial).opacity =
              0.4 + b.pingIntensity * 0.6;
            const flareScale = 1.0 + b.pingIntensity * 1.8;
            b.coreDiscMesh.scale.set(flareScale, flareScale, 1);

            // 5. Ground reticles
            b.baseOuterRingMesh.rotation.z += 0.012;
            b.baseInnerRingMesh.rotation.z -= 0.018;
            (b.baseOuterRingMesh.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
              (b.baseOuterRingMesh.material as THREE.MeshBasicMaterial).opacity,
              0.92,
              0.15
            );
            (b.baseInnerRingMesh.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
              (b.baseInnerRingMesh.material as THREE.MeshBasicMaterial).opacity,
              0.88,
              0.15
            );

            // 6. Vertical light conduit string
            const beamBreath = 1.2 + Math.sin(elapsedTime * 9.0) * 0.25;
            b.beamMesh.scale.x = THREE.MathUtils.lerp(b.beamMesh.scale.x, beamBreath, 0.15);
            (b.beamMesh.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp(
              (b.beamMesh.material as THREE.MeshBasicMaterial).opacity,
              0.95,
              0.15
            );
            (b.lineMesh.material as THREE.LineBasicMaterial).opacity = THREE.MathUtils.lerp(
              (b.lineMesh.material as THREE.LineBasicMaterial).opacity,
              1.0,
              0.15
            );
            (b.portMesh.material as THREE.MeshBasicMaterial).opacity = 0.95;
          } else if (!b.settledIdle) {
            // Settle once into resting plumb line and ground marker (Zero per-frame mutations when idle)
            b.pulseMesh.visible = false;
            b.pingRingMesh1.visible = false;
            b.pingRingMesh2.visible = false;
            b.beamMesh.scale.y = 1.0;
            b.beamMesh.scale.x = 0.75;
            (b.beamMesh.material as THREE.MeshBasicMaterial).opacity = 0.18;
            (b.lineMesh.material as THREE.LineBasicMaterial).opacity = 0.12;
            (b.portMesh.material as THREE.MeshBasicMaterial).opacity = 0.35;
            (b.baseOuterRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.26;
            (b.baseInnerRingMesh.material as THREE.MeshBasicMaterial).opacity = 0.22;
            (b.coreDiscMesh.material as THREE.MeshBasicMaterial).opacity = 0.15;
            b.coreDiscMesh.scale.set(1, 1, 1);
            b.settledIdle = true;
          }
        });
        }

        // Perspective-project DOM statement: Anchored below avatar on mobile, above avatar on desktop
        const stmtEl = statementRef.current;
        if (stmtEl) {
          const statementWorldY = width < 768 ? 40 : HERO_Y + cardHeight * 0.5 + 130;
          const stmtProj = projectToScreen(0, statementWorldY, 75);
          const shouldBeVis = stmtProj.isVisible && !isNodeFocused;
          if (shouldBeVis !== lastStmtVis) {
            stmtEl.style.opacity = shouldBeVis ? "1" : "0";
            stmtEl.style.pointerEvents = shouldBeVis ? "auto" : "none";
            lastStmtVis = shouldBeVis;
          }
          if (shouldBeVis) {
            const dx = Math.abs(stmtProj.screenX - lastStmtX);
            const dy = Math.abs(stmtProj.screenY - lastStmtY);
            const ds = Math.abs(stmtProj.scale - lastStmtS);
            if (dx > 0.08 || dy > 0.08 || ds > 0.001) {
              stmtEl.style.transform = `translate3d(${stmtProj.screenX.toFixed(1)}px, ${stmtProj.screenY.toFixed(1)}px, 0) translate(-50%, -50%) scale3d(${stmtProj.scale.toFixed(3)}, ${stmtProj.scale.toFixed(3)}, 1)`;
              lastStmtX = stmtProj.screenX;
              lastStmtY = stmtProj.screenY;
              lastStmtS = stmtProj.scale;
            }
          }
        }

        // Perspective-project Hero Status Badge: Anchored below bottom of video at Z = 45
        const badgeEl = heroBadgeRef?.current;
        if (badgeEl) {
          const badgeHeroY = width < 768 ? 260 : HERO_Y;
          const badgeWorldY = badgeHeroY - cardHeight * 0.5 - 28;
          const badgeProj = projectToScreen(0, badgeWorldY, 45);
          const shouldBeVis = badgeProj.isVisible && !isNodeFocused;
          if (shouldBeVis !== lastBadgeVis) {
            badgeEl.style.opacity = shouldBeVis ? "1" : "0";
            badgeEl.style.pointerEvents = shouldBeVis ? "auto" : "none";
            lastBadgeVis = shouldBeVis;
          }
          if (shouldBeVis) {
            const dx = Math.abs(badgeProj.screenX - lastBadgeX);
            const dy = Math.abs(badgeProj.screenY - lastBadgeY);
            const ds = Math.abs(badgeProj.scale - lastBadgeS);
            if (dx > 0.08 || dy > 0.08 || ds > 0.001) {
              badgeEl.style.transform = `translate3d(${badgeProj.screenX.toFixed(1)}px, ${badgeProj.screenY.toFixed(1)}px, 0) translate(-50%, -50%) scale3d(${badgeProj.scale.toFixed(3)}, ${badgeProj.scale.toFixed(3)}, 1)`;
              lastBadgeX = badgeProj.screenX;
              lastBadgeY = badgeProj.screenY;
              lastBadgeS = badgeProj.scale;
            }
          }
        }

        // Smooth 3D carousel rotation interpolation on mobile
        if (isMobile) {
          const dAngle = targetCarouselAngleRef.current - currentCarouselAngleRef.current;
          if (Math.abs(dAngle) > 0.001) {
            currentCarouselAngleRef.current += dAngle * lerpFactor;
          } else {
            currentCarouselAngleRef.current = targetCarouselAngleRef.current;
          }
        }

        // Snappy card sleep discipline: when camera is settled on mobile, pause DOM projections to yield 100% compositor headroom
        const isAngleMoving = isMobile && Math.abs(targetCarouselAngleRef.current - currentCarouselAngleRef.current) > 0.001;
        const isCamMoving =
          Math.abs(dx) > 0.04 ||
          Math.abs(dy) > 0.04 ||
          Math.abs(dz) > 0.04 ||
          Math.abs(dyaw) > 0.0005 ||
          Math.abs(dpitch) > 0.0005 ||
          Math.abs(targetParallaxX - ambientParallaxX) > 0.02 ||
          Math.abs(targetParallaxY - ambientParallaxY) > 0.02 ||
          isAngleMoving ||
          activeNodeIdRef.current !== lastActiveNodeForProj;

        if (isCamMoving) {
          cardsSettledCount = 0;
          lastActiveNodeForProj = activeNodeIdRef.current;
        } else {
          cardsSettledCount = Math.min(10, cardsSettledCount + 1);
        }

        const isMobileView = (typeof window !== "undefined" ? window.innerWidth : width) < 768;
        const shouldProjectCards = true;

        // Perspective-project all spatial node cards with Compositor-Only 120 FPS standard
        if (nodeRefs.current && shouldProjectCards) {
          NODE_GRAPH.forEach((node) => {
            if (node.id === "root") return;
            const el = nodeRefs.current?.get(node.id);
            if (!el) return;

            const coords = getNodeCoordinates(node, isMobileView, currentCarouselAngleRef.current);
            const proj = projectToScreen(coords.x, coords.y, coords.z);
            el._screenX = proj.screenX;
            el._screenY = proj.screenY;
            el._scale = proj.scale;

            if (proj.isVisible) {
              const isThisNodeActive = activeNodeIdRef.current === node.id;
              const isThisNodeHovered = hoveredNodeIdRef.current === node.id;
              const isAnyNodeHovered = hoveredNodeIdRef.current !== null;

              let targetOpacity = "1";
              let targetPointerEvents = "auto";
              let targetZIndex = isNodeFocused
                ? isThisNodeActive
                  ? "100"
                  : "10"
                : Math.max(10, Math.round(25 + coords.z)).toString();

              if (isNodeFocused) {
                targetOpacity = isThisNodeActive ? "1" : "0";
                targetPointerEvents = isThisNodeActive ? "auto" : "none";
              } else {
                if (isThisNodeHovered) {
                  targetOpacity = "1";
                  targetZIndex = "60";
                } else if (isAnyNodeHovered) {
                  targetOpacity = "0.35";
                } else if (isMobileView) {
                  // Mobile portrait overview: ONLY the front center active card is fully visible (1.0),
                  // flanking cards are dimmed (0.15), and rear cards are hidden (0.0).
                  const isFrontCenter = coords.z >= 95;
                  const isFlanking = coords.z >= 20;
                  targetOpacity = isFrontCenter ? "1" : isFlanking ? "0.15" : "0";
                  targetPointerEvents = isFrontCenter ? "auto" : "none";
                  targetZIndex = isFrontCenter ? "100" : Math.max(10, Math.round(25 + coords.z)).toString();
                }
              }

              if (el._lastOpacity !== targetOpacity) {
                el.style.opacity = targetOpacity;
                el._lastOpacity = targetOpacity;
              }
              if (el._lastPointerEvents !== targetPointerEvents) {
                el.style.pointerEvents = targetPointerEvents;
                el._lastPointerEvents = targetPointerEvents;
              }
              if (el._lastZIndex !== targetZIndex) {
                el.style.zIndex = targetZIndex;
                el._lastZIndex = targetZIndex;
              }

              if (isThisNodeActive) {
                if (!cachedActiveDims || cachedActiveDims.id !== node.id) {
                  cachedActiveDims = {
                    id: node.id,
                    w: el.offsetWidth || (window.innerWidth < 640 ? Math.round(window.innerWidth * 0.94) : 1040),
                    h: el.offsetHeight || 500,
                  };
                }
                const cardW = cachedActiveDims.w;
                const cardH = cachedActiveDims.h;
                const halfW = Math.round(cardW * 0.5);
                const halfH = Math.round(cardH * 0.5);
                const posX = Math.round(proj.screenX) - halfW;
                const posY = Math.round(proj.screenY) - halfH;
                const clampedX = Math.max(12, Math.min(window.innerWidth - cardW - 12, posX));
                const clampedY = Math.max(12, Math.min(window.innerHeight - cardH - 12, posY));
                const dx = Math.abs(clampedX - (el._lastX ?? -999));
                const dy = Math.abs(clampedY - (el._lastY ?? -999));
                if (dx > 0.08 || dy > 0.08) {
                  el.style.transform = `translate3d(${clampedX}px, ${clampedY}px, 0) scale3d(1, 1, 1)`;
                  el._lastX = clampedX;
                  el._lastY = clampedY;
                }
                if (el._lastZIndex !== "50") {
                  el.style.zIndex = "50";
                  el._lastZIndex = "50";
                }
              } else {
                const cardScale = isMobileView ? proj.scale * 0.80 : proj.scale;
                const dx = Math.abs(proj.screenX - (el._lastX ?? -999));
                const dy = Math.abs(proj.screenY - (el._lastY ?? -999));
                const ds = Math.abs(cardScale - (el._lastS ?? -999));
                if (dx > 0.08 || dy > 0.08 || ds > 0.001) {
                  el.style.transform = `translate3d(${proj.screenX.toFixed(1)}px, ${proj.screenY.toFixed(1)}px, 0) translate(-50%, -50%) scale3d(${cardScale.toFixed(3)}, ${cardScale.toFixed(3)}, 1)`;
                  el._lastX = proj.screenX;
                  el._lastY = proj.screenY;
                  el._lastS = cardScale;
                }
              }
            } else {
              if (el._lastOpacity !== "0") {
                el.style.opacity = "0";
                el.style.pointerEvents = "none";
                el._lastOpacity = "0";
                el._lastPointerEvents = "none";
              }
            }
          });
        }

        // Update telemetry throttled to 10 FPS (100ms) - Never write DOM text on every 120 FPS frame!
        if (now - lastTelUpdate > 100) {
          lastTelUpdate = now;
          const telEl = telemetryRef.current;
          if (telEl) {
            const yawDeg = Math.round((currentOrbitAngleRef.current.yaw * 180) / Math.PI);
            const pitchDeg = Math.round((currentOrbitAngleRef.current.pitch * 180) / Math.PI);
            if (width < 640) {
              telEl.textContent = `${fps} FPS`;
            } else {
              telEl.textContent = `POS: [${camera.position.x.toFixed(0)}, ${camera.position.y.toFixed(0)}, ${camera.position.z.toFixed(0)}] | ROT: [${yawDeg}°, ${pitchDeg}°] | ${fps} FPS`;
            }
          }
        }

        // Throttle radar render (desktop: ~40 FPS, mobile: ~10 FPS to reduce 2D canvas shadow rasterization)
        radarFrameCounter++;
        const radarInterval = isMobile ? 6 : 3;
        if (radarFrameCounter % radarInterval === 0) {
          drawRadar();
        }

        renderer.render(scene, camera);
      };

      // Viewport Culling Observer (Zero GPU/VRAM Waste Offscreen)
      const viewportObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const nowVisible = entry.isIntersecting;
            if (nowVisible !== isVisible) {
              isVisible = nowVisible;
              if (isVisible) {
                lastFrameTime = performance.now();
                if (!animFrameId) {
                  animFrameId = requestAnimationFrame(animate);
                }
                // When re-entering Stage 03 from Stage 04 or Stage 01, smoothly ease camera to default overview
                if (activeNodeIdRef.current === "root") {
                  const isMob = window.innerWidth < 768;
                  targetCamRef.current.x = 0;
                  targetCamRef.current.y = isMob ? 20 : 75;
                  targetCamRef.current.z = isMob ? MOBILE_DEFAULT_CAMERA_Z : DEFAULT_CAMERA_Z;
                  targetLookAtRef.current.x = 0;
                  targetLookAtRef.current.y = isMob ? -20 : -60;
                  targetLookAtRef.current.z = 0;
                }
              } else if (animFrameId) {
                cancelAnimationFrame(animFrameId);
                animFrameId = null;
              }
            }
          });
        },
        { threshold: 0 }
      );
      viewportObserver.observe(canvas);

      animate();

      return () => {
        if (overscrollTimer) clearTimeout(overscrollTimer);
        viewportObserver.disconnect();
        if (animFrameId) cancelAnimationFrame(animFrameId);
        window.removeEventListener("wheel", handleWheel);
        window.removeEventListener("mousedown", handleMouseDown);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        window.removeEventListener("touchstart", handleTouchStart);
        window.removeEventListener("touchmove", handleTouchMove);
        window.removeEventListener("touchend", handleTouchEnd);
        window.removeEventListener("resize", handleResize);
        if (video) {
          video.removeEventListener("loadedmetadata", calibrateVideoDimensions);
        }

        // Dispose Three.js objects
        heroMeshGeometry.dispose();
        heroAuraGeo.dispose();
        heroAuraMat.dispose();
        heroAuraTex.dispose();
        clusterNebulaGeos.forEach((g) => g.dispose());
        clusterNebulaMats.forEach((m) => m.dispose());
        videoMaterial.dispose();
        heroTexture.dispose();
        starGeo.dispose();
        starMat.dispose();
        floorGeo.dispose();
        floorMat.dispose();
        floorBeacons.forEach((b) => {
          b.baseOuterRingMesh.geometry.dispose();
          (b.baseOuterRingMesh.material as THREE.Material).dispose();
          b.baseInnerRingMesh.geometry.dispose();
          (b.baseInnerRingMesh.material as THREE.Material).dispose();
          b.coreDiscMesh.geometry.dispose();
          (b.coreDiscMesh.material as THREE.Material).dispose();
          b.pingRingMesh1.geometry.dispose();
          (b.pingRingMesh1.material as THREE.Material).dispose();
          b.pingRingMesh2.geometry.dispose();
          (b.pingRingMesh2.material as THREE.Material).dispose();
          b.beamMesh.geometry.dispose();
          (b.beamMesh.material as THREE.Material).dispose();
          b.lineMesh.geometry.dispose();
          (b.lineMesh.material as THREE.Material).dispose();
          b.portMesh.geometry.dispose();
          (b.portMesh.material as THREE.Material).dispose();
          b.pulseMesh.geometry.dispose();
          (b.pulseMesh.material as THREE.Material).dispose();
        });
        limePacketTex.dispose();
        cyanPacketTex.dispose();
        emeraldPacketTex.dispose();
        limeBeamTex.dispose();
        cyanBeamTex.dispose();
        emeraldBeamTex.dispose();
        limePulseTex.dispose();
        cyanPulseTex.dispose();
        emeraldPulseTex.dispose();
        limeFlareTex.dispose();
        cyanFlareTex.dispose();
        emeraldFlareTex.dispose();
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
        {/* Hidden video source element for Three.js texture (loaded on demand for desktop) */}
        <video
          ref={videoRef}
          id="hero-video"
          loop
          muted
          playsInline
          preload="none"
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
