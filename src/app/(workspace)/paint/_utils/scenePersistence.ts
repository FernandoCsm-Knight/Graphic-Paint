import type { Point } from '@/types/geometry';
import type { PaintSceneItemSnapshot } from '@/lib/workspace/projectPersistence.schemas';
import {
    DASH_ARRAYS,
    type BrushStyle,
    type FillAlgorithm,
    type LineAlgorithm,
    type LineDashPreset,
} from '@/app/(workspace)/paint/_context/SettingsContext';
import { Shape, type SceneItem, type ShapeOptions } from '@/app/(workspace)/paint/_shapes/ShapeTypes';
import Line from '@/app/(workspace)/paint/_shapes/Line';
import Arrow from '@/app/(workspace)/paint/_shapes/Arrow';
import Rectangle from '@/app/(workspace)/paint/_shapes/Rectangle';
import Square from '@/app/(workspace)/paint/_shapes/Square';
import Circle from '@/app/(workspace)/paint/_shapes/Circle';
import Ellipse from '@/app/(workspace)/paint/_shapes/Ellipse';
import Triangle from '@/app/(workspace)/paint/_shapes/Triangle';
import Diamond from '@/app/(workspace)/paint/_shapes/Diamond';
import Pentagon from '@/app/(workspace)/paint/_shapes/Pentagon';
import Hexagon from '@/app/(workspace)/paint/_shapes/Hexagon';
import Heptagon from '@/app/(workspace)/paint/_shapes/Heptagon';
import Octagon from '@/app/(workspace)/paint/_shapes/Octagon';
import Star from '@/app/(workspace)/paint/_shapes/Star';
import FreePolygon from '@/app/(workspace)/paint/_shapes/FreePolygon';
import FreeForm from '@/app/(workspace)/paint/_shapes/FreeForm';
import FillShape from '@/app/(workspace)/paint/_shapes/FillShape';
import ClearRectItem from '@/app/(workspace)/paint/_shapes/ClearRectItem';
import ImageShape from '@/app/(workspace)/paint/_shapes/ImageShape';
import ShapeGroup from '@/app/(workspace)/paint/_shapes/ShapeGroup';
import type { BoundingBox } from '@/app/(workspace)/paint/_shapes/ShapeTypes';

export type SerializedSceneItem = {
    kind: string;
    data: Record<string, unknown>;
};

export type PaintClipboardShapePayload = {
    item: SerializedSceneItem;
    pixelated: boolean;
    pixelSize: number;
    overlayBounds: BoundingBox | null;
    visualRotation: number;
};

const ZERO_POINT = { x: 0, y: 0 };

const DASH_PRESET_BY_KEY = new Map<string, LineDashPreset>(
    Object.entries(DASH_ARRAYS).map(([preset, values]) => [values.join(','), preset as LineDashPreset]),
);

function clonePoint(point: Point): Point {
    return { x: point.x, y: point.y };
}

function clonePoints(points: Point[]): Point[] {
    return points.map(clonePoint);
}

function getLineDashPreset(lineDash: number[] | undefined): LineDashPreset {
    return DASH_PRESET_BY_KEY.get((lineDash ?? []).join(',')) ?? 'solid';
}

function getCommonShapeData(shape: Shape) {
    return {
        strokeStyle: shape.strokeStyle,
        fillStyle: shape.fillStyle,
        lineWidth: shape.lineWidth,
        filled: shape.filled,
        pixelated: shape.pixelated,
        pixelSize: shape.pixelSize,
        lineAlgorithm: shape.lineAlgorithm,
        lineDash: getLineDashPreset(shape.lineDash),
    };
}

function getCommonFreeformData(shape: FreeForm) {
    return {
        strokeStyle: shape.strokeStyle,
        lineWidth: shape.lineWidth,
        pixelated: shape.pixelated,
        pixelSize: shape.pixelSize,
        lineAlgorithm: shape.lineAlgorithm,
        lineDash: getLineDashPreset(shape.lineDash),
        brushStyle: shape.brushStyle,
        isEraser: shape.isEraser,
        filled: shape.filled,
    };
}

