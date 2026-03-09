export class Tmp extends Phaser.Scene {

    constructor() {
        super('Tmp');
    }

    // Moves the player around the map
    playerMovement(speed){

        this.playerKeys = this.input.keyboard.addKeys({up: "W", down: "S", left: "A", right: "D"});

        if(this.playerKeys.up.isDown){
            this.player.setVelocityY(-speed/Math.sqrt(2));
        }
        else if(this.playerKeys.down.isDown){
            this.player.setVelocityY(speed/Math.sqrt(2));
        }
        else if(this.playerKeys.left.isDown){
            this.player.setVelocityX(-speed/Math.sqrt(2));
        }
        else if(this.playerKeys.right.isDown){
            this.player.setVelocityX(speed/Math.sqrt(2));
        }
        else{
            this.player.setVelocityX(0);
            this.player.setVelocityY(0);
        }
    }

    // Camera follows the player around
    camera(map, player){
        this.cameras.main.setBounds(0, 0, map.widthInPixels, map.heightInPixels);
        this.cameras.main.startFollow(player, true, 0.1, 0.1);
    }

    preload() {

        // Load the Cat from the Spritesheet
        this.load.spritesheet("retro-cats-sheet", "assets/RetroCatsFree.png", {
            frameWidth: 64, 
            frameHeight: 64, 
            spacing: 3, 
            startFrame: 0,
            endFrame: 0
        });

        // Floors and Walls
        this.load.image("floors-walls-sheet", "assets/TopDownHouse_FloorsAndWalls.png");

        // Level Tilemap (Subject to Change)
        this.load.tilemapTiledJSON('temporary-tilemap', 'assets/Map-tmp.tmj');
    }

    create() {

        //Adding tile map
        this.tempMap = this.make.tilemap({key: 'temporary-tilemap'});

        this.floorWalls = this.tempMap.addTilesetImage('TopDownHouse_FloorsAndWalls', 'floors-walls-sheet');

        this.floor = this.tempMap.createLayer('Tile Layer 1', this.floorWalls);


        //Adding player

        // Temporary as a cat (change to mouse later)
        this.player = this.physics.add.sprite(350,600,"retro-cats-sheet", 0);
        // this.player.setCollideWorldBounds(true);
    }

    update() {
        this.playerMovement(200);
        this.camera(this.tempMap, this.player);
    }
    
}
