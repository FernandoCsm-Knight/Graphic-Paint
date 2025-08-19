import { Shape, type Point, type ShapeOptions } from "./ShapeTypes";

const lineInfo = (start: Point, end: Point): { angle: number; size: number } => {
    const angle = Math.atan2(end.y - start.y, end.x - start.x);
    const size = Math.hypot(end.x - start.x, end.y - start.y);
    return { angle, size };
}

export class Line extends Shape {
    kind = 'line' as const;

    start: Point;
    end: Point;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        this.start = start;
        this.end = end;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const dx = this.end.x - this.start.x;
        const dy = this.end.y - this.start.y;

        let x = this.start.x;
        let y = this.start.y;
        this.drawPixel({ x, y }, ctx);

        const passo = (Math.abs(dx) > Math.abs(dy)) ? Math.abs(dx) : Math.abs(dy);
        
        const stepX = dx / passo;
        const stepY = dy / passo;

        for(let i = 0; i < passo; i++) {
            x += stepX;
            y += stepY;
            
            this.drawPixel({ x: Math.round(x), y: Math.round(y) }, ctx);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);
        ctx.lineTo(this.end.x, this.end.y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point) {
        const det = (this.end.x - this.start.x) * (p.y - this.start.y) - (this.end.y - this.start.y) * (p.x - this.start.x);
        const inRange = p.x >= Math.min(this.start.x, this.end.x) && p.x <= Math.max(this.start.x, this.end.x) &&
                        p.y >= Math.min(this.start.y, this.end.y) && p.y <= Math.max(this.start.y, this.end.y);
        return inRange && Math.abs(det) < 1;
    }

    moveBy(dx: number, dy: number): void {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x += dx;
        this.end.y += dy;
    }
}

export class Square extends Shape {
    kind = 'square' as const;

    topLeft: Point;
    bottomRight: Point;

    constructor(topLeft: Point, bottomRight: Point, opts: ShapeOptions) {
        super(opts);
        this.topLeft = topLeft;
        this.bottomRight = bottomRight;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const dx = this.bottomRight.x - this.topLeft.x;
        const dy = this.bottomRight.y - this.topLeft.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));

        let x = this.topLeft.x;
        let y = this.topLeft.y;
        this.drawPixel({ x, y }, ctx);

        const incrX = dx > 0 ? 1 : -1;
        const incrY = dy > 0 ? 1 : -1;

        for(let i = 0; i < side; i++) {
            x += incrX;
            this.drawPixel({ x: x, y }, ctx);
            this.drawPixel({ x: x, y: y + (incrY > 0 ? side : -side) }, ctx);
        }

        for(let i = 0; i < side; i++) {
            y += incrY;
            this.drawPixel({ x, y: y }, ctx);
            this.drawPixel({ x: x - (incrX > 0 ? side : -side), y: y }, ctx);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const dx = this.bottomRight.x - this.topLeft.x;
        const dy = this.bottomRight.y - this.topLeft.y;
        const side = Math.max(Math.abs(dx), Math.abs(dy));

        ctx.beginPath();

        if(dx > 0 && dy > 0) {
            ctx.rect(this.topLeft.x, this.topLeft.y, side, side);
        } else if(dx > 0 && dy < 0) {
            ctx.rect(this.topLeft.x, this.topLeft.y,  side, -side);
        } else if(dx < 0 && dy > 0) {
            ctx.rect(this.topLeft.x, this.topLeft.y,  -side, side);
        } else {
            ctx.rect(this.topLeft.x, this.topLeft.y,  -side, -side);
        }

        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.topLeft.x && p.x <= this.bottomRight.x && p.y >= this.topLeft.y && p.y <= this.bottomRight.y;
    }

    moveBy(dx: number, dy: number): void {
        this.topLeft.x += dx;
        this.topLeft.y += dy;
        this.bottomRight.x += dx;
        this.bottomRight.y += dy;
    }
}

export class Rectangle extends Shape {
    kind = 'rect' as const;