function getShapeOptions(data: Record<string, unknown>): ShapeOptions {
    const lineDashPreset = typeof data.lineDash === 'string' ? (data.lineDash as LineDashPreset) : 'solid';

    return {
        strokeStyle: typeof data.strokeStyle === 'string' ? data.strokeStyle : '#000000',
        fillStyle: typeof data.fillStyle === 'string' ? data.fillStyle : '#FFFFFF',
        lineWidth: typeof data.lineWidth === 'number' ? data.lineWidth : 1,
        filled: Boolean(data.filled),
        pixelated: Boolean(data.pixelated),
        pixelSize: typeof data.pixelSize === 'number' ? data.pixelSize : 20,
        lineAlgorithm: (typeof data.lineAlgorithm === 'string' ? data.lineAlgorithm : 'bresenham') as LineAlgorithm,
        lineDash: DASH_ARRAYS[lineDashPreset] ?? [],
    };
}

function applyCommonShapeData(shape: Shape, data: Record<string, unknown>) {
    shape.strokeStyle = typeof data.strokeStyle === 'string' ? data.strokeStyle : shape.strokeStyle;
    shape.fillStyle = typeof data.fillStyle === 'string' ? data.fillStyle : shape.fillStyle;
    shape.lineWidth = typeof data.lineWidth === 'number' ? data.lineWidth : shape.lineWidth;
    shape.filled = Boolean(data.filled);
    shape.pixelated = Boolean(data.pixelated);
    shape.pixelSize = typeof data.pixelSize === 'number' ? data.pixelSize : shape.pixelSize;
    shape.lineAlgorithm = (typeof data.lineAlgorithm === 'string' ? data.lineAlgorithm : shape.lineAlgorithm) as LineAlgorithm;
    shape.lineDash = DASH_ARRAYS[(typeof data.lineDash === 'string' ? data.lineDash : 'solid') as LineDashPreset] ?? [];
    // Backward compat: old saves stored a `rotation` angle; bake it into the shape's data.
    if (typeof data.rotation === 'number' && data.rotation !== 0) {
        shape.rotateBy(data.rotation, shape.getCenter());
    }
}

function isPoint(value: unknown): value is Point {
    return (
        typeof value === 'object' &&
        value !== null &&
        typeof (value as Point).x === 'number' &&
        typeof (value as Point).y === 'number'
    );
}

function readPoint(value: unknown, fallback: Point = ZERO_POINT): Point {
    return isPoint(value) ? clonePoint(value) : clonePoint(fallback);
}

function readPoints(value: unknown): Point[] {
    return Array.isArray(value) ? value.filter(isPoint).map(clonePoint) : [];
}

async function imageSourceToDataUrl(image: CanvasImageSource): Promise<string | null> {
    if (typeof HTMLImageElement !== 'undefined' && image instanceof HTMLImageElement) {
        if (image.currentSrc.startsWith('data:')) return image.currentSrc;
        if (image.src.startsWith('data:')) return image.src;
    }

    if (typeof HTMLCanvasElement !== 'undefined' && image instanceof HTMLCanvasElement) {
        return image.toDataURL('image/png');
    }

    const width =
        'naturalWidth' in image ? Number(image.naturalWidth) :
        'width' in image ? Number(image.width) :
        0;
    const height =
        'naturalHeight' in image ? Number(image.naturalHeight) :
        'height' in image ? Number(image.height) :
        0;

    if (!width || !height) return null;

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL('image/png');
}

async function loadImageFromDataUrl(dataUrl: string): Promise<HTMLImageElement> {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Nao foi possivel carregar a imagem do projeto.'));
        image.src = dataUrl;
    });

    return image;
}

