export class ClipboardImageLoader {
    static isClipboardSupported(): boolean {
        return 'clipboard' in navigator && 'read' in navigator.clipboard;
    }

    static async loadImageFromClipboard(): Promise<HTMLImageElement> {
        if (!this.isClipboardSupported())
            throw new Error('Clipboard API não é suportada neste navegador');

        const elements = await navigator.clipboard.read();

        let blob = undefined;
        for (let i = 0; !blob && i < elements.length; i++) {
            const imageType = elements[i].types.find(type => type.startsWith('image/'));
            if (imageType) blob = await elements[i].getType(imageType);
        }

        if (!blob) throw new Error('Nenhuma imagem encontrada na área de transferência');

        return await this.blobToImage(blob);
    }

    static async copyImageToClipboard(img: Blob): Promise<void> {
        if (!this.isClipboardSupported()) throw new Error('Clipboard API não é suportada neste navegador');

        await navigator.clipboard.write([
            new ClipboardItem({
                [img.type]: img
            })
        ]);
    }

    private static blobToImage(blob: Blob): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                URL.revokeObjectURL(url);
                resolve(img);
            };

            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error('Erro ao carregar a imagem'));
            };

            img.src = url;
        });
    }
}
