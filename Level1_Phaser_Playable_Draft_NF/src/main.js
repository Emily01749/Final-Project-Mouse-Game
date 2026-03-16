class MainMenuScene extends Phaser.Scene {
  constructor() {
    super('mainmenu');
  }

  preload() {
    this.load.image('menuBg', 'assets/images/lCk9cg.png');
  }

  create() {
    const centerX = this.scale.width / 2;
    const centerY = this.scale.height / 2;

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
    makeButton(centerY + 40, 'Level 3', 'level3');
  }
}

class Level1Scene extends Phaser.Scene {
  constructor() {
    super('level1');
    this.score = 0;
    this.health = 100;
    this.levelTime = 90;
    this.levelWon = false;
    this.levelLost = false;
    this.lastHitAt = 0;
    this.playerMoving = false;
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

    this.anims.create({
      key: 'mouse-walk',
      frames: [{ key: 'mouse', frame: 13 }, { key: 'mouse', frame: 16 }, { key: 'mouse', frame: 19 }, { key: 'mouse', frame: 22 }],
      frameRate: 10,
      repeat: -1,
    });

    this.anims.create({
      key: 'cat-run',
      frames: this.anims.generateFrameNumbers('cat', { start: 0, end: 12 }),
      frameRate: 12,
      repeat: -1,
    });

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

    this.retryButton.on('pointerdown', () => this.scene.restart());
    this.menuButton.on('pointerdown', () => this.scene.start('mainmenu'));

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
      if (this.playerMoving) {
        const dx = this.player.x - enemy.x;
        const dy = this.player.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
          const speed = enemy.getData('speed');
          enemy.setVelocityX((dx / dist) * speed);
          enemy.setVelocityY((dy / dist) * speed);
          enemy.setFlipX(dx < 0);
          enemy.anims.play('cat-run', true);
        }
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

    if (this.health <= 0) {
      this.health = 0;
      this.onLose('Health depleted');
    }

    this.updateUi();
  }

  onWin() {
    if (this.levelWon || this.levelLost) return;
    this.levelWon = true;
    if (this.cheese) this.cheese.disableBody(true, true);
    const elapsed = 90 - this.levelTime;
    const best = Number(localStorage.getItem('mouseCheeseBestTime') || '9999');
    if (elapsed < best) localStorage.setItem('mouseCheeseBestTime', String(elapsed));
    const newBest = Math.min(elapsed, best);

    this.status.setVisible(true);
    this.status.setText(`You got the cheese! Score: ${this.score} Time: ${elapsed}s Best: ${newBest}s`);
    this.retryButton.setVisible(true);
    this.menuButton.setVisible(true);
  }

  onLose(reason) {
    if (this.levelWon || this.levelLost) return;
    this.levelLost = true;

    this.status.setVisible(true);
    this.status.setText(`You lost: ${reason} Score: ${this.score}`);
    this.retryButton.setVisible(true);
    this.menuButton.setVisible(true);
  }

  updateUi() {
    this.healthBar.setCrop(0, 0, 64 * (this.health / 100), 8);
    const best = Number(localStorage.getItem('mouseCheeseBestTime') || '0');
    const bestText = best > 0 && best < 9999 ? `${best}s` : '-';
    this.ui.setText(`Score: ${this.score}   Time: ${this.levelTime}s   Best: ${bestText}`);
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
  scene: [MainMenuScene, Level1Scene],
});
