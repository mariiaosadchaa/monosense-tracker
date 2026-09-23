import { X } from "lucide-react";

export function ModalHead({ label, title, close }: { label: string; title: string; close: () => void }) {
    return (
        <div className="modal-head">
            <div>
                <span className="eyebrow">{label}</span>
                <h2>{title}</h2>
            </div>
            <button type="button" onClick={close}>
                <X />
            </button>
        </div>
    );
}
