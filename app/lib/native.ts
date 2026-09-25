/**
 * Міст до нативної iOS-оболонки (Capacitor). Працює БЕЗ npm-залежностей:
 * у застосунку Capacitor сам додає window.Capacitor з плагінами.
 * У звичайному браузері всі функції — тихі no-op.
 */
type CapacitorGlobal = {
    isNativePlatform?: () => boolean;
    getPlatform?: () => string;
    Plugins?: Record<string, any>;
};

export function capacitor(): CapacitorGlobal | undefined {
    if (typeof window === "undefined") return undefined;
    return (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
}

export const isNativeApp = () => !!capacitor()?.isNativePlatform?.();

export function nativePlugin<T = any>(name: string): T | undefined {
    return isNativeApp() ? (capacitor()?.Plugins?.[name] as T | undefined) : undefined;
}

/** Легка тактильна віддача (як в iOS). */
export function haptic(style: "Light" | "Medium" | "Heavy" = "Light") {
    nativePlugin("Haptics")?.impact?.({ style })?.catch?.(() => {});
}

/** Віддача для успіху/помилки (після збереження операції тощо). */
export function hapticNotify(type: "SUCCESS" | "WARNING" | "ERROR" = "SUCCESS") {
    nativePlugin("Haptics")?.notification?.({ type })?.catch?.(() => {});
}
