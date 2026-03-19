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
    makeButton(centerY + 40, 'Level 3', 'Level3');
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
    // UI: Text
    // -----------

    // Can change to actual health bar or something later if want to
    displayHealth( x , y){

        this.healthDisplayText = this.add.text(x , y, "(Health Bar): " + this.player.health, {
            fontSize: "15px",
            fontFamily : "Courtier New",
            color : "black"
        }).setOrigin(0.5);

        this.healthDisplayText.setScrollFactor(0);
    }

    displayScore(x , y){

        this.scoreDisplayText = this.add.text(x , y, "(Score): " + this.player.score, {
            fontSize: "15px",
            fontFamily : "Courtier New",
            color : "black"
        }).setOrigin(0.5);

        this.scoreDisplayText.setScrollFactor(0);
    }

    // -----------
    // Timer
    // -----------
    
    // Timer Formatting: https://phaser.discourse.group/t/countdown-timer/2471/4

    createTimer(x , y){
        this.initialTime = 60;

        this.timerText = this.add.text(x , y, "(Time): " + this.formatTimer(this.initialTime), {
            fontSize: "15px",
            fontFamily : "Courtier New",
            color : "black"
        }).setOrigin(0.5);

        this.timerText.setScrollFactor(0);

        this.timedEvent = this.time.addEvent({
            delay: 800, 
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
        this.initialTime -= 1;

        if(this.initialTime < 0){
            this.initialTime = 0;
        }

        this.timerText.setText('(Timer): ' + this.formatTimer(this.initialTime));
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

        var countDownPress = 0;

        if(this.playerKeysWSAD.up.isDown || this.playerKeysArrow.up.isDown){
            countDownPress++;
        }
        if(this.playerKeysWSAD.down.isDown || this.playerKeysArrow.down.isDown){
            countDownPress++;
        }
        if(this.playerKeysWSAD.left.isDown || this.playerKeysArrow.left.isDown){
            countDownPress++;
        }
        if(this.playerKeysWSAD.right.isDown || this.playerKeysArrow.right.isDown){
            countDownPress++;
        }

        if(countDownPress > 1){
            speed = speed/Math.sqrt(2);
        }

        // Sets velocity for up, down, left, right, otherwise 0 for idle
        if(this.playerKeysWSAD.up.isDown || this.playerKeysArrow.up.isDown){
            this.player.setAccelerationY(-speed);
        }
        if(this.playerKeysWSAD.down.isDown || this.playerKeysArrow.down.isDown){
            this.player.setAccelerationY(speed);
        }
        if(this.playerKeysWSAD.left.isDown || this.playerKeysArrow.left.isDown){
            this.player.setAccelerationX(-speed);
        }
        if(this.playerKeysWSAD.right.isDown || this.playerKeysArrow.right.isDown){
            this.player.setAccelerationX(speed);
        }
        if(countDownPress == 0){
            this.player.setAccelerationX(0);
            this.player.setAccelerationY(0);
        }

        if(this.initialTime > this.paralzedUntil){
            this.player.angle += 30;
            this.player.setAccelerationX(0);
            this.player.setAccelerationY(0);
        }
        else{
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

            this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);

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

            this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);

            this.gameOver();

        });
    }

    catCollisions(player, cat){

        this.catCollided = false;

        this.setupSpriteCollisions(cat);
        player.body.onOverlap = true;

        this.physics.add.overlap(player, cat, (p, c) => {

            this.catCollided = true;

            c.setAlpha(0.5);

            /*if(this.player.health <= 0){
                this.player.health = 0
            }
            else{
                this.player.health -= 0.05;
            }*/

            //this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);

            //this.gameOver();

            this.paralzedUntil = this.initialTime - 3;

            cat.setVelocityX(500);

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
                this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);
            }

        });

        this.physics.add.collider(player, healthItem2, (plyr, hlth) => {

            hlth.setVisible(false);
            hlth.body.enable = false;

            if(this.player.health < 5 && !(this.player.health > 5)){
                this.player.health += 0.20;
                this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);
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

            this.player.score += 1;

            this.scoreDisplayText.text = "(Score): " + this.player.score;

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
        this.bestTime = this.mins + " : " + this.seconds;
        this.bestScore = this.player.score;

        this.scene.start("TestLevelCompleted", {bestTime : this.bestTime, bestScore : this.bestScore});
    }

    gameOver(){

        this.time.addEvent({
            delay: 4570,
            loop: false,
            callback: () => {
                if(this.player.health <= 0 || this.initialTime == 0){
                    this.bestTime = this.mins + " : " + this.seconds;
                    this.bestScore = this.player.score;

                    this.scene.start("TestGameOver", {bestTime : this.bestTime, bestScore : this.bestScore});
                }
            },
            callbackScope: this
        });
    }


    // -----------------------------------------------------------------------------
    // --------------------------- Main Stuff for Level  ---------------------------
    // -----------------------------------------------------------------------------

    preload() {

        // Load the Mouse
        this.load.spritesheet("mouse-ts", "assets/images/Mouse-Sheet.png", {
            frameWidth: 32,
            frameHeight: 32,
            spacing: 0,
            startFrame: 0,
            endFrame: 0
        });

        // Load the Cat from the Spritesheet
        this.load.spritesheet("cat-ts", "assets/images/IdleCat.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 0,
            endFrame: 0
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

        // --------------- Player ---------------

        // Mouse Sprite
        this.player = this.physics.add.sprite(350,600,"mouse-ts");
        this.player.setScale(0.59);
        this.player.setCollideWorldBounds(true);

        //Adjusts player movment
        this.player.speed = 2000;
        this.player.setDrag(10000);
        this.player.setMaxVelocity(250);

        this.player.score = 0;
        this.player.health = 5.00;

        // --------------- Cat ---------------

        this.cat = this.physics.add.sprite(500, 600, "cat-ts");
        this.cat.speed = 50;

        // --------------- Object Collisions ---------------

        // Display Health Bar
        // Parameters: x, y, amount Of Player Health
        this.displayHealth(60, 20, this.player.health);

        this.displayScore(160, 20, this.player.health);

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

    }

    update() {
        // Sets up the Camera
        // Parameters: tilemap, player, zoom
        this.camera(this.level3Map, this.player, 1);

        // Moves the player; Keyboard Controls: W A S D
        // Parameters: acceleration (player speed)
        this.playerMovement(this.player.speed);

        if(this.seconds > 10){

            this.cat.setDrag(100);
            this.cat.setMaxVelocity(100);

            this.catDist = Phaser.Math.Distance.BetweenPoints(this.player, this.cat);

            console.log("inital: " + this.initialTime);
            console.log("paralzed: " + this.paralzedUntil);

            if(this.initialTime < this.paralzedUntil){
                if(this.catDist < 10){
                    this.physics.moveToObject(this.cat, this.player, 1);
                    
                }
                else if(this.catDist < 500){
                    this.physics.moveToObject(this.cat, this.player, this.cat.speed);
                }
            }
            
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
  scene: [MainMenuScene, Level1Scene, Level3, TestLevelCompleted, TestGameOver],
});
