class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('mainmenu');
  }

  preload() {
    this.load.image('menuBg', 'assets/images/lCk9cg.png');
    this.load.audio('bgMusic', 'assets/Music/pixeltown-color-parade-main-version-41716-01-53.mp3');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

    if (!this.game.bgMusic) {
      this.game.bgMusic = this.sound.add('bgMusic', {
        loop: true,
        volume: 0.5,
      });
    }

    if (!this.game.bgMusic.isPlaying) {
      const startMusic = () => {
        if (!this.game.bgMusic.isPlaying) {
          this.game.bgMusic.play();
        }
      };

      if (this.sound.locked) {
        this.sound.once('unlocked', startMusic);
      } else {
        startMusic();
      }
    }

    // Background image for the menu.
    this.add.image(0, 0, 'menuBg').setOrigin(0).setDisplaySize(this.scale.width, this.scale.height);

    this.add.text(centerX, 60, 'Cat Attack', { fontSize: '18px', color: '#ffffff' }).setOrigin(0.5);

    const makeButton = (y, label, sceneKey) => {
      const btn = this.add.rectangle(centerX, y, 140, 26, 0xD2B48C).setOrigin(0.5).setInteractive({ useHandCursor: true });
      const txt = this.add.text(centerX, y, label, { fontSize: '12px', color: '#000000' }).setOrigin(0.5);
      btn.on('pointerover', () => btn.setFillStyle(0xC2A57A));
      btn.on('pointerout', () => btn.setFillStyle(0xD2B48C));
      btn.on('pointerdown', () => this.scene.start(sceneKey));
      return { btn, txt };
    };

    makeButton(centerY - 20, 'Level 1', 'level1');
    makeButton(centerY + 10, 'Level 2', 'level2');
    makeButton(centerY + 40, 'Level 3', 'Level3');
  }
}

class Level1Scene extends Phaser.Scene {
  constructor(sceneKey = 'level1', bestTimeStorageKey = 'mouseCheeseBestTime', nextSceneKey = 'level2') {
    super(sceneKey);
    this.bestTimeStorageKey = bestTimeStorageKey;
    this.nextSceneKey = nextSceneKey;
    this.resetLevelState();
  }

  resetLevelState() {
    this.score = 0;
    this.health = 100;
    this.levelTime = 60;
    this.levelWon = false;
    this.levelLost = false;
    this.lastHitAt = 0;
    this.playerMoving = false;
    this.playerHitAnimating = false;
    this.playerHitTween = null;
  }

  init() {
    this.resetLevelState();
  }

