const BOARD_WIDTH = 10;
const BOARD_HEIGHT = 20;
const BLOCK = 20; // pixels
const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
let bgmInterval = null;

function playTone(freq, duration){
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.stop(audioCtx.currentTime + duration);
}

function startBGM(){
    if(bgmInterval) return;
    const notes = [440,392,330,392,440,440,440,392,392,392,440,330,330,330];
    let i = 0;
    bgmInterval = setInterval(()=>{
        playTone(notes[i%notes.length],0.25);
        i++;
    },300);
}

function lineClearSound(){ playTone(880,0.2); }
function lockSound(){ playTone(660,0.1); }

const SHAPES = {
    'I': [
        [[0,1],[1,1],[2,1],[3,1]],
        [[2,0],[2,1],[2,2],[2,3]]
    ],
    'J': [
        [[0,0],[0,1],[1,1],[2,1]],
        [[1,0],[2,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]],
        [[1,0],[1,1],[0,2],[1,2]]
    ],
    'L': [
        [[2,0],[0,1],[1,1],[2,1]],
        [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,1],[0,2]],
        [[0,0],[1,0],[1,1],[1,2]]
    ],
    'O': [
        [[1,0],[2,0],[1,1],[2,1]]
    ],
    'S': [
        [[1,1],[2,1],[0,2],[1,2]],
        [[1,0],[1,1],[2,1],[2,2]]
    ],
    'T': [
        [[1,0],[0,1],[1,1],[2,1]],
        [[1,0],[1,1],[2,1],[1,2]],
        [[0,1],[1,1],[2,1],[1,2]],
        [[1,0],[0,1],[1,1],[1,2]]
    ],
    'Z': [
        [[0,1],[1,1],[1,2],[2,2]],
        [[2,0],[1,1],[2,1],[1,2]]
    ]
};

class Piece {
    constructor(shape){
        this.shape = shape;
        this.rot = 0;
        this.x = Math.floor(BOARD_WIDTH / 2) - 2;
        this.y = 0;
    }
    coords(rot=this.rot){
        return SHAPES[this.shape][rot].map(([x,y]) => [x+this.x, y+this.y]);
    }
    rotate(){
        this.rot = (this.rot + 1) % SHAPES[this.shape].length;
    }
}

class Tetris {
    constructor(){
        this.board = Array.from({length: BOARD_HEIGHT}, () => Array(BOARD_WIDTH).fill(0));
        this.score = 0;
        this.level = 1;
        this.speed = 500;
        this.current = this.newPiece();
        this.next = this.newPiece();
        this.interval = null;
    }
    newPiece(){
        const shapes = Object.keys(SHAPES);
        return new Piece(shapes[Math.floor(Math.random()*shapes.length)]);
    }
    collides(piece, dx=0, dy=0, drot=false){
        let rot = piece.rot;
        if(drot) rot = (rot + 1) % SHAPES[piece.shape].length;
        for(const [x,y] of piece.coords(rot)){
            const nx = x + dx;
            const ny = y + dy;
            if(nx < 0 || nx >= BOARD_WIDTH || ny >= BOARD_HEIGHT) return true;
            if(ny >= 0 && this.board[ny][nx]) return true;
        }
        return false;
    }
    lock(piece){
        for(const [x,y] of piece.coords()){
            if(y >= 0) this.board[y][x] = 1;
        }
        this.removeLines();
        this.current = this.next;
        this.next = this.newPiece();
        if(this.collides(this.current)) this.gameOver();
        lockSound();
    }
    removeLines(){
        let newBoard = this.board.filter(row => row.some(cell => !cell));
        const removed = BOARD_HEIGHT - newBoard.length;
        while(newBoard.length < BOARD_HEIGHT){
            newBoard.unshift(Array(BOARD_WIDTH).fill(0));
        }
        this.board = newBoard;
        this.score += removed;
        document.getElementById('score').textContent = `Score: ${this.score}`;
        if(removed > 0) lineClearSound();
        this.updateLevel();
    }
    updateLevel(){
        const newLevel = Math.floor(this.score / 10) + 1;
        if(newLevel !== this.level){
            this.level = newLevel;
            document.getElementById('level').textContent = `Level: ${this.level}`;
            this.updateSpeed();
        }
    }
    updateSpeed(){
        this.speed = Math.max(100, 500 - (this.level - 1) * 50);
        if(this.interval){
            clearInterval(this.interval);
            this.interval = setInterval(()=>{
                if(!this.move(0,1)) this.lock(this.current);
                this.draw();
            }, this.speed);
        }
    }
    move(dx, dy, drot=false){
        if(!this.collides(this.current, dx, dy, drot)){
            if(drot) this.current.rotate();
            this.current.x += dx;
            this.current.y += dy;
            return true;
        }
        return false;
    }
    hardDrop(){
        while(this.move(0,1));
        this.lock(this.current);
        this.draw();
    }
    draw(){
        ctx.clearRect(0,0,canvas.width, canvas.height);
        for(let y=0;y<BOARD_HEIGHT;y++){
            for(let x=0;x<BOARD_WIDTH;x++){
                if(this.board[y][x]) this.drawBlock(x,y,'#0ff');
            }
        }
        for(const [x,y] of this.current.coords()){
            if(y>=0) this.drawBlock(x,y,'#f80');
        }
    }
    drawBlock(x,y,color){
        ctx.fillStyle=color;
        ctx.fillRect(x*BLOCK,y*BLOCK,BLOCK,BLOCK);
        ctx.strokeStyle='#333';
        ctx.strokeRect(x*BLOCK,y*BLOCK,BLOCK,BLOCK);
    }
    start(){
        if(this.interval) clearInterval(this.interval);
        this.interval = setInterval(()=>{
            if(!this.move(0,1)) this.lock(this.current);
            this.draw();
        }, this.speed);
    }
    gameOver(){
        clearInterval(this.interval);
        alert('Game Over');
    }
}

const game = new Tetris();
let started = false;
window.addEventListener('keydown', e=>{
    if(!started){
        audioCtx.resume();
        startBGM();
        started = true;
    }
    if(e.key === 'ArrowLeft') game.move(-1,0);
    else if(e.key === 'ArrowRight') game.move(1,0);
    else if(e.key === 'ArrowUp') game.move(0,0,true);
    else if(e.key === 'ArrowDown') game.move(0,1);
    else if(e.code === 'Space') game.hardDrop();
    else if(e.key.toLowerCase() === 'q') game.gameOver();
    game.draw();
});

game.draw();
game.start();
