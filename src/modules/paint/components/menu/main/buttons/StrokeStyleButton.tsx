import { useContext } from "react";
import { LuPenLine } from "react-icons/lu";
import { MenuContext } from "../../../../context/MenuContext";
import WorkspaceToolButton from "../../../../../../components/WorkspaceToolButton";

const StrokeStyleButton = () => {
    const { strokeStyleButtonRef, strokeStyleMenu, setStrokeStyleMenu } = useContext(MenuContext)!;

    return (
        <WorkspaceToolButton
            ref={strokeStyleButtonRef}
            onClick={() => setStrokeStyleMenu(!strokeStyleMenu)}
            stayActive
            active={strokeStyleMenu}
            ariaLabel="Estilo de traço e pincel"
            title="Estilo de traço e pincel"
        >
            <LuPenLine className="ui-icon" />
        </WorkspaceToolButton>
    );
};

export default StrokeStyleButton;
