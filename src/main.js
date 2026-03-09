import { Start } from './scenes/Start.js';
import { Level1 } from './scenes/Level1.js';
import { Level2} from './scenes/Level2.js';
import { Level3 } from './scenes/Level3.js';
import { LevelCompleted } from './scenes/LevelCompleted.js';
import { GameOver } from './scenes/GameOver.js';

const config = {
    type: Phaser.AUTO,
    title: 'CMPM 176 Mouse Game',
    description: '',
    parent: 'game-container',
    width: 1280 / 1.12,
    height: 720 / 1.12,
    backgroundColor: '#000000',
    pixelArt: false,
    scene: [
        Start,
        Level1,
        Level2,
        Level3,
        LevelCompleted,
        GameOver
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    
    //adding physics
    physics: {
    default: 'arcade',
        arcade: {
            gravity: {
                x: 0,
                y: 0 
            },
            debug: true
        }
    },
}

new Phaser.Game(config);
            