async function serializeSceneItem(item: SceneItem): Promise<SerializedSceneItem | null> {
    if (item instanceof ShapeGroup) {
        const children = (await Promise.all(item.shapes.map((child) => serializeSceneItem(child))))
            .filter((child): child is SerializedSceneItem => child !== null);
        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                children: children.map((child) => ({
                    kind: child.kind,
                    data: child.data,
                })),
            },
        };
    }

    if (item instanceof ImageShape) {
        const dataUrl = await imageSourceToDataUrl(item.image);
        if (!dataUrl) return null;

        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                x: item.x,
                y: item.y,
                width: item.width,
                height: item.height,
                rotation: item.rotation,
                flipX: item.flipX,
                flipY: item.flipY,
                dataUrl,
            },
        };
    }

    if (item instanceof Line || item instanceof Arrow) {
        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                start: clonePoint(item.start),
                end: clonePoint(item.end),
            },
        };
    }

    if (item instanceof Rectangle || item instanceof Square) {
        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                points: item.points.map(clonePoint),
            },
        };
    }

    if (item instanceof Circle) {
        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                center: clonePoint(item.center),
                radius: item.radius,
            },
        };
    }

    if (item instanceof Ellipse) {
        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                center: clonePoint(item.center),
                radiusX: item.radiusX,
                radiusY: item.radiusY,
                ellipseAngle: item.ellipseAngle,
            },
        };
    }

    if (
        item instanceof Triangle ||
        item instanceof Diamond ||
        item instanceof Pentagon ||
        item instanceof Hexagon ||
        item instanceof Heptagon ||
        item instanceof Octagon ||
        item instanceof Star ||
        item instanceof FreePolygon
    ) {
        return {
            kind: item.kind,
            data: {
                ...getCommonShapeData(item),
                points: clonePoints(item.points),
            },
        };
    }

    if (item instanceof FreeForm) {
        return {
            kind: item.kind,
            data: {
                ...getCommonFreeformData(item),
                points: clonePoints(item.points),
            },
        };
    }

    if (item instanceof FillShape) {
        return {
            kind: item.kind,
            data: {
                strokeStyle: item.strokeStyle,
                pixelated: item.pixelated,
                pixelSize: item.pixelSize,
                isEraser: item.isEraser,
                algorithm: item.algorithm,
                point: clonePoint(item.point),
            },
        };
    }

    if (item instanceof ClearRectItem) {
        const raw = item as unknown as Record<string, number>;
        return {
            kind: 'clearrect',
            data: {
                x: raw.x,
                y: raw.y,
                w: raw.w,
                h: raw.h,
            },
        };
    }

    return null;
}

