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
  handleWheelDolly: (deltaY: number) => "stay" | "overscroll-down" | "overscroll-up";
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

export const MOBILE_DEFAULT_CAMERA_Z = 1280; // ~25% closer overview zoom on mobile (was 1620; 1620 / 1280 = +26.5% zoom)
export const TABLET_DEFAULT_CAMERA_Z = 1920; // Reduced default overview scale by ~23% so whole stage content is framed boldly in one go

export const MOBILE_NODE_ORDER = [
  "edge-gateway",
  "hyperscale",
  "event-stream",
  "omnisync",
  "kerneltrace",
  "infra-compute",
];

export function getEffectiveDefaultCameraZ(width: number, height: number): number {
  if (width < 768) return MOBILE_DEFAULT_CAMERA_Z;
  if (width < 1024) return TABLET_DEFAULT_CAMERA_Z;
  // Compact landscape screens (e.g. 1024x768): slightly expanded camera Z so outer cards fit comfortably
  if (width <= 1180 && height <= 820) return 2050;
  return DEFAULT_CAMERA_Z;
}

export function getNodeCoordinates(
  node: NodeData,
  isCompact: boolean,
  mobileAngle: number = 0,
  isTablet: boolean = false
): { x: number; y: number; z: number } {
  if (!isCompact) return { x: node.x, y: node.y, z: node.z };
  const idx = MOBILE_NODE_ORDER.indexOf(node.id);
  if (idx === -1) return { x: node.x, y: node.y, z: node.z };

  // 3D cylindrical carousel arc (Radius 205 on mobile, 320 on tablet)
  const baseAngle = idx * ((2 * Math.PI) / 6) + mobileAngle;
  const R = isTablet ? 320 : 205;
  const centerY = isTablet ? -25 : -15;
  const x = Math.sin(baseAngle) * R;
  const z = Math.cos(baseAngle) * R * 0.65;
  return { x, y: centerY, z };
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
    const overscrollDownRef = useRef(0);
    const overscrollUpRef = useRef(0);
    const overscrollResetTimerRef = useRef<NodeJS.Timeout | null>(null);

    const focusNodeInternal = useCallback(
      (nodeId: string) => {
        const node = NODE_GRAPH.find((n) => n.id === nodeId);
        if (!node) return;

        activeNodeIdRef.current = nodeId;
        hoveredNodeIdRef.current = null;
        onNodeActivated(nodeId);
        playWarpSound();

        const isCompact = typeof window !== "undefined" && window.innerWidth < 1024;
        const isTablet = typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024;
        const defaultZ = typeof window !== "undefined" ? getEffectiveDefaultCameraZ(window.innerWidth, window.innerHeight) : DEFAULT_CAMERA_Z;

        if (nodeId === "root") {
          targetOrbitAngleRef.current.yaw = 0;
          targetOrbitAngleRef.current.pitch = 0;
          targetCamRef.current.x = 0;
          targetCamRef.current.y = isCompact ? (isTablet ? 30 : 20) : 75;
          targetCamRef.current.z = defaultZ;
          targetLookAtRef.current.x = 0;
          targetLookAtRef.current.y = isCompact ? (isTablet ? -30 : -20) : -60;
          targetLookAtRef.current.z = 0;
        } else {
          if (isCompact) {
            const idx = MOBILE_NODE_ORDER.indexOf(nodeId);
            if (idx !== -1) {
              targetCarouselAngleRef.current = -idx * ((2 * Math.PI) / 6);
              currentCarouselAngleRef.current = targetCarouselAngleRef.current;
            }
          }
          // Center camera directly on focused card with comfortable framing
          const coords = getNodeCoordinates(node, isCompact, currentCarouselAngleRef.current, isTablet);
          targetCamRef.current.x = isCompact ? 0 : coords.x;
          targetCamRef.current.y = coords.y;
          targetCamRef.current.z = isCompact
            ? coords.z + (isTablet ? 720 : 620)
            : node.camTarget
            ? node.camTarget.z
            : node.z + 520;
          targetLookAtRef.current.x = isCompact ? 0 : coords.x;
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
          const isMobileView = (typeof window !== "undefined" ? window.innerWidth : 1024) < 768;
          const isTabletView = (typeof window !== "undefined" ? window.innerWidth : 1024) >= 768 && (typeof window !== "undefined" ? window.innerWidth : 1024) < 1024;
          const scaleFactor = isMobileView ? 0.55 : (isTabletView ? 0.75 : 1.0);
          const scaledDelta = deltaZ * scaleFactor;
          const minZ = isMobileView ? 850 : (isTabletView ? 1100 : 350);
          const maxZ = isMobileView ? 1800 : (isTabletView ? 2450 : MAX_CAMERA_Z);
          targetCamRef.current.z = Math.min(
            Math.max(targetCamRef.current.z + scaledDelta, minZ),
            maxZ
          );
        },
        handleWheelDolly: (deltaY: number): "stay" | "overscroll-down" | "overscroll-up" => {
          const defaultZ = typeof window !== "undefined" ? getEffectiveDefaultCameraZ(window.innerWidth, window.innerHeight) : DEFAULT_CAMERA_Z;
          const boundaryDownZ = MAX_CAMERA_Z - 30; // 2770
          const boundaryUpZ = defaultZ - (boundaryDownZ - defaultZ); // 990 on desktop

          const distFromCenter = Math.abs(currentCamRef.current.z - defaultZ);
          const maxSpan = boundaryDownZ - defaultZ;
          const speedFactor = Math.min(1.0, distFromCenter / Math.max(maxSpan, 1));
          const normalizedDelta = Math.min(Math.max(Math.abs(deltaY) / 50, 0.7), 2.4);
          const dollySpeed = (175 + speedFactor * 75) * normalizedDelta;

          if (overscrollResetTimerRef.current) clearTimeout(overscrollResetTimerRef.current);
          overscrollResetTimerRef.current = setTimeout(() => {
            overscrollDownRef.current = 0;
            overscrollUpRef.current = 0;
          }, 250);

          if (deltaY > 0) {
            // Scrolling DOWN: dolly back towards Stage 04
            if (targetCamRef.current.z < boundaryDownZ) {
              targetCamRef.current.z = Math.min(boundaryDownZ, targetCamRef.current.z + dollySpeed);
              overscrollDownRef.current = 0;
              return "stay";
            } else {
              // Reached boundary: accumulate overscroll
              overscrollDownRef.current += Math.abs(deltaY);
              if (overscrollDownRef.current > 45) {
                overscrollDownRef.current = 0;
                return "overscroll-down";
              }
              return "stay";
            }
          } else if (deltaY < 0) {
            // Scrolling UP: dolly forward towards Stage 01
            if (targetCamRef.current.z > boundaryUpZ) {
              targetCamRef.current.z = Math.max(boundaryUpZ, targetCamRef.current.z - dollySpeed);
              overscrollUpRef.current = 0;
              return "stay";
            } else {
              // Reached boundary: accumulate overscroll
              overscrollUpRef.current += Math.abs(deltaY);
              if (overscrollUpRef.current > 45) {
                overscrollUpRef.current = 0;
                return "overscroll-up";
              }
              return "stay";
            }
          }

          return "stay";
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
          const isCompact = typeof window !== "undefined" && window.innerWidth < 1024;
          const isTablet = typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024;
          const defaultZ = typeof window !== "undefined" ? getEffectiveDefaultCameraZ(window.innerWidth, window.innerHeight) : DEFAULT_CAMERA_Z;
          targetOrbitAngleRef.current.yaw = 0;
          targetOrbitAngleRef.current.pitch = 0;
          targetCamRef.current.x = 0;
          targetCamRef.current.y = isCompact ? (isTablet ? 30 : 20) : 75;
          targetCamRef.current.z = defaultZ;
          targetLookAtRef.current.x = 0;
          targetLookAtRef.current.y = isCompact ? (isTablet ? -30 : -20) : -60;
          targetLookAtRef.current.z = 0;
          focusNodeInternal("root");
        },
        highlightConnection: (nodeId: string, isHovered: boolean) => {
          if (highlightConnRef.current)
            highlightConnRef.current(nodeId, isHovered);
        },
        triggerDimensionalBreach: (direction: "enter" | "exit" = "enter") => {
          const isCompact = typeof window !== "undefined" && window.innerWidth < 1024;
          const isTablet = typeof window !== "undefined" && window.innerWidth >= 768 && window.innerWidth < 1024;
          const defaultZ = typeof window !== "undefined" ? getEffectiveDefaultCameraZ(window.innerWidth, window.innerHeight) : DEFAULT_CAMERA_Z;
          if (direction === "enter") {
            // Camera swoops forward from hyperspace depth into elevated perspective
            currentCamRef.current.z = isCompact ? 1900 : 2100;
            currentCamRef.current.x = 0;
            currentCamRef.current.y = isCompact ? (isTablet ? 30 : 20) : 75;
            targetCamRef.current.x = 0;
            targetCamRef.current.y = isCompact ? (isTablet ? 30 : 20) : 75;
            targetCamRef.current.z = defaultZ;
            targetLookAtRef.current.x = 0;
            targetLookAtRef.current.y = isCompact ? (isTablet ? -30 : -20) : -60;
            targetLookAtRef.current.z = 0;
            currentLookAtRef.current.x = 0;
            currentLookAtRef.current.y = isCompact ? (isTablet ? -30 : -20) : -60;
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
      const isCompact = width < 1024;
      const isTablet = width >= 768 && width < 1024;
      const isMobile = width < 768;
      const defaultZ = getEffectiveDefaultCameraZ(width, height);

      // Scene setup
      const scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x050508, 0.00042);

      const initialAspect = width / height;
      const initialFov = initialAspect < 1.0 ? Math.min(74, (50 / initialAspect) * 0.68) : 50;
      const camera = new THREE.PerspectiveCamera(initialFov, initialAspect, 1, 6000);
      camera.position.set(0, isCompact ? (isTablet ? 30 : 20) : 180, defaultZ);
      camera.lookAt(0, isCompact ? (isTablet ? -30 : -20) : -70, 0);
      currentCamRef.current.z = defaultZ;
      targetCamRef.current.z = defaultZ;
      currentCamRef.current.y = isCompact ? (isTablet ? 30 : 20) : 75;
      targetCamRef.current.y = isCompact ? (isTablet ? 30 : 20) : 75;
      currentLookAtRef.current.y = isCompact ? (isTablet ? -30 : -20) : -60;
      targetLookAtRef.current.y = isCompact ? (isTablet ? -30 : -20) : -60;

      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isMobile,
        powerPreference: "high-performance",
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.0 : (isTablet ? 1.5 : 2)));

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

      // Compact (mobile & tablet): high-performance stripped shader (150.0 dense grid step) strictly isolated for 60/120 FPS
      const floorFragmentShader = isCompact ? `
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
          float maxDist = ${isTablet ? "1150.0" : "750.0"};
          if (dist > maxDist) { gl_FragColor = vec4(0.0); return; }
          float alpha = smoothstep(maxDist, 200.0, dist);
          float majorGrid = getGrid(p, 150.0, 1.2) * 0.7;
          float axisX = 1.0 - min(abs(p.y) / (fwidth(p.y) * 1.5), 1.0);
          float axisZ = 1.0 - min(abs(p.x) / (fwidth(p.x) * 1.5), 1.0);
          float axes = max(axisX, axisZ) * 0.4;
          float centerSpot = smoothstep(400.0, 40.0, dist) * 0.1;
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

        const isCompactView = width < 1024;
        const isTabletView = width >= 768 && width < 1024;
        NODE_GRAPH.forEach((node) => {
          if (node.id === "root") return;

          const coords = getNodeCoordinates(node, isCompactView, 0, isTabletView);
          const nodeX = coords.x;
          const nodeY = coords.y;
          const nodeZ = coords.z;

          // Exact physical bottom edge of each card for vertical conduit beam
          const cardHalfHeight = isCompactView
            ? (isTabletView ? 140 : 115)
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

      // Mobile: 3 static floor reticle rings placed beneath the 3 front-facing carousel cards
      const mobileFloorBeaconGroup = new THREE.Group();
      scene.add(mobileFloorBeaconGroup);

      function rebuildMobileFloorBeacons() {
        while (mobileFloorBeaconGroup.children.length > 0) {
          const obj = mobileFloorBeaconGroup.children[0];
          mobileFloorBeaconGroup.remove(obj);
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
          if ((obj as THREE.Mesh).material) {
            ((obj as THREE.Mesh).material as THREE.Material).dispose();
          }
        }

        const isTabletNow = typeof window !== "undefined" ? (window.innerWidth >= 768 && window.innerWidth < 1024) : false;
        const R = isTabletNow ? 320 : 205;
        const floorY = Y_FLOOR + 1;
        const cardHalfHeight = isTabletNow ? 140 : 115;
        const centerY = isTabletNow ? -25 : -15;
        const cardBottomY = centerY - cardHalfHeight; // -165 on tablet, -130 on mobile
        const beamHeight = Math.abs(cardBottomY - floorY); // 334 on tablet, 369 on mobile

        // 3 front-facing carousel slots: Center (0), Left (-60 deg), Right (+60 deg)
        // Central conduit is fully visible; flanking conduits are dimmed to match their cards
        const slots = [
          {
            angle: 0,
            color: 0xccff00,
            beamTex: limeBeamTex,
            outerOpacity: 0.40,
            innerOpacity: 0.48,
            beamOpacity: 0.45,
            lineOpacity: 0.55,
            beamWidth: isTabletNow ? 20 : 16,
          },
          {
            angle: -Math.PI / 3,
            color: 0x06b6d4,
            beamTex: cyanBeamTex,
            outerOpacity: 0.22,
            innerOpacity: 0.26,
            beamOpacity: 0.20,
            lineOpacity: 0.24,
            beamWidth: isTabletNow ? 16 : 13,
          },
          {
            angle: Math.PI / 3,
            color: 0x10b981,
            beamTex: emeraldBeamTex,
            outerOpacity: 0.22,
            innerOpacity: 0.26,
            beamOpacity: 0.20,
            lineOpacity: 0.24,
            beamWidth: isTabletNow ? 16 : 13,
          },
        ];

        slots.forEach(({ angle, color, beamTex, outerOpacity, innerOpacity, beamOpacity, lineOpacity, beamWidth }) => {
          const slotX = Math.sin(angle) * R;
          const slotZ = Math.cos(angle) * R * 0.65;

          // 1. Outer reticle ring
          const outerGeo = new THREE.RingGeometry(isTabletNow ? 32 : 26, isTabletNow ? 44 : 36, 32);
          const outerMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: outerOpacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const outerMesh = new THREE.Mesh(outerGeo, outerMat);
          outerMesh.rotation.x = -Math.PI / 2;
          outerMesh.position.set(slotX, floorY + 0.1, slotZ);
          outerMesh.renderOrder = 10;
          mobileFloorBeaconGroup.add(outerMesh);

          // 2. Inner ring
          const innerGeo = new THREE.RingGeometry(isTabletNow ? 16 : 12, isTabletNow ? 24 : 18, 24);
          const innerMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            opacity: innerOpacity,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const innerMesh = new THREE.Mesh(innerGeo, innerMat);
          innerMesh.rotation.x = -Math.PI / 2;
          innerMesh.position.set(slotX, floorY + 0.15, slotZ);
          innerMesh.renderOrder = 10;
          mobileFloorBeaconGroup.add(innerMesh);

          // 3. Core contact disc
          const discGeo = new THREE.CircleGeometry(isTabletNow ? 10 : 8, 24);
          const discMat = new THREE.MeshBasicMaterial({
            color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            opacity: outerOpacity * 0.85,
            side: THREE.DoubleSide,
            depthWrite: false,
          });
          const discMesh = new THREE.Mesh(discGeo, discMat);
          discMesh.rotation.x = -Math.PI / 2;
          discMesh.position.set(slotX, floorY + 0.2, slotZ);
          discMesh.renderOrder = 11;
          mobileFloorBeaconGroup.add(discMesh);

          // 4. Luminous tapered conduit plane (Option B: Holographic tractor beam ribbon)
          const beamGeo = new THREE.PlaneGeometry(beamWidth, beamHeight);
          beamGeo.translate(0, -beamHeight / 2, 0); // Origin at top (card bottom)
          const beamMat = new THREE.MeshBasicMaterial({
            map: beamTex,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: beamOpacity,
            side: THREE.DoubleSide,
          });
          const beamMesh = new THREE.Mesh(beamGeo, beamMat);
          beamMesh.position.set(slotX, cardBottomY, slotZ);
          beamMesh.rotation.y = angle; // Face outward along radial line towards camera
          beamMesh.renderOrder = 14;
          mobileFloorBeaconGroup.add(beamMesh);

          // 5. Central laser core line for razor-sharp filament definition
          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(slotX, floorY, slotZ),
            new THREE.Vector3(slotX, cardBottomY, slotZ),
          ]);
          const lineMat = new THREE.LineBasicMaterial({
            color,
            transparent: true,
            opacity: lineOpacity,
            depthWrite: false,
          });
          const lineMesh = new THREE.Line(lineGeo, lineMat);
          lineMesh.renderOrder = 15;
          mobileFloorBeaconGroup.add(lineMesh);
        });
      }
      rebuildMobileFloorBeacons();

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

      // Hero avatar texture: on compact (mobile & tablet), load dedicated portrait cutout texture; on desktop, stream interactive video
      let heroTexture: THREE.Texture;
      if (isCompact) {
        heroTexture = new THREE.TextureLoader().load("/avatar-portrait-mobile.webp");
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

      // On compact (mobile & tablet): cutout already has clean alpha; strip luma keying, leaving only smooth edge feather vignette.
      // On desktop: retains procedural luma keying and edge feather vignette for the studio video loop.
      const nodeFragmentShader = isCompact ? `
        uniform sampler2D uTexture;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec4 texColor = texture2D(uTexture, vUv);

          // Edge Feather Vignette: Soft feather on boundaries (especially bottom torso edge into void)
          float edgeX = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
          float edgeY = smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.98, vUv.y);
          float edgeAlpha = edgeX * edgeY;

          float finalAlpha = texColor.a * edgeAlpha * uOpacity;
          gl_FragColor = vec4(texColor.rgb, finalAlpha);
        }
      ` : `
        uniform sampler2D uTexture;
        uniform float uOpacity;
        varying vec2 vUv;

        void main() {
          vec4 texColor = texture2D(uTexture, vUv);

          // 1. Procedural Luma Keying: Dissolve dark studio background
          float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
          float lumaAlpha = smoothstep(0.04, 0.24, luma);

          // 2. Edge Feather Vignette: Dissolve harsh rectangular boundary into the void
          float edgeX = smoothstep(0.0, 0.08, vUv.x) * smoothstep(1.0, 0.92, vUv.x);
          float edgeY = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.96, vUv.y);
          float edgeAlpha = edgeX * edgeY;

          float finalAlpha = lumaAlpha * edgeAlpha * uOpacity;
          gl_FragColor = vec4(texColor.rgb, finalAlpha);
        }
      `;

      const isCompactInit = typeof window !== "undefined" ? window.innerWidth < 1024 : isCompact;
      const isTabletInit = typeof window !== "undefined" ? (window.innerWidth >= 768 && window.innerWidth < 1024) : isTablet;

      const videoMaterial = new THREE.ShaderMaterial({
        vertexShader: nodeVertexShader,
        fragmentShader: nodeFragmentShader,
        uniforms: {
          uTexture: { value: heroTexture },
          uOpacity: { value: 1.0 },
        },
        transparent: true,
        depthWrite: false,
      });

      let currentAspect = isCompactInit ? (571 / 1024) : (1080 / 608);
      let cardHeight = isCompactInit
        ? (isTabletInit ? 520 : 440)
        : (920 / currentAspect);
      let cardWidth = isCompactInit
        ? cardHeight * currentAspect
        : Math.min(window.innerWidth * 0.82, 920);

      let heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
      const heroMesh = new THREE.Mesh(heroMeshGeometry, videoMaterial);
      const heroMeshInitY = isCompactInit ? (isTabletInit ? 560 : 460) : HERO_Y;
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

        const isCompactView = width < 1024;
        // In compact view (mobile & tablet), satellite cards are arranged in a bottom arc carousel;
        // skipping curves and packet effects saves draw calls and prevents visual clutter.
        if (isCompactView) return;

        NODE_GRAPH.forEach((node) => {
          if (node.id === "root") return;
          const coords = getNodeCoordinates(node, false);
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
          const avatarRadX = 185;
          const avatarRadY = 220;
          const startX = avatarCenterX + Math.cos(angle) * avatarRadX;
          const startY = avatarCenterY + Math.sin(angle) * avatarRadY;
          const startZ = -10;
          const start = new THREE.Vector3(startX, startY, startZ);

          // Card ingress port
          let endX = nodeX;
          let endY = nodeY;
          let endZ = nodeZ;

          if (nodeX > 50) {
            endX = nodeX - 165; // left edge of right-hand cards
          } else if (nodeX < -50) {
            endX = nodeX + 165; // right edge of left-hand cards
          } else if (nodeY > avatarCenterY) {
            endY = nodeY - 110;
          } else {
            endY = nodeY + 110;
          }
          const end = new THREE.Vector3(endX, endY, endZ);

          // Smooth 3D cubic bezier control points
          const cp1 = new THREE.Vector3(
            start.x + Math.cos(angle) * 140,
            start.y + Math.sin(angle) * 140,
            start.z + 20
          );
          const cp2 = new THREE.Vector3(
            end.x - (nodeX > 50 ? 100 : nodeX < -50 ? -100 : 0),
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
        const isCompactNow = window.innerWidth < 1024;
        const isTabletNow = window.innerWidth >= 768 && window.innerWidth < 1024;

        if (isCompactNow) {
          currentAspect = 571 / 1024;
          cardHeight = isTabletNow ? 520 : 440;
          cardWidth = cardHeight * currentAspect;
          const heroMeshCalibY = isTabletNow ? 560 : 460;
          heroMeshGeometry.dispose();
          heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
          heroMesh.geometry = heroMeshGeometry;
          heroMesh.position.set(0, heroMeshCalibY, 0);
        } else {
          if (video && video.videoWidth && video.videoHeight) {
            currentAspect = video.videoWidth / video.videoHeight;
          } else {
            currentAspect = 1080 / 608;
          }
          cardWidth = Math.min(window.innerWidth * 0.82, 920);
          cardHeight = cardWidth / currentAspect;

          const heroMeshCalibY = HERO_Y;
          heroMeshGeometry.dispose();
          heroMeshGeometry = new THREE.PlaneGeometry(cardWidth, cardHeight);
          heroMesh.geometry = heroMeshGeometry;
          heroMesh.position.set(0, heroMeshCalibY, 0);
        }

        rebuildCurves();
        rebuildFloorBeacons();
        rebuildMobileFloorBeacons();
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



      // Input interactions: Mouse drag pan
      let isDragging = false;
      let dragStart = { x: 0, y: 0 };

      const isInteractiveTarget = (target: HTMLElement | null) => {
        if (!target) return true;
        // In active deep-dive inspect mode, interactions belong to the card content (scrolling, code, tabs)
        if (activeNodeIdRef.current !== "root" && target.closest(".spatial-node")) {
          return true;
        }
        return (
          target.closest("#project-drawer") ||
          target.closest(".hud-controls") ||
          target.closest("header") ||
          target.closest("footer") ||
          target.closest("nav") ||
          target.closest("#shortcuts-modal") ||
          target.closest("#pro-hint-banner") ||
          target.closest("#radar-container") ||
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
        if (isInteractiveTarget(target) || target?.closest(".spatial-node")) {
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
          if (!isCompact) {
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
          // On compact (mobile & tablet): keep 3D carousel centered and stable; gesture intent evaluated cleanly on touchend
        } else if (e.touches.length === 2) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          const delta = touchStartDist - dist;
          targetCamRef.current.z += delta * 2;
          const minZ = isMobile ? 850 : (isTablet ? 1100 : MIN_CAMERA_Z);
          const maxZ = isMobile ? 1800 : (isTablet ? 2450 : MAX_CAMERA_Z);
          targetCamRef.current.z = Math.min(
            Math.max(targetCamRef.current.z, minZ),
            maxZ
          );
          touchStartDist = dist;
        }
      };

      const handleTouchEnd = (e: TouchEvent) => {
        if (!isSpatialInFocus()) {
          isDragging = false;
          return;
        }
        if (isCompact && e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;
          const absDx = Math.abs(deltaX);
          const absDy = Math.abs(deltaY);
          const duration = performance.now() - touchStartTime;

          if (activeNodeIdRef.current === "root") {
            // Clean horizontal swipe: step 3D cylindrical carousel (allows natural slight diagonal angle)
            if (absDx > 35 && absDy < absDx * 1.15 && duration < 750) {
              const step = deltaX < 0 ? 1 : -1;
              if (onStepMobileOrbit) {
                onStepMobileOrbit(step);
              } else {
                targetCarouselAngleRef.current -= step * ((2 * Math.PI) / 6);
                playKeyClick();
              }
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
        const isCompactRadar = width < 1024;
        const isTabletRadar = width >= 768 && width < 1024;
        const heroMeshRadarY = isCompactRadar ? (isTabletRadar ? 560 : 460) : HERO_Y;
        const rootRadar = worldToRadar(0, heroMeshRadarY, rw, rh);
        radarCtx.strokeStyle = "rgba(204, 255, 0, 0.25)";
        radarCtx.lineWidth = 1;
        NODE_GRAPH.forEach((n) => {
          if (n.id === "root") return;
          const coords = getNodeCoordinates(n, isCompactRadar, 0, isTabletRadar);
          const { rx, ry } = worldToRadar(coords.x, coords.y, rw, rh);
          radarCtx.beginPath();
          radarCtx.moveTo(rootRadar.rx, rootRadar.ry);
          radarCtx.lineTo(rx, ry);
          radarCtx.stroke();
        });

        // Node blips
        NODE_GRAPH.forEach((n) => {
          const coords = getNodeCoordinates(n, isCompactRadar, 0, isTabletRadar);
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
      let lastStmtX = -999, lastStmtY = -999, lastStmtS = -999, lastStmtVis = false, lastStmtOpacity = "-1";
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
        // Floor beacons: 3 static reticles on mobile & tablet, dynamic 6 beacons on desktop
        floorBeaconGroup.visible = isCompact ? false : !isNodeFocused;
        mobileFloorBeaconGroup.visible = isCompact ? !isNodeFocused : false;
        clusterNebulaGroup.visible = isCompact ? false : true;

        // Animate dynamic floor beacons & descending contact pings on hover (desktop only)
        if (!isCompact) {
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

        const isCompactView = (typeof window !== "undefined" ? window.innerWidth : width) < 1024;
        const isTabletView = (typeof window !== "undefined" ? window.innerWidth : width) >= 768 && (typeof window !== "undefined" ? window.innerWidth : width) < 1024;

        // Perspective-project DOM statement: Anchored below avatar on mobile/tablet, above avatar on desktop
        const stmtEl = statementRef.current;
        const isAnyHoveredForDim = hoveredNodeIdRef.current !== null;
        if (stmtEl) {
          const statementWorldY = isCompactView ? (isTabletView ? 305 : 225) : HERO_Y + cardHeight * 0.5 + 130;
          const stmtProj = projectToScreen(0, statementWorldY, 75);
          const shouldBeVis = stmtProj.isVisible && !isNodeFocused;

          let targetStmtOpacity = "0";
          if (shouldBeVis) {
            targetStmtOpacity = isAnyHoveredForDim ? "0.20" : "1";
          }
          if (lastStmtOpacity !== targetStmtOpacity) {
            stmtEl.style.opacity = targetStmtOpacity;
            stmtEl.style.pointerEvents = targetStmtOpacity === "1" ? "auto" : "none";
            lastStmtOpacity = targetStmtOpacity;
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

        // Central video mesh dimming when any node is hovered or active (Compositor zero-cost)
        const targetVideoOpacity = isNodeFocused ? 0.0 : isAnyHoveredForDim ? 0.20 : 1.0;
        if (videoMaterial.uniforms.uOpacity) {
          const curOp = videoMaterial.uniforms.uOpacity.value;
          if (Math.abs(curOp - targetVideoOpacity) > 0.005) {
            videoMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(curOp, targetVideoOpacity, 0.18);
          }
        }

        // Perspective-project Hero Status Badge: Anchored below bottom of video at Z = 45
        const badgeEl = heroBadgeRef?.current;
        if (badgeEl) {
          const badgeHeroY = isCompactView ? (isTabletView ? 560 : 460) : HERO_Y;
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

        // Smooth 3D carousel rotation interpolation on mobile & tablet
        if (isCompactView) {
          const dAngle = targetCarouselAngleRef.current - currentCarouselAngleRef.current;
          if (Math.abs(dAngle) > 0.001) {
            currentCarouselAngleRef.current += dAngle * lerpFactor;
          } else {
            currentCarouselAngleRef.current = targetCarouselAngleRef.current;
          }
        }

        // Snappy card sleep discipline: when camera is settled on mobile/tablet, pause DOM projections to yield 100% compositor headroom
        const isAngleMoving = isCompactView && Math.abs(targetCarouselAngleRef.current - currentCarouselAngleRef.current) > 0.001;
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

        const shouldProjectCards = true;

        // Perspective-project all spatial node cards with Compositor-Only 120 FPS standard
        if (nodeRefs.current && shouldProjectCards) {
          NODE_GRAPH.forEach((node) => {
            if (node.id === "root") return;
            const el = nodeRefs.current?.get(node.id);
            if (!el) return;

            const coords = getNodeCoordinates(node, isCompactView, currentCarouselAngleRef.current, isTabletView);
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
                  targetOpacity = "0.20";
                } else if (isCompactView) {
                  // Mobile & Tablet portrait overview:
                  // Active card is prominently front-center; flanking cards dimmed to ambient context (0.15)
                  const R = isTabletView ? 320 : 205;
                  const depthRatio = coords.z / (R * 0.65);
                  const isFrontCenter = depthRatio >= 0.85;
                  const isFlanking = depthRatio >= 0.20 && depthRatio < 0.85;
                  targetOpacity = isFrontCenter ? "1" : isFlanking ? "0.15" : "0";
                  targetPointerEvents = isFrontCenter ? "auto" : "none";
                  targetZIndex = isFrontCenter ? "250" : Math.max(5, Math.round(50 + coords.z)).toString();
                } else {
                  // Desktop overview when no node is hovered:
                  // Elegant, soft dimmed ambient state (0.70) until hovered
                  targetOpacity = "0.7";
                  targetPointerEvents = "auto";
                  targetZIndex = Math.max(10, Math.round(25 + coords.z)).toString();
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
                const cardScale = isCompactView ? (isTabletView ? proj.scale * 0.92 : proj.scale * 0.80) : proj.scale;
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
        if (overscrollResetTimerRef.current) clearTimeout(overscrollResetTimerRef.current);
        viewportObserver.disconnect();
        if (animFrameId) cancelAnimationFrame(animFrameId);
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
        while (mobileFloorBeaconGroup.children.length > 0) {
          const obj = mobileFloorBeaconGroup.children[0];
          mobileFloorBeaconGroup.remove(obj);
          if ((obj as THREE.Mesh).geometry) {
            (obj as THREE.Mesh).geometry.dispose();
          }
          if ((obj as THREE.Mesh).material) {
            ((obj as THREE.Mesh).material as THREE.Material).dispose();
          }
        }
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
