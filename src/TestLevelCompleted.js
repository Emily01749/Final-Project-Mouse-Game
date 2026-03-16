export class TestLevelCompleted extends Phaser.Scene {

    constructor() {
        super('TestLevelCompleted');
    }


    init(data){
        this.bestTime = data.bestTime;
        this.bestScore = data.bestScore;
    }

    create() {
        console.log(this.bestTime);
        console.log(this.bestScore);

        this.add.text(400, 170, "Time: " + this.bestTime, {
            fontSize: "32px",
            fontFamily : "Courtier New",
            color : "white"
        });

        this.add.text(870, 170, "Score: " + this.bestScore, {
            fontSize: "32px",
            fontFamily : "Courtier New",
            color : "white"
        });

    }

    update() {
        
    }
    
}