async function deserializeSceneItem(item: SerializedSceneItem): Promise<SceneItem | null> {
    const data = item.data;

    switch (item.kind) {
        case 'line': {
            const shape = new Line(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.start = readPoint(data.start);
            shape.end = readPoint(data.end);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'arrow': {
            const shape = new Arrow(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.start = readPoint(data.start);
            shape.end = readPoint(data.end);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'rect': {
            const shape = new Rectangle(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            if (Array.isArray(data.points) && data.points.length === 4) {
                shape.points = readPoints(data.points);
            } else if (isPoint(data.topLeft) && isPoint(data.bottomRight)) {
                // Backward compat: old saves used topLeft/bottomRight.
                const tl = readPoint(data.topLeft), br = readPoint(data.bottomRight);
                shape.points = [tl, { x: br.x, y: tl.y }, br, { x: tl.x, y: br.y }];
            }
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'square': {
            const shape = new Square(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            if (Array.isArray(data.points) && data.points.length === 4) {
                shape.points = readPoints(data.points);
            } else if (isPoint(data.topLeft) && isPoint(data.bottomRight)) {
                // Backward compat: old saves used topLeft/bottomRight.
                const tl = readPoint(data.topLeft), br = readPoint(data.bottomRight);
                shape.points = [tl, { x: br.x, y: tl.y }, br, { x: tl.x, y: br.y }];
            }
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'circle': {
            const shape = new Circle(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.center = readPoint(data.center);
            shape.radius = typeof data.radius === 'number' ? data.radius : 0;
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'ellipse': {
            const shape = new Ellipse(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.center = readPoint(data.center);
            shape.radiusX = typeof data.radiusX === 'number' ? data.radiusX : 0;
            shape.radiusY = typeof data.radiusY === 'number' ? data.radiusY : 0;
            shape.ellipseAngle = typeof data.ellipseAngle === 'number' ? data.ellipseAngle : 0;
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'triangle': {
            const shape = new Triangle(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'diamond': {
            const shape = new Diamond(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'pentagon': {
            const shape = new Pentagon(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'hexagon': {
            const shape = new Hexagon(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'heptagon': {
            const shape = new Heptagon(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'octagon': {
            const shape = new Octagon(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'star': {
            const shape = new Star(ZERO_POINT, ZERO_POINT, getShapeOptions(data));
            shape.points = readPoints(data.points);
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'polygon': {
            const shape = new FreePolygon(readPoints(data.points), getShapeOptions(data));
            applyCommonShapeData(shape, data);
            return shape;
        }
        case 'group': {
            const nestedItems = Array.isArray(data.children)
                ? await Promise.all(
                    data.children.map((child) =>
                        deserializeSceneItem({
                            kind: typeof child?.kind === 'string' ? child.kind : '',
                            data: typeof child?.data === 'object' && child.data !== null
                                ? (child.data as Record<string, unknown>)
                                : {},
                        })
                    )
                )
                : [];
            const shapes = nestedItems.filter((candidate): candidate is Shape => candidate instanceof Shape);
            const group = new ShapeGroup(shapes, getShapeOptions(data));
            applyCommonShapeData(group, data);
            return group;
        }
        case 'image': {
            if (typeof data.dataUrl !== 'string' || data.dataUrl.length === 0) return null;
            const image = await loadImageFromDataUrl(data.dataUrl);
            const shape = new ImageShape(
                image,
                typeof data.x === 'number' ? data.x : 0,
                typeof data.y === 'number' ? data.y : 0,
                typeof data.width === 'number' ? data.width : image.naturalWidth,
                typeof data.height === 'number' ? data.height : image.naturalHeight,
                getShapeOptions(data),
            );
            applyCommonShapeData(shape, data);
            shape.rotation = typeof data.rotation === 'number' ? data.rotation : shape.rotation;
            shape.flipX = Boolean(data.flipX);
            shape.flipY = Boolean(data.flipY);
            return shape;
        }
        case 'freeform':
            return new FreeForm(readPoints(data.points), {
                strokeStyle: typeof data.strokeStyle === 'string' ? data.strokeStyle : '#000000',
                lineWidth: typeof data.lineWidth === 'number' ? data.lineWidth : 1,
                pixelated: Boolean(data.pixelated),
                pixelSize: typeof data.pixelSize === 'number' ? data.pixelSize : 20,
                lineAlgorithm: (typeof data.lineAlgorithm === 'string' ? data.lineAlgorithm : 'bresenham') as LineAlgorithm,
                lineDash: DASH_ARRAYS[(typeof data.lineDash === 'string' ? data.lineDash : 'solid') as LineDashPreset] ?? [],
                brushStyle: (typeof data.brushStyle === 'string' ? data.brushStyle : 'smooth') as BrushStyle,
                isEraser: Boolean(data.isEraser),
                filled: Boolean(data.filled),
            });
        case 'floodfill':
            return new FillShape({
                strokeStyle: typeof data.strokeStyle === 'string' ? data.strokeStyle : '#000000',
                pixelated: Boolean(data.pixelated),
                pixelSize: typeof data.pixelSize === 'number' ? data.pixelSize : 20,
                isEraser: Boolean(data.isEraser),
                algorithm: (typeof data.algorithm === 'string' ? data.algorithm : 'scanline') as FillAlgorithm,
                point: readPoint(data.point),
            });
        case 'clearrect':
            return new ClearRectItem(
                typeof data.x === 'number' ? data.x : 0,
                typeof data.y === 'number' ? data.y : 0,
                typeof data.w === 'number' ? data.w : 0,
                typeof data.h === 'number' ? data.h : 0,
            );
        default:
            return null;
    }
}

export async function serializePaintScene(scene: SceneItem[]): Promise<PaintSceneItemSnapshot[]> {
    const serialized: PaintSceneItemSnapshot[] = [];

    for (const item of scene) {
        const nextItem = await serializeSceneItem(item);
        if (!nextItem) continue;

        serialized.push({
            position: serialized.length,
            kind: nextItem.kind,
            data: nextItem.data,
        });
    }

    return serialized;
}

export async function deserializePaintScene(
    scene: PaintSceneItemSnapshot[],
): Promise<SceneItem[]> {
    const items = await Promise.all(
        [...scene]
            .sort((left, right) => left.position - right.position)
            .map((item) =>
                deserializeSceneItem({
                    kind: item.kind,
                    data: typeof item.data === 'object' && item.data !== null
                        ? (item.data as Record<string, unknown>)
                        : {},
                })
            )
    );

    return items.filter((item): item is SceneItem => item !== null);
}

export async function serializePaintClipboardShape(shape: Shape): Promise<PaintClipboardShapePayload | null> {
    const item = await serializeSceneItem(shape);
    if (!item) return null;

    return {
        item,
        pixelated: shape.pixelated,
        pixelSize: shape.pixelSize,
        overlayBounds: shape.getOverlayBounds(),
        visualRotation: shape.getVisualRotation(),
    };
}

export async function deserializePaintClipboardShape(
    payload: PaintClipboardShapePayload,
): Promise<Shape | null> {
    const item = await deserializeSceneItem(payload.item);
    if (!(item instanceof Shape)) return null;

    item.restoreTransformFrame(payload.overlayBounds, payload.visualRotation);
    return item;
}
