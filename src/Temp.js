export class Tmp extends Phaser.Scene {

    constructor() {
        super('Tmp');
    }

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

    preload() {

        this.load.spritesheet("retro-cats-sheet", "assets/RetroCatsFree.png", {
            frameWidth: 64, 
            frameHeight: 64, 
            spacing: 3, 
            startFrame: 0,
            endFrame: 0
        });
        this.load.image("floors-walls-sheet", "assets/TopDownHouse_FloorsAndWalls.png");
        this.load.tilemapTiledJSON('temporary-tilemap', 'assets/Map-tmp.tmj');
    }

    create() {

        //Adding tile map
        const tempMap = this.make.tilemap({key: 'temporary-tilemap'});

        const floorWalls = tempMap.addTilesetImage('TopDownHouse_FloorsAndWalls', 'floors-walls-sheet');

        const floor = tempMap.createLayer('Tile Layer 1', floorWalls);


        //Adding player

        // Temporary as a cat (change to mouse later)
        this.player = this.physics.add.sprite(350,600,"retro-cats-sheet", 0);
        this.player.setCollideWorldBounds(true);
    }

    update() {
        this.playerMovement(200);
    }
    
}
