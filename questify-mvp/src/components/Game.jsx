import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import BattleScene from './BattleScene.jsx'; // Import the BattleScene with correct extension

// Main game scene
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.playerData = null; // Initialize player data holder
        this.questions = [];
    }

    init(data) {
        // Receive questions from React component
        this.questions = data.questions || [];
        console.log("MainScene Initialized with questions:", this.questions);

        // Initialize or load player data
        // Try loading from LocalStorage first
        const savedData = localStorage.getItem('questifyPlayerData');
        if (savedData) {
            try {
                this.playerData = JSON.parse(savedData);
                console.log("Loaded player data from LocalStorage:", this.playerData);
                 // Basic validation
                 if (typeof this.playerData.hp !== 'number' || typeof this.playerData.xp !== 'number' || typeof this.playerData.level !== 'number') {
                     throw new Error("Invalid player data format");
                 }
                 // Ensure HP isn't starting at 0 from a previous game over
                 if (this.playerData.hp <= 0) {
                    this.playerData.hp = 80 + this.playerData.level * 20; // Reset HP based on level
                 }
            } catch (e) {
                console.error("Failed to parse player data from LocalStorage, resetting:", e);
                localStorage.removeItem('questifyPlayerData'); // Clear corrupted data
                this.playerData = null; // Force re-initialization
            }
        }

        if (!this.playerData) {
            this.playerData = {
                hp: 100,
                maxHp: 100,
                xp: 0,
                level: 1,
            };
            console.log("Initialized new player data:", this.playerData);
        }
         // Calculate max HP based on level for consistency
        this.playerData.maxHp = 80 + this.playerData.level * 20;
        this.playerData.hp = Math.min(this.playerData.hp, this.playerData.maxHp); // Ensure current HP doesn't exceed max

        // Save initial/loaded data
        this.savePlayerData();
    }

    preload() {
        console.log("MainScene preload started");
        // Full URLs for testing
        const playerURL = window.location.origin + '/assets/sprites/player_placeholder.png';
        const enemyURL = window.location.origin + '/assets/sprites/enemy_placeholder.png';
        console.log("Loading assets from:", { playerURL, enemyURL });
        
        // Load assets
        this.load.image('player', playerURL);
        this.load.image('enemy', enemyURL);
        console.log("MainScene preload completed");
    }

    create() {
         // Basic world setup (replace with tilemap later)
        this.cameras.main.setBackgroundColor('#2d2d2d');
        this.physics.world.setBounds(0, 0, 1600, 1200); // Larger world bounds

        // --- Player Setup --- 
        this.player = this.physics.add.sprite(100, 100, 'player');
        this.player.setCollideWorldBounds(true);
        this.cameras.main.startFollow(this.player, true, 0.1, 0.1); // Camera follows player
        this.cameras.main.setBounds(0, 0, 1600, 1200);

        this.createPlayerAnimations();

        // --- Enemy Setup --- 
        this.enemies = this.physics.add.staticGroup();
        // Add some enemies at different positions
        this.addEnemy(300, 200, 'Slime');
        this.addEnemy(600, 400, 'Goblin');
        this.addEnemy(250, 550, 'Bat');

        // --- Collision Setup --- 
        this.physics.add.collider(this.player, this.enemies, this.handlePlayerEnemyCollision, null, this);

        // --- UI Setup --- 
        this.hpText = this.add.text(16, 16, '', { fontSize: '18px', fill: '#00ff00', stroke: '#000000', strokeThickness: 4 }).setScrollFactor(0);
        this.xpText = this.add.text(16, 40, '', { fontSize: '18px', fill: '#ffff00', stroke: '#000000', strokeThickness: 4 }).setScrollFactor(0);
        this.levelText = this.add.text(16, 64, '', { fontSize: '18px', fill: '#ffffff', stroke: '#000000', strokeThickness: 4 }).setScrollFactor(0);
        this.updateUI(); // Initial UI update

        // --- Input Setup --- 
        this.cursors = this.input.keyboard.createCursorKeys();

        // --- Scene Resumption Logic --- 
        // Listen for the battle end event from BattleScene (though direct calls might be simpler)
        // this.events.on('resume', this.handleResume, this);

        console.log("MainScene create finished.");

    }

     createPlayerAnimations() {
        console.log("Creating player animations");
        // Simple animations for a still image (no frames)
        if (this.anims.exists('left')) {
            console.log("Animations already exist, skipping creation");
            return;
        }

        try {
            // Create basic animations that just use the same frame
            this.anims.create({
                key: 'left',
                frames: [ { key: 'player' } ],
                frameRate: 10
            });
            this.anims.create({
                key: 'turn',
                frames: [ { key: 'player' } ],
                frameRate: 10
            });
            this.anims.create({
                key: 'right',
                frames: [ { key: 'player' } ],
                frameRate: 10
            });
            this.anims.create({
                key: 'up',
                frames: [ { key: 'player' } ],
                frameRate: 10
            });
            this.anims.create({
                key: 'down',
                frames: [ { key: 'player' } ],
                frameRate: 10
            });
            console.log("Player animations created successfully");
        } catch (err) {
            console.error("Error creating animations:", err);
        }
    }

    addEnemy(x, y, name) {
        const enemy = this.enemies.create(x, y, 'enemy');
        enemy.name = name;
        // Optional: Make enemy slightly interactive (e.g., tint on hover)
        // enemy.setInteractive();
        // enemy.on('pointerover', () => enemy.setTint(0xff0000));
        // enemy.on('pointerout', () => enemy.clearTint());
        return enemy;
    }

    handlePlayerEnemyCollision(player, enemy) {
        // Prevent immediate re-collision if battle starts/ends quickly
        if (!enemy.active) return;
        if (this.scene.isPaused('MainScene')) return; // Don't trigger if already transitioning

        console.log(`Collision with enemy: ${enemy.name}`);
        const question = this.getRandomQuestion();

        if (!question) {
            console.warn("No questions available to start battle!");
            // Optional: Briefly disable the enemy to prevent spamming
            enemy.disableBody(true, false); // Make inactive but keep visible
            this.time.delayedCall(2000, () => { enemy.enableBody(true, enemy.x, enemy.y, true, true); });
            return;
        }

        // Pause this scene's physics and input
        this.physics.pause();
        this.input.keyboard.enabled = false;
        player.setVelocity(0, 0);
        player.anims.play('turn');

        // Pause MainScene and launch BattleScene
        this.scene.pause('MainScene');
        this.scene.launch('BattleScene', {
            playerData: this.playerData,
            question: question,
            enemyData: { name: enemy.name, gameObject: enemy }, // Pass enemy info and the GameObject itself
            mainSceneRef: this // Pass a reference to this scene
        });
    }

    getRandomQuestion() {
        if (!this.questions || this.questions.length === 0) {
            return null; // Or a default question like "No questions loaded?"
        }
        return Phaser.Utils.Array.GetRandom(this.questions);
    }

    updatePlayerData(newData) {
         console.log("MainScene received updated player data:", newData);
         // Basic validation before merging
         if (newData && typeof newData.hp === 'number' && typeof newData.xp === 'number' && typeof newData.level === 'number') {
            this.playerData = { ...this.playerData, ...newData };
             // Recalculate max HP based on potential level change
             this.playerData.maxHp = 80 + this.playerData.level * 20;
             this.playerData.hp = Math.min(this.playerData.hp, this.playerData.maxHp); // Clamp HP

            this.updateUI();
            this.savePlayerData();

            if (this.playerData.hp <= 0) {
                this.handleGameOver();
            }
         } else {
            console.error("Received invalid player data from battle:", newData);
         }
    }

    removeEnemy(enemyGameObject) {
        console.log(`MainScene removing enemy: ${enemyGameObject.name}`);
        if (enemyGameObject && enemyGameObject.active) {
             this.enemies.remove(enemyGameObject, true, true); // Remove from group and destroy
        }
         // Check if all enemies are defeated
        if (this.enemies.countActive(true) === 0) {
            this.handleVictory();
        }
    }

    handleResume() {
        console.log("MainScene resumed.");
        // Re-enable input and physics (might not be needed if pause/resume handles it)
        this.input.keyboard.enabled = true;
        this.physics.resume();
         this.createPlayerAnimations(); // Ensure anims are recreated if purged
        this.updateUI(); // Refresh UI in case data changed while paused
    }

     handleGameOver() {
        console.log("GAME OVER triggered in MainScene");
        this.physics.pause();
        this.player.setTint(0xff0000); // Tint player red
        this.player.anims.stop();
        this.input.keyboard.enabled = false;

        // Display Game Over message
         this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'GAME OVER', {
            fontSize: '64px', fill: '#ff0000', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0);

        // Option to restart? For now, just stops.
        // Maybe clear saved data on game over?
        // localStorage.removeItem('questifyPlayerData');

        // Consider stopping the scene or transitioning elsewhere
        // this.scene.stop();
     }

      handleVictory() {
        console.log("ALL ENEMIES DEFEATED - VICTORY!");
        this.physics.pause();
        this.player.anims.stop();
        this.input.keyboard.enabled = false;

        // Display Victory message
         this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, 'VICTORY!', {
            fontSize: '64px', fill: '#ffff00', stroke: '#000', strokeThickness: 6
        }).setOrigin(0.5).setScrollFactor(0);

        // Consider transitioning to a summary screen or next level
     }


    updateUI() {
        if (!this.playerData) return;
         const xpForNextLevel = 75 * Math.pow(1.2, this.playerData.level - 1);
         this.hpText.setText(`HP: ${Math.max(0, this.playerData.hp)} / ${this.playerData.maxHp}`);
         this.xpText.setText(`XP: ${this.playerData.xp} / ${Math.ceil(xpForNextLevel)}`);
         this.levelText.setText(`Level: ${this.playerData.level}`);

         // Change HP text color based on health % (example)
        const hpPercent = this.playerData.hp / this.playerData.maxHp;
        if (hpPercent <= 0) this.hpText.setFill('#ff0000');
        else if (hpPercent < 0.3) this.hpText.setFill('#ff8c00'); // Orange
        else if (hpPercent < 0.6) this.hpText.setFill('#ffff00'); // Yellow
        else this.hpText.setFill('#00ff00'); // Green
    }

    savePlayerData() {
        if (this.playerData) {
            try {
                localStorage.setItem('questifyPlayerData', JSON.stringify(this.playerData));
                console.log("Saved player data:", this.playerData);
            } catch (e) {
                console.error("Failed to save player data to LocalStorage:", e);
            }
        }
    }

    update(time, delta) {
        // Handle player movement only if the scene is active and not paused
        if (!this.player || !this.cursors || !this.input.keyboard.enabled || this.scene.isPaused('MainScene')) {
            if (this.player && this.player.body) {
                 this.player.setVelocity(0);
                 if(this.player && this.player.anims) this.player.anims.play('turn', true);
            }
            return;
        }

         // Don't allow movement if HP is 0
         if (this.playerData.hp <= 0) {
            this.player.setVelocity(0);
            return;
         }

        const speed = 200;
        let velocityX = 0;
        let velocityY = 0;

        if (this.cursors.left.isDown) {
            velocityX = -speed;
        } else if (this.cursors.right.isDown) {
            velocityX = speed;
        }

        if (this.cursors.up.isDown) {
            velocityY = -speed;
        } else if (this.cursors.down.isDown) {
            velocityY = speed;
        }

        this.player.setVelocityX(velocityX);
        this.player.setVelocityY(velocityY);

        // Normalize diagonal speed
        if (this.player.body && this.player.body.velocity) {
            this.player.body.velocity.normalize().scale(speed);
        }

        // Update animations based on velocity
        if (!this.player.anims) return; // Skip animation if anims not available

        if (velocityX < 0) {
            this.player.anims.play('left', true);
        } else if (velocityX > 0) {
            this.player.anims.play('right', true);
        } else if (velocityY < 0) {
            this.player.anims.play('up', true);
        } else if (velocityY > 0) {
            this.player.anims.play('down', true);
        } else {
            this.player.anims.play('turn');
        }
    }
}

