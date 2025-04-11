import Phaser from 'phaser';

class BattleScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BattleScene' });
        console.log('BattleScene constructor called');
    }

    init(data) {
        console.log('BattleScene init data:', data);
        
        try {
            this.playerData = data.playerData || { hp: 100, xp: 0, level: 1 }; // Default values if missing
            this.question = data.question || "Default question if none provided";
            this.enemyData = data.enemyData || { name: "Unknown Enemy" };
            this.mainSceneRef = data.mainSceneRef;

            // Battle state
            this.playerHP = this.playerData.hp;
            this.enemyHP = 50; // Example enemy HP
            
            console.log('BattleScene initialized successfully with:', {
                playerHP: this.playerHP,
                enemyHP: this.enemyHP,
                question: this.question
            });
        } catch (err) {
            console.error('Error in BattleScene.init:', err);
        }
    }

    preload() {
        console.log('BattleScene preload started');
        // Preload battle-specific assets if needed
        // For now, we assume enemy sprite is loaded in MainScene
        // this.load.image('battle_bg', 'assets/ui/battle_background.png');
    }

    create() {
        console.log('BattleScene create started');
        
        try {
            // Optional: Dim or change background
            this.cameras.main.setBackgroundColor('rgba(0, 0, 0, 0.6)');

            // --- Battle UI --- 
            console.log('Creating battle UI elements');

            // Enemy display
            // const enemySprite = this.add.sprite(this.cameras.main.centerX, 150, this.enemyData.spriteKey || 'enemy').setScale(2);
            this.add.text(100, 50, `Enemy: ${this.enemyData.name}`, { fontSize: '24px', fill: '#fff' });
            this.enemyHPText = this.add.text(600, 50, `HP: ${this.enemyHP}`, { fontSize: '24px', fill: '#ff0000' });

            // Player display
            this.add.text(100, 500, `Player`, { fontSize: '24px', fill: '#fff' });
            this.playerHPText = this.add.text(600, 500, `HP: ${this.playerHP}`, { fontSize: '24px', fill: '#00ff00' });

            // Question display
            this.questionText = this.add.text(this.cameras.main.centerX, 250, this.question, {
                fontSize: '20px',
                fill: '#fff',
                align: 'center',
                wordWrap: { width: 700 }
            }).setOrigin(0.5);

            // Generate and display multiple-choice options
            console.log('Generating answer options');
            this.displayOptions();
            
            console.log('BattleScene create completed successfully');
        } catch (err) {
            console.error('Error in BattleScene.create:', err);
        }
    }

    displayOptions() {
        console.log('displayOptions called');
        // Clear previous options if any
        if (this.optionTexts) {
            this.optionTexts.forEach(text => text.destroy());
        }
        this.optionTexts = [];

        const options = this.generateOptions(this.question);
        console.log('Generated options:', options);
        
        let optionY = 350;
        options.forEach((option, index) => {
            const optionText = this.add.text(this.cameras.main.centerX, optionY, `${index + 1}. ${option.text}`, {
                fontSize: '18px',
                fill: '#fff',
                backgroundColor: '#555',
                padding: { x: 10, y: 5 }
            })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

            optionText.on('pointerdown', () => {
                this.handleAnswer(option.isCorrect, optionText);
            });
            optionText.on('pointerover', () => optionText.setBackgroundColor('#777'));
            optionText.on('pointerout', () => optionText.setBackgroundColor('#555'));

            this.optionTexts.push(optionText);
            optionY += 50;
        });
        
        // Re-enable input
        this.input.enabled = true;
        console.log('displayOptions completed');
    }

    // Simple dummy option generator
    generateOptions(correctAnswer) {
        console.log('generateOptions called with:', correctAnswer);
        const options = [{ text: correctAnswer, isCorrect: true }];
        const dummyAnswers = [
            "Syntax Error",
            "Off-by-one error",
            "Check the API limits",
            "Clear the cache",
            "It works on my machine",
            "Race condition",
            "Floating point inaccuracy",
            "Segmentation fault"
        ];

        const shuffledDummies = Phaser.Utils.Array.Shuffle(dummyAnswers.slice());
        let count = 0;
        for(let i = 0; i < shuffledDummies.length && count < 3; i++) {
            // Ensure dummy is not exactly the correct answer (case-insensitive check)
            if (shuffledDummies[i].toLowerCase() !== correctAnswer.toLowerCase()) {
                options.push({ text: shuffledDummies[i], isCorrect: false });
                count++;
            }
        }

        // Ensure we always have 4 options if possible
        while (options.length < 4 && dummyAnswers.length >= options.length) {
            const extraDummy = dummyAnswers.find(ans => !options.some(opt => opt.text.toLowerCase() === ans.toLowerCase()));
            if(extraDummy) {
                options.push({ text: extraDummy, isCorrect: false });
            }
            // Break if we can't find any more unique dummies (shouldn't happen with the list size)
            if (!extraDummy) break;
        }

        return Phaser.Utils.Array.Shuffle(options);
    }

    handleAnswer(isCorrect, selectedText) {
        console.log('handleAnswer called, isCorrect:', isCorrect);
        if (!this.input.enabled) return; // Prevent double clicks

        // Disable further clicks during feedback
        this.input.enabled = false;
        // Visually indicate the choice
        this.optionTexts.forEach(text => text.setBackgroundColor('#555')); // Reset others
        selectedText.setBackgroundColor(isCorrect ? '#008000' : '#8B0000'); // Darker correct/incorrect indication

        let feedbackMsg = "";
        if (isCorrect) {
            const damage = Phaser.Math.Between(20, 35); // Damage range
            this.enemyHP = Math.max(0, this.enemyHP - damage);
            this.enemyHPText.setText(`HP: ${this.enemyHP}`);
            this.playerData.xp += 15; // Gain XP
            feedbackMsg = `Correct! Enemy takes ${damage} damage. (+15 XP)`;
            this.showFeedback(feedbackMsg, true);
        } else {
            const damage = Phaser.Math.Between(10, 20);
            this.playerHP = Math.max(0, this.playerHP - damage);
            this.playerData.hp = this.playerHP; // Update player data HP immediately
            this.playerHPText.setText(`HP: ${this.playerHP}`);
            feedbackMsg = `Incorrect! Player takes ${damage} damage.`;
            this.showFeedback(feedbackMsg, false);
        }

        // Check battle end conditions after a short delay for feedback
        this.time.delayedCall(1800, () => {
            if (this.enemyHP <= 0) {
                this.endBattle(true); // Player wins
            } else if (this.playerHP <= 0) {
                this.endBattle(false); // Player loses (Game Over)
            } else {
                // For MVP: Battle ends after one question
                this.endBattle(true); // Treat as win for now if player survived
            }
        });
    }

    showFeedback(message, isCorrect) {
        console.log('showFeedback:', message);
        const feedbackText = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, message, {
            fontSize: '24px',
            fill: isCorrect ? '#90EE90' : '#F08080', // Lighter Green/Red
            backgroundColor: 'rgba(0,0,0,0.8)',
            padding: { x: 15, y: 8 },
            align: 'center'
        }).setOrigin(0.5);

        // Fade out the feedback text after a delay
        this.tweens.add({
            targets: feedbackText,
            alpha: 0,
            ease: 'Power1',
            duration: 1500, // Duration of fade
            delay: 1000, // Wait before starting fade
            onComplete: () => {
                feedbackText.destroy();
            }
        });
    }

    endBattle(playerWon) {
        console.log("Battle Ended. Player Won:", playerWon);

        if (playerWon) {
            // Check for level up ONLY if player won
            const xpForNextLevel = 75 * Math.pow(1.2, this.playerData.level - 1); // Exponential XP curve
            if (this.playerData.xp >= xpForNextLevel) {
                this.playerData.level++;
                this.playerData.xp = this.playerData.xp - xpForNextLevel; // Carry over remaining XP
                const maxHpForLevel = 80 + this.playerData.level * 20; // Increase max HP
                this.playerData.hp = Math.min(this.playerData.hp + 30, maxHpForLevel); // Restore some HP, cap at new max
                console.log(`LEVEL UP! Reached Level ${this.playerData.level}. Max HP: ${maxHpForLevel}`);
            }
        } else {
            // Handle Game Over
            console.log("GAME OVER");
            this.playerData.hp = 0; // Ensure HP is 0
        }

        // Use the main scene reference to update player data and potentially remove enemy
        if (this.mainSceneRef) {
            console.log('Calling mainSceneRef.updatePlayerData with:', this.playerData);
            this.mainSceneRef.updatePlayerData(this.playerData);
            if(playerWon && this.enemyData.gameObject) {
                console.log('Calling mainSceneRef.removeEnemy with:', this.enemyData.gameObject);
                this.mainSceneRef.removeEnemy(this.enemyData.gameObject);
            }
        }

        // Stop this scene and resume the main scene
        this.scene.stop('BattleScene');
        this.scene.resume('MainScene');
    }

}

console.log('BattleScene module loaded');
export default BattleScene; 