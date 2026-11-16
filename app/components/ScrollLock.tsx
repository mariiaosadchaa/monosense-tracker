"use client";

import { useEffect } from "react";

/**
 * Поки на екрані є .modal-backdrop — фіксуємо body (iOS Safari ігнорує overflow:hidden),
 * щоб прокручувалось лише вікно, а не сторінка під ним. Після закриття повертаємо позицію.
 */
export function ScrollLock() {
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        let locked = false;
        let savedY = 0;
        const lock = () => {
            savedY = window.scrollY;
            root.classList.add("modal-open");
            Object.assign(body.style, { position: "fixed", top: `-${savedY}px`, left: "0", right: "0", width: "100%" });
            locked = true;
        };
        const unlock = () => {
            root.classList.remove("modal-open");
            Object.assign(body.style, { position: "", top: "", left: "", right: "", width: "" });
            window.scrollTo(0, savedY);
            locked = false;
        };
        const sync = () => {
            const open = Boolean(document.querySelector(".modal-backdrop"));
            if (open && !locked) lock();
            else if (!open && locked) unlock();
        };
        const observer = new MutationObserver(sync);
        observer.observe(body, { childList: true, subtree: true });
        sync();
        return () => {
            observer.disconnect();
            if (locked) unlock();
        };
    }, []);
    return null;
}
