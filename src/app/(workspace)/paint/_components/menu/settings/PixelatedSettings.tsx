'use client';

import { useContext } from "react";
import { SettingsContext, type ClipAlgorithm, type LineAlgorithm } from "../../../_context/SettingsContext";
import GridSettings from "./GridSettings";
import PlacementModeSettings from "./PlacementModeSettings";
import Settings from "./ui/Settings";

const PixelatedSettings = () => {
    const {
        pixelSize,
        setPixelSize,
        lineAlgorithm,
        setLineAlgorithm,
        clipAlgorithm,
        setClipAlgorithm,
    } = useContext(SettingsContext)!;
    
    const handlePixelSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const size = parseInt(event.target.value);
        if(size >= 1 && size <= 100) setPixelSize(size);
    };

    const handleLineAlgorithmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setLineAlgorithm(event.target.value as LineAlgorithm);
    };

    const handleClipAlgorithmChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        setClipAlgorithm(event.target.value as ClipAlgorithm);
    };

    const clipDescriptions: Record<ClipAlgorithm, string> = {
        'cohen-sutherland': 'Recorte de retas por testes de região (outcodes)',
        'liang-barsky':     'Recorte de retas por interseção paramétrica',
        'sutherland-hodgman': 'Recorte de polígonos contra janela retangular',
    };

    return (
        <Settings>
            <li>
                <label className="block mb-[var(--pm-gap)]">
                    Tamanho do Pixel
                </label>
                <div className="flex items-center gap-[var(--pm-gap)]">
                    <input
                        type="range"
                        min="5"
                        max="50"
                        step="1"
                        value={pixelSize}
                        onChange={handlePixelSizeChange}
                        className="slider flex-1 h-2 rounded-lg cursor-pointer"
                    />
                    <span className="ui-value-chip font-mono px-[var(--pm-btn-pad)] py-0.5 rounded min-w-[3rem] text-center">
                        {pixelSize}px
                    </span>
                </div>
            </li>

            <li>
                <label className="block mb-[var(--pm-gap)]">
                    Algoritmo de Linha
                </label>
                <select
                    value={lineAlgorithm}
                    onChange={handleLineAlgorithmChange}
                    className="ui-input w-full p-[var(--pm-btn-pad)] rounded-md"
                >
                    <option value="bresenham">Bresenham</option>
                    <option value="dda">DDA (Digital Differential Analyzer)</option>
                </select>
                <div className="max-w-55 ui-panel-muted-on-dark mt-1">
                    {lineAlgorithm === 'bresenham' 
                        ? 'Algoritmo mais preciso e eficiente para rasterização'
                        : 'Algoritmo simples baseado em interpolação linear'
                    }
                </div>
            </li>
            <li>
                <label className="block mb-[var(--pm-gap)]">
                    Algoritmo de Recorte (Seleção)
                </label>
                <select
                    value={clipAlgorithm}
                    onChange={handleClipAlgorithmChange}
                    className="ui-input w-full p-[var(--pm-btn-pad)] rounded-md"
                >
                    <option value="cohen-sutherland">Cohen-Sutherland (reta)</option>
                    <option value="liang-barsky">Liang-Barsky (reta)</option>
                    <option value="sutherland-hodgman">Sutherland-Hodgman (polígono)</option>
                </select>
                <div className="max-w-55 ui-panel-muted-on-dark mt-1">
                    {clipDescriptions[clipAlgorithm]}
                </div>
            </li>

            <PlacementModeSettings />
            <GridSettings descriptionPrefix="dos pixels desenhados" />
        </Settings>
    );
};

export default PixelatedSettings;
