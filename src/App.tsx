import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// --- 設定 ---
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

  // 診断用表示ステート
  const [debugInfo, setDebugInfo] = useState("Initializing...");
  const [pressedKeys, setPressedKeys] = useState<string[]>([]);
  const [playerPos, setPlayerPos] = useState("0.0, 0.0");

  // ゲームの状態管理
  const gameRef = useRef<{
    isLocked: boolean;
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
    frameCount: number;
  }>({
    isLocked: false,
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
    frameCount: 0,
  });

  useEffect(() => {
    if (!mountRef.current) return;

    // キャンバスのクリーンアップ
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    const game = gameRef.current;

    // --- 1. Three.js 初期化 ---
    game.scene = new THREE.Scene();
    game.scene.background = new THREE.Color(CONFIG.COLORS.SKY);
    game.scene.fog = new THREE.Fog(CONFIG.COLORS.SKY, 10, 50);

    game.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

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
    game.scene.add(dirLight);

    // --- 2. オブジェクト生成 ---
    game.blocks = [];
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

    for (let x = -CONFIG.WORLD_WIDTH / 2; x < CONFIG.WORLD_WIDTH / 2; x++) {
      for (let z = -CONFIG.WORLD_DEPTH / 2; z < CONFIG.WORLD_DEPTH / 2; z++) {
        const h1 = Math.sin(x * 0.1) * Math.sin(z * 0.1);
        const h2 = Math.sin(x * 0.3 + z * 0.2);
        const height = Math.floor((h1 + h2 * 0.5) * 3);

        const mesh = new THREE.Mesh(geometry, materials);
        mesh.position.set(x, height, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        game.scene.add(mesh);
        game.blocks.push({ x, y: height, z });

        let minDepth = Math.max(height - 2, -5);
        for (let h = height - 1; h >= minDepth; h--) {
          const dirt = new THREE.Mesh(geometry, matSide);
          dirt.position.set(x, h, z);
          game.scene.add(dirt);
        }
      }
    }

    // --- プレイヤー生成 (精巧版) ---
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

      // -- 頭グループ --
      const headGroup = new THREE.Group();
      headGroup.position.y = 0.95;

      // 頭本体
      const headMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 0.5, 0.5),
        yellow
      );
      headGroup.add(headMain);

      // 耳 (左)
      const lEarGroup = new THREE.Group();
      lEarGroup.position.set(-0.2, 0.25, 0);
      lEarGroup.rotation.z = 0.35;
      const lEarBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.45, 0.12),
        yellow
      );
      lEarBase.position.y = 0.225;
      const lEarTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.121, 0.15, 0.121),
        black
      );
      lEarTip.position.y = 0.525;
      lEarGroup.add(lEarBase);
      lEarGroup.add(lEarTip);
      headGroup.add(lEarGroup);

      // 耳 (右)
      const rEarGroup = new THREE.Group();
      rEarGroup.position.set(0.2, 0.25, 0);
      rEarGroup.rotation.z = -0.35;
      const rEarBase = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 0.45, 0.12),
        yellow
      );
      rEarBase.position.y = 0.225;
      const rEarTip = new THREE.Mesh(
        new THREE.BoxGeometry(0.121, 0.15, 0.121),
        black
      );
      rEarTip.position.y = 0.525;
      rEarGroup.add(rEarBase);
      rEarGroup.add(rEarTip);
      headGroup.add(rEarGroup);

      // 目
      const eyeGeo = new THREE.BoxGeometry(0.08, 0.08, 0.05);
      const lEye = new THREE.Mesh(eyeGeo, black);
      lEye.position.set(-0.16, 0, 0.26);
      const rEye = new THREE.Mesh(eyeGeo, black);
      rEye.position.set(0.16, 0, 0.26);
      headGroup.add(lEye);
      headGroup.add(rEye);

      // 鼻
      const nose = new THREE.Mesh(
        new THREE.BoxGeometry(0.04, 0.03, 0.05),
        black
      );
      nose.position.set(0, -0.05, 0.26);
      headGroup.add(nose);

      // ほっぺ
      const cheekGeo = new THREE.BoxGeometry(0.12, 0.12, 0.05);
      const lCheek = new THREE.Mesh(cheekGeo, red);
      lCheek.position.set(-0.24, -0.12, 0.26);
      const rCheek = new THREE.Mesh(cheekGeo, red);
      rCheek.position.set(0.24, -0.12, 0.26);
      headGroup.add(lCheek);
      headGroup.add(rCheek);

      group.add(headGroup);

      // -- 体グループ --
      const bodyGroup = new THREE.Group();
      bodyGroup.position.y = 0.45;

      // 胴体
      const bodyMain = new THREE.Mesh(
        new THREE.BoxGeometry(0.5, 0.6, 0.4),
        yellow
      );
      bodyGroup.add(bodyMain);

      // 背中の模様 (茶色の縞)
      const stripe1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.41),
        brown
      );
      stripe1.position.set(0, 0.1, 0);
      bodyGroup.add(stripe1);
      const stripe2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.05, 0.41),
        brown
      );
      stripe2.position.set(0, -0.1, 0);
      bodyGroup.add(stripe2);

      // 手 (前足)
      const armGeo = new THREE.BoxGeometry(0.12, 0.25, 0.12);
      const lArm = new THREE.Mesh(armGeo, yellow);
      lArm.position.set(-0.2, 0.1, 0.2);
      lArm.rotation.x = -0.5;
      lArm.rotation.z = 0.2;
      const rArm = new THREE.Mesh(armGeo, yellow);
      rArm.position.set(0.2, 0.1, 0.2);
      rArm.rotation.x = -0.5;
      rArm.rotation.z = -0.2;
      bodyGroup.add(lArm);
      bodyGroup.add(rArm);

      // 足
      const footGeo = new THREE.BoxGeometry(0.18, 0.1, 0.25);
      const lFoot = new THREE.Mesh(footGeo, yellow);
      lFoot.position.set(-0.15, -0.35, 0.1);
      const rFoot = new THREE.Mesh(footGeo, yellow);
      rFoot.position.set(0.15, -0.35, 0.1);
      bodyGroup.add(lFoot);
      bodyGroup.add(rFoot);

      // しっぽ (カミナリ型)
      const tailGroup = new THREE.Group();
      tailGroup.position.set(0, -0.2, -0.2);

      // 根元 (茶色)
      const t1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.05), brown);
      t1.position.set(0, 0.12, 0);
      t1.rotation.z = -0.6;
      tailGroup.add(t1);

      // 中間 (黄色)
      const t2 = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.05), yellow);
      t2.position.set(0.1, 0.35, 0);
      t2.rotation.z = 0.6;
      tailGroup.add(t2);

      // 先端 (黄色・大)
      const t3 = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.5, 0.05), yellow);
      t3.position.set(0.05, 0.75, 0);
      t3.rotation.z = -0.4;
      tailGroup.add(t3);

      bodyGroup.add(tailGroup);
      group.add(bodyGroup);

      // 全パーツに影をつける
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      group.position.set(0, 5, 0);
      game.scene.add(group);
      game.player = group;
    };
    createPlayer();

    // --- 3. ループ処理 ---
    const animate = () => {
      game.animationId = requestAnimationFrame(animate);

      if (game.isLocked && game.player) {
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

        const k = game.keys;
        if (k["KeyW"] || k["ArrowUp"]) dir.add(forward.negate());
        if (k["KeyS"] || k["ArrowDown"]) dir.add(forward);
        if (k["KeyA"] || k["ArrowLeft"]) dir.add(right.negate());
        if (k["KeyD"] || k["ArrowRight"]) dir.add(right);

        if (dir.length() > 0) {
          dir.normalize();
          const targetRot = Math.atan2(dir.x, dir.z);
          let diff = targetRot - game.player.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          game.player.rotation.y += diff * 0.2;
          game.player.position.add(dir.multiplyScalar(speed));
        }

        if (k["Space"] && game.playerOnGround) {
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
            if (b.x === px && b.z === pz) groundY = b.y + 0.5;
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
        game.camera!.position.set(cx, cy, cz);
        game.camera!.lookAt(
          game.player.position.x,
          game.player.position.y + 1,
          game.player.position.z
        );

        game.frameCount++;
        if (game.frameCount % 10 === 0) {
          setPlayerPos(
            `${game.player.position.x.toFixed(
              1
            )}, ${game.player.position.z.toFixed(1)}`
          );
        }
      }

      game.renderer!.render(game.scene!, game.camera!);
    };
    animate();

    const handleKeyDown = (e: KeyboardEvent) => {
      game.keys[e.code] = true;
      setPressedKeys((prev) => Array.from(new Set([...prev, e.code])));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      game.keys[e.code] = false;
      setPressedKeys((prev) => prev.filter((k) => k !== e.code));
    };

    const handleResize = () => {
      if (!game.camera || !game.renderer) return;
      game.camera.aspect = window.innerWidth / window.innerHeight;
      game.camera.updateProjectionMatrix();
      game.renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!game.isLocked) return;
      game.cameraAngle -= e.movementX * 0.005;
      game.cameraVerticalAngle -= e.movementY * 0.005;
      game.cameraVerticalAngle = Math.max(
        -Math.PI / 3,
        Math.min(Math.PI / 3, game.cameraVerticalAngle)
      );
    };

    const handleLockChange = () => {
      const locked = !!document.pointerLockElement;
      game.isLocked = locked;
      setIsLocked(locked);
      setDebugInfo(locked ? "LOCKED (Ready)" : "UNLOCKED (Click screen)");
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
        if (mountRef.current.contains(game.renderer.domElement)) {
          mountRef.current.removeChild(game.renderer.domElement);
        }
        game.renderer.dispose();
      }
    };
  }, []);

  const startLock = () => {
    document.body.requestPointerLock();
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
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />

      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          zIndex: 100,
          color: "#00FF00",
          background: "rgba(0,0,0,0.5)",
          padding: "5px",
          fontFamily: "monospace",
          pointerEvents: "none",
        }}
      >
        STATUS: {debugInfo}
        <br />
        POS: {playerPos}
        <br />
        KEYS: {pressedKeys.join(", ") || "None"}
      </div>

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
            クリックで再開します
          </h1>
          <p>W, A, S, D または 矢印 = 動く</p>
          <p>スペース = ジャンプ</p>
          <p>マウス = 視点を変える</p>
        </div>
      )}

      {isLocked && (
        <div
          style={{
            position: "absolute",
            top: "10px",
            right: "10px",
            color: "white",
            backgroundColor: "rgba(0,0,0,0.5)",
            padding: "10px",
            borderRadius: "5px",
            pointerEvents: "none",
            userSelect: "none",
          }}
        >
          <p>
            <b>操作方法</b>
          </p>
          <p>動く：WASD / 矢印</p>
          <p>スペース：ジャンプ</p>
          <p>一時停止：ESC</p>
        </div>
      )}
    </div>
  );
}
