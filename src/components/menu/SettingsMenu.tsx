
import { useContext } from "react";
import { PaintContext } from "../../context/PaintContext";
import GlassCard from "./GlassCard";
import PixelatedSettings from "./settings/PixelatedSettings";
import { SettingsContext } from "../../context/SettingsContext";

const SettingsMenu = () => {
    const { pixelated } = useContext(PaintContext)!;

    const { pageSizeEraser, setPageSizeEraser } = useContext(SettingsContext)!;
    

    if (!pixelated) {
        return (
            <GlassCard initial={{ x: 0, y: 0 }}>
                <div className="p-4 w-64">
                    <h3 className="text-lg font-semibold mb-4 text-gray-800">Configurações</h3>
                    
                    <div className="space-y-4 flex items-center justify-evenly">
                        <label className="block m-0 text-sm font-medium text-gray-700">
                            Borracha Suavizada
                        </label>
                        <input onChange={() => setPageSizeEraser(!pageSizeEraser)} type="checkbox" className="cursor-pointer w-5 h-5"/>
                    </div>
                </div>
            </GlassCard>
        );
    }

    return (
        <PixelatedSettings/>
    );
};

export default SettingsMenu;