// React component wrapper for the Phaser game
function Game({ questions }) {
  const gameContainer = useRef(null);
  const gameInstance = useRef(null);
  const [error, setError] = useState(null);
  const [gameStatus, setGameStatus] = useState('Loading game...');

  useEffect(() => {
    console.log('Game component mounted', { 
      containerExists: !!gameContainer.current,
      gameInstanceExists: !!gameInstance.current,
      questionsLength: questions.length
    });

    try {
      if (!gameContainer.current || gameInstance.current) {
          console.log('Early return - container or game instance condition not met');
          return;
      }

      setGameStatus('Creating Phaser config...');
      const config = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameContainer.current,
        physics: {
          default: 'arcade',
          arcade: {
            debug: true // Enable physics debug to see what's happening
          }
        },
        scene: [MainScene, BattleScene],
        // Add baseURL to help with asset loading
        loader: {
          baseURL: '',
          crossOrigin: 'anonymous'
        }
      };

      console.log('Initializing Phaser game with config:', config);
      setGameStatus('Creating Phaser game...');
      
      // Create the Phaser game instance and store it in the ref
      gameInstance.current = new Phaser.Game(config);
      console.log('Phaser game created:', gameInstance.current);

      // Start the MainScene, passing the questions
      setGameStatus('Starting main scene...');
      gameInstance.current.scene.start('MainScene', { questions: questions });
      console.log('MainScene started with questions:', questions);
      
      setGameStatus('Game ready!');

      return () => {
        console.log('Game component unmounting, destroying Phaser instance');
        if (gameInstance.current) {
            gameInstance.current.destroy(true);
            gameInstance.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing Phaser game:', err);
      setError(err.message);
      setGameStatus('Error initializing game');
    }
  }, [questions]); // Dependency array includes questions

  return (
    <div>
      {error && (
        <div style={{ color: 'red', padding: '10px', margin: '10px 0', border: '1px solid red' }}>
          <h3>Error initializing game:</h3>
          <p>{error}</p>
        </div>
      )}
      <div style={{ fontSize: '14px', color: '#888', marginBottom: '10px' }}>
        {gameStatus} (Questions: {questions.length})
      </div>
      <div 
        ref={gameContainer} 
        id="phaser-game-container" 
        style={{ 
          width: '800px', 
          height: '600px', 
          margin: 'auto',
          border: '1px solid #ccc',
          backgroundColor: '#000'
        }}
      />
    </div>
  );
}

export default Game;
