export class FloodFill {
    static fill(
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        fillColor: string,
        pixelSize: number
    ): void {
        const canvas = ctx.canvas;
        
        // Converte a posição do clique para coordenadas de pixel
        const pixelX = Math.floor(x / pixelSize);
        const pixelY = Math.floor(y / pixelSize);
        
        // Converte a cor de preenchimento para RGB
        const fillRgb = this.hexToRgb(fillColor);
        if (!fillRgb) return;
        
        // Obtém a cor do pixel clicado (no centro do pixel)
        const centerX = pixelX * pixelSize + Math.floor(pixelSize / 2);
        const centerY = pixelY * pixelSize + Math.floor(pixelSize / 2);
        
        if (centerX >= canvas.width || centerY >= canvas.height || centerX < 0 || centerY < 0) {
            return;
        }
        
        // Obtém os dados da imagem uma única vez
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        const index = (centerY * canvas.width + centerX) * 4;
        const targetR = data[index];
        const targetG = data[index + 1];
        const targetB = data[index + 2];
        const targetA = data[index + 3];
        
        // Se a cor de preenchimento é igual à cor alvo, não faz nada
        if (
            targetR === fillRgb.r &&
            targetG === fillRgb.g &&
            targetB === fillRgb.b &&
            targetA === 255
        ) {
            return;
        }
        
        // Usa o algoritmo de flood fill no modo pixelado
        this.floodFillPixelated(
            ctx,
            imageData,
            pixelX,
            pixelY,
            targetR,
            targetG,
            targetB,
            targetA,
            fillRgb.r,
            fillRgb.g,
            fillRgb.b,
            pixelSize
        );
    }
    
    private static floodFillPixelated(
        ctx: CanvasRenderingContext2D,
        imageData: ImageData,
        startX: number,
        startY: number,
        targetR: number,
        targetG: number,
        targetB: number,
        targetA: number,
        fillR: number,
        fillG: number,
        fillB: number,
        pixelSize: number
    ): void {
        const canvas = ctx.canvas;
        const pixelWidth = Math.floor(canvas.width / pixelSize);
        const pixelHeight = Math.floor(canvas.height / pixelSize);
        
        if (startX < 0 || startX >= pixelWidth || startY < 0 || startY >= pixelHeight) {
            return;
        }
        
        const visited = new Set<string>();
        const stack: { x: number; y: number }[] = [{ x: startX, y: startY }];
        const data = imageData.data;
        
        while (stack.length > 0) {
            const { x, y } = stack.pop()!;
            const key = `${x},${y}`;
            
            if (visited.has(key)) continue;
            if (x < 0 || x >= pixelWidth || y < 0 || y >= pixelHeight) continue;
            
            // Verifica se a cor do pixel é igual à cor alvo
            const centerX = x * pixelSize + Math.floor(pixelSize / 2);
            const centerY = y * pixelSize + Math.floor(pixelSize / 2);
            
            if (!this.isTargetColorFromData(data, canvas.width, centerX, centerY, targetR, targetG, targetB, targetA)) {
                continue;
            }
            
            visited.add(key);
            
            // Preenche o pixel
            ctx.fillStyle = `rgb(${fillR}, ${fillG}, ${fillB})`;
            ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
            
            // Adiciona pixels vizinhos à pilha
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
    }
    
    private static isTargetColorFromData(
        data: Uint8ClampedArray,
        canvasWidth: number,
        x: number,
        y: number,
        targetR: number,
        targetG: number,
        targetB: number,
        targetA: number
    ): boolean {
        if (x < 0 || x >= canvasWidth || y < 0) {
            return false;
        }
        
        const index = (y * canvasWidth + x) * 4;
        
        return (
            data[index] === targetR &&
            data[index + 1] === targetG &&
            data[index + 2] === targetB &&
            data[index + 3] === targetA
        );
    }
    
    private static hexToRgb(hex: string): { r: number; g: number; b: number } | null {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result
            ? {
                  r: parseInt(result[1], 16),
                  g: parseInt(result[2], 16),
                  b: parseInt(result[3], 16),
              }
            : null;
    }
}