  preload() {
    this.load.tilemapTiledJSON('level1', 'assets/map/level1.json');
    this.load.image('floorsWalls', 'assets/images/TopDownHouse_FloorsAndWalls.png');
    this.load.image('furniture2', 'assets/images/TopDownHouse_FurnitureState2.png');
    this.load.image('furniture1', 'assets/images/TopDownHouse_FurnitureState1.png');
    this.load.spritesheet('smallItems', 'assets/images/TopDownHouse_SmallItems.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('cat', 'assets/images/JumpCatttt.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('mouse', 'assets/images/MouseSpritesheet.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('cheese', 'assets/images/maasdam.png');
    this.load.image('healthpanel', 'assets/images/HealthBarPanel_160x41.png');
    this.load.image('valuebar', 'assets/images/ValueBar_128x16.png');
    this.load.image('valuered', 'assets/images/ValueRed_120x8.png');
    this.load.spritesheet('hearts', 'assets/images/HeartIcons_32x32.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    const map = this.make.tilemap({ key: 'level1' });

    const tsFloors = map.addTilesetImage('TopDownHouse_FloorsAndWalls', 'floorsWalls');
    const tsF2 = map.addTilesetImage('TopDownHouse_FurnitureState2', 'furniture2');
    const tsF1 = map.addTilesetImage('TopDownHouse_FurnitureState1', 'furniture1');
    const tsItems = map.addTilesetImage('TopDownHouse_SmallItems', 'smallItems');

    this.groundLayer = map.createLayer('Ground', [tsFloors, tsF2, tsF1, tsItems]);
    this.rugsLayer = map.getLayer('Rugs') ? map.createLayer('Rugs', [tsFloors, tsF2, tsF1, tsItems]) : null;
    this.decorLayer = map.createLayer('Decorations', [tsFloors, tsF2, tsF1, tsItems]);

    this.groundLayer.forEachTile((tile) => {
      if (!tile || tile.index < 0) return;
      if (tile.y < 10) tile.setCollision(true);
    });

    // Decorations are solid: collide on every non-empty decoration tile.
    this.decorLayer.forEachTile((tile) => {
      if (!tile || tile.index <= 0) return;
      tile.setCollision(true);
    });

    const objectLayers = map.objects || [];
    const spawnLayer = objectLayers.find((l) => /player\s*spawn/i.test(l.name || ''));
    const spawnObj = spawnLayer?.objects?.[0] || null;

    const fallbackX = 32;
    const fallbackY = map.heightInPixels - 32;

    // Tiled object coordinates are already in world space for this map.
    const spawnX = spawnObj ? (spawnObj.x + (spawnObj.width || 0) / 2) : fallbackX;
    const spawnY = spawnObj ? (spawnObj.y - (spawnObj.height || 0) / 2) : fallbackY;

    this.player = this.physics.add.sprite(spawnX, spawnY, 'mouse', 13);
    this.player.setScale(1.0);
    this.player.setDepth(900);
    this.player.setVisible(true);
    this.player.body.setSize(10, 12);
    this.player.body.setOffset(3, 2);
    this.player.setCollideWorldBounds(true);

    if (!this.anims.exists('mouse-walk')) {
      this.anims.create({
        key: 'mouse-walk',
        frames: [{ key: 'mouse', frame: 13 }, { key: 'mouse', frame: 16 }, { key: 'mouse', frame: 19 }, { key: 'mouse', frame: 22 }],
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists('cat-run')) {
      this.anims.create({
        key: 'cat-run',
        frames: this.anims.generateFrameNumbers('cat', { start: 0, end: 12 }),
        frameRate: 12,
        repeat: -1,
      });
    }

    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.decorLayer);

    this.coins = this.physics.add.group();
    const coinObjects = map.getObjectLayer('Coins')?.objects || [];
    for (const obj of coinObjects) {
      const coin = this.coins.create(obj.x + (obj.width || 16) / 2, obj.y - (obj.height || 16) / 2, 'smallItems', 4);
      coin.body.setSize(12, 12);
      coin.body.setOffset(2, 2);
      const coinProp = obj.properties?.find((p) => p.name === 'coin');
      coin.setData('value', coinProp?.value ?? 20);
    }

    const cheeseObj = map.getObjectLayer('Cheese')?.objects?.[0];
    const cheeseX = cheeseObj ? cheeseObj.x + (cheeseObj.width || 16) / 2 : map.widthInPixels - 24;
    const cheeseY = cheeseObj ? cheeseObj.y - (cheeseObj.height || 16) / 2 : map.heightInPixels - 24;
    this.cheese = this.physics.add.staticSprite(cheeseX, cheeseY, 'cheese');

    this.enemies = this.physics.add.group();
    const enemyObjects = map.getObjectLayer('Enemy')?.objects || [];
    for (const obj of enemyObjects) {
      const enemy = this.enemies.create(obj.x + (obj.width || 32) / 2, obj.y - (obj.height || 32) / 2, 'cat', 0);
      enemy.anims.play('cat-run', true);
      enemy.setData('speed', 25);
      enemy.body.setSize(20, 16);
      enemy.body.setOffset(6, 12);
    }

    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.collider(this.enemies, this.decorLayer);

    this.physics.add.overlap(this.player, this.coins, (_, coin) => {
      this.score += coin.getData('value');
      coin.destroy();
      this.updateUi();
    });

    this.physics.add.overlap(this.player, this.enemies, () => this.onEnemyHit());
    this.physics.add.overlap(this.player, this.cheese, () => this.onWin());

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    const viewW = this.scale.width;
    const viewH = this.scale.height;

    this.healthBarBg = this.add.image(70, 20, 'valuebar').setScrollFactor(0).setDepth(1001).setScale(0.5);
    this.healthBar = this.add.image(38, 20, 'valuered').setScrollFactor(0).setDepth(1002).setScale(1).setOrigin(0, 0.5);
    this.healthBar.setCrop(0, 0, 64 * (this.health / 100), 8);
    this.heartIcon = this.add.image(16, 20, 'hearts', 0).setScrollFactor(0).setDepth(1000).setScale(1);

    this.ui = this.add.text(210, 6, '', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    this.status = this.add.text(viewW * 0.5, viewH * 0.5, 'WASD / Arrow keys to move', {
      fontSize: '9px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 5 },
      align: 'center',
      wordWrap: { width: Math.max(220, viewW - 80), useAdvancedWrap: true },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.retryButton = this.add.text(viewW * 0.5, viewH * 0.5 + 40, 'Retry', {
      fontSize: '10px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

    this.menuButton = this.add.text(viewW * 0.5, viewH * 0.5 + 70, 'Main Menu', {
      fontSize: '10px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

    this.nextLevelButton = this.add.text(viewW * 0.5, viewH * 0.5 + 100, 'Next Level', {
      fontSize: '10px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

    this.retryButton.on('pointerdown', () => this.scene.restart());
    this.menuButton.on('pointerdown', () => this.scene.start('mainmenu'));
    this.nextLevelButton.on('pointerdown', () => {
      if (this.nextSceneKey) this.scene.start(this.nextSceneKey);
    });

    this.time.delayedCall(2400, () => {
      if (!this.levelWon && !this.levelLost) {
        this.status.setText('');
        this.status.setVisible(false);
      }
    });

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.levelWon || this.levelLost) return;
        this.levelTime -= 1;
        if (this.levelTime <= 0) {
          this.levelTime = 0;
          this.onLose('Time up');
        }
        this.updateUi();
      },
    });

    this.updateUi();
  }

  update() {
    if (this.levelWon || this.levelLost) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      return;
    }

    for (const enemy of this.enemies.getChildren()) {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const speed = enemy.getData('speed');
        enemy.setVelocityX((dx / dist) * speed);
        enemy.setVelocityY((dy / dist) * speed);
        enemy.setFlipX(dx < 0);
        enemy.anims.play('cat-run', true);
      } else {
        enemy.setVelocity(0, 0);
        enemy.anims.stop();
        enemy.setFrame(0);
      }
    }

    const speed = 95;
    let vx = 0;
    let vy = 0;

    if (this.keys.left.isDown || this.keys.leftArrow.isDown) vx = -speed;
    else if (this.keys.right.isDown || this.keys.rightArrow.isDown) vx = speed;

    if (this.keys.up.isDown || this.keys.upArrow.isDown) vy = -speed;
    else if (this.keys.down.isDown || this.keys.downArrow.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
      const k = Math.SQRT1_2;
      vx *= k;
      vy *= k;
    }

    this.player.setVelocity(vx, vy);
    this.playerMoving = (vx !== 0 || vy !== 0);

    if (vx !== 0 || vy !== 0) {
      this.player.anims.play('mouse-walk', true);
      if (vx < 0) this.player.setFlipX(true);
      if (vx > 0) this.player.setFlipX(false);
    } else {
      this.player.anims.stop();
      this.player.setFrame(13);
    }
  }

  onEnemyHit() {
    const now = this.time.now;
    if (now - this.lastHitAt < 800 || this.levelWon || this.levelLost) return;

    this.lastHitAt = now;
    this.health -= 20;
    this.score = Math.max(0, this.score - 15);
    this.cameras.main.shake(120, 0.003);
    this.playPlayerHitAnimation();

    if (this.health <= 0) {
      this.health = 0;
      this.onLose('Health depleted');
    }

    this.updateUi();
  }

  playPlayerHitAnimation() {
    if (!this.player) return;

    this.player.setTint(0xffcdd2);
    this.playerHitAnimating = true;

    if (this.playerHitTween) {
      this.playerHitTween.stop();
    }

    this.playerHitTween = this.tweens.add({
      targets: this.player,
      angle: { from: -12, to: 12 },
      duration: 70,
      yoyo: true,
      repeat: 3,
      onComplete: () => {
        if (this.player?.active) {
          this.player.angle = 0;
          this.player.clearTint();
        }
        this.playerHitAnimating = false;
        this.playerHitTween = null;
      },
    });

    this.time.delayedCall(350, () => {
      if (this.player?.active) {
        this.player.clearTint();
      }
    });
  }

  onWin() {
    if (this.levelWon || this.levelLost) return;
    this.levelWon = true;
    if (this.cheese?.disableBody) {
      this.cheese.disableBody(true, true);
    } else if (this.cheese) {
      if (this.cheese.body) this.cheese.body.enable = false;
      this.cheese.destroy();
      this.cheese = null;
    }
    const elapsed = 60 - this.levelTime;
    const best = Number(localStorage.getItem(this.bestTimeStorageKey) || '9999');
    if (elapsed < best) localStorage.setItem(this.bestTimeStorageKey, String(elapsed));
    const newBest = Math.min(elapsed, best);

    this.status.setVisible(true);
    this.status.setText(`You got the cheese! Score: ${this.score} Time: ${elapsed}s Best: ${newBest}s`);
    this.retryButton.setVisible(true);
    this.menuButton.setVisible(true);
    this.nextLevelButton.setVisible(Boolean(this.nextSceneKey));
  }

  onLose(reason) {
    if (this.levelWon || this.levelLost) return;
    this.levelLost = true;

    this.status.setVisible(true);
    this.status.setText(`You lost: ${reason} Score: ${this.score}`);
    this.retryButton.setVisible(true);
    this.menuButton.setVisible(true);
    this.nextLevelButton.setVisible(false);
  }

  updateUi() {
    this.healthBar.setCrop(0, 0, 64 * (this.health / 100), 8);
    const best = Number(localStorage.getItem(this.bestTimeStorageKey) || '0');
    const bestText = best > 0 && best < 9999 ? `${best}s` : '-';
    this.ui.setText(`Score: ${this.score}   Time: ${this.levelTime}s   Best: ${bestText}`);
  }
}

class Level2Scene extends Level1Scene {
  constructor() {
    super('level2', 'mouseCheeseBestTimeLevel2', 'Level3');
  }

  preload() {
    this.load.tilemapTiledJSON('level2', 'assets/map/level2_176.tmj');
    this.load.image('level2FloorsWalls', 'assets/images/TopDownHouse_FloorsAndWalls.png');
    this.load.image('level2Furniture2', 'assets/images/TopDownHouse_FurnitureState2.png');
    this.load.image('level2Furniture1', 'assets/images/TopDownHouse_FurnitureState1.png');
    this.load.spritesheet('level2SmallItems', 'assets/images/TopDownHouse_SmallItems.png', { frameWidth: 16, frameHeight: 16 });
    this.load.spritesheet('level2Cat', 'assets/images/Idle2Cattt.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('level2CatIdle', 'assets/images/IdleCatt.png', { frameWidth: 32, frameHeight: 32 });
    this.load.spritesheet('level2Mouse', 'assets/images/MouseSpritesheet.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('cheese', 'assets/images/maasdam.png');
    this.load.image('healthpanel', 'assets/images/HealthBarPanel_160x41.png');
    this.load.image('valuebar', 'assets/images/ValueBar_128x16.png');
    this.load.image('valuered', 'assets/images/ValueRed_120x8.png');
    this.load.spritesheet('hearts', 'assets/images/HeartIcons_32x32.png', { frameWidth: 32, frameHeight: 32 });
  }

  create() {
    const map = this.make.tilemap({ key: 'level2' });

    const tsFloors = map.addTilesetImage('FloorsAndWalls', 'level2FloorsWalls');
    const tsF2 = map.addTilesetImage('FurnitureState2', 'level2Furniture2');
    const tsF1 = map.addTilesetImage('FurnitureState1', 'level2Furniture1');
    const tsItems = map.addTilesetImage('TopDownHouse_SmallItems', 'level2SmallItems');
    const tilesets = [tsFloors, tsF2, tsF1, tsItems].filter(Boolean);

    this.groundLayer = map.createLayer('Ground', tilesets);
    this.rugsLayer = map.getLayer('Rugs') ? map.createLayer('Rugs', tilesets) : null;
    this.decorLayer = map.createLayer('Decorations', tilesets);

    this.groundLayer.forEachTile((tile) => {
      if (!tile || tile.index < 0) return;
      if (tile.y < 8) tile.setCollision(true);
    });

    this.decorLayer.forEachTile((tile) => {
      if (!tile || tile.index <= 0) return;
      const gid = tile.index & 0x1FFFFFFF;
      if (gid === 1079) return;

      const isFurnitureTile = (gid >= 29 && gid <= 496);
      const isWallTile = (gid >= 821 && gid <= 982);
      const isSmallItemTile = (gid >= 1075 && gid <= 1138);

      if (isFurnitureTile || isWallTile || isSmallItemTile) {
        tile.setCollision(true);
      }
    });

    const obstacleObjects = map.getObjectLayer('Obstacles')?.objects || [];
    this.obstacles = this.physics.add.staticGroup();
    for (const obj of obstacleObjects) {
      const width = Math.max(10, (obj.width || 0) * 0.8);
      const height = Math.max(10, (obj.height || 0) * 0.8);
      const obstacle = this.add.zone(
        obj.x + (obj.width || 0) / 2,
        obj.y - (obj.height || 0) / 2,
        width,
        height,
      );
      this.physics.add.existing(obstacle, true);
      this.obstacles.add(obstacle);
      obstacle.body.setSize(width, height);
    }

    const objectLayers = map.objects || [];
    const spawnLayer = objectLayers.find((l) => /player\s*spawn/i.test(l.name || ''));
    const spawnObj = spawnLayer?.objects?.[0] || null;

    const fallbackX = 32;
    const fallbackY = map.heightInPixels - 32;
    const spawnX = spawnObj ? (spawnObj.x + (spawnObj.width || 0) / 2) : fallbackX;
    const spawnY = spawnObj ? (spawnObj.y - (spawnObj.height || 0) / 2) : fallbackY;

    this.player = this.physics.add.sprite(spawnX, spawnY, 'level2Mouse', 13);
    this.player.setScale(1.0);
    this.player.setDepth(900);
    this.player.setVisible(true);
    this.player.body.setSize(10, 12);
    this.player.body.setOffset(3, 2);
    this.player.setCollideWorldBounds(true);

    if (!this.anims.exists('level2-mouse-walk')) {
      this.anims.create({
        key: 'level2-mouse-walk',
        frames: [{ key: 'level2Mouse', frame: 13 }, { key: 'level2Mouse', frame: 16 }, { key: 'level2Mouse', frame: 19 }, { key: 'level2Mouse', frame: 22 }],
        frameRate: 10,
        repeat: -1,
      });
    }

    if (!this.anims.exists('level2-cat-run')) {
      this.anims.create({
        key: 'level2-cat-run',
        frames: this.anims.generateFrameNumbers('level2Cat', { start: 0, end: 13 }),
        frameRate: 10,
        repeat: -1,
      });
    }

    this.physics.add.collider(this.player, this.groundLayer);
    this.physics.add.collider(this.player, this.decorLayer);

    this.coins = [];
    const duckTiles = [];
    this.decorLayer.forEachTile((tile) => {
      if (tile && tile.index === 1079) duckTiles.push(tile);
    });
    const coinObjects = map.getObjectLayer('Coins')?.objects || [];
    for (const obj of coinObjects) {
      const coinX = obj.x + (obj.width || 16) / 2;
      const coinY = obj.y - (obj.height || 16) / 2;
      let duckTile = null;
      let duckTileIndex = -1;
      let bestDistSq = Number.POSITIVE_INFINITY;
      for (let i = 0; i < duckTiles.length; i += 1) {
        const tile = duckTiles[i];
        const tileCenterX = tile.getCenterX();
        const tileCenterY = tile.getCenterY();
        const dx = coinX - tileCenterX;
        const dy = coinY - tileCenterY;
        const distSq = (dx * dx) + (dy * dy);
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          duckTile = tile;
          duckTileIndex = i;
        }
      }
      if (duckTileIndex >= 0) duckTiles.splice(duckTileIndex, 1);

      const pickupX = duckTile ? duckTile.getCenterX() : coinX;
      const pickupY = duckTile ? duckTile.getCenterY() : coinY;
      const pickupZone = this.add.zone(
        pickupX,
        pickupY,
        14,
        14,
      );
      this.physics.add.existing(pickupZone);
      pickupZone.setData('duckTileX', duckTile?.x ?? null);
      pickupZone.setData('duckTileY', duckTile?.y ?? null);
      pickupZone.setData('value', 20);
      this.coins.push(pickupZone);

      this.physics.add.overlap(this.player, pickupZone, (_, touchedZone) => {
        if (!touchedZone.active) return;
        this.score += touchedZone.getData('value');
        const duckTileX = touchedZone.getData('duckTileX');
        const duckTileY = touchedZone.getData('duckTileY');
        if (touchedZone.body) touchedZone.body.enable = false;
        touchedZone.destroy();
        if (duckTileX !== null && duckTileY !== null) {
          this.decorLayer.removeTileAt(duckTileX, duckTileY, true, true);
        }
        this.updateUi();
      });
    }

    const cheeseObj = map.getObjectLayer('Cheese')?.objects?.[0];
    const cheeseX = cheeseObj ? cheeseObj.x + (cheeseObj.width || 16) / 2 : map.widthInPixels - 24;
    const cheeseY = cheeseObj ? cheeseObj.y - (cheeseObj.height || 16) / 2 : map.heightInPixels - 24;
    const cheeseTileLeft = map.worldToTileX(cheeseX - 12);
    const cheeseTileRight = map.worldToTileX(cheeseX + 12);
    const cheeseTileTop = map.worldToTileY(cheeseY - 12);
    const cheeseTileBottom = map.worldToTileY(cheeseY + 12);
    for (let tileY = cheeseTileTop; tileY <= cheeseTileBottom; tileY += 1) {
      for (let tileX = cheeseTileLeft; tileX <= cheeseTileRight; tileX += 1) {
        const tile = this.decorLayer.getTileAt(tileX, tileY);
        if (tile) tile.setCollision(false);
      }
    }
    this.cheese = this.physics.add.staticSprite(cheeseX, cheeseY, 'cheese');
    this.cheese.body.setSize(Math.max(12, cheeseObj?.width || 16), Math.max(12, cheeseObj?.height || 16));

    this.enemies = this.physics.add.group();
    const enemyObjects = map.getObjectLayer('Enemy')?.objects || [];
    for (const obj of enemyObjects) {
      const enemy = this.enemies.create(obj.x + (obj.width || 32) / 2, obj.y - (obj.height || 32) / 2, 'level2Cat', 0);
      enemy.anims.play('level2-cat-run', true);
      enemy.setData('speed', 25);
      enemy.body.setSize(20, 16);
      enemy.body.setOffset(6, 12);
    }

    this.physics.add.collider(this.enemies, this.groundLayer);
    this.physics.add.collider(this.enemies, this.obstacles);

    this.physics.add.overlap(this.player, this.enemies, () => this.onEnemyHit());
    this.physics.add.overlap(this.player, this.cheese, () => this.onWin());

    this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
    this.cameras.main.stopFollow();
    this.cameras.main.setZoom(1);

    this.physics.world.setBounds(0, 0, map.widthInPixels, map.heightInPixels);

    this.keys = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      upArrow: Phaser.Input.Keyboard.KeyCodes.UP,
      downArrow: Phaser.Input.Keyboard.KeyCodes.DOWN,
      leftArrow: Phaser.Input.Keyboard.KeyCodes.LEFT,
      rightArrow: Phaser.Input.Keyboard.KeyCodes.RIGHT,
    });

    const viewW = this.scale.width;
    const viewH = this.scale.height;

    this.healthBarBg = this.add.image(70, 20, 'valuebar').setScrollFactor(0).setDepth(1001).setScale(0.5);
    this.healthBar = this.add.image(38, 20, 'valuered').setScrollFactor(0).setDepth(1002).setScale(1).setOrigin(0, 0.5);
    this.healthBar.setCrop(0, 0, 64 * (this.health / 100), 8);
    this.heartIcon = this.add.image(16, 20, 'hearts', 0).setScrollFactor(0).setDepth(1000).setScale(1);

    this.ui = this.add.text(210, 6, '', {
      fontSize: '10px',
      color: '#ffffff',
      backgroundColor: '#00000088',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

    this.status = this.add.text(viewW * 0.5, viewH * 0.5, 'WASD / Arrow keys to move', {
      fontSize: '9px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 6, y: 5 },
      align: 'center',
      wordWrap: { width: Math.max(220, viewW - 80), useAdvancedWrap: true },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

    this.retryButton = this.add.text(viewW * 0.5, viewH * 0.5 + 40, 'Retry', {
      fontSize: '10px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

    this.menuButton = this.add.text(viewW * 0.5, viewH * 0.5 + 70, 'Main Menu', {
      fontSize: '10px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

    this.nextLevelButton = this.add.text(viewW * 0.5, viewH * 0.5 + 100, 'Next Level', {
      fontSize: '10px',
      color: '#ffe082',
      backgroundColor: '#000000aa',
      padding: { x: 5, y: 3 },
      align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

    this.retryButton.on('pointerdown', () => this.scene.restart());
    this.menuButton.on('pointerdown', () => this.scene.start('mainmenu'));
    this.nextLevelButton.on('pointerdown', () => this.scene.start('Level3'));

    this.time.delayedCall(2400, () => {
      if (!this.levelWon && !this.levelLost) {
        this.status.setText('');
        this.status.setVisible(false);
      }
    });

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        if (this.levelWon || this.levelLost) return;
        this.levelTime -= 1;
        if (this.levelTime <= 0) {
          this.levelTime = 0;
          this.onLose('Time up');
        }
        this.updateUi();
      },
    });

    this.updateUi();
  }

  update() {
    if (this.levelWon || this.levelLost) {
      this.player.setVelocity(0, 0);
      this.player.anims.stop();
      return;
    }

    for (const enemy of this.enemies.getChildren()) {
      const dx = this.player.x - enemy.x;
      const dy = this.player.y - enemy.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const speed = enemy.getData('speed');
        enemy.setVelocityX((dx / dist) * speed);
        enemy.setVelocityY((dy / dist) * speed);
        enemy.setFlipX(dx < 0);
        enemy.anims.play('level2-cat-run', true);
      } else {
        enemy.setVelocity(0, 0);
        enemy.anims.stop();
        enemy.setFrame(0);
      }
    }

    const speed = 95;
    let vx = 0;
    let vy = 0;

    if (this.keys.left.isDown || this.keys.leftArrow.isDown) vx = -speed;
    else if (this.keys.right.isDown || this.keys.rightArrow.isDown) vx = speed;

    if (this.keys.up.isDown || this.keys.upArrow.isDown) vy = -speed;
    else if (this.keys.down.isDown || this.keys.downArrow.isDown) vy = speed;

    if (vx !== 0 && vy !== 0) {
      const k = Math.SQRT1_2;
      vx *= k;
      vy *= k;
    }

    this.player.setVelocity(vx, vy);
    this.playerMoving = (vx !== 0 || vy !== 0);

    if (vx !== 0 || vy !== 0) {
      this.player.anims.play('level2-mouse-walk', true);
      if (vx < 0) this.player.setFlipX(true);
      if (vx > 0) this.player.setFlipX(false);
    } else {
      this.player.anims.stop();
      this.player.setFrame(13);
    }
  }
}

class Level3 extends Phaser.Scene {

    constructor() {
        super('Level3');
    }

 // -----------------------------------------------------------------------------
    // --------------------------------- Scene  ------------------------------------
    // -----------------------------------------------------------------------------
    
    // -----------
    // Camera
    // -----------
    // Follows the player around
    // Can zoom in on player
    camera(map, player, zoom){
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels).setZoom(zoom);
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
    }

    // -----------
    // Timer
    // -----------
    
    // Timer Formatting: https://phaser.discourse.group/t/countdown-timer/2471/4

    createTimer(x , y){
        this.levelDurationMs = 60000;
        this.levelEndsAt = this.time.now + this.levelDurationMs;
        this.initialTime = 60;

        this.timedEvent = this.time.addEvent({
            delay: 250, 
            callback: this.updateTimer, 
            callbackScope: this, 
            loop: true
        });
    }

    formatTimer(secs){
        this.mins = Math.floor(secs/60);
        this.seconds = secs % 60;

        this.seconds = this.seconds.toString().padStart(2, '0');

        return `${this.mins}:${this.seconds}`;
    }

    updateTimer(){
        const remainingMs = Math.max(0, this.levelEndsAt - this.time.now);
        this.initialTime = Math.ceil(remainingMs / 1000);
        this.updateUi();
    }

    // -----------------------------------------------------------------------------
    // --------------------------------- Player ------------------------------------
    // -----------------------------------------------------------------------------

    // Moves the player around the map
    // Controls: WSAD keyboard
    playerMovement(speed){

        //Add keyboard input for player controls
        this.playerKeysWSAD = this.input.keyboard.addKeys({up: "W", down: "S", left: "A", right: "D"});
        this.playerKeysArrow = this.input.keyboard.createCursorKeys();

        let vx = 0;
        let vy = 0;

        if(this.playerKeysWSAD.left.isDown || this.playerKeysArrow.left.isDown){
            vx = -speed;
        }
        else if(this.playerKeysWSAD.right.isDown || this.playerKeysArrow.right.isDown){
            vx = speed;
        }

        if(this.playerKeysWSAD.up.isDown || this.playerKeysArrow.up.isDown){
            vy = -speed;
        }
        else if(this.playerKeysWSAD.down.isDown || this.playerKeysArrow.down.isDown){
            vy = speed;
        }

        if(vx !== 0 && vy !== 0){
            const k = Math.SQRT1_2;
            vx *= k;
            vy *= k;
        }

        this.player.setVelocity(vx, vy);

        if(vx !== 0 || vy !== 0){
            this.player.anims.play('level3-mouse-walk', true);
            if(vx < 0){
                this.player.setFlipX(true);
            }
            else if(vx > 0){
                this.player.setFlipX(false);
            }
        }
        else{
            this.player.anims.stop();
            this.player.setFrame(13);
        }

        if(!this.playerHitAnimating){
            this.player.angle = 0;
        }
    }

    // -----------------------------------------------------------------------------
    // --------------------------------- Objects -----------------------------------
    // -----------------------------------------------------------------------------

    // -----------
    // Collisions
    // -----------

    setupSpriteCollisions(sprite){
        this.physics.world.enable(sprite);
        sprite.body.allowGravity = false;
        sprite.body.immovable = true;
    }
    setupObjCollisions(objects){
        objects.forEach(obj => {
            this.setupSpriteCollisions(obj);
        });
    }

    cheeseObjCollisions(player, cheese){
        this.cheeseCollided = false;
        this.setupObjCollisions(cheese);

        this.physics.add.collider(player, cheese, (plyer, chese) => {
            this.cheeseCollided = true;
            chese.body.enable = false;
            this.winLevel();
        });
    }

    obsticleObjCollisions(player, obsticle){

        this.obsticleCollided = false;
        this.setupObjCollisions(obsticle);
   
        this.physics.add.collider(player, obsticle, (player, obst)=>{
            this.obsticleCollided = true;

            
            if(this.player.health <= 0){
                this.player.health = 0;
            }
            else{
                this.player.health -= 0.05;
            }

            this.updateUi();

            this.gameOver();

        });
    }

    fallingObjCollision(player, falling){
        this.fallingCollided = false;
        this.setupObjCollisions(falling);

        player.body.onOverlap = true;

        this.physics.add.overlap(player, falling, (player, fall)=> {

            this.fallingCollided = true;

            if(this.player.health <= 0){
                this.player.health = 0;
            }
            else{
                this.player.health -= 0.05;
            }

            this.updateUi();

            this.gameOver();

        });
    }

    catCollisions(player, cat){

        this.catCollided = false;

        this.physics.world.enable(cat);
        cat.body.allowGravity = false;
        cat.body.immovable = false;
        player.body.onOverlap = true;

        this.physics.add.overlap(player, cat, (p, c) => {
            if(this.time.now < this.catRecoverAt){
                return;
            }

            this.catCollided = true;
            this.catRecoverAt = this.time.now + 700;

            this.catResumeChaseAt = this.time.now + 700;
            if(this.player.health <= 0){
                this.player.health = 0;
            }
            else{
                this.player.health -= 0.20;
                if(this.player.health < 0){
                    this.player.health = 0;
                }
            }
            const dx = p.x - c.x;
            const dy = p.y - c.y;
            const dist = Math.max(1, Math.sqrt(dx * dx + dy * dy));
            const knockback = 140;
            p.setVelocity((dx / dist) * knockback, (dy / dist) * knockback);
            p.setTint(0xffcdd2);
            this.playerHitAnimating = true;
            if(this.playerHitTween){
                this.playerHitTween.stop();
            }
            this.playerHitTween = this.tweens.add({
                targets: p,
                angle: { from: -12, to: 12 },
                duration: 70,
                yoyo: true,
                repeat: 3,
                onComplete: () => {
                    if(p.active){
                        p.angle = 0;
                        p.clearTint();
                    }
                    this.playerHitAnimating = false;
                    this.playerHitTween = null;
                },
            });
            this.time.delayedCall(350, () => {
                if(p.active){
                    p.clearTint();
                }
            });

            this.updateUi();
            this.gameOver();

            this.resetClocks();

        });

    }

    itemsCollisions(player, healthItem, healthItem2, speedItem, scoreItem){

        this.healthItemCollided = false;
        this.speedItemCollided = false;
        this.scoreItemCollided = false;

        this.setupObjCollisions(healthItem);
        this.setupObjCollisions(healthItem2);
        this.setupObjCollisions(speedItem);
        this.setupObjCollisions(scoreItem);

        // ---------------
        // Health Items
        // ---------------

        this.physics.add.collider(player, healthItem, (plyr, hlth)=>{
            this.healthItemCollided = true;

            hlth.setVisible(false);
            hlth.body.enable = false;

            if(this.player.health < 5 && !(this.player.health > 5)){
                this.player.health += 0.05;
                this.updateUi();
            }

        });

        this.physics.add.collider(player, healthItem2, (plyr, hlth) => {

            hlth.setVisible(false);
            hlth.body.enable = false;

            if(this.player.health < 5 && !(this.player.health > 5)){
                this.player.health += 0.20;
                this.updateUi();
            }


        });

        // ---------------
        // Speed Items
        // ---------------

        this.physics.add.collider(player, speedItem, (plyr, sped)=>{
            this.speedItemCollided = true;

            sped.setVisible(false);
            sped.body.enable = false;

            this.player.speed += 100;
            
        });

        // ---------------
        // Score Items
        // ---------------

        this.physics.add.collider(player, scoreItem, (plyr, scre) => {
            this.scoreItemCollided = true;

            scre.setVisible(false);
            scre.body.enable = false;

            this.player.score += 20;

            this.updateUi();

        });
    }

    resetClocks(){
        this.clockObj.forEach(clock => {

            if (Math.random() < 0.1){
                clock.body.y = 800;
            }

        });

    }

    // ------------------------------------------------------------------------------
    // ------------------------------ Win / Game Over  ------------------------------
    // ------------------------------------------------------------------------------

    winLevel(){
        if(this.levelWon || this.levelLost) return;
        this.levelWon = true;
        const elapsed = 60 - this.initialTime;
        const best = Number(localStorage.getItem('mouseCheeseBestTimeLevel3') || '9999');
        if (elapsed < best) localStorage.setItem('mouseCheeseBestTimeLevel3', String(elapsed));
        const newBest = Math.min(elapsed, best);

        this.status.setVisible(true);
        this.status.setText(`You got the cheese! Score: ${this.player.score} Time: ${elapsed}s Best: ${newBest}s`);
        this.retryButton.setVisible(true);
        this.menuButton.setVisible(true);
    }

    gameOver(){
        if (this.levelWon || this.levelLost) {
            return;
        }

        if (this.gameOverTriggered) {
            return;
        }

        if (this.player.health > 0 && this.initialTime > 0) {
            return;
        }

        this.gameOverTriggered = true;

        this.time.addEvent({
            delay: 0,
            loop: false,
            callback: () => {
                if(this.player.health <= 0 || this.initialTime == 0){
                    this.levelLost = true;
                    const reason = this.player.health <= 0 ? 'Health depleted' : 'Time up';
                    this.status.setVisible(true);
                    this.status.setText(`You lost: ${reason} Score: ${this.player.score}`);
                    this.retryButton.setVisible(true);
                    this.menuButton.setVisible(true);
                }
            },
            callbackScope: this
        });
    }

    updateUi(){
        if (!this.ui || !this.healthBar) return;
        this.healthBar.setCrop(0, 0, 64 * (this.player.health / 5), 8);
        const best = Number(localStorage.getItem('mouseCheeseBestTimeLevel3') || '0');
        const bestText = best > 0 && best < 9999 ? `${best}s` : '-';
        this.ui.setText(`Score: ${this.player.score}   Time: ${this.initialTime}s   Best: ${bestText}`);
    }


    // -----------------------------------------------------------------------------
    // --------------------------- Main Stuff for Level  ---------------------------
    // -----------------------------------------------------------------------------

    preload() {

        // Load the Mouse
        this.load.spritesheet('mouse-ts', 'assets/images/MouseSpritesheet.png', {
            frameWidth: 16, 
            frameHeight: 16,
        });

        // Load the Cat from the Spritesheet
        this.load.spritesheet('cat-ts', 'assets/images/JumpCatttt.png', {
            frameWidth: 32, 
            frameHeight: 32,
        });

        // Floor
        this.load.image("floors-ts", "assets/images/Floor.png");

        
        this.load.spritesheet("catFurniture-ts", "assets/images/Furnitures.png",{
            frameWidth: 32,
            frameHeight: 32,
            spacing: 0,
            startFrame: 26,
            endFrame: 26
        });

        // Load Objects
        this.load.spritesheet("foodBowls-ts", "assets/images/CatBowls.png", {
            frameWidth: 16, 
            frameHeight: 16, 
            spacing: 0, 
            startFrame: 0,
            endFrame: 0
        });

        this.load.spritesheet("fallingObsticle-ts", "assets/images/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 116,
            endFrame: 116
        });

        /*this.load.spritesheet("cheese-ts", "assets/images/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 116,
            endFrame: 116
        });*/

        this.load.spritesheet("healthItem-ts", "assets/images/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 228,
            endFrame: 228
        });

        this.load.spritesheet("speedItem-ts", "assets/images/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 242,
            endFrame: 242
        });

        this.load.spritesheet("scoreItem-ts", "assets/images/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 212,
            endFrame: 212
        });




        this.load.spritesheet("floors&walls-ts", "assets/images/TopDownHouse_FloorsAndWalls.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("furniture-ts", "assets/images/TopDownHouse_FurnitureState1.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("smallItems-ts", "assets/images/TopDownHouse_SmallItems.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("cheese-ts", "assets/images/maasdam.png", {
            frameWidth: 16,
            frameHeight: 16,
        });
        this.load.image('healthpanel', 'assets/images/HealthBarPanel_160x41.png');
        this.load.image('valuebar', 'assets/images/ValueBar_128x16.png');
        this.load.image('valuered', 'assets/images/ValueRed_120x8.png');
        this.load.spritesheet('hearts', 'assets/images/HeartIcons_32x32.png', { frameWidth: 32, frameHeight: 32 });

        // Level Tilemap
        this.load.tilemapTiledJSON('level3', 'assets/map/Level3.tmj')
    }

    objTexture(dict, layer, tilesheet){

        this.objTiles = [];

        for(let i = 0; i < dict["gid"].length; i++){
            //console.log(`Gid: ${dict["gid"][i]} Frame: ${dict["frame"][i]}`);

            this.objName = this.level3Map.createFromObjects(layer, {gid: dict["gid"][i], frame: dict["frame"][i], key : tilesheet});
            

            this.objTiles.push(this.objName);
        }
        
        return this.objTiles;

    }

    create() {

        this.physics.world.setBounds( 0, 0, 715, 620);

        // --------------- TileMap ---------------
        this.level3Map = this.make.tilemap({key: 'level3'})

        // ---------------
        // Tilemap Layers
        // ---------------

        // Tile Layers
        this.bg = this.level3Map.addTilesetImage("TopDownHouse_FloorsAndWalls", "floors&walls-ts");
        this.bgLayer = this.level3Map.createLayer("background", this.bg);
        
        this.border = this.level3Map.addTilesetImage("TopDownHouse_FloorsAndWalls", "floors&walls-ts");
        this.borderLayer = this.level3Map.createLayer("border", this.border);

        this.borderLayer.setCollisionByProperty({ collides: true });

        this.decor = this.level3Map.addTilesetImage("TopDownHouse_FurnitureState1", "furniture-ts");
        this.decorLayer = this.level3Map.createLayer("decor", this.decor);

        // Object Layers
        this.cheeseObj = this.level3Map.createFromObjects("cheese", {gid : 227, key : "cheese-ts"});
        this.mealObj = this.level3Map.createFromObjects("mealDish", {gid : 196, frame: 33, key : "smallItems-ts"});
        this.soupObj = this.level3Map.createFromObjects("soup", {gid : 201, frame: 38, key : "smallItems-ts"});
        this.duckObj = this.level3Map.createFromObjects("ducks", {gid : 167, frame: 4, key : "smallItems-ts"});
        this.redJarObj = this.level3Map.createFromObjects("redJar", {gid : 220, frame: 57, key : "smallItems-ts"});
        this.clockObj = this.level3Map.createFromObjects("clockFall", {gid : 176, frame: 13, key : "smallItems-ts"});

        this.tableTexture = {
            gid: [280, 281, 293, 294, 306, 307],
            frame: [52, 53, 65, 66, 78, 79]
        }
        this.stoolTexture = {
            gid: [273, 272, 259, 260],
            frame: [45, 44, 31, 32]
        }
        this.nightStandTexture = {
            gid: [271, 270, 257, 258],
            frame: [43, 42, 29, 30]
        }
        this.nightStandTexture = {
            gid: [271, 270, 257, 258],
            frame: [43, 42, 29, 30]
        }
        this.bookShelfTexture = {
            gid : [286, 287, 288, 299, 300, 301, 312, 313, 314],
            frame: [58, 59, 60, 71, 72, 73, 84, 85, 86]
        }
        this.plantTexture = {
            gid: [371, 358],
            frame: [143, 130]
        }
        this.lampTexture = {
            gid: [449, 436],
            frame: [221, 208]
        }
        this.cabnetTexture = {
            gid : [319, 320, 332, 333, 345, 346],
            frame : [91, 92, 104, 105, 117, 118]
        }

        this.couchFrontViewTexture = {
            gid : [363, 364, 365, 366, 376, 377, 378, 379],
            frame : [135, 136, 137, 138, 148, 149, 150, 151]
        }
        this.couchBackViewTexture = {
            gid : [359, 360, 361, 362, 372, 373, 374, 375],
            frame : [131, 132, 133, 134, 144, 145, 146, 147]
        }
        this.couchSideViewTexture = {
            gid : [384, 385, 397, 398, 410, 411, 423, 424],
            frame : [156, 157, 169, 170, 182, 183, 195, 196]
        }

        this.tableObj = this.objTexture(this.tableTexture, "table", "furniture-ts");
        this.stoolObj = this.objTexture(this.stoolTexture, "stool", "furniture-ts");
        this.nightstandObj = this.objTexture(this.nightStandTexture, "nightstand" ,"furniture-ts");
        this.bookshelfObj = this.objTexture(this.bookShelfTexture, "bookshelf", "furniture-ts");
        this.plantObj = this.objTexture(this.plantTexture, "plant", "furniture-ts");
        this.lampObj = this.objTexture(this.lampTexture, "lamp", "furniture-ts");
        this.cabnetObj = this.objTexture(this.cabnetTexture, "cabnets", "furniture-ts");
        this.couchFrontObj = this.objTexture(this.couchFrontViewTexture, "couchFrontview", "furniture-ts");
        this.couchBackObj = this.objTexture(this.couchBackViewTexture, "couchBackview", "furniture-ts");
        this.couchSideObj = this.objTexture(this.couchSideViewTexture, "couchSideview", "furniture-ts");


        // --------------- Timer ---------------
        this.createTimer(270, 20);

        this.nextRespawnTime = 60 - 10;

        this.paralzedUntil = 1000;
        this.catRecoverAt = 0;
        this.catResumeChaseAt = 0;
        this.playerHitAnimating = false;
        this.playerHitTween = null;
        this.levelWon = false;
        this.levelLost = false;
        this.gameOverTriggered = false;

        if (!this.anims.exists('level3-mouse-walk')) {
            this.anims.create({
                key: 'level3-mouse-walk',
                frames: [{ key: 'mouse-ts', frame: 13 }, { key: 'mouse-ts', frame: 16 }, { key: 'mouse-ts', frame: 19 }, { key: 'mouse-ts', frame: 22 }],
                frameRate: 10,
                repeat: -1,
            });
        }

        if (!this.anims.exists('level3-cat-run')) {
            this.anims.create({
                key: 'level3-cat-run',
                frames: this.anims.generateFrameNumbers('cat-ts', { start: 0, end: 12 }),
                frameRate: 12,
                repeat: -1,
            });
        }

        // --------------- Player ---------------

        // Mouse Sprite
        this.player = this.physics.add.sprite(350,600,"mouse-ts", 13);
        this.player.body.setSize(10, 12);
        this.player.body.setOffset(3, 2);

        //Adjusts player movment
        this.player.speed = 95;
        this.player.setDrag(0);
        this.player.setMaxVelocity(95);

        this.player.score = 0;
        this.player.health = 5.00;

        // --------------- Cat ---------------

        this.cat = this.physics.add.sprite(500, 600, "cat-ts");
        this.cat.speed = 50;
        this.cat.setFrame(0);

        // --------------- Object Collisions ---------------

        const viewW = this.scale.width;
        const viewH = this.scale.height;

        this.healthBarBg = this.add.image(70, 20, 'valuebar').setScrollFactor(0).setDepth(1001).setScale(0.5);
        this.healthBar = this.add.image(38, 20, 'valuered').setScrollFactor(0).setDepth(1002).setScale(1).setOrigin(0, 0.5);
        this.healthBar.setCrop(0, 0, 64 * (this.player.health / 5), 8);
        this.heartIcon = this.add.image(16, 20, 'hearts', 0).setScrollFactor(0).setDepth(1000).setScale(1);

        this.ui = this.add.text(210, 6, '', {
            fontSize: '10px',
            color: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 5, y: 3 },
            align: 'center',
        }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(1000);

        this.status = this.add.text(viewW * 0.5, viewH * 0.5, 'WASD / Arrow keys to move', {
            fontSize: '9px',
            color: '#ffe082',
            backgroundColor: '#000000aa',
            padding: { x: 6, y: 5 },
            align: 'center',
            wordWrap: { width: Math.max(220, viewW - 80), useAdvancedWrap: true },
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001);

        this.retryButton = this.add.text(viewW * 0.5, viewH * 0.5 + 40, 'Retry', {
            fontSize: '10px',
            color: '#ffe082',
            backgroundColor: '#000000aa',
            padding: { x: 5, y: 3 },
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

        this.menuButton = this.add.text(viewW * 0.5, viewH * 0.5 + 70, 'Main Menu', {
            fontSize: '10px',
            color: '#ffe082',
            backgroundColor: '#000000aa',
            padding: { x: 5, y: 3 },
            align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(1001).setInteractive({ useHandCursor: true }).setVisible(false);

        this.retryButton.on('pointerdown', () => this.scene.restart());
        this.menuButton.on('pointerdown', () => this.scene.start('mainmenu'));

        this.time.delayedCall(2400, () => {
            if (!this.levelWon && !this.levelLost) {
                this.status.setText('');
                this.status.setVisible(false);
            }
        });

        // Player collides with cat bowl
        // Parameters: player, catBowl
        //this.bowlObjCollisions(this.player, this.bowlsObj, this.player.health);

        this.physics.add.collider(this.player, this.borderLayer);

        this.cheeseObjCollisions(this.player, this.cheeseObj);

        this.catCollisions(this.player, this.cat, this.player.health);

        this.itemsCollisions(this.player, this.soupObj, this.mealObj, this.redJarObj, this.duckObj);

        this.fallingObjCollision(this.player, this.clockObj);

        this.couchFrontObj.forEach(couchF => {
            this.obsticleObjCollisions(this.player, couchF);
        });
        this.couchBackObj.forEach(couchB => {
            this.obsticleObjCollisions(this.player, couchB);
        });
        this.couchSideObj.forEach(couchS => {
            this.obsticleObjCollisions(this.player, couchS);
        });
        this.tableObj.forEach(table => {
            this.obsticleObjCollisions(this.player, table);
        });
        this.stoolObj.forEach(stool => {
            this.obsticleObjCollisions(this.player, stool);
        });
        this.nightstandObj.forEach(stand => {
            this.obsticleObjCollisions(this.player, stand);
        });
        this.bookshelfObj.forEach(shelf => {
            this.obsticleObjCollisions(this.player, shelf);
        });
        this.plantObj.forEach(plant => {
            this.obsticleObjCollisions(this.player, plant);
        });
        this.lampObj.forEach(lamp => {
            this.obsticleObjCollisions(this.player, lamp);
        });
        this.cabnetObj.forEach(cabnet => {
            this.obsticleObjCollisions(this.player, cabnet);
        });

        this.updateUi();

    }

    update() {
        if (this.levelWon || this.levelLost) {
            this.player.setAcceleration(0, 0);
            this.player.setVelocity(0, 0);
            this.player.anims.stop();
            this.cat.setVelocity(0, 0);
            this.cat.anims.stop();
            return;
        }

        // Sets up the Camera
        // Parameters: tilemap, player, zoom
        this.camera(this.level3Map, this.player, 1);

        // Moves the player; Keyboard Controls: W A S D
        // Parameters: acceleration (player speed)
        this.playerMovement(this.player.speed);

        this.cat.setDrag(100);
        this.cat.setMaxVelocity(100);

        this.catDist = Phaser.Math.Distance.BetweenPoints(this.player, this.cat);

        if(this.time.now < this.catResumeChaseAt){
            this.cat.setVelocity(0, 0);
            this.cat.anims.stop();
            this.cat.setFrame(0);
        }
        else if(this.catDist < 10){
            this.physics.moveToObject(this.cat, this.player, 1);
            this.cat.anims.play('level3-cat-run', true);
        }
        else if(this.catDist < 500){
            this.physics.moveToObject(this.cat, this.player, this.cat.speed);
            this.cat.anims.play('level3-cat-run', true);
        }
        else{
            this.cat.setVelocity(0, 0);
            this.cat.anims.stop();
            this.cat.setFrame(0);
        }

        if(this.cat.body.velocity.x < 0){
            this.cat.setFlipX(true);
        }
        else if(this.cat.body.velocity.x > 0){
            this.cat.setFlipX(false);
        }

        if(this.initialTime < this.nextRespawnTime){

            this.nextRespawnTime = this.nextRespawnTime - 10;

            this.redJarObj.forEach(sped => {
                sped.setVisible(true);
                sped.body.enable = true;
            });

            this.soupObj.forEach(hlth => {
                hlth.setVisible(true);
                hlth.body.enable = true;
            });
            
            this.mealObj.forEach(hlth => {
                hlth.setVisible(true);
                hlth.body.enable = true;
            });
        }

        this.clockObj.forEach(clock => {

            clock.body.enable = true;

            this.dist = Phaser.Math.Distance.BetweenPoints(this.player, clock);

            if(this.dist < 400){
                clock.body.setDrag(100);
                clock.body.setMaxVelocity(7000);

                clock.body.setVelocityY(100);

            }

        });

        if(this.cat.alpha < 1){
            this.cat.setAlpha(this.cat.alpha + 0.005);
        }
    

        //GameOver when timer is 00:00
        this.gameOver(); //checks player health & timer

        //this.testCollision();
       
    }

    // -----------------------------------------------------------------------------------
    // --------------------------------- Testing Stuff -----------------------------------
    // -----------------------------------------------------------------------------------
    
    testCollision(){
        if(this.catCollided){
            console.log("cat/player collided");
            console.log(this.player.health);
        }
        if(this.bowlCollided){
            console.log("Player touched bowl");
        }
        if(this.cheeseCollided){
            console.log("Player touched cheese");
        }
    }

}

class TestLevelCompleted extends Phaser.Scene {
  constructor() {
    super('TestLevelCompleted');
  }

  create(data) {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x102418);
    this.add.text(centerX, centerY - 30, 'Level Complete', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(centerX, centerY, `Time: ${data?.bestTime ?? '-'}\nScore: ${data?.bestScore ?? 0}`, { fontSize: '12px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.add.text(centerX, centerY + 48, 'Main Menu', { fontSize: '12px', color: '#ffe082', backgroundColor: '#000000aa', padding: { x: 6, y: 4 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('mainmenu'));
  }
}

class TestGameOver extends Phaser.Scene {
  constructor() {
    super('TestGameOver');
  }

  create(data) {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;
    this.add.rectangle(centerX, centerY, this.scale.width, this.scale.height, 0x2a1111);
    this.add.text(centerX, centerY - 30, 'Game Over', { fontSize: '20px', color: '#ffffff' }).setOrigin(0.5);
    this.add.text(centerX, centerY, `Time: ${data?.bestTime ?? '-'}\nScore: ${data?.bestScore ?? 0}`, { fontSize: '12px', color: '#ffffff', align: 'center' }).setOrigin(0.5);
    this.add.text(centerX, centerY + 48, 'Retry Level 3', { fontSize: '12px', color: '#ffe082', backgroundColor: '#000000aa', padding: { x: 6, y: 4 } })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.scene.start('Level3'));
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 320,
  height: 320,
  backgroundColor: '#222',
  pixelArt: true,
  roundPixels: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false,
    },
  },
  scene: [MainMenuScene, Level1Scene, Level2Scene, Level3, TestLevelCompleted, TestGameOver],
});
