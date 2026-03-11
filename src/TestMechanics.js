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

        this.playerHealth = 5;

        this.healthDisplayText = this.add.text(x , y, "(Health Bar): " + this.playerHealth, {
            fontSize: "32px",
            fontFamily : "Courtier New",
            color : "black"
        }).setOrigin(0.5);

        this.healthDisplayText.setScrollFactor(0);
    }

    // -----------
    // Timer
    // -----------
    
    // Timer Formatting: https://phaser.discourse.group/t/countdown-timer/2471/4

    createTimer(x , y){
        this.initialTime = 90;

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

        // Sets velocity for up, down, left, right, otherwise 0 for idle
        if(this.playerKeys.up.isDown){
            this.player.setVelocityY(-speed/2);
        }
        else if(this.playerKeys.down.isDown){
            this.player.setVelocityY(speed/2);
        }
        else if(this.playerKeys.left.isDown){
            this.player.setVelocityX(-speed/2);
        }
        else if(this.playerKeys.right.isDown){
            this.player.setVelocityX(speed/2);
        }
        else{
            this.player.setVelocityX(0);
            this.player.setVelocityY(0);
        }
    }

    // -----------------------------------------------------------------------------
    // --------------------------------- Objects -----------------------------------
    // -----------------------------------------------------------------------------

    // -----------
    // Collisions
    // -----------
    setupObjCollisions(objects){
        objects.forEach(obj => {
            this.physics.world.enable(obj);
            obj.body.allowGravity = false;
            obj.body.immovable = true;
        });
    }

    cheeseObjCollisions(player, cheese){
        this.setupObjCollisions(cheese);

        this.physics.add.collider(player, cheese, (plyer, chese) => {
            console.log("Player touched cheese");
            chese.body.enable = false;
            this.winLevel();
        });
    }

    bowlObjCollisions(player, catBowl){

        this.setupObjCollisions(catBowl);
   
        this.physics.add.collider(player, catBowl, (player, bowl)=>{
            console.log("Player touched object");

            bowl.setVisible(false);
            bowl.body.enable = false;

            this.playerHealth -= 1;

            this.healthDisplayText.text = "(Health Bar): " + this.playerHealth;

            this.gameOver();

        });
    }

    catCollisions(player, cat){

        player.body.onOverlap = true;

        this.physics.add.overlap(player, cat, (p, c) => {

            c.setAlpha(0.5);

            if(this.playerHealth > 0){
                this.playerHealth -= 0.05;
            }
            else{
                this.playerHealth = 0;
                this.gameOver();
            }

            console.log(this.playerHealth);

            this.healthDisplayText.text = "(Health Bar): " + this.playerHealth.toFixed(2);

        });
    }

    // -----------------------------------------------------------------------------
    // --------------------------------- Game Over  --------------------------------
    // -----------------------------------------------------------------------------

    winLevel(){
        this.scene.start("LevelCompleted");
    }

    gameOver(){
        if(this.playerHealth == 0){
            this.scene.start("GameOver");
        }
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

        this.load.spritesheet("furniture-ts", "assets/Furnitures.png", {
            frameWidth: 32, 
            frameHeight: 32, 
            spacing: 0, 
            startFrame: 116,
            endFrame: 116
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
        this.cheeseObj = this.tempMap.createFromObjects("cheese", {gid : 136, key : "furniture-ts"});

        // --------------- Timer ---------------
        this.createTimer(650, 170);

        // --------------- Player ---------------

        // Temporary as a cat (change to mouse later)
        this.player = this.physics.add.sprite(350,600,"mouse-ts");
        // this.player.setCollideWorldBounds(true);

        // --------------- Enemy / Trap ---------------

        this.cat = this.physics.add.sprite(500, 600, "cat-ts");

        // --------------- Object Collisions ---------------

        // Display Health Bar
        // Parameters: x, y, amount Of Player Health
        this.displayHealth(400, 170, this.playerHealth);

        // Player collides with cat bowl
        // Parameters: player, catBowl
        this.bowlObjCollisions(this.player, this.bowlsObj, this.playerHealth);

        this.cheeseObjCollisions(this.player, this.cheeseObj);

        this.catCollisions(this.player, this.cat, this.playerHealth);

    }

    update() {
        // Sets up the Camera
        // Parameters: tilemap, player, zoom
        this.camera(this.tempMap, this.player, 1.55);

        // Moves the player; Keyboard Controls: W A S D
        // Parameters: speed
        this.playerMovement(1000);

        if(this.seconds > 30){

            this.physics.moveToObject(this.cat, this.player, 100);
            
        }
        else{
            this.cat.setVelocityX(0);
            this.cat.setVelocityY(0);
        }
       
    }
    
}
