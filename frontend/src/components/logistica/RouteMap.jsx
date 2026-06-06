import {
    CircleMarker,
    MapContainer,
    Polyline,
    Popup,
    TileLayer,
    Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { DEFAULT_CENTER, getCoordsForVenta } from "../../services/api/logistica";

export default function RouteMap({ ventas, coordsByVentaId, clientesById }) {
    const routePoints = ventas
        .map(venta => ({ 
            venta, 
            coords: getCoordsForVenta(coordsByVentaId, venta.id), 
            cliente: clientesById[String(venta.cliente)] 
        }))
        .filter(item => item.coords);

    const center = routePoints[0] 
        ? [routePoints[0].coords.lat, routePoints[0].coords.lng] 
        : DEFAULT_CENTER;

    return (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-hidden rounded-2xl border border-stone-800/80 bg-stone-900/40 shadow-xl">
                <MapContainer center={center} zoom={12} scrollWheelZoom style={{ height: "560px", width: "100%" }}>
                    <TileLayer 
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' 
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                    />
                    {routePoints.length > 1 && (
                        <Polyline 
                            positions={routePoints.map(i => [i.coords.lat, i.coords.lng])} 
                            pathOptions={{ color: "#CAED4E", weight: 4 }} 
                        />
                    )}
                    {routePoints.map((item, index) => (
                        <CircleMarker 
                            key={item.venta.id} 
                            center={[item.coords.lat, item.coords.lng]} 
                            radius={12} 
                            pathOptions={{ color: "#CAED4E", fillColor: "#111111", fillOpacity: 0.9, weight: 2 }}
                        >
                            <Tooltip permanent direction="center" opacity={1}>
                                <span className="text-xs font-bold text-[#CAED4E]">{index + 1}</span>
                            </Tooltip>
                            <Popup>
                                <div className="text-sm p-1">
                                    <p className="font-semibold text-gray-900">Venta #{item.venta.id}</p>
                                    <p className="text-gray-700">{item.cliente?.nombre || item.venta.cliente}</p>
                                    <p className="text-gray-600 text-xs mt-1">{item.venta.direccion_entrega || item.cliente?.direccion || "-"}</p>
                                </div>
                            </Popup>
                        </CircleMarker>
                    ))}
                </MapContainer>
            </div>
            
            <aside className="rounded-2xl border border-stone-800/80 bg-stone-900/40 p-4 shadow-xl flex flex-col h-[560px] overflow-hidden">
                <h3 className="text-sm font-semibold text-stone-200">Paso a paso</h3>
                <div className="mt-3 space-y-3 overflow-y-auto flex-1 pr-1">
                    {ventas.map((venta, index) => {
                        const cliente = clientesById[String(venta.cliente)];
                        const coords = getCoordsForVenta(coordsByVentaId, venta.id);
                        return (
                            <div key={venta.id} className="rounded-xl border border-stone-900 bg-stone-950/40 p-3 hover:border-stone-800 transition duration-300">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#CAED4E]">Parada {index + 1}</p>
                                <p className="mt-1 text-sm font-bold text-white">Venta #{venta.id}</p>
                                <p className="text-sm text-stone-300 font-medium">{cliente?.nombre || venta.cliente}</p>
                                <p className="text-xs text-stone-400 mt-1">{venta.direccion_entrega || cliente?.direccion || "-"}</p>
                                <p className="mt-1.5 text-[10px] text-stone-500 italic">
                                    {coords ? coords.displayName || "Geolocalizada" : "Sin geolocalizar"}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </aside>
        </div>
    );
}
