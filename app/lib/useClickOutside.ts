import { useEffect, type RefObject } from "react";

/** Закриває панель/меню при кліку поза елементом або натисканні Escape. */
export function useClickOutside(ref: RefObject<HTMLElement | null>, onClose: () => void, active = true) {
    useEffect(() => {
        if (!active) return;
        const onDown = (e: MouseEvent | TouchEvent) => {
            const el = ref.current;
            if (el && !el.contains(e.target as Node)) onClose();
        };
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [ref, onClose, active]);
}
