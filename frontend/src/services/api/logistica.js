const GEOCODE_CACHE_KEY = "lupon-logistica-geocode-v2";
export const DEFAULT_CENTER = [-34.6037, -58.3816];

export function readGeocodeCache() {
    try {
        const raw = localStorage.getItem(GEOCODE_CACHE_KEY);
        return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
}

export function writeGeocodeCache(cache) {
    try {
        localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
        console.warn("No se pudo escribir en el caché de geolocalización", error);
    }
}

export function buildAddress(value) {
    const base = String(value || "").trim();
    if (!base) return "";
    const lowered = base.toLowerCase();
    if (lowered.includes("argentina")) return base;
    if (lowered.includes("buenos aires")) return `${base}, Argentina`;
    return `${base}, Buenos Aires, Argentina`;
}

export async function geocodeAddress(rawAddress) {
    const address = buildAddress(rawAddress);
    if (!address) return null;
    const cache = readGeocodeCache();
    if (cache[address]) return cache[address];
    
    const query = new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ar", q: address });
    const res = await fetch(`https://nominatim.openstreetmap.org/search?${query}`);
    if (!res.ok) throw new Error("No se pudo geocodificar.");
    
    const results = await res.json();
    if (!Array.isArray(results) || results.length === 0) {
        cache[address] = null;
        writeGeocodeCache(cache);
        return null;
    }
    const first = results[0];
    const payload = { lat: Number(first.lat), lng: Number(first.lon), displayName: first.display_name || address };
    cache[address] = payload;
    writeGeocodeCache(cache);
    return payload;
}

export function getCoordsForVenta(coordsByVentaId, ventaId) {
    const item = coordsByVentaId[String(ventaId)];
    if (!item || typeof item.lat !== "number") return null;
    return item;
}
