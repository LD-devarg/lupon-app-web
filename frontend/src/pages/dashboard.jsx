import { useEffect, useMemo, useState } from "react";
import Button from "../components/ui/Button";
import { getClientes } from "../services/api/clientes";
import { getContactos } from "../services/api/contactos";
import { getDashboard } from "../services/api/dashboard";

export default function Dashboard() {
  const [clientes, setClientes] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [filters, setFilters] = useState({
    fechaDesde: "",
    fechaHasta: "",
    cliente: "",
    proveedor: "",
    formaPago: "",
    estadoCobro: "",
    estadoPago: "",
    medioPago: "",
  });
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  useEffect(() => {
    if (isFilterOpen) {
      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }
    return undefined;
  }, [isFilterOpen]);

  useEffect(() => {
    const loadCombos = async () => {
      try {
        const [clientesData, proveedoresData] = await Promise.all([
          getClientes(),
          getContactos({ tipo: "proveedor" }),
        ]);
        setClientes(clientesData || []);
        setProveedores(proveedoresData || []);
      } catch (err) {
        setError(err?.message || "No se pudieron cargar los filtros.");
      }
    };
    loadCombos();
  }, []);

  const loadDashboard = async (nextFilters = filters) => {
    setError("");
    try {
      setIsLoading(true);
      const response = await getDashboard({
        fecha_desde: nextFilters.fechaDesde,
        fecha_hasta: nextFilters.fechaHasta,
        cliente: nextFilters.cliente,
        proveedor: nextFilters.proveedor,
        forma_pago: nextFilters.formaPago,
        estado_cobro: nextFilters.estadoCobro,
        estado_pago: nextFilters.estadoPago,
        medio_pago: nextFilters.medioPago,
      });
      setData(response);
    } catch (err) {
      setError(err?.message || "No se pudo cargar el dashboard.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatArs = (value) => {
    if (value === null || value === undefined || value === "") return "-";
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(number);
  };

  const formatPercent = (value) => {
    const number = Number(value);
    if (Number.isNaN(number)) return "-";
    return `${(number * 100).toFixed(2)}%`;
  };

  const cards = data?.cards || {};

  const handleChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    loadDashboard(filters);
    setIsFilterOpen(false);
  };

  const handleClear = () => {
    const cleared = {
      fechaDesde: "",
      fechaHasta: "",
      cliente: "",
      proveedor: "",
      formaPago: "",
      estadoCobro: "",
      estadoPago: "",
      medioPago: "",
    };
    setFilters(cleared);
    loadDashboard(cleared);
    setIsFilterOpen(false);
  };

  const clientesConDeuda = useMemo(() => data?.clientes_con_deuda || [], [data]);
  const comprasPendientes = useMemo(() => data?.compras_pendientes || [], [data]);
  const documentosPorVencer = data?.documentos_por_vencer || {};
  const documentosVencidos = data?.documentos_vencidos || {};

  return (
    <div className="mx-auto mt-2 w-full max-w-3xl p-4 text-center">
      <h2 className="text-xl font-semibold text-gray-800">Dashboard financiero</h2>
      <p className="mt-1 text-sm text-gray-600">
        Resumen operativo con filtros por fechas y estados.
      </p>
      <div className="mt-4">
        <Button
          type="button"
          className="w-full rounded-xl px-3 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-300"
          onClick={() => setIsFilterOpen(true)}
        >
          Ver filtros
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {isLoading ? (
        <p className="mt-3 text-sm text-gray-600">Cargando dashboard...</p>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-3 text-left">
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Ventas totales</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.ventas_totales?.total)}
          </p>
          <p className="text-xs text-gray-600">
            Cobradas: {formatArs(cards.ventas_totales?.cobradas)}
          </p>
          <p className="text-xs text-gray-600">
            Parciales: {formatArs(cards.ventas_totales?.parciales)}
          </p>
          <p className="text-xs text-gray-600">
            Pendientes: {formatArs(cards.ventas_totales?.pendientes)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Compras totales</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.compras_totales?.total)}
          </p>
          <p className="text-xs text-gray-600">
            Pagadas: {formatArs(cards.compras_totales?.pagadas)}
          </p>
          <p className="text-xs text-gray-600">
            Parciales: {formatArs(cards.compras_totales?.parciales)}
          </p>
          <p className="text-xs text-gray-600">
            Pendientes: {formatArs(cards.compras_totales?.pendientes)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Ganancia bruta</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.ganancia_bruta)}
          </p>
          <p className="text-xs text-gray-600">
            Margen: {formatPercent(cards.margen_bruto)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Flujo neto</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.flujo_neto)}
          </p>
          <p className="text-xs text-gray-600">
            Ingresos: {formatArs(cards.ingresos_caja?.total)}
          </p>
          <p className="text-xs text-gray-600">
            Egresos: {formatArs(cards.egresos_caja?.total)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Deuda clientes</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.deuda_clientes)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Deuda proveedores</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.deuda_proveedores)}
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 text-left">
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Ingresos efectivo</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.ingresos_caja?.por_medio_pago?.efectivo)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm text-gray-600">Ingresos transferencia</p>
          <p className="text-lg font-semibold text-gray-800">
            {formatArs(cards.ingresos_caja?.por_medio_pago?.transferencia)}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-left">
        <div className="neuro-shadow-div p-3">
          <p className="text-sm font-semibold text-gray-700">Documentos por vencer</p>
          <p className="text-xs text-gray-600">
            Hoy: {documentosPorVencer.hoy?.cantidad || 0} -{" "}
            {formatArs(documentosPorVencer.hoy?.saldo)}
          </p>
          <p className="text-xs text-gray-600">
            Proximos 7 dias: {documentosPorVencer.proximos_7_dias?.cantidad || 0} -{" "}
            {formatArs(documentosPorVencer.proximos_7_dias?.saldo)}
          </p>
          <p className="text-xs text-gray-600">
            Proximos 30 dias: {documentosPorVencer.proximos_30_dias?.cantidad || 0} -{" "}
            {formatArs(documentosPorVencer.proximos_30_dias?.saldo)}
          </p>
        </div>
        <div className="neuro-shadow-div p-3">
          <p className="text-sm font-semibold text-gray-700">Documentos vencidos</p>
          <p className="text-xs text-gray-600">
            Cantidad: {documentosVencidos.cantidad || 0}
          </p>
          <p className="text-xs text-gray-600">
            Saldo: {formatArs(documentosVencidos.saldo)}
          </p>
        </div>
      </div>

      <div className="mt-6 text-left">
        <h3 className="text-sm font-semibold text-gray-700">Clientes con deuda</h3>
        <div className="mt-2 space-y-2">
          {clientesConDeuda.length === 0 ? (
            <p className="text-sm text-gray-600">Sin clientes con deuda.</p>
          ) : null}
          {clientesConDeuda.map((item) => (
            <div key={item.id} className="neuro-shadow-div p-3">
              <p className="text-sm font-semibold text-gray-800">{item.nombre}</p>
              <p className="text-xs text-gray-600">
                Deuda: {formatArs(item.deuda)}
              </p>
              <p className="text-xs text-gray-600">
                Ventas pendientes: {item.ventas_pendientes}
              </p>
              <p className="text-xs text-gray-600">
                Ultimo cobro: {item.ultimo_cobro || "-"}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-left">
        <h3 className="text-sm font-semibold text-gray-700">Compras pendientes de pago</h3>
        <div className="mt-2 space-y-2">
          {comprasPendientes.length === 0 ? (
            <p className="text-sm text-gray-600">Sin compras pendientes.</p>
          ) : null}
          {comprasPendientes.map((item) => (
            <div key={item.id} className="neuro-shadow-div p-3">
              <p className="text-sm font-semibold text-gray-800">
                Compra #{item.id} - {item.proveedor}
              </p>
              <p className="text-xs text-gray-600">
                Documento: {item.numero_documento || "-"}
              </p>
              <p className="text-xs text-gray-600">
                Fecha: {item.fecha_compra}
              </p>
              <p className="text-xs text-gray-600">
                Saldo pendiente: {formatArs(item.saldo_pendiente)}
              </p>
              <p className="text-xs text-gray-600">
                Estado pago: {item.estado_pago}
              </p>
            </div>
          ))}
        </div>
      </div>
      {isFilterOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-xl bg-white p-4 text-left shadow-xl">
            <Button
              type="button"
              className="absolute right-3 top-3 rounded-md px-2 py-1 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-800"
              onClick={() => setIsFilterOpen(false)}
            >
              X
            </Button>
            <h3 className="text-lg font-semibold text-gray-800">Filtros</h3>
            <form className="mt-4 grid grid-cols-2 gap-3" onSubmit={handleSubmit}>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Fecha desde</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                  value={filters.fechaDesde}
                  onChange={(event) => handleChange("fechaDesde", event.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Fecha hasta</label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-xl border border-gray-300 p-2 text-sm input-shadow bg-neutral-200"
                  value={filters.fechaHasta}
                  onChange={(event) => handleChange("fechaHasta", event.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Cliente</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={filters.cliente}
                    onChange={(event) => handleChange("cliente", event.target.value)}
                  >
                    <option value="">Todos</option>
                    {clientes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Proveedor</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={filters.proveedor}
                    onChange={(event) => handleChange("proveedor", event.target.value)}
                  >
                    <option value="">Todos</option>
                    {proveedores.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Forma de pago</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={filters.formaPago}
                    onChange={(event) => handleChange("formaPago", event.target.value)}
                  >
                    <option value="">Todas</option>
                    <option value="contado">Contado</option>
                    <option value="contado pendiente">Contado pendiente</option>
                    <option value="cuenta corriente">Cuenta corriente</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Estado cobro</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={filters.estadoCobro}
                    onChange={(event) => handleChange("estadoCobro", event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="cobrado">Cobrado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Estado pago</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={filters.estadoPago}
                    onChange={(event) => handleChange("estadoPago", event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="parcial">Parcial</option>
                    <option value="pagado">Pagado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-gray-700">Medio de pago</label>
                <div className="mt-1 rounded-lg border border-gray-300 p-2 text-sm input-wrap input-shadow bg-neutral-200">
                  <select
                    className="w-full bg-transparent rounded-lg focus:outline-none capitalize"
                    value={filters.medioPago}
                    onChange={(event) => handleChange("medioPago", event.target.value)}
                  >
                    <option value="">Todos</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                  </select>
                </div>
              </div>
              <Button
                type="submit"
                className="w-full rounded-xl px-3 col-span-2 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
              >
                Aplicar filtros
              </Button>
              <Button
                type="button"
                className="w-full rounded-xl px-3 col-span-2 py-2 text-sm font-medium text-gray-700 neuro-shadow-button bg-neutral-200"
                onClick={handleClear}
              >
                Limpiar filtros
              </Button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
