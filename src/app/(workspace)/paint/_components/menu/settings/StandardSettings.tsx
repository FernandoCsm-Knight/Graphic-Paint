'use client';

import { useContext } from "react";
import { SettingsContext } from "../../../_context/SettingsContext";
import GridSettings from "./GridSettings";
import PlacementModeSettings from "./PlacementModeSettings";
import Settings from "./ui/Settings";

const StandardSettings = () => {
    const { pageSizeEraser, setPageSizeEraser } = useContext(SettingsContext)!;

    return (
        <Settings>
            <li className="flex items-center justify-between">
                <label className="block m-0" htmlFor="pageSizeEraserInput">
                    Borracha Suavizada
                </label>
                <input 
                    id="pageSizeEraserInput"
                    onChange={() => setPageSizeEraser(!pageSizeEraser)} 
                    type="checkbox" 
                    checked={pageSizeEraser} 
                    className="cursor-pointer w-[var(--pm-icon)] h-[var(--pm-icon)]"
                />
            </li>
            <PlacementModeSettings />
            <GridSettings descriptionPrefix="do traco livre" />
        </Settings>
    );
}

export default StandardSettings;
