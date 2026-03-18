export class TestGameOver extends Phaser.Scene {

    constructor() {
        super('TestGameOver');
    }

    init(data){
        this.bestTime = data.bestTime;
        this.bestScore = data.bestScore;
    }

    create() {
        console.log(this.bestTime);
        console.log(this.bestScore);

        this.add.text(270, 20, "Time: " + this.bestTime, {
            fontSize: "15px",
            fontFamily : "Courtier New",
            color : "white"
        });

        this.add.text(160, 20, "Score: " + this.bestScore, {
            fontSize: "15px",
            fontFamily : "Courtier New",
            color : "white"
        });

    }

    update() {
        
    }
    
}
