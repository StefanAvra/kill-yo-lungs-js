var game = new Phaser.Game(480, 640, Phaser.AUTO, null, {
    preload: preload, create: create, update: update
});

WebFontConfig = {

    //  'active' means all requested fonts have finished loading
    //  We set a 1 second delay before calling 'createText'.
    //  For some reason if we don't the browser cannot render the text the first time it's created.
    active: function () { game.time.events.add(Phaser.Timer.SECOND, createText, this); },

    //  The Google Fonts we want to load (specify as many as you like in the array)
    google: {
        families: ['Press Start 2P']
    }

};

var ball;
var paddle;
var explosions;

var bricks;
var newBrick;
var brickInfo;

var scoreText;
var score = 0;

var lives = 3;
var livesText;
var lifeLostText;

var stages = ['0', 'IA1', 'IA2', 'IA3', 'IB', 'IIA', 'IIB', 'IIIA', 'IIIB', 'IIIC', 'IVA', 'IVA', 'IVB'];
var currentStage = 0;

var cursors;
var pauseKey;

var powerUpTextBlinkTimer = 0;
var powerUpTextBlinkI = 0;


function preload() {
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
    game.scale.pageAlignHorizontally = true;
    game.scale.pageAlignVertically = true;
    game.stage.backgroundColor = '#fabfd0';

    game.load.image('ball', 'img/ball.png');
    game.load.image('paddle', 'img/paddle.png');
    game.load.image('brick', 'img/brick.png');
    game.load.image('carcinoma', 'img/carcinoma.png');
    game.load.spritesheet('explosion', 'img/explosion.png', 30, 30);

    game.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1/webfont.js');

    game.load.audio('bgm', 'audio/bgm.mp3');
    game.load.audio('sfx:hitWall', 'audio/hitWall.mp3');
    game.load.audio('sfx:hitBrick', 'audio/hitBrick.mp3');
    game.load.audio('sfx:gameover', 'audio/gameover.mp3');
    game.load.audio('sfx:boom', 'audio/boom.mp3');

    game.load.text('level', 'levels/lung1.json');    

    game.time.advancedTiming = true; // for FPS debugging

}

function create() {

    game.physics.startSystem(Phaser.Physics.ARCADE);
    game.physics.arcade.checkCollision.down = false;

    cursors = game.input.keyboard.createCursorKeys();
    pauseKey = game.input.keyboard.addKey(Phaser.KeyCode.P);


    ball = game.add.sprite(game.world.width * 0.5, game.world.height - 25, 'ball');
    ball.anchor.set(0.5);
    game.physics.enable(ball, Phaser.Physics.ARCADE);
    ball.body.collideWorldBounds = true;
    ball.body.bounce.set(1);
    ball.body.velocity.set(150, -200);
    ball.checkWorldBounds = true;
    ball.events.onOutOfBounds.add(ballLeaveScreen, this);

    paddle = game.add.sprite(game.world.width * 0.5, game.world.height - 5, 'paddle');
    paddle.anchor.set(0.5, 1);
    game.physics.enable(paddle, Phaser.Physics.ARCADE);
    paddle.body.immovable = true;

    explosions = game.add.group();
    explosions.createMultiple(30, 'explosion');
    explosions.forEach(setupExplosion, this);

    initLevel();

    textStyle = { font: '16px Press Start 2P', fill: '#000000', align: 'center' };
    scoreText = game.add.text(25, 20, 'STAGE: ' + stages[currentStage], textStyle);
    livesText = game.add.text(game.world.width - 25, 20, 'SMOKES: ' + lives, textStyle);
    livesText.anchor.set(1, 0);
    lifeLostText = game.add.text(game.world.width * 0.5, game.world.height * 0.75, 'YOU LOST A CIG!\nCLICK TO LIGHT UP\nANOTHER ONE', textStyle);
    lifeLostText.anchor.set(0.5);
    lifeLostText.visible = false;

    gameOverText = game.add.text(game.world.width * 0.5, game.world.height * 0.75, 'GAME OVER\nCANCER FAILED\n YOUR BODY IS A TEMPLE', textStyle);
    gameOverText.anchor.set(0.5);
    gameOverText.visible = false;

    powerUpText = game.add.text(game.world.width * 0.5, game.world.height * 0.1, 'METASTASIS UNLOCKED', textStyle);
    powerUpText.anchor.set(0.5);
    powerUpText.visible = false;

    pauseText = game.add.text(game.world.width * 0.5, game.world.height * 0.5, 'PAUSE', textStyle);
    pauseText.anchor.set(0.5);
    pauseText.visible = false;

    backgroundMusic = game.add.audio('bgm');
    backgroundMusic.loopFull();
    sfx = {
        hitBrick: game.add.audio('sfx:hitBrick'),
        hitWall: game.add.audio('sfx:hitWall'),
        gameover: game.add.audio('sfx:gameover'),
        boom: game.add.audio('sfx:boom')

    }
    sfx.hitBrick.allowMultiple = false;


}

function createText() {

}

