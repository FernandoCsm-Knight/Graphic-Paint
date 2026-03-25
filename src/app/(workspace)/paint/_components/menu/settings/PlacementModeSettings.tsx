'use client';

import { useContext } from "react";
import { SettingsContext, type PlacementMode } from "../../../_context/SettingsContext";

const descriptions: Record<PlacementMode, string> = {
    bbox:     'Move e redimensiona pela caixa delimitadora',
    vertices: 'Arrasta vértices individuais da estrutura',
};

const PlacementModeSettings = () => {
    const { placementMode, setPlacementMode } = useContext(SettingsContext)!;

    return (
        <li>
            <label className="block mb-[var(--pm-gap)]">
                Modo de Posicionamento
            </label>
            <select
                value={placementMode}
                onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                className="ui-input w-full p-[var(--pm-btn-pad)] rounded-md"
            >
                <option value="bbox">Caixa Delimitadora</option>
                <option value="vertices">Vértices</option>
            </select>
            <div className="ui-panel-muted-on-dark max-w-55 mt-1">
                {descriptions[placementMode]}
            </div>
        </li>
    );
};

export default PlacementModeSettings;
