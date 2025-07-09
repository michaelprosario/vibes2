class PixelSpriteEditor {
    constructor() {
        this.canvas = document.getElementById('sprite-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = 16;
        this.height = 16;
        this.pixelSize = 20;
        this.currentColor = '#000000';
        this.currentTool = 'pencil';
        this.isDrawing = false;
        this.spriteData = [];
        
        this.colors = [
            '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
            '#800000', '#808080', '#800080', '#008000', '#000080', '#808000', '#008080', '#C0C0C0',
            '#FF8000', '#80FF00', '#00FF80', '#8000FF', '#0080FF', '#FF0080', '#FF4000', '#4000FF',
            '#40FF00', '#00FF40', '#0040FF', '#FF00C0', '#C000FF', '#00C0FF', '#FFC000', '#C0FF00'
        ];
        
        this.initCanvas();
        this.initColorPalette();
        this.bindEvents();
    }
    
    initCanvas() {
        this.canvas.width = this.width * this.pixelSize;
        this.canvas.height = this.height * this.pixelSize;
        this.ctx.imageSmoothingEnabled = false;
        
        this.spriteData = Array(this.height).fill().map(() => Array(this.width).fill('#FFFFFF'));
        this.redraw();
    }
    
    initColorPalette() {
        const paletteGrid = document.getElementById('palette-grid');
        paletteGrid.innerHTML = '';
        
        this.colors.forEach(color => {
            const swatch = document.createElement('div');
            swatch.className = 'color-swatch';
            swatch.style.backgroundColor = color;
            swatch.addEventListener('click', () => this.selectColor(color));
            paletteGrid.appendChild(swatch);
        });
        
        this.updateCurrentColor();
    }
    
    selectColor(color) {
        this.currentColor = color;
        this.updateCurrentColor();
    }
    
    updateCurrentColor() {
        document.getElementById('current-color').style.backgroundColor = this.currentColor;
    }
    
    getPixelFromMouse(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) / this.pixelSize);
        const y = Math.floor((e.clientY - rect.top) / this.pixelSize);
        return { x, y };
    }
    
    setPixel(x, y, color) {
        if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
            this.spriteData[y][x] = color;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
        }
    }
    
    redraw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.ctx.fillStyle = this.spriteData[y][x];
                this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
            }
        }
        
        this.ctx.strokeStyle = '#ddd';
        this.ctx.lineWidth = 1;
        for (let x = 0; x <= this.width; x++) {
            this.ctx.beginPath();
            this.ctx.moveTo(x * this.pixelSize, 0);
            this.ctx.lineTo(x * this.pixelSize, this.height * this.pixelSize);
            this.ctx.stroke();
        }
        for (let y = 0; y <= this.height; y++) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y * this.pixelSize);
            this.ctx.lineTo(this.width * this.pixelSize, y * this.pixelSize);
            this.ctx.stroke();
        }
    }
    
    handleMouseDown(e) {
        this.isDrawing = true;
        const { x, y } = this.getPixelFromMouse(e);
        this.drawPixel(x, y);
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        const { x, y } = this.getPixelFromMouse(e);
        this.drawPixel(x, y);
    }
    
    handleMouseUp() {
        this.isDrawing = false;
    }
    
    drawPixel(x, y) {
        if (this.currentTool === 'pencil') {
            this.setPixel(x, y, this.currentColor);
        } else if (this.currentTool === 'eraser') {
            this.setPixel(x, y, '#FFFFFF');
        }
    }
    
    selectTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool').forEach(btn => btn.classList.remove('active'));
        document.getElementById(tool).classList.add('active');
    }
    
    newCanvas() {
        const width = parseInt(document.getElementById('width').value);
        const height = parseInt(document.getElementById('height').value);
        
        if (width > 0 && height > 0 && width <= 64 && height <= 64) {
            this.width = width;
            this.height = height;
            this.initCanvas();
        }
    }
    
    saveSprite() {
        const data = {
            width: this.width,
            height: this.height,
            pixels: this.spriteData
        };
        
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sprite.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    loadSprite() {
        document.getElementById('file-input').click();
    }
    
    handleFileLoad(e) {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (data.width && data.height && data.pixels) {
                    this.width = data.width;
                    this.height = data.height;
                    this.spriteData = data.pixels;
                    this.canvas.width = this.width * this.pixelSize;
                    this.canvas.height = this.height * this.pixelSize;
                    this.redraw();
                    
                    document.getElementById('width').value = this.width;
                    document.getElementById('height').value = this.height;
                }
            } catch (error) {
                alert('Invalid file format');
            }
        };
        reader.readAsText(file);
    }
    
    exportJPEG() {
        const exportCanvas = document.createElement('canvas');
        const exportCtx = exportCanvas.getContext('2d');
        exportCanvas.width = this.width;
        exportCanvas.height = this.height;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                exportCtx.fillStyle = this.spriteData[y][x];
                exportCtx.fillRect(x, y, 1, 1);
            }
        }
        
        exportCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sprite.jpg';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 'image/jpeg', 0.9);
    }
    
    bindEvents() {
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.handleMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.handleMouseUp());
        
        document.getElementById('pencil').addEventListener('click', () => this.selectTool('pencil'));
        document.getElementById('eraser').addEventListener('click', () => this.selectTool('eraser'));
        
        document.getElementById('new-canvas').addEventListener('click', () => this.newCanvas());
        document.getElementById('save').addEventListener('click', () => this.saveSprite());
        document.getElementById('load').addEventListener('click', () => this.loadSprite());
        document.getElementById('export').addEventListener('click', () => this.exportJPEG());
        
        document.getElementById('file-input').addEventListener('change', (e) => this.handleFileLoad(e));
        
        document.getElementById('current-color').addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'color';
            input.value = this.currentColor;
            input.addEventListener('change', (e) => this.selectColor(e.target.value));
            input.click();
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new PixelSpriteEditor();
});