function update() {

    //  FPS debug info
    game.debug.text(game.time.fps || '--', 10, 10, "#00ff00");


    game.physics.arcade.collide(ball, paddle, ballHitPaddle);
    game.physics.arcade.collide(ball, bricks, ballHitBrick);

    if (ball.body.blocked.up === true) {
        sfx.hitWall.play();
    } else if (ball.body.blocked.left === true) {
        sfx.hitWall.play();
    } else if (ball.body.blocked.right === true) {
        sfx.hitWall.play();
    }



    // paddle movement
    if (cursors.left.isDown) {
        paddle.body.velocity.x -= 10;
    } else if (cursors.right.isDown) {
        paddle.body.velocity.x += 10;
    } else {
        paddle.x = game.input.x || game.world.width * 0.5;
        paddle.body.velocity.x = 0;
    }
    game.input.x = paddle.x;


    // powerup text
    if (powerUpText.visible == true) {
        powerUpTextBlinkTimer += game.time.physicsElapsed;
        if (powerUpTextBlinkTimer >= 0.05) {
            powerUpTextBlinkTimer = 0;
            powerUpTextBlinkI++;
            if (powerUpTextBlinkI % 2 == 0) {
                var f = powerUpText.font;
                f.fill = '#FFFFFF';
                powerUpText.addColor('#FFFFFF', 0);
            } else {
                var f = powerUpText.font;
                f.fill = '#000000';
                powerUpText.addColor('#000000', 0);
            }
            if (powerUpTextBlinkI == 30) {
                powerUpText.visible = false;
                powerUpTextBlinkI = 0;
            }

        }
    }
}

function initLevel() {

    levelData = JSON.parse(game.cache.getText('level'));
    // console.log(levelData);



    brickInfo = {
        width: 20,
        height: 5,
        count: {
            row: 69,
            col: 20,
            total: 1380,
        },
        offset: {
            top: 150,
            left: 50
        },
        padding: 0,
        maxHealth: 2,
        health: 2,
        tintArray: ["#000000"]
    };

    bricks = game.add.group();
    bricks.enableBody = true;
    levelData.layout.forEach(function (element) {
        switch (element.type) {
            case "brick":
                newBrick = game.add.sprite(element.x, element.y, 'brick');
                game.physics.enable(newBrick, Phaser.Physics.ARCADE);
                newBrick.body.immovable = true;
                newBrick.health = levelData.tileData.health;
                newBrick.tintArray = levelData.tileData.tintArray;
                newBrick.nextTint = 0;
                newBrick.brickType = element.type;
                bricks.add(newBrick);
                break;
            case "bomb":
                newBrick = game.add.sprite(element.x + 7, element.y - 1, 'carcinoma');
                game.physics.enable(newBrick, Phaser.Physics.ARCADE);
                newBrick.body.immovable = true;
                newBrick.health = 1;
                newBrick.brickType = element.type;
                bricks.add(newBrick);
                break;

        }
    });

}

function ballHitBrick(ball, brick) {
    brick.damage(1);
    switch (brick.brickType) {
        case "brick":
            sfx.hitBrick.play();
            break;

        case "bomb":
            sfx.boom.play();
            var explosion = explosions.getFirstExists(false);
            explosion.reset(brick.body.x, brick.body.y);
            explosion.play('explosion', 60, false, true);
            powerUpText.visible = true;
            break;
    }


    var count_alive = 0;
    for (i = 0; i < bricks.children.length; i++) {
        if (bricks.children[i].alive == true) {
            count_alive++;
        }
    }

    if (brick.alive == false) {
        if (stages.length > currentStage + 1) {
            currentStage = getCurrentStageByBricks(count_alive);
            scoreText.setText('STAGE: ' + stages[currentStage]);
        }
    } else {
        brick.tint = brick.tintArray[brick.nextTint];
        brick.nextTint++;
    }

    if (count_alive == 0) {
        alert('You won the game, congratulations!');
        location.reload();
    }

}
function ballHitPaddle() {
    ball.body.velocity.x = -1 * 5 * (paddle.x - ball.x);
    sfx.hitWall.play();
}

function ballLeaveScreen() {
    ball.body.velocity.set(0);
    lives--;
    backgroundMusic.stop();
    if (lives) {
        livesText.setText('SMOKES: ' + lives);
        lifeLostText.visible = true;
        ball.reset(game.world.width * 0.5, game.world.height - 25);
        paddle.reset(game.world.width * 0.5, game.world.height - 5);
        game.input.onDown.addOnce(function () {
            lifeLostText.visible = false;
            backgroundMusic.play();
            ball.body.velocity.set(150, -200);
        }, this);
    }
    else {
        gameOverText.visible = true;

        sfx.gameover.play();
        game.input.onDown.addOnce(function () {
            location.reload();
        }, this);


    }
}

function setupExplosion(explosion) {
    explosion.anchor.x = 0.5;
    explosion.anchor.y = 0.5;
    explosion.animations.add('explosion');
}

const scale = (num, in_min, in_max, out_min, out_max) => {
    return (num - in_min) * (out_max - out_min) / (in_max - in_min) + out_min;
}

function getCurrentStageByBricks(count_alive) {
    return Math.round(scale(count_alive, brickInfo.count.total, 0, 0, stages.length));
}