    topLeft: Point;
    bottomRight: Point;

    constructor(topLeft: Point, bottomRight: Point, opts: ShapeOptions) {
        super(opts);
        this.topLeft = topLeft;
        this.bottomRight = bottomRight;
    }

    pixelatedDraw(ctx: CanvasRenderingContext2D): void {
        const dx = this.bottomRight.x - this.topLeft.x;
        const dy = this.bottomRight.y - this.topLeft.y;

        let x = this.topLeft.x;
        let y = this.topLeft.y;
        this.drawPixel({ x, y }, ctx);

        const incrX = dx > 0 ? 1 : -1;
        const incrY = dy > 0 ? 1 : -1;

        for(let i = 0; i < Math.abs(dx); i++) {
            x += incrX;
            this.drawPixel({ x: x, y: y }, ctx);
            this.drawPixel({ x: x, y: y + dy }, ctx);
        }

        for(let i = 0; i < Math.abs(dy); i++) {
            y += incrY;
            this.drawPixel({ x: x, y: y }, ctx);
            this.drawPixel({ x: x - dx, y: y }, ctx);
        }
    }

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.rect(this.topLeft.x, this.topLeft.y, this.bottomRight.x - this.topLeft.x, this.bottomRight.y - this.topLeft.y);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.topLeft.x && p.x <= this.bottomRight.x && p.y >= this.topLeft.y && p.y <= this.bottomRight.y;
    }

    moveBy(dx: number, dy: number): void {
        this.topLeft.x += dx;
        this.topLeft.y += dy;
        this.bottomRight.x += dx;
        this.bottomRight.y += dy;
    }
}

export class Circle extends Shape {
    kind = 'circle' as const;

    center: Point;
    radius: number;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);

        const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
        const radius = Math.hypot(end.x - start.x, end.y - start.y) / 2;

        this.center = center;
        this.radius = radius;
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.center.x, this.center.y, this.radius, 0, 2 * Math.PI);
        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        const dx = p.x - this.center.x;
        const dy = p.y - this.center.y;
        return dx * dx + dy * dy < this.radius * this.radius;
    }

    moveBy(dx: number, dy: number): void {
        this.center.x += dx;
        this.center.y += dy;
    }
}

export class Arrow extends Shape {
    kind = 'arrow' as const;

    start: Point;
    end: Point;

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        this.start = start;
        this.end = end;
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        const angle = Math.atan2(this.end.y - this.start.y, this.end.x - this.start.x);
        const headLength = 2 * this.lineWidth;

        const x = this.end.x;
        const y = this.end.y;

        ctx.beginPath();
        ctx.moveTo(this.start.x, this.start.y);

        ctx.lineTo(x, y);
        ctx.lineTo(x - headLength * Math.cos(angle - Math.PI / 6), y - headLength * Math.sin(angle - Math.PI / 6));
        
        ctx.moveTo(x, y);
        ctx.lineTo(x - headLength * Math.cos(angle + Math.PI / 6), y - headLength * Math.sin(angle + Math.PI / 6));

        ctx.strokeStyle = this.strokeStyle;
        ctx.lineWidth = this.lineWidth;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        const det = (this.end.x - this.start.x) * (p.y - this.start.y) - (this.end.y - this.start.y) * (p.x - this.start.x);
        const inRange = p.x >= Math.min(this.start.x, this.end.x) && p.x <= Math.max(this.start.x, this.end.x) &&
                        p.y >= Math.min(this.start.y, this.end.y) && p.y <= Math.max(this.start.y, this.end.y);
        return inRange && Math.abs(det) < 1;
    }

    moveBy(dx: number, dy: number): void {
        this.start.x += dx;
        this.start.y += dy;
        this.end.x += dx;
        this.end.y += dy;
    }
}

export class Triangle extends Shape {
    kind = 'triangle' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        const { angle, size } = lineInfo(start, end);
        
