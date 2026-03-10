export class Tmp extends Phaser.Scene {

    constructor() {
        super('Tmp');
    }

    // -----------------------------------------------------------------------------
    // --------------------------------- Scene  ------------------------------------
    // -----------------------------------------------------------------------------
    
    // Camera follows the player around
    camera(map, player, zoom){
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels).setZoom(zoom);
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
    }

    // -----------------------------------------------------------------------------
    // --------------------------------- Player ------------------------------------
    // -----------------------------------------------------------------------------

    // Moves the player around the map
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
    // --------------------------------- Objects ------------------------------------
    // -----------------------------------------------------------------------------

    setupObjCollisions(objects){
        objects.forEach(obj => {
            this.physics.world.enable(obj);
            obj.body.allowGravity = false;
            obj.body.immovable = true;
        });
    }

    bowlObjCollisions(player, bowl){
        
        this.setupObjCollisions(bowl);

        this.physics.add.collider(player, bowl, ()=>{
            console.log("Player touched bowl");
        });
    }

    preload() {

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

        // Load Objects
        this.load.spritesheet("foodBowls-ts", "assets/CatBowls.png", {
            frameWidth: 16, 
            frameHeight: 16, 
            spacing: 0, 
            startFrame: 0,
            endFrame: 0
        });


        // Level Tilemap (Subject to Change)
        this.load.tilemapTiledJSON('temporary-tilemap', 'assets/Map-tmp.tmj');
    }

    create() {


        //Adding tile map
        this.tempMap = this.make.tilemap({key: 'temporary-tilemap'});

        this.floor = this.tempMap.addTilesetImage('Floor', 'floors-ts');

        this.floorLayer = this.tempMap.createLayer("floor", this.floor);

        this.bowlsObj = this.tempMap.createFromObjects("foodBowls", {gid : 19, key: "foodBowls-ts"});

        //Adding player

        // Temporary as a cat (change to mouse later)
        this.player = this.physics.add.sprite(350,600,"cat-ts");
        // this.player.setCollideWorldBounds(true);

        this.bowlObjCollisions(this.player, this.bowlsObj);
    }

    update() {
        this.playerMovement(1000);
        this.camera(this.tempMap, this.player, 1.65);
    }
    
}
