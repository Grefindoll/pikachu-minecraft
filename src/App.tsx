import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// ゲームの設定定数
const CONFIG = {
  WORLD_WIDTH: 40,
  WORLD_DEPTH: 40,
  BLOCK_SIZE: 1,
  COLORS: {
    SKY: 0x87ceeb,
    GRASS: 0x55aa55,
    DIRT: 0x8b5a2b,
    PIKA_YELLOW: 0xffdd00,
    BLACK: 0x111111,
    RED: 0xff0000,
    BROWN: 0x8b4513,
  },
};

export default function MinecraftPikachuTS() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLocked, setIsLocked] = useState(false);

  // ゲームの状態管理用 Ref
  const gameRef = useRef<{
    camera: THREE.PerspectiveCamera | null;
    scene: THREE.Scene | null;
    renderer: THREE.WebGLRenderer | null;
    player: THREE.Group | null;
    playerVelocity: { y: number };
    playerOnGround: boolean;
    blocks: Array<{ x: number; y: number; z: number }>;
    keys: { [key: string]: boolean };
    cameraAngle: number;
    cameraVerticalAngle: number;
    animationId: number;
  }>({
    camera: null,
    scene: null,
    renderer: null,
    player: null,
    playerVelocity: { y: 0 },
    playerOnGround: false,
    blocks: [],
    keys: {},
    cameraAngle: 0,
    cameraVerticalAngle: 0,
    animationId: 0,
  });

  // ゲームの初期化とメインループ
  useEffect(() => {
    if (!mountRef.current) return;

    const { current: game } = gameRef;

    // --- 1. 初期化処理 ---

    // シーン
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(CONFIG.COLORS.SKY);
    game.scene.fog = new THREE.Fog(CONFIG.COLORS.SKY, 10, 50);

    // カメラ
    game.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // レンダラー
    game.renderer = new THREE.WebGLRenderer({ antialias: true });
    game.renderer.setSize(window.innerWidth, window.innerHeight);
    game.renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(game.renderer.domElement);

    // ライト
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    game.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
    dirLight.position.set(50, 100, 50);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    const d = 50;
    dirLight.shadow.camera.left = -d;
    dirLight.shadow.camera.right = d;
    dirLight.shadow.camera.top = d;
    dirLight.shadow.camera.bottom = -d;
    game.scene.add(dirLight);

    // 地形生成
    const generateTerrain = () => {
      const geometry = new THREE.BoxGeometry(
        CONFIG.BLOCK_SIZE,
        CONFIG.BLOCK_SIZE,
        CONFIG.BLOCK_SIZE
      );
      const matTop = new THREE.MeshLambertMaterial({
        color: CONFIG.COLORS.GRASS,
      });
      const matSide = new THREE.MeshLambertMaterial({
        color: CONFIG.COLORS.DIRT,
      });
      const materials = [matSide, matSide, matTop, matSide, matSide, matSide];

      const addToScene = (obj: THREE.Object3D) => {
        if (game.scene) game.scene.add(obj);
      };

      for (let x = -CONFIG.WORLD_WIDTH / 2; x < CONFIG.WORLD_WIDTH / 2; x++) {
        for (let z = -CONFIG.WORLD_DEPTH / 2; z < CONFIG.WORLD_DEPTH / 2; z++) {
          const h1 = Math.sin(x * 0.1) * Math.sin(z * 0.1);
          const h2 = Math.sin(x * 0.3 + z * 0.2);
          const height = Math.floor((h1 + h2 * 0.5) * 3);

          const mesh = new THREE.Mesh(geometry, materials);
          mesh.position.set(x, height, z);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          addToScene(mesh);

          game.blocks.push({ x, y: height, z });

          let minDepth = Math.max(height - 3, -5);
          for (let h = height - 1; h >= minDepth; h--) {
            const dirt = new THREE.Mesh(geometry, matSide);
            dirt.position.set(x, h, z);
            addToScene(dirt);
          }
        }
      }
    };

    // プレイヤー生成
    const createPlayer = () => {
      const group = new THREE.Group();

      const yellow = new THREE.MeshLambertMaterial({
        color: CONFIG.COLORS.PIKA_YELLOW,
      });
      const black = new THREE.MeshLambertMaterial({
        color: CONFIG.COLORS.BLACK,
      });
      const red = new THREE.MeshLambertMaterial({ color: CONFIG.COLORS.RED });
      const brown = new THREE.MeshLambertMaterial({
        color: CONFIG.COLORS.BROWN,
      });

      // 体・頭
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.35),
        yellow
      );
      body.position.y = 0.3;
      body.castShadow = true;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.BoxGeometry(0.55, 0.5, 0.5),
        yellow
      );
      head.position.y = 0.85;
      head.castShadow = true;
      group.add(head);

      // 耳
      const earGeo = new THREE.BoxGeometry(0.12, 0.4, 0.12);
      const lEar = new THREE.Mesh(earGeo, yellow);
      lEar.position.set(-0.2, 1.25, 0);
      lEar.rotation.z = 0.3;
      group.add(lEar);
      const lTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.122, 0.1, 0.122),
        black
      );
      lTip.position.set(-0.24, 1.45, 0);
      lTip.rotation.z = 0.3;
      group.add(lTip);

      const rEar = new THREE.Mesh(earGeo, yellow);
      rEar.position.set(0.2, 1.25, 0);
      rEar.rotation.z = -0.3;
      group.add(rEar);
      const rTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.122, 0.1, 0.122),
        black
      );
      rTip.position.set(0.24, 1.45, 0);
      rTip.rotation.z = -0.3;
      group.add(rTip);

      // 顔
      const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
      const lEye = new THREE.Mesh(eyeGeo, black);
      lEye.position.set(-0.12, 0.9, 0.26);
      group.add(lEye);
      const rEye = new THREE.Mesh(eyeGeo, black);
      rEye.position.set(0.12, 0.9, 0.26);
      group.add(rEye);
      const nose = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.03, 0.05),
        black
      );
      nose.position.set(0, 0.85, 0.26);
      group.add(nose);
      const cheekGeo = new THREE.BoxGeometry(0.1, 0.1, 0.05);
      const lCheek = new THREE.Mesh(cheekGeo, red);
      lCheek.position.set(-0.2, 0.75, 0.26);
      group.add(lCheek);
      const rCheek = new THREE.Mesh(cheekGeo, red);
      rCheek.position.set(0.2, 0.75, 0.26);
      group.add(rCheek);

      // 尻尾
      const tailGroup = new THREE.Group();
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.3, 0.05), brown);
      t1.position.set(0, 0.1, 0);
      t1.rotation.z = 0.5;
      tailGroup.add(t1);
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.3, 0.05), yellow);
      t2.position.set(0.1, 0.3, 0);
      t2.rotation.z = -0.5;
      tailGroup.add(t2);
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.3, 0.05), yellow);
      t3.position.set(-0.05, 0.5, 0);
      t3.rotation.z = 0.3;
      tailGroup.add(t3);
      tailGroup.position.set(0, 0.4, -0.2);
      group.add(tailGroup);

      group.position.set(0, 5, 0);
      if (game.scene) game.scene.add(group);
      game.player = group;
    };

    generateTerrain();
    createPlayer();

    // --- 2. アニメーションループ ---
    const animate = () => {
      game.animationId = requestAnimationFrame(animate);

      // 【修正点】bodyではなく、実際の描画領域(mountRef.current)にロックがかかっているか確認
      const isPointerLocked = document.pointerLockElement === mountRef.current;

      if (isPointerLocked && game.player) {
        const speed = 0.1;
        const dir = new THREE.Vector3();

        const forward = new THREE.Vector3(
          Math.sin(game.cameraAngle),
          0,
          Math.cos(game.cameraAngle)
        ).normalize();
        const right = new THREE.Vector3(
          Math.sin(game.cameraAngle - Math.PI / 2),
          0,
          Math.cos(game.cameraAngle - Math.PI / 2)
        ).normalize();

        if (game.keys["KeyW"]) dir.add(forward.negate());
        if (game.keys["KeyS"]) dir.add(forward);
        if (game.keys["KeyA"]) dir.add(right.negate());
        if (game.keys["KeyD"]) dir.add(right);

        if (dir.length() > 0) {
          dir.normalize();
          const targetRot = Math.atan2(dir.x, dir.z) + Math.PI;

          let diff = targetRot - game.player.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          game.player.rotation.y += diff * 0.2;

          game.player.position.add(dir.multiplyScalar(speed));
        }

        if (game.keys["Space"] && game.playerOnGround) {
          game.playerVelocity.y = 0.25;
          game.playerOnGround = false;
        }

        game.playerVelocity.y -= 0.01;
        game.player.position.y += game.playerVelocity.y;

        const px = Math.round(game.player.position.x);
        const pz = Math.round(game.player.position.z);
        let groundY = -100;

        for (const b of game.blocks) {
          if (Math.abs(b.x - px) <= 1 && Math.abs(b.z - pz) <= 1) {
            if (b.x === px && b.z === pz) {
              groundY = b.y + 0.5;
            }
          }
        }

        if (game.player.position.y < groundY) {
          game.player.position.y = groundY;
          game.playerVelocity.y = 0;
          game.playerOnGround = true;
        } else {
          game.playerOnGround = false;
        }

        if (game.player.position.y < -20) {
          game.player.position.set(0, 10, 0);
          game.playerVelocity.y = 0;
        }
      }

      if (game.player && game.camera) {
        const dist = 8;
        const cx =
          game.player.position.x +
          dist *
            Math.sin(game.cameraAngle) *
            Math.cos(game.cameraVerticalAngle);
        const cz =
          game.player.position.z +
          dist *
            Math.cos(game.cameraAngle) *
            Math.cos(game.cameraVerticalAngle);
        const cy =
          game.player.position.y +
          dist * Math.sin(game.cameraVerticalAngle) +
          2;

        game.camera.position.set(cx, cy, cz);
        game.camera.lookAt(
          game.player.position.x,
          game.player.position.y + 1,
          game.player.position.z
        );
      }

      if (game.renderer && game.scene && game.camera) {
        game.renderer.render(game.scene, game.camera);
      }
    };

    animate();

    // --- 3. イベントリスナー ---
    const handleKeyDown = (e: KeyboardEvent) => {
      game.keys[e.code] = true;
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.code] = false;
    };

    const handleResize = () => {
      if (!game.camera || !game.renderer) return;
      game.camera.aspect = window.innerWidth / window.innerHeight;
      game.camera.updateProjectionMatrix();
      game.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      // 【修正点】ここもmountRef.currentをチェック
      if (document.pointerLockElement !== mountRef.current) return;
      game.cameraAngle -= e.movementX * 0.005;
      game.cameraVerticalAngle -= e.movementY * 0.005;
      game.cameraVerticalAngle = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, game.cameraVerticalAngle)
      );
    };

    const handleLockChange = () => {
      // 【修正点】ここもmountRef.currentをチェック
      setIsLocked(document.pointerLockElement === mountRef.current);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("resize", handleResize);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("pointerlockchange", handleLockChange);

    return () => {
      cancelAnimationFrame(game.animationId);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("pointerlockchange", handleLockChange);
      if (mountRef.current && game.renderer) {
        mountRef.current.removeChild(game.renderer.domElement);
      }
    };
  }, []);

  // 【修正点】ここが一番大事です。document.bodyではなく、mountRef.current（このdiv）をロックします
  const startLock = () => {
    mountRef.current?.requestPointerLock();
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#87CEEB",
      }}
    >
      {/* このdivにrefを設定し、ここにロックをかけます */}
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      {!isLocked && (
        <div
          onClick={startLock}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.6)",
            color: "white",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <h1 style={{ fontSize: "2rem", marginBottom: "1rem" }}>
            Click to Start
          </h1>
          <p>W, A, S, D = Move</p>
          <p>SPACE = Jump</p>
          <p>Mouse = Look</p>
        </div>
      )}

      {isLocked && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            left: "10px",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "10px",
            borderRadius: "5px",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <p>
            <b>Controls:</b>
          </p>
          <p>WASD to Move</p>
          <p>Space to Jump</p>
          <p>ESC to Pause</p>
        </div>
      )}
    </div>
  );
}
