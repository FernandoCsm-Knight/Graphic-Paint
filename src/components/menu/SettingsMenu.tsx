
import { useContext } from "react";
import { PaintContext, type LineAlgorithm, type GridDisplayMode } from "../../context/PaintContext";
import GlassCard from "./GlassCard";

const SettingsMenu = () => {
    const { 
        pixelated, 
        settings
    } = useContext(PaintContext)!;
    
    const handlePixelSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const size = parseInt(event.target.value);
        if(size >= 1 && size <= 100) settings.setPixelSize(size);
    };

    const handleLineAlgorithmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        settings.setLineAlgorithm(event.target.value as LineAlgorithm);
    };

    const handleGridDisplayModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        settings.setGridDisplayMode(event.target.value as GridDisplayMode);
    };

    if (!pixelated) {
        return (
            <GlassCard initial={{ x: 0, y: 0 }}>
                <div className="p-4 w-64">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Configurações</h3>
                    <div className="text-gray-600 text-sm">
                        Ative o modo pixelado para acessar as configurações avançadas.
                    </div>
                </div>
            </GlassCard>
        );
    }

    return (
        <GlassCard initial={{ x: 0, y: 0 }}>
            <div className="p-4 w-80">
                <h3 className="text-lg font-semibold mb-4 text-gray-800">
                    Configurações do Modo Pixelado
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Tamanho do Pixel
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min="5"
                                max="50"
                                step="1"
                                value={settings.pixelSize}
                                onChange={handlePixelSizeChange}
                                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            />
                            <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded min-w-[3rem] text-center">
                                {settings.pixelSize}px
                            </span>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Algoritmo de Linha
                        </label>
                        <select
                            value={settings.lineAlgorithm}
                            onChange={handleLineAlgorithmChange}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="bresenham">Bresenham</option>
                            <option value="dda">DDA (Digital Differential Analyzer)</option>
                        </select>
                        <div className="text-xs text-gray-500 mt-1">
                            {settings.lineAlgorithm === 'bresenham' 
                                ? 'Algoritmo mais preciso e eficiente para rasterização'
                                : 'Algoritmo simples baseado em interpolação linear'
                            }
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Exibição do Grid
                        </label>
                        <select
                            value={settings.gridDisplayMode}
                            onChange={handleGridDisplayModeChange}
                            className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                            <option value="behind">Atrás do desenho</option>
                            <option value="front">À frente do desenho</option>
                            <option value="none">Sem grid</option>
                        </select>
                        <div className="text-xs text-gray-500 mt-1">
                            {settings.gridDisplayMode === 'behind' && 'Grid aparece atrás dos pixels desenhados'}
                            {settings.gridDisplayMode === 'front' && 'Grid aparece sobre os pixels desenhados'}
                            {settings.gridDisplayMode === 'none' && 'Grid não é exibido'}
                        </div>
                    </div>
                </div>
            </div>
        </GlassCard>
    );
};

export default SettingsMenu;
