import { useEffect, useMemo, useState } from "react";
import SearchableSelect from "../components/ui/SearchableSelect";
import { getClientes } from "../services/api/clientes";
import { getVentas } from "../services/api/ventas";
import { getCobros } from "../services/api/cobros";

export default function CuentaCorrienteClientes() {
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState("");
  const [ventas, setVentas] = useState([]);
  const [cobros, setCobros] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadClientes = async () => {
      try {
        const data = await getClientes({ useCache: false });
        setClientes(data || []);
      } catch (err) {
        setError(err?.message || "No se pudo cargar clientes.");
      }
    };
    loadClientes();
  }, []);

  useEffect(() => {
    if (!clienteId) {
      setVentas([]);
      setCobros([]);
      return;
    }
    const loadMovimientos = async () => {
      setError("");
      setIsLoading(true);
      try {
        const [ventasData, cobrosData] = await Promise.all([
          getVentas({ clienteId }),
          getCobros({ clienteId }),
        ]);
        setVentas(ventasData || []);
        setCobros(cobrosData || []);
      } catch (err) {
        setError(err?.message || "No se pudo cargar la cuenta corriente.");
      } finally {
        setIsLoading(false);
      }
    };
    loadMovimientos();
  }, [clienteId]);

  const clienteOptions = useMemo(
    () =>
      clientes.map((cliente) => ({
        value: String(cliente.id),
        label: cliente.nombre_fantasia
          ? `${cliente.nombre} - ${cliente.nombre_fantasia}`
          : cliente.nombre,
      })),
    [clientes]
  );

  const formatDate = (value) => {
    if (!value) return "-";
    const [year, month, day] = String(value).split("-");
    if (!year || !month || !day) return "-";
    return `${day}/${month}/${year}`;
  };

  const formatArs = (value) => {
    const number = Number(value || 0);
    if (Number.isNaN(number)) return "$ 0,00";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const movimientos = useMemo(() => {
    const base = [
      ...ventas.map((venta) => ({
        tipo: "venta",
        fecha_emision: venta.fecha_venta,
        detalle: `Venta #${venta.id}`,
        fecha_vto: venta.vencimiento || null,
        debe: Number(venta.total || 0),
        haber: 0,
        id: venta.id,
      })),
      ...cobros.map((cobro) => ({
        tipo: "cobro",
        fecha_emision: cobro.fecha_cobro,
        detalle: `Cobro #${cobro.id}`,
        fecha_vto: null,
        debe: 0,
        haber: Number(cobro.monto || 0),
        id: cobro.id,
      })),
    ];

    base.sort((a, b) => {
      const fechaA = String(a.fecha_emision || "");
      const fechaB = String(b.fecha_emision || "");
      if (fechaA !== fechaB) return fechaA.localeCompare(fechaB);
      if (a.tipo !== b.tipo) return a.tipo === "venta" ? -1 : 1;
      return a.id - b.id;
    });

    let saldo = 0;
    return base.map((item) => {
      saldo += item.debe - item.haber;
      return { ...item, saldo };
    });
  }, [ventas, cobros]);

  const saldoActual = movimientos.length
    ? movimientos[movimientos.length - 1].saldo
    : 0;

  return (
    <div className="mx-auto mt-2 w-full max-w-lg lg:max-w-none p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Cuenta Corriente Clientes</h2>
      <p className="mt-1 text-sm text-gray-600">
        Libro de ventas y cobros con saldo a la fecha.
      </p>

      <div className="mt-4 rounded-xl pedidos-shadow p-4 text-left">
        <label className="text-sm font-medium text-gray-700">Cliente</label>
        <SearchableSelect
          options={clienteOptions}
          value={clienteId}
          onChange={setClienteId}
          placeholder="Seleccionar cliente"
          wrapperClassName="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-300"
          inputClassName="w-full rounded-lg border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
          selectClassName="w-full bg-transparent rounded-lg focus:outline-none capitalize"
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 rounded-xl pedidos-shadow p-4 text-left">
        <div className="mb-3 text-sm font-semibold text-gray-800">
          Saldo actual: {formatArs(saldoActual)}
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-gray-300 text-left text-gray-700">
                <th className="px-2 py-2">Fecha emision</th>
                <th className="px-2 py-2">Detalle</th>
                <th className="px-2 py-2">Fecha de vto.</th>
                <th className="px-2 py-2">Debe</th>
                <th className="px-2 py-2">Haber</th>
                <th className="px-2 py-2">Saldo a la fecha</th>
              </tr>
            </thead>
            <tbody>
              {!clienteId ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-gray-600">
                    Selecciona un cliente para ver movimientos.
                  </td>
                </tr>
              ) : null}
              {clienteId && isLoading ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-gray-600">
                    Cargando movimientos...
                  </td>
                </tr>
              ) : null}
              {clienteId && !isLoading && movimientos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-2 py-4 text-center text-gray-600">
                    No hay ventas o cobros para el cliente.
                  </td>
                </tr>
              ) : null}
              {clienteId && !isLoading
                ? movimientos.map((mov, idx) => (
                    <tr key={`${mov.tipo}-${mov.id}-${idx}`} className="border-b border-gray-200">
                      <td className="px-2 py-2 text-gray-700">{formatDate(mov.fecha_emision)}</td>
                      <td className="px-2 py-2 text-gray-700">{mov.detalle}</td>
                      <td className="px-2 py-2 text-gray-700">{formatDate(mov.fecha_vto)}</td>
                      <td className="px-2 py-2 text-gray-700">{mov.debe ? formatArs(mov.debe) : "-"}</td>
                      <td className="px-2 py-2 text-gray-700">{mov.haber ? formatArs(mov.haber) : "-"}</td>
                      <td className="px-2 py-2 font-medium text-gray-800">{formatArs(mov.saldo)}</td>
                    </tr>
                  ))
                : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
