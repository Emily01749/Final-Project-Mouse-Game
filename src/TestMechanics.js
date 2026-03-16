export class TestMechanics extends Phaser.Scene {

    constructor() {
        super('TestMechanics');
    }

    // Assets
    // https://sfrisk.itch.io/midnight-lilac-tileset
    // https://toffeecraft.itch.io/cat-pixel-mega-pack
    // https://toffeecraft.itch.io/cat-pack

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
            fontSize: "32px",
            fontFamily : "Courtier New",
            color : "black"
        }).setOrigin(0.5);

        this.healthDisplayText.setScrollFactor(0);
    }

    displayScore(x , y){

        this.scoreDisplayText = this.add.text(x , y, "(Score): " + this.player.score, {
            fontSize: "32px",
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
            fontSize: "32px",
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
        this.playerKeys = this.input.keyboard.addKeys({up: "W", down: "S", left: "A", right: "D"});

        var countDownPress = 0;

        if(this.playerKeys.up.isDown){
            countDownPress++;
        }
        if(this.playerKeys.down.isDown){
            countDownPress++;
        }
        if(this.playerKeys.left.isDown){
            countDownPress++;
        }
        if(this.playerKeys.right.isDown){
            countDownPress++;
        }

        if(countDownPress > 1){
            speed = speed/Math.sqrt(2);
        }

        // Sets velocity for up, down, left, right, otherwise 0 for idle
        if(this.playerKeys.up.isDown){
            this.player.setAccelerationY(-speed);
        }
        if(this.playerKeys.down.isDown){
            this.player.setAccelerationY(speed);
        }
        if(this.playerKeys.left.isDown){
            this.player.setAccelerationX(-speed);
        }
        if(this.playerKeys.right.isDown){
            this.player.setAccelerationX(speed);
        }
        if(countDownPress == 0){
            this.player.setAccelerationX(0);
            this.player.setAccelerationY(0);
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

    bowlObjCollisions(player, catBowl){

        this.bowlCollided = false;
        this.setupObjCollisions(catBowl);
   
        this.physics.add.collider(player, catBowl, (player, bowl)=>{
            this.bowlCollided = true;

            
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
        /*player.body.onOverlap = true;

        this.physics.add.overlap(player, cat, (p, c) => {
            this.catCollided = true;

            c.setAlpha(0.5);

            //if(this.player.health > 0){
            this.player.health -= 0.05;
            //}
            //else{
            //    this.player.health = 0;
            //    this.gameOver();
            //}

            this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);

        });*/

        this.setupSpriteCollisions(cat);

        this.physics.add.collider(player, cat, (p, c) => {

            this.catCollided = true;

            c.setAlpha(0.5);

            if(this.player.health <= 0){
                this.player.health = 0
            }
            else{
                this.player.health -= 0.05;
            }

            this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);

            this.gameOver();

        });


    }

    itemsCollisions(player, healthItem, speedItem, scoreItem){

        this.healthItemCollided = false;
        this.speedItemCollided = false;
        this.scoreItemCollided = false;

        this.setupObjCollisions(healthItem);
        this.setupObjCollisions(speedItem);
        this.setupObjCollisions(scoreItem);

        this.physics.add.collider(player, healthItem, (plyr, hlth)=>{
            this.healthItemCollided = true;

            hlth.setVisible(false);
            hlth.body.enable = false;

            if(this.player.health < 5 && !(this.player.health > 5)){
                this.player.health += 0.05;
                this.healthDisplayText.text = "(Health Bar): " + this.player.health.toFixed(2);
            }

        });

        this.physics.add.collider(player, speedItem, (plyr, sped)=>{
            this.speedItemCollided = true;

            sped.setVisible(false);
            sped.body.enable = false;

            this.player.speed += 100;
            
        });

        this.physics.add.collider(player, scoreItem, (plyr, scre) => {
            this.scoreItemCollided = true;

            scre.setVisible(false);
            scre.body.enable = false;

            this.player.score += 1;

            this.scoreDisplayText.text = "(Score): " + this.player.score;

        });
    }

    // ------------------------------------------------------------------------------
    // ------------------------------ Win / Game Over  ------------------------------
    // ------------------------------------------------------------------------------

    winLevel(){
        this.scene.start("LevelCompleted");
    }

    gameOver(){

        this.time.addEvent({
            delay: 4570,
            loop: false,
            callback: () => {
                if(this.player.health <= 0 || this.initialTime == 0){
                    this.scene.start("GameOver");
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
        this.load.spritesheet("mouse-ts", "assets/Mouse-Sheet.png", {
            frameWidth: 32,
            frameHeight: 32,
            spacing: 0,
            startFrame: 0,
            endFrame: 0
        });

        // Load the Cat from the Spritesheet
        this.load.spritesheet("cat-ts", "assets/IdleCat.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 0,
            endFrame: 0
        });

        // Floor
        this.load.image("floors-ts", "assets/Floor.png");

        
        this.load.spritesheet("catFurniture-ts", "assets/Furnitures.png",{
            frameWidth: 32,
            frameHeight: 32,
            spacing: 0,
            startFrame: 26,
            endFrame: 26
        });

        // Load Objects
        this.load.spritesheet("foodBowls-ts", "assets/CatBowls.png", {
            frameWidth: 16, 
            frameHeight: 16, 
            spacing: 0, 
            startFrame: 0,
            endFrame: 0
        });

        this.load.spritesheet("cheese-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 116,
            endFrame: 116
        });

        this.load.spritesheet("healthItem-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 228,
            endFrame: 228
        });

        this.load.spritesheet("speedItem-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 242,
            endFrame: 242
        });

        this.load.spritesheet("scoreItem-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 212,
            endFrame: 212
        });

        // Level Tilemap (Subject to Change)
        this.load.tilemapTiledJSON('temporary-tilemap', 'assets/Map-tmp.tmj');
    }

    create() {

        // --------------- TileMap ---------------
        this.tempMap = this.make.tilemap({key: 'temporary-tilemap'});

        // ---------------
        // Tilemap Layers
        // ---------------

        // Tile Layers
        this.floor = this.tempMap.addTilesetImage('Floor', 'floors-ts');
        this.floorLayer = this.tempMap.createLayer("floor", this.floor);

        // Object Layers
        this.bowlsObj = this.tempMap.createFromObjects("foodBowls", {gid : 19, key: "foodBowls-ts"});
        this.healthItemObj = this.tempMap.createFromObjects("healthItem", {gid : 248, key: "healthItem-ts"});
        this.speedItemObj = this.tempMap.createFromObjects("speedItem", {gid : 262, key: "speedItem-ts"});
        this.scoreItemObj = this.tempMap.createFromObjects("scoreItem", {gid : 232, key: "scoreItem-ts"});
        this.cheeseObj = this.tempMap.createFromObjects("cheese", {gid : 136, key : "cheese-ts"});

        // --------------- Timer ---------------
        this.createTimer(650, 170);

        this.nextRespawnTime = 60 - 10;

        // --------------- Player ---------------

        // Temporary as a cat (change to mouse later)
        this.player = this.physics.add.sprite(350,600,"mouse-ts");

        //Adjusts player movment
        this.player.speed = 2000;
        this.player.setDrag(10000);
        this.player.setMaxVelocity(250);

        this.player.score = 0;
        this.player.health = 5.00;

        // --------------- Cat ---------------

        this.cat = this.physics.add.sprite(500, 600, "cat-ts");

        // --------------- Object Collisions ---------------

        // Display Health Bar
        // Parameters: x, y, amount Of Player Health
        this.displayHealth(400, 170, this.player.health);

        this.displayScore(870, 170, this.player.health);

        // Player collides with cat bowl
        // Parameters: player, catBowl
        this.bowlObjCollisions(this.player, this.bowlsObj, this.player.health);

        this.cheeseObjCollisions(this.player, this.cheeseObj);

        this.catCollisions(this.player, this.cat, this.player.health);

        this.itemsCollisions(this.player, this.healthItemObj, this.speedItemObj, this.scoreItemObj);

    }

    update() {
        // Sets up the Camera
        // Parameters: tilemap, player, zoom
        this.camera(this.tempMap, this.player, 1.55);

        // Moves the player; Keyboard Controls: W A S D
        // Parameters: acceleration (player speed)
        this.playerMovement(this.player.speed);

        if(this.seconds > 10){

            this.cat.setDrag(1000);
            this.cat.setMaxVelocity(100);
            this.physics.moveToObject(this.cat, this.player, 70);
            
        }

        if(this.initialTime < this.nextRespawnTime){

            this.nextRespawnTime = this.nextRespawnTime - 10;

            this.speedItemObj.forEach(sped => {
                sped.setVisible(true);
                sped.body.enable = true;
            });

            this.healthItemObj.forEach(hlth => {
                hlth.setVisible(true);
                hlth.body.enable = true;
            });
        }

        /*else{
            this.cat.setVelocityX(0);
            this.cat.setVelocityY(0);
        }*/

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
