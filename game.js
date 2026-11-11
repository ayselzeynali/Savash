(() => {
  "use strict";

  const canvas = document.getElementById("game");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const $ = id => document.getElementById(id);
  const background = new Image();
  background.src = "./file_00000000d45c81f48ba3ab6d5282ec87.png";

  const MAX_WAVE = 20;
  const keys = Object.create(null);
  const touch = Object.create(null);
  let W = 0, H = 0, DPR = 1;
  let player = null, team = [], enemies = [], bullets = [];
  let wave = 1, kills = 0, mode = "menu", onlineMode = false;
  let firing = false, lastFrame = 0, hudTimer = 0, sendTimer = 0;
  let peerShotTimer = 0;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const net = () => window.SavashNet || null;

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, canvas.clientWidth);
    H = Math.max(1, canvas.clientHeight);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (player) {
      player.x = clamp(player.x, 14, W - 14);
      player.y = clamp(player.y, 96, H - 14);
    }
  }

  function clearInput() {
    Object.keys(keys).forEach(key => { keys[key] = false; });
    Object.keys(touch).forEach(key => { touch[key] = false; });
    firing = false;
  }

  function showGameUI(visible) {
    ["hud", "mission", "topButtons", "pad", "fire"].forEach(id => {
      const element = $(id);
      if (element) element.classList.toggle("hidden", !visible);
    });
  }

  function hideOverlays() {
    ["start", "how", "online", "result", "pause"].forEach(id => {
      const element = $(id);
      if (element) element.classList.add("hidden");
    });
  }

  function mainMenu() {
    mode = "menu";
    onlineMode = false;
    clearInput();
    if (net()) net().disconnect();
    showGameUI(false);
    hideOverlays();
    $("start").classList.remove("hidden");
  }

  function makeSoldier(x, y, hp = 100) {
    return { x, y, hp, maxHp: hp, cooldown: Math.random() * 0.3 };
  }

  function startCampaign() {
    wave = 1;
    kills = 0;
    onlineMode = false;
    beginWave();
  }

  function startOnlineDuel() {
    if (!net() || !net().isConnected()) return;
    wave = 1;
    kills = 0;
    onlineMode = true;
    beginWave();
  }

  function beginWave() {
    player = makeSoldier(W / 2, H * 0.58, 100);
    player.cooldown = 0;
    team = Array.from({ length: 5 }, (_, i) =>
      makeSoldier(W / 2 + (i - 2) * 25, H * 0.58 + 48, 100)
    );
    enemies = [];
    bullets = [];
    clearInput();
    mode = "playing";
    peerShotTimer = 0;
    sendTimer = 0;
    if (!onlineMode) {
      const count = 4 + wave * 2;
      for (let i = 0; i < count; i++) {
        spawnEnemy(i === count - 1 && wave % 5 === 0);
      }
    }
    hideOverlays();
    showGameUI(true);
    updateHud();
  }

  function spawnEnemy(boss) {
    let x = 0, y = 0;
    const safeDistance = Math.min(220, Math.max(130, Math.min(W, H) * 0.32));
    for (let attempt = 0; attempt < 12; attempt++) {
      const side = Math.floor(Math.random() * 4);
      x = side === 0 ? 16 : side === 1 ? W - 16 : Math.random() * W;
      y = side === 2 ? 86 : side === 3 ? H - 16 : 86 + Math.random() * Math.max(1, H - 102);
      if (!player || Math.hypot(x - player.x, y - player.y) > safeDistance) break;
    }
    const hp = (boss ? 260 : 34) + wave * (boss ? 32 : 10);
    enemies.push({
      x, y, hp, maxHp: hp,
      speed: boss ? 34 + wave * 1.4 : 42 + wave * 3,
      cooldown: 0.65, boss, size: boss ? 19 : 10
    });
  }

  function nearest(x, y, list) {
    let result = null, best = Infinity;
    for (const item of list) {
      const d = Math.hypot(item.x - x, item.y - y);
      if (d < best) { best = d; result = item; }
    }
    return result;
  }

  function moveToward(actor, x, y, speed, dt) {
    const dx = x - actor.x, dy = y - actor.y;
    const length = Math.hypot(dx, dy);
    if (length > 1) {
      actor.x += dx / length * speed * dt;
      actor.y += dy / length * speed * dt;
    }
    actor.x = clamp(actor.x, 12, W - 12);
    actor.y = clamp(actor.y, 84, H - 12);
  }

  function addBullet(x, y, targetX, targetY, owner, targetType, damage) {
    const angle = Math.atan2(targetY - y, targetX - x);
    bullets.push({
      x, y,
      vx: Math.cos(angle) * (owner === "peer" ? 360 : 440),
      vy: Math.sin(angle) * (owner === "peer" ? 360 : 440),
      life: 1.35, owner, targetType, damage
    });
  }

  function shootAt(actor, target, targetType) {
    if (!target) return;
    addBullet(actor.x, actor.y, target.x, target.y, "local", targetType, 25);
  }

  function getRemote() {
    if (!onlineMode || !net()) return null;
    return net().getRemoteState();
  }

  function updateHud() {
    if (!player) return;
    $("hp").textContent = String(Math.ceil(player.hp));
    $("healthFill").style.width = clamp(player.hp, 0, 100) + "%";
    $("level").textContent = onlineMode ? "ONLINE DUEL" : "WAVE " + wave + "/" + MAX_WAVE;
    $("kills").textContent = "KILLS " + kills;
    $("squad").textContent = "SQUAD " + team.filter(s => s.hp > 0).length + "/5";
    $("mission").textContent = onlineMode
      ? (getRemote() ? "DUEL — DEFEAT YOUR RIVAL" : "WAITING FOR RIVAL SIGNAL")
      : "MISSION: " + enemies.length + " ENEMIES REMAIN";
  }

  function finish(won) {
    if (mode !== "playing") return;
    mode = "result";
    clearInput();
    if (onlineMode && net()) {
      net().sendGameState({ x: player.x / W, y: player.y / H, hp: player.hp, firing: false });
    }
    showGameUI(false);
    $("result").classList.remove("hidden");
    $("resultTitle").textContent = onlineMode
      ? (won ? "DUEL VICTORY" : "DUEL DEFEAT")
      : (won ? (wave === MAX_WAVE ? "CAMPAIGN COMPLETE" : "WAVE " + wave + " CLEARED") : "MISSION FAILED");
    $("resultText").textContent = onlineMode
      ? (won ? "Your rival has been defeated." : "Your commander has been defeated.") + " Total eliminations: " + kills + "."
      : (won ? "Excellent work, commander. Your squad survived this wave." : "Your commander was defeated.") + " Total kills: " + kills + ".";
    $("nextBtn").classList.toggle("hidden", onlineMode || !won || wave >= MAX_WAVE);
  }

  function update(dt) {
    if (mode !== "playing" || !player) return;

    const dx = ((keys.arrowright || keys.d || touch.right) ? 1 : 0) -
               ((keys.arrowleft || keys.a || touch.left) ? 1 : 0);
    const dy = ((keys.arrowdown || keys.s || touch.down) ? 1 : 0) -
               ((keys.arrowup || keys.w || touch.up) ? 1 : 0);
    const magnitude = Math.hypot(dx, dy) || 1;
    player.x = clamp(player.x + dx / magnitude * 190 * dt, 12, W - 12);
    player.y = clamp(player.y + dy / magnitude * 190 * dt, 88, H - 12);

    for (let i = 0; i < team.length; i++) {
      const soldier = team[i];
      if (soldier.hp <= 0) continue;
      const angle = i * Math.PI * 2 / 5;
      const tx = player.x + Math.cos(angle) * 48;
      const ty = player.y + Math.sin(angle) * 48;
      if (Math.hypot(tx - soldier.x, ty - soldier.y) > 12) {
        moveToward(soldier, tx, ty, 150, dt);
      }
      soldier.cooldown -= dt;
      const enemy = nearest(soldier.x, soldier.y, enemies);
      if (enemy && Math.hypot(enemy.x - soldier.x, enemy.y - soldier.y) < 360 && soldier.cooldown <= 0) {
        shootAt(soldier, enemy, "enemy");
        soldier.cooldown = 0.62;
      }
    }

    const remote = getRemote();
    const remotePoint = remote ? { x: clamp(remote.x, 0, 1) * W, y: clamp(remote.y, 0, 1) * H } : null;

    player.cooldown -= dt;
    if (firing && player.cooldown <= 0) {
      const enemy = nearest(player.x, player.y, enemies);
      if (onlineMode && remotePoint) {
        const enemyDistance = enemy ? Math.hypot(enemy.x - player.x, enemy.y - player.y) : Infinity;
        const peerDistance = Math.hypot(remotePoint.x - player.x, remotePoint.y - player.y);
        if (peerDistance < enemyDistance) shootAt(player, remotePoint, "peer");
        else if (enemy) shootAt(player, enemy, "enemy");
      } else if (enemy) {
        shootAt(player, enemy, "enemy");
      }
      player.cooldown = 0.17;
    }

    if (onlineMode && remotePoint && remote && remote.firing && peerShotTimer <= 0) {
      addBullet(remotePoint.x, remotePoint.y, player.x, player.y, "peer", "local", 12);
      peerShotTimer = 0.28;
    }
    peerShotTimer = Math.max(0, peerShotTimer - dt);

    for (const enemy of enemies) {
      const targets = [player, ...team.filter(s => s.hp > 0)];
      const target = nearest(enemy.x, enemy.y, targets);
      if (target) moveToward(enemy, target.x, target.y, enemy.speed, dt);
      enemy.cooldown -= dt;
      if (target && Math.hypot(target.x - enemy.x, target.y - enemy.y) < enemy.size + 16 && enemy.cooldown <= 0) {
        target.hp = Math.max(0, target.hp - (enemy.boss ? 18 : 8));
        enemy.cooldown = enemy.boss ? 0.65 : 0.85;
      }
    }

    for (const bullet of bullets) {
      bullet.x += bullet.vx * dt;
      bullet.y += bullet.vy * dt;
      bullet.life -= dt;

      if (bullet.owner === "peer") {
        if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < 16) {
          player.hp = Math.max(0, player.hp - bullet.damage);
          bullet.life = 0;
        }
        continue;
      }

      if (bullet.targetType === "peer" && remotePoint) {
        if (Math.hypot(remotePoint.x - bullet.x, remotePoint.y - bullet.y) < 19) {
          if (net()) net().sendHit(bullet.damage);
          bullet.life = 0;
        }
      } else {
        const enemy = nearest(bullet.x, bullet.y, enemies);
        if (enemy && Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < enemy.size + 5) {
          enemy.hp -= bullet.damage;
          bullet.life = 0;
        }
      }
    }

    bullets = bullets.filter(b => b.life > 0 && b.x > -24 && b.x < W + 24 && b.y > -24 && b.y < H + 24);
    const before = enemies.length;
    enemies = enemies.filter(enemy => enemy.hp > 0);
    kills += before - enemies.length;

    if (onlineMode && remote && remote.hp <= 0) {
      finish(true);
      return;
    }
    if (player.hp <= 0) {
      player.hp = 0;
      finish(false);
      return;
    }
    if (!onlineMode && enemies.length === 0) {
      finish(true);
      return;
    }

    hudTimer -= dt;
    if (hudTimer <= 0) {
      updateHud();
      hudTimer = 0.12;
    }

    if (onlineMode && net()) {
      sendTimer -= dt;
      if (sendTimer <= 0) {
        net().sendGameState({
          x: player.x / W,
          y: player.y / H,
          hp: player.hp,
          firing: !!firing
        });
        sendTimer = (window.SAVASH_CONFIG && window.SAVASH_CONFIG.stateIntervalMs || 100) / 1000;
      }
    }
  }

  function drawSoldier(actor, color, scale = 1) {
    ctx.save();
    ctx.translate(actor.x, actor.y);
    ctx.scale(scale, scale);
    ctx.fillStyle = "#17212a";
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = color;
    ctx.fillRect(-8, -4, 16, 18);
    ctx.fillStyle = "#d8b28a";
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#222";
    ctx.fillRect(4, 2, 18, 3);
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    if (background.complete && background.naturalWidth) {
      const scale = Math.max(W / background.width, H / background.height);
      const sourceW = W / scale, sourceH = H / scale;
      ctx.globalAlpha = 0.58;
      ctx.drawImage(
        background,
        (background.width - sourceW) / 2,
        (background.height - sourceH) / 2,
        sourceW, sourceH, 0, 0, W, H
      );
      ctx.globalAlpha = 1;
    } else {
      const gradient = ctx.createLinearGradient(0, 0, W, H);
      gradient.addColorStop(0, "#68764a");
      gradient.addColorStop(1, "#293d2d");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, W, H);
    }

    ctx.fillStyle = "#15251c66";
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = "#ffffff12";
    for (let x = 0; x < W; x += 48) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 48) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    if (!player) return;
    team.forEach(soldier => {
      if (soldier.hp > 0) drawSoldier(soldier, "#4e9a54", 0.86);
    });
    drawSoldier(player, "#2f75c8", 1.2);

    enemies.forEach(enemy => {
      drawSoldier(enemy, enemy.boss ? "#711b25" : "#a93636", enemy.boss ? 1.45 : 1);
      ctx.fillStyle = "#111";
      ctx.fillRect(enemy.x - 15, enemy.y - 27, 30, 4);
      ctx.fillStyle = enemy.boss ? "#ffb13b" : "#ef4444";
      ctx.fillRect(enemy.x - 15, enemy.y - 27, 30 * clamp(enemy.hp / enemy.maxHp, 0, 1), 4);
      if (enemy.boss) {
        ctx.fillStyle = "#fff";
        ctx.font = "bold 10px Arial";
        ctx.textAlign = "center";
        ctx.fillText("BOSS", enemy.x, enemy.y - 34);
      }
    });

    const remote = getRemote();
    if (onlineMode && remote) {
      const rival = { x: clamp(remote.x, 0, 1) * W, y: clamp(remote.y, 0, 1) * H };
      drawSoldier(rival, "#e4b64f", 1.2);
      ctx.fillStyle = "#101820";
      ctx.fillRect(rival.x - 19, rival.y - 31, 38, 5);
      ctx.fillStyle = "#e4b64f";
      ctx.fillRect(rival.x - 19, rival.y - 31, 38 * clamp(remote.hp / 100, 0, 1), 5);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 10px Arial";
      ctx.textAlign = "center";
      ctx.fillText("RIVAL", rival.x, rival.y - 38);
    }

    bullets.forEach(bullet => {
      ctx.fillStyle = bullet.owner === "peer" ? "#ff9b9b" : "#ffe066";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function pauseGame() {
    if (mode !== "playing") return;
    mode = "paused";
    firing = false;
    if (onlineMode && net()) net().sendGameState({ x: player.x / W, y: player.y / H, hp: player.hp, firing: false });
    $("pause").classList.remove("hidden");
  }

  function frame(timestamp) {
    const dt = Math.min(0.04, (timestamp - lastFrame) / 1000 || 0);
    lastFrame = timestamp;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  $("startBtn").addEventListener("click", startCampaign);
  $("howBtn").addEventListener("click", () => $("how").classList.remove("hidden"));
  $("backBtn").addEventListener("click", () => $("how").classList.add("hidden"));
  $("pauseBtn").addEventListener("click", pauseGame);
  $("resumeBtn").addEventListener("click", () => {
    $("pause").classList.add("hidden");
    mode = "playing";
  });
  $("quitBtn").addEventListener("click", mainMenu);
  $("menuBtn").addEventListener("click", mainMenu);
  $("nextBtn").addEventListener("click", () => {
    if (!onlineMode && wave < MAX_WAVE) {
      wave++;
      beginWave();
    }
  });

  window.addEventListener("savash:start-online", startOnlineDuel);
  window.addEventListener("savash:peer-hit", event => {
    if (onlineMode && mode === "playing" && player) {
      const damage = clamp(Number(event.detail && event.detail.damage) || 0, 0, 40);
      player.hp = Math.max(0, player.hp - damage);
      updateHud();
    }
  });

  document.querySelectorAll("#pad button").forEach(button => {
    const direction = button.dataset.d;
    button.addEventListener("pointerdown", event => {
      event.preventDefault();
      touch[direction] = true;
      try { button.setPointerCapture(event.pointerId); } catch (_) {}
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
      button.addEventListener(type, () => { touch[direction] = false; });
    });
  });

  $("fire").addEventListener("pointerdown", event => {
    event.preventDefault();
    firing = true;
    try { $("fire").setPointerCapture(event.pointerId); } catch (_) {}
  });
  ["pointerup", "pointercancel", "lostpointercapture"].forEach(type => {
    $("fire").addEventListener(type, () => { firing = false; });
  });

  window.addEventListener("keydown", event => {
    const key = event.key.toLowerCase();
    keys[key] = true;
    if (key.startsWith("arrow") || key === " ") event.preventDefault();
    if (key === "escape" && mode === "playing") pauseGame();
  });
  window.addEventListener("keyup", event => { keys[event.key.toLowerCase()] = false; });
  window.addEventListener("blur", clearInput);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && mode === "playing") pauseGame();
  });
  canvas.addEventListener("contextmenu", event => event.preventDefault());
  window.addEventListener("resize", resize);

  resize();
  mainMenu();
  requestAnimationFrame(frame);
})();