        this.points = [];
        for(let i = 0; i < 3; i++) {
            const adjust = (i * 2 * Math.PI) / 3;
            this.points.push({
                x: start.x + size * Math.cos(angle + adjust),
                y: start.y + size * Math.sin(angle + adjust)
            });
        }
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        ctx.lineTo(this.points[1].x, this.points[1].y);
        ctx.lineTo(this.points[2].x, this.points[2].y);
        ctx.lineTo(this.points[0].x, this.points[0].y); 
        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= this.points[0].y && p.y <= this.points[2].y;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
}

export class Diamond extends Shape {
    kind = 'diamond' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        const { angle, size } = lineInfo(start, end);

        this.points = [];
        for(let i = 0; i < 4; i++) {
            const adjust = (i * Math.PI) / 2;
            this.points.push({
                x: start.x + size * Math.cos(angle + adjust),
                y: start.y + size * Math.sin(angle + adjust)
            });
        }
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
       
        for(let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();

        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= this.points[0].y && p.y <= this.points[2].y;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
}

export class Pentagon extends Shape {
    kind = 'pentagon' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        const { angle, size } = lineInfo(start, end);

        this.points = [];
        for(let i = 0; i < 5; i++) {
            const adjust = (i * 2 * Math.PI) / 5;
            this.points.push({
                x: start.x + size * Math.cos(angle + adjust),
                y: start.y + size * Math.sin(angle + adjust)
            });
        }
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for(let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();

        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= this.points[0].y && p.y <= this.points[2].y;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
}

export class Hexagon extends Shape {
    kind = 'hexagon' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        const { angle, size } = lineInfo(start, end);

        this.points = [];
        for(let i = 0; i < 6; i++) {
            const adjust = (i * Math.PI) / 3;
            this.points.push({
                x: start.x + size * Math.cos(angle + adjust),
                y: start.y + size * Math.sin(angle + adjust)
            });
        }
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for(let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();

        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= this.points[0].y && p.y <= this.points[2].y;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
}

export class Octagon extends Shape {
    kind = 'octagon' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);
        const { angle, size } = lineInfo(start, end);

        this.points = [];
        for(let i = 0; i < 8; i++) {
            const adjust = (i * Math.PI) / 4;
            this.points.push({
                x: start.x + size * Math.cos(angle + adjust),
                y: start.y + size * Math.sin(angle + adjust)
            });
        }
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for(let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();

        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= this.points[0].y && p.y <= this.points[2].y;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
}

export class Star extends Shape {
    kind = 'star' as const;

    points: Point[];

    constructor(start: Point, end: Point, opts: ShapeOptions) {
        super(opts);

        const angle = Math.atan2(end.y - start.y, end.x - start.x);
        const outerRadius = Math.hypot(end.x - start.x, end.y - start.y);
        const innerRadius = outerRadius / 2;

        this.points = [];
        for(let i = 0; i < 5; i++) {
            const outerAngle = angle + (i * 2 * Math.PI) / 5;
            const innerAngle = angle + (i * 2 * Math.PI) / 5 + Math.PI / 5;
            
            this.points.push({
                x: start.x + outerRadius * Math.cos(outerAngle),
                y: start.y + outerRadius * Math.sin(outerAngle)
            });

            this.points.push({
                x: start.x + innerRadius * Math.cos(innerAngle),
                y: start.y + innerRadius * Math.sin(innerAngle)
            });
        }
    }

    pixelatedDraw(): void {}

    standardDraw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);

        for(let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.closePath();

        ctx.lineWidth = this.lineWidth;
        ctx.strokeStyle = this.strokeStyle;
        ctx.stroke();
    }

    contains(p: Point): boolean {
        const max = Math.max(...this.points.map(p => p.y));
        const min = Math.min(...this.points.map(p => p.y));
        return p.x >= this.points[0].x && p.x <= this.points[2].x && p.y >= min && p.y <= max;
    }

    moveBy(dx: number, dy: number): void {
        for(const point of this.points) {
            point.x += dx;
            point.y += dy;
        }
    }
}
