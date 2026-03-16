export class Level2 extends Phaser.Scene {

    constructor() {
        super('Level2');
    }

    preload() {
        this.loadTiledJSON('level2', 'assets/176_level_2.tmj');
        this.load.image('FloorsWalls', 'assets/TopDownHouse_FloorsAndWalls.png');
        this.load.image('idle2Cat', 'assets/Idle2Cattt.png');
        this.load.image('idleXmasCat', 'assets/IdleCatt.png');
        this.load.image('Mouse', 'assets/MouseSpritesheet.png');
        this.load.image('Furniture1', 'assets/TopDownHouse_FurnitureState1.png');
        this.load.image('Furniture2', 'assets/TopDownHouse_FurnitureState2.png');
        this.load.image('SmallItems', 'assets/TopDownHouse_SmallItems.png');
    }

    create() {
        // Tiled map
        const map = this.make.tilemap({key: 'level2'})

        // Tilesets
        const floorsWalls = map.addTilesetImage('FloorsWalls', 'FloorsWalls');
        const furniture1 = map.addTilesetImage('Furniture1', 'Furniture1');
        const furniture2 = map.addTilesetImage('Furniture2', 'Furniture2');
        const smallItems = map.addTilesetImage('SmallItems', 'SmallItems');

        //layers
        const Decorations = map.this.createLayer('deco', [furniture1, furniture2, smallItems]);
        const Rugs = map.createLayer('rug', furniture2);
        const Ground = map.createLayer('ground', floorsWalls);

       Decorations.setCollisionByProperty({collision : true});
       this.physics.add.collider(this.player, Decorations); // <- assuming its called this.player
       

    }

    update() {
        
    }
    
}
