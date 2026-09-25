"use client";

import { useEffect } from "react";
import { isNativeApp, nativePlugin, haptic } from "../lib/native";

/** Підключається один раз у layout. У браузері нічого не робить. */
export function NativeBridge() {
    useEffect(() => {
        if (!isNativeApp()) return;
        const root = document.documentElement;
        root.classList.add("is-native");

        // Статус-бар під тему: темна тема → світлий текст
        const StatusBar = nativePlugin("StatusBar");
        const syncStatusBar = () => {
            const dark = root.dataset.theme === "dark";
            StatusBar?.setStyle?.({ style: dark ? "DARK" : "LIGHT" })?.catch?.(() => {});
        };
        syncStatusBar();
        const themeObserver = new MutationObserver(syncStatusBar);
        themeObserver.observe(root, { attributes: true, attributeFilter: ["data-theme"] });

        // Ховаємо сплеш, коли сторінка вже намалювалась
        const hide = () => nativePlugin("SplashScreen")?.hide?.({ fadeOutDuration: 350 })?.catch?.(() => {});
        requestAnimationFrame(() => requestAnimationFrame(hide));

        // Тактильна віддача на натискання кнопок
        const onPress = (e: PointerEvent) => {
            const el = (e.target as HTMLElement | null)?.closest?.("button, [role='button'], .dc-chip, .data-row, .tx");
            if (el && !(el as HTMLButtonElement).disabled) haptic("Light");
        };
        document.addEventListener("pointerdown", onPress, { passive: true });

        // Повернення в застосунок — оновити дані (як pull-to-refresh)
        const App = nativePlugin("App");
        let resumeHandle: { remove?: () => void } | undefined;
        App?.addListener?.("resume", () => window.dispatchEvent(new Event("rivna:resume")))
            ?.then?.((h: { remove?: () => void }) => (resumeHandle = h));

        return () => {
            themeObserver.disconnect();
            document.removeEventListener("pointerdown", onPress);
            resumeHandle?.remove?.();
        };
    }, []);
    return null;
}
