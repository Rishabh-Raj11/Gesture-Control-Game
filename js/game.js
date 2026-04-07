class Game {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.width = 1000;
        this.height = 700;
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.state = 'LOADING'; 
        this.score = 0;
        this.health = 100;
        this.sensitivity = 1.0;
        
        this.player = {
            x: this.width / 2,
            y: this.height - 120,
            width: 45,
            height: 55,
            color: '#00e5ff',
            shield: false,
            weaponType: 1
        };

        this.bullets = [];
        this.enemies = [];
        this.particles = [];
        this.stars = this.createStars();
        this.shockwaves = [];
        
        this.lastTime = performance.now();
        this.lastShoot = 0;
        this.enemySpawnTimer = 0;
        this.lastGestureTime = 0;

        this.bindEvents();
        // Start non-playing loop immediately to run cinematic background
        requestAnimationFrame(() => this.loop());
    }

    bindEvents() {
        document.getElementById('btn_play').onclick = () => this.start();
        document.getElementById('btn_settings').onclick = () => this.setState('SETTINGS');
        const sensSlider = document.getElementById('sens_slider');
        sensSlider.oninput = (e) => {
            this.sensitivity = parseFloat(e.target.value);
            document.getElementById('sens_val').innerText = this.sensitivity.toFixed(1);
        };
        document.getElementById('btn_settings_back').onclick = () => this.setState('MENU');
        document.getElementById('btn_resume').onclick = () => this.resume();
        document.getElementById('btn_quit_pause').onclick = () => this.quitToMenu();
        document.getElementById('btn_restart').onclick = () => this.start();
        document.getElementById('btn_quit_over').onclick = () => this.quitToMenu();
    }

    createStars() {
        const stars = [];
        for (let i = 0; i < 150; i++) {
            stars.push({
                x: Math.random() * this.width,
                y: Math.random() * this.height,
                speed: Math.random() * 80 + 20,
                size: Math.random() * 2.5 + 0.5,
                color: Math.random() > 0.8 ? '#00e5ff' : (Math.random() > 0.8 ? '#b000ff' : '#ffffff')
            });
        }
        return stars;
    }

    setState(newState) {
        this.state = newState;
        const els = ['loading_status', 'main_menu', 'settings_menu', 'pause_menu', 'game_over', 'hud'];
        els.forEach(id => document.getElementById(id).style.display = 'none');
        if(newState==='LOADING') document.getElementById('loading_status').style.display='block';
        if(newState==='MENU') document.getElementById('main_menu').style.display='block';
        if(newState==='SETTINGS') document.getElementById('settings_menu').style.display='block';
        if(newState==='PLAYING') document.getElementById('hud').style.display='flex';
        if(newState==='PAUSED') document.getElementById('pause_menu').style.display='block';
        if(newState==='GAME_OVER') document.getElementById('game_over').style.display='block';
        
        // Reset timing on resume so things don't warp
        this.lastTime = performance.now();
    }

    quitToMenu() {
        this.setState('MENU');
        this.bullets = []; this.enemies = []; this.particles = []; this.shockwaves = [];
        this.score = 0;
    }

    start() {
        this.setState('PLAYING');
        this.score = 0;
        this.health = 100;
        this.bullets = []; this.enemies = []; this.particles = []; this.shockwaves = [];
        
        // Center player immediately
        this.player.x = this.width / 2;
        this.player.y = this.height - 120;
        
        this.updateUI();
        this.lastTime = performance.now();
    }

    pause() { if (this.state === 'PLAYING') this.setState('PAUSED'); }
    resume() { 
        if (this.state === 'PAUSED') {
            this.setState('PLAYING');
            this.lastTime = performance.now();
        }
    }

    handleGesture(gesture) {
        const now = performance.now();
        if (now - this.lastGestureTime < 800) return;

        if (gesture === 'OPEN_PALM') {
            if (this.state === 'MENU' || this.state === 'GAME_OVER') {
                this.start(); this.lastGestureTime = now;
            } else if (this.state === 'PAUSED') {
                this.resume(); this.lastGestureTime = now;
            }
        } else if (gesture === '3_FINGERS') {
            if (this.state === 'PLAYING') {
                this.pause(); this.lastGestureTime = now;
            }
        }
    }

    updateUI() {
        document.getElementById('score').innerText = this.score;
        document.getElementById('health').innerText = this.health;
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        
        const now = performance.now();
        // Prevent huge dt jumps if tab is backgrounded
        const dt = Math.min((now - this.lastTime) / 1000, 0.1); 
        this.lastTime = now;
        
        // Do not update the game logic if completely paused, but we CAN update in MENU!
        if (this.state === 'LOADING' || this.state === 'PAUSED') {
            this.draw(); // keep drawing the static frame
            return;
        }
        
        this.update(dt, now);
        this.draw();
    }

    createAsteroidPolygon(radius) {
        const vertices = [];
        const numPoints = Math.floor(Math.random() * 5) + 6; 
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const dist = radius * (0.7 + Math.random() * 0.3);
            vertices.push({x: Math.cos(angle) * dist, y: Math.sin(angle) * dist});
        }
        return vertices;
    }

    update(dt, now) {
        // --- CINEMATIC UPDATE ALWAYS RUNS (Stars) ---
        for (const star of this.stars) {
            star.y += star.speed * dt;
            if (star.y > this.height) {
                star.y = 0;
                star.x = Math.random() * this.width;
            }
        }

        // Generate ambient enemies if in Menu loop
        if (this.state === 'MENU' || this.state === 'SETTINGS' || this.state === 'GAME_OVER') {
            this.enemySpawnTimer -= dt;
            if (this.enemySpawnTimer <= 0) {
                const radius = 25 + Math.random() * 40; // bigger ambient asteroids
                this.enemies.push({
                    x: Math.random() * this.width,
                    y: -100,
                    radius: radius,
                    vertices: this.createAsteroidPolygon(radius),
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 2,
                    speed: 50 + Math.random() * 150, // slower
                    hp: 1
                });
                this.enemySpawnTimer = 1.5 + Math.random() * 2;
            }
        }

        // --- PLAYING LOGIC ---
        if (this.state === 'PLAYING') {
            if (window.gestureRecognizer) {
                const g = window.gestureRecognizer;
                let normX = (g.handX - 0.5) * this.sensitivity + 0.5;
                let normY = (g.handY - 0.5) * this.sensitivity + 0.5;
                
                const targetX = normX * this.width;
                const targetY = normY * this.height;
                
                this.player.x += (targetX - this.player.x) * 0.3; 
                this.player.y += (targetY - this.player.y) * 0.3;
                
                this.player.x = Math.max(0, Math.min(this.width, this.player.x));
                this.player.y = Math.max(0, Math.min(this.height, this.player.y));

                this.player.shield = (g.gesture === 'OPEN_PALM');
                
                if (g.gesture === '2_FINGERS') this.player.weaponType = 2; 
                else if (g.gesture === '1_FINGER') this.player.weaponType = 1;

                if (g.gesture === 'FIST' && now - this.lastShoot > 120) {
                    this.shoot();
                    this.lastShoot = now;
                }
            }

            // Spawn Game Enemies
            this.enemySpawnTimer -= dt;
            if (this.enemySpawnTimer <= 0) {
                const radius = 25 + Math.random() * 25;
                this.enemies.push({
                    x: Math.random() * this.width,
                    y: -50,
                    radius: radius,
                    vertices: this.createAsteroidPolygon(radius),
                    rotation: 0,
                    rotSpeed: (Math.random() - 0.5) * 3,
                    speed: 150 + Math.random() * 300,
                    hp: Math.ceil(radius / 20)
                });
                const spawnRate = Math.max(0.15, 0.5 - (this.score * 0.003));
                this.enemySpawnTimer = spawnRate + Math.random() * spawnRate; 
            }
        }

        // Move Bullets
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            if (b.y < 0 || b.x < 0 || b.x > this.width) this.bullets.splice(i, 1);
        }

        // Move Enemies & Collisions
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const e = this.enemies[i];
            e.y += e.speed * dt;
            e.rotation += e.rotSpeed * dt;

            // Collision only if playing
            if (this.state === 'PLAYING') {
                const dist = Math.hypot(e.x - this.player.x, e.y - this.player.y);
                if (dist < e.radius + this.player.width/2 - 10) { 
                    if (!this.player.shield) {
                        this.health -= 25;
                        this.updateUI();
                        this.createExplosion(e.x, e.y, '#ff0055', 15);
                        this.createShockwave(e.x, e.y, '#ff0055');
                        if (this.health <= 0) {
                            this.gameOver();
                        }
                    } else {
                        this.score += 5;
                        this.updateUI();
                        this.createExplosion(e.x, e.y, '#00e5ff', 10);
                    }
                    this.enemies.splice(i, 1);
                    continue;
                }
            }

            if (e.y > this.height + 100) {
                this.enemies.splice(i, 1);
                continue;
            }

            // Bullet collision
            for (let j = this.bullets.length - 1; j >= 0; j--) {
                const b = this.bullets[j];
                if (Math.hypot(e.x - b.x, e.y - b.y) < e.radius + 8) {
                    this.createExplosion(b.x, b.y, '#00e5ff', 3); 
                    this.bullets.splice(j, 1);
                    e.hp--;
                    if (e.hp <= 0) {
                        this.enemies.splice(i, 1);
                        if (this.state === 'PLAYING') {
                            this.score += 15;
                            this.updateUI();
                        }
                        this.createExplosion(e.x, e.y, '#ffaa00', 12);
                        this.createShockwave(e.x, e.y, '#ffaa00');
                        break;
                    }
                }
            }
        }
        
        // Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) this.particles.splice(i, 1);
        }

        // Shockwaves
        for (let i = this.shockwaves.length - 1; i >= 0; i--) {
            const s = this.shockwaves[i];
            s.radius += s.speed * dt;
            s.life -= dt;
            if (s.life <= 0) this.shockwaves.splice(i, 1);
        }
    }

    shoot() {
        if (this.player.weaponType === 1) { 
            this.bullets.push({x: this.player.x, y: this.player.y - 30, vx: 0, vy: -1000});
        } else if (this.player.weaponType === 2) { 
            this.bullets.push({x: this.player.x - 20, y: this.player.y - 10, vx: -250, vy: -800});
            this.bullets.push({x: this.player.x + 20, y: this.player.y - 10, vx: 250, vy: -800});
        }
    }

    createExplosion(x, y, color, count) {
        // Cap particles heavily for GPU performance
        let maxParticles = Math.min(count, 15);
        for (let i = 0; i < maxParticles; i++) {
            this.particles.push({
                x, y,
                vx: (Math.random() - 0.5) * 800,
                vy: (Math.random() - 0.5) * 800,
                life: 0.3 + Math.random() * 0.4,
                color: color,
                size: Math.random() * 3 + 1
            });
        }
    }

    createShockwave(x, y, color) {
        this.shockwaves.push({
            x, y, radius: 10, speed: 500, life: 0.4, maxLife: 0.4, color: color
        });
    }

    draw() {
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.clearRect(0, 0, this.width, this.height);

        // Draw parallax stars
        for (const star of this.stars) {
            this.ctx.fillStyle = star.color;
            this.ctx.globalAlpha = star.y / this.height * 0.5 + 0.3; 
            this.ctx.fillRect(star.x, star.y, star.size, star.size);
        }
        this.ctx.globalAlpha = 1.0;

        // Additive blending handles visual blooming naturally without heavy shadowBlur algorithms
        this.ctx.globalCompositeOperation = 'screen';

        // Draw Player Ship (ONLY IF FULLY PLAYING or dying moment)
        if (this.state === 'PLAYING' || this.state === 'PAUSED' || this.state === 'GAME_OVER') {
            this.ctx.save();
            this.ctx.translate(this.player.x, this.player.y);
            
            // Shield Bubble (Faux Glow)
            if (this.player.shield) {
                this.ctx.beginPath();
                this.ctx.arc(0, 0, this.player.width + 20, 0, Math.PI * 2);
                
                this.ctx.fillStyle = 'rgba(0, 229, 255, 0.15)';
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#00e5ff';
                this.ctx.lineWidth = 2;
                this.ctx.stroke();
                
                // Outer fast glow
                this.ctx.lineWidth = 8;
                this.ctx.globalAlpha = 0.3;
                this.ctx.stroke();
                this.ctx.globalAlpha = 1.0;
            }

            // Thruster
            this.ctx.beginPath();
            this.ctx.moveTo(-15, this.player.height/3);
            this.ctx.lineTo(15, this.player.height/3);
            this.ctx.lineTo(0, this.player.height/2 + 20 + Math.random()*20); 
            this.ctx.fillStyle = '#ffaa00';
            this.ctx.fill();

            // Ship Body Polygon
            this.ctx.fillStyle = '#050508'; 
            this.ctx.beginPath();
            this.ctx.moveTo(0, -this.player.height/1.2);
            this.ctx.lineTo(this.player.width/2, this.player.height/3);
            this.ctx.lineTo(this.player.width/3, this.player.height/2.5);
            this.ctx.lineTo(0, this.player.height/4); 
            this.ctx.lineTo(-this.player.width/3, this.player.height/2.5);
            this.ctx.lineTo(-this.player.width/2, this.player.height/3);
            this.ctx.closePath();
            this.ctx.fill();

            this.ctx.strokeStyle = this.player.color;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Cockpit
            this.ctx.beginPath();
            this.ctx.moveTo(0, -this.player.height/3);
            this.ctx.lineTo(8, 5);
            this.ctx.lineTo(-8, 5);
            this.ctx.closePath();
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();

            this.ctx.restore();
        }

        // Draw Bullets - Fast Bloom
        for (const b of this.bullets) {
            // Core
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fill();
            this.ctx.closePath();
            
            // Halo
            this.ctx.beginPath();
            this.ctx.arc(b.x, b.y, 8, 0, Math.PI * 2);
            this.ctx.fillStyle = 'rgba(0, 229, 255, 0.4)';
            this.ctx.fill();
            this.ctx.closePath();

            // Trail
            this.ctx.beginPath();
            this.ctx.moveTo(b.x, b.y);
            this.ctx.lineTo(b.x - b.vx * 0.05, b.y - b.vy * 0.05);
            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = '#00e5ff';
            this.ctx.stroke();
        }

        // Draw Enemies
        for (const e of this.enemies) {
            this.ctx.save();
            this.ctx.translate(e.x, e.y);
            this.ctx.rotate(e.rotation);
            
            this.ctx.beginPath();
            this.ctx.moveTo(e.vertices[0].x, e.vertices[0].y);
            for(let i=1; i<e.vertices.length; i++){
                this.ctx.lineTo(e.vertices[i].x, e.vertices[i].y);
            }
            this.ctx.closePath();
            
            this.ctx.fillStyle = '#10000a';
            this.ctx.fill();
            
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = '#ff0055';
            this.ctx.stroke();
            
            // Faux Glow
            this.ctx.lineWidth = 8;
            this.ctx.globalAlpha = 0.3;
            this.ctx.stroke();
            this.ctx.globalAlpha = 1.0;
            
            // Core
            this.ctx.beginPath();
            this.ctx.arc(0, 0, e.radius * 0.3, 0, Math.PI * 2);
            this.ctx.fillStyle = '#ff0055';
            this.ctx.fill();

            this.ctx.restore();
        }

        // Draw Particles
        for (const p of this.particles) {
            this.ctx.globalAlpha = Math.max(0, p.life * 2);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
            
            // Tiny aura
            this.ctx.globalAlpha = Math.max(0, p.life * 0.5);
            this.ctx.fillRect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
        }

        // Draw Shockwaves
        for (const s of this.shockwaves) {
            this.ctx.globalAlpha = Math.max(0, s.life / s.maxLife);
            this.ctx.beginPath();
            this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            this.ctx.strokeStyle = s.color;
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
            
            // Glow
            this.ctx.lineWidth = 10;
            this.ctx.globalAlpha = Math.max(0, (s.life / s.maxLife) * 0.3);
            this.ctx.stroke();
        }

        this.ctx.globalAlpha = 1.0;
        this.ctx.globalCompositeOperation = 'source-over';
    }

    gameOver() {
        this.setState('GAME_OVER');
        document.getElementById('final_score').innerText = this.score;
    }
}
