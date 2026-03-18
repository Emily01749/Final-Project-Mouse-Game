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

        this.load.spritesheet("fallingObsticle-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 116,
            endFrame: 116
        });

        /*this.load.spritesheet("cheese-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 116,
            endFrame: 116
        });*/

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




        this.load.spritesheet("floors&walls-ts", "assets/TopDownHouse_FloorsAndWalls.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("furniture-ts", "assets/TopDownHouse_FurnitureState1.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("smallItems-ts", "assets/TopDownHouse_SmallItems.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        this.load.spritesheet("cheese-ts", "assets/maasdam.png", {
            frameWidth: 16,
            frameHeight: 16,
        });

        // Level Tilemap
        this.load.tilemapTiledJSON('level3', 'assets/Level3.tmj')
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
