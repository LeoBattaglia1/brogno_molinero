import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import api from "../api/api";

const EMPRESA_FICTICIA = {
  nombre: "Molinero Brogno",
  rubro: "Mantenimiento y reparación de molinos",
  telefono: "(02268) 45-1234",
  direccion: "Ruta 29 Km 14, Ayacucho, Bs. As.",
};

function hoyISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatearFechaCorta(iso) {
  if (!iso) return "";
  const partes = String(iso).split("-");
  if (partes.length !== 3) return iso;
  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearMoneda(valor) {
  const num = Number(valor || 0);
  return num.toLocaleString("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  });
}

function sanitizarNombreArchivo(texto) {
  return String(texto || "Presupuesto")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ");
}

function crearItemVacio() {
  return {
    uid: `${Date.now()}-${Math.random()}`,
    cantidad: "",
    descripcion: "",
    total: "",
  };
}

// Dibuja el logo vectorial de Molinero Brogno directamente en el PDF
function dibujarLogoEnPdf(doc, x, y, size = 16) {
  doc.setFillColor(15, 23, 42);
  doc.roundedRect(x, y, size, size, 2.5, 2.5, "F");

  const cx = x + size / 2;
  const cy = y + size * 0.42;

  // Torre
  doc.setDrawColor(56, 189, 248);
  doc.setLineWidth(0.9);
  doc.line(cx, y + size * 0.22, cx, y + size * 0.82);

  // Aspas
  doc.setFillColor(56, 189, 248);
  doc.triangle(
    cx,
    cy - 1,
    x + size * 0.78,
    y + size * 0.22,
    x + size * 0.72,
    y + size * 0.4,
    "F",
  );
  doc.triangle(
    cx,
    cy + 0.5,
    x + size * 0.74,
    y + size * 0.6,
    x + size * 0.58,
    y + size * 0.66,
    "F",
  );

  doc.setFillColor(125, 211, 252);
  doc.triangle(
    cx,
    cy - 1,
    x + size * 0.22,
    y + size * 0.22,
    x + size * 0.28,
    y + size * 0.4,
    "F",
  );
  doc.triangle(
    cx,
    cy + 0.5,
    x + size * 0.26,
    y + size * 0.6,
    x + size * 0.42,
    y + size * 0.66,
    "F",
  );

  // Centro y base
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, 1.1, "F");
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.8);
  doc.line(x + size * 0.32, y + size * 0.82, x + size * 0.68, y + size * 0.82);
}

const styles = {
  container: {
    padding: "10px 8px",
    width: "100%",
    boxSizing: "border-box",
    fontFamily: "system-ui, -apple-system, sans-serif",
  },
  sheet: {
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: "12px",
    padding: "20px 22px",
    maxWidth: "1060px",
    margin: "0 auto",
    boxShadow: "0 4px 16px rgba(15, 23, 42, 0.07)",
    boxSizing: "border-box",
    color: "#0f172a",
  },
  rowAlineada: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: "12px",
    alignItems: "stretch",
    marginBottom: "14px",
  },
  colBox: {
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "12px 14px",
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    minWidth: 0,
  },
  colHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "8px",
    marginBottom: "10px",
  },
  sectionTitle: {
    margin: 0,
    fontSize: "0.95rem",
    fontWeight: "800",
    color: "#0f172a",
  },
  input: {
    padding: "8px 10px",
    borderRadius: "7px",
    border: "1px solid #cbd5e1",
    fontSize: "0.9rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box",
  },
  select: {
    padding: "9px 11px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    fontSize: "0.93rem",
    backgroundColor: "#ffffff",
    color: "#0f172a",
    width: "100%",
    boxSizing: "border-box",
  },
  chip: (activa) => ({
    padding: "6px 10px",
    borderRadius: "7px",
    border: activa ? "1px solid #1d4ed8" : "1px solid #cbd5e1",
    backgroundColor: activa ? "#dbeafe" : "#ffffff",
    color: activa ? "#1e3a8a" : "#334155",
    fontWeight: activa ? "700" : "600",
    fontSize: "0.84rem",
    cursor: "pointer",
    transition: "all 0.14s ease",
  }),
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    marginBottom: "12px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9rem",
  },
  th: {
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    fontWeight: "800",
    fontSize: "0.82rem",
    textAlign: "left",
    padding: "10px 10px",
    borderBottom: "1px solid #cbd5e1",
  },
  td: {
    padding: "8px 10px",
    borderBottom: "1px solid #e2e8f0",
    verticalAlign: "middle",
  },
  btnMic: (escuchando) => ({
    padding: "7px 10px",
    borderRadius: "7px",
    border: escuchando ? "1px solid #dc2626" : "1px solid #cbd5e1",
    backgroundColor: escuchando ? "#fee2e2" : "#f8fafc",
    color: escuchando ? "#b91c1c" : "#0f172a",
    fontWeight: "700",
    fontSize: "0.8rem",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  }),
  btnQuitar: {
    padding: "6px 9px",
    borderRadius: "7px",
    border: "1px solid #fca5a5",
    backgroundColor: "#fef2f2",
    color: "#991b1b",
    fontWeight: "700",
    fontSize: "0.78rem",
    cursor: "pointer",
  },
  btnMas: {
    padding: "8px 14px",
    borderRadius: "8px",
    border: "none",
    backgroundColor: "#2563eb",
    color: "#ffffff",
    fontWeight: "800",
    fontSize: "0.9rem",
    cursor: "pointer",
  },
  totalesBox: {
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "14px",
    marginBottom: "18px",
  },
  totalesTable: {
    width: "100%",
    maxWidth: "360px",
    borderCollapse: "collapse",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    overflow: "hidden",
  },
  accionesBarra: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "10px",
  },
  btnPdf: {
    padding: "11px 20px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #2e6f40 0%, #1d4d2b 100%)",
    color: "#ffffff",
    fontWeight: "700",
    fontSize: "0.92rem",
    cursor: "pointer",
  },
  btnLimpiar: {
    padding: "10px 16px",
    borderRadius: "8px",
    border: "1px solid #cbd5e1",
    backgroundColor: "#ffffff",
    color: "#334155",
    fontWeight: "700",
    fontSize: "0.88rem",
    cursor: "pointer",
  },
  errorMsg: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fca5a5",
    color: "#991b1b",
    padding: "10px 12px",
    borderRadius: "8px",
    fontSize: "0.86rem",
    fontWeight: "700",
    marginBottom: "14px",
  },
};

export default function Presupuestos() {
  const [clientes, setClientes] = useState([]);
  const [campos, setCampos] = useState([]);
  const [molinos, setMolinos] = useState([]);

  const [clienteId, setClienteId] = useState("");
  const [camposSeleccionados, setCamposSeleccionados] = useState([]);
  const [molinosSeleccionados, setMolinosSeleccionados] = useState([]);

  const [items, setItems] = useState(() => [crearItemVacio()]);
  const [errorAviso, setErrorAviso] = useState("");
  const [uidEscuchando, setUidEscuchando] = useState(null);

  const recognitionRef = useRef(null);

  const soportaVoz = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  const cargarCatalogos = useCallback(async () => {
    try {
      const [resCli, resCam, resMol] = await Promise.all([
        api.get("/clientes"),
        api.get("/campos"),
        api.get("/molinos"),
      ]);
      setClientes(Array.isArray(resCli.data) ? resCli.data : []);
      setCampos(Array.isArray(resCam.data) ? resCam.data : []);
      setMolinos(Array.isArray(resMol.data) ? resMol.data : []);
    } catch (err) {
      console.error("Error cargando catálogos en Presupuestos:", err);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignorar
        }
      }
    };
  }, [cargarCatalogos]);

  const clienteSeleccionado = useMemo(
    () => clientes.find((c) => Number(c.id) === Number(clienteId)) || null,
    [clientes, clienteId],
  );

  const camposDisponibles = useMemo(() => {
    if (!clienteId) return [];
    return campos.filter((c) => Number(c.cliente_id) === Number(clienteId));
  }, [campos, clienteId]);

  const molinosDisponibles = useMemo(() => {
    if (camposSeleccionados.length === 0) return [];
    const setCam = new Set(camposSeleccionados.map(Number));
    return molinos.filter((m) => setCam.has(Number(m.campo_id)));
  }, [molinos, camposSeleccionados]);

  const nombresCamposSeleccionados = useMemo(
    () =>
      camposSeleccionados
        .map((id) => campos.find((c) => Number(c.id) === Number(id))?.nombre)
        .filter(Boolean),
    [camposSeleccionados, campos],
  );

  const nombresMolinosSeleccionados = useMemo(
    () =>
      molinosSeleccionados
        .map((id) => molinos.find((m) => Number(m.id) === Number(id))?.nombre)
        .filter(Boolean),
    [molinosSeleccionados, molinos],
  );

  const subtotal = useMemo(() => {
    const suma = items.reduce((acc, it) => acc + Number(it.total || 0), 0);
    return Number(suma.toFixed(2));
  }, [items]);

  const iva21 = useMemo(() => Number((subtotal * 0.21).toFixed(2)), [subtotal]);

  const totalGeneral = useMemo(
    () => Number((subtotal + iva21).toFixed(2)),
    [subtotal, iva21],
  );

  const handleChangeCliente = (nuevoId) => {
    setClienteId(nuevoId);
    setCamposSeleccionados([]);
    setMolinosSeleccionados([]);
    setErrorAviso("");
  };

  const toggleCampo = (idCampo) => {
    const numId = Number(idCampo);
    setCamposSeleccionados((prev) => {
      const existe = prev.includes(numId);
      const sig = existe ? prev.filter((id) => id !== numId) : [...prev, numId];

      const validosMolinos = new Set(
        molinos
          .filter((m) => sig.includes(Number(m.campo_id)))
          .map((m) => Number(m.id)),
      );
      setMolinosSeleccionados((mPrev) =>
        mPrev.filter((mId) => validosMolinos.has(Number(mId))),
      );
      return sig;
    });
  };

  const toggleMolino = (idMolino) => {
    const numId = Number(idMolino);
    setMolinosSeleccionados((prev) =>
      prev.includes(numId)
        ? prev.filter((id) => id !== numId)
        : [...prev, numId],
    );
  };

  const agregarFilaItem = () => {
    setItems((prev) => [...prev, crearItemVacio()]);
  };

  const quitarFilaItem = (uid) => {
    setItems((prev) =>
      prev.length <= 1 ? prev : prev.filter((it) => it.uid !== uid),
    );
  };

  const actualizarItem = (uid, cambios) => {
    setItems((prev) =>
      prev.map((it) => (it.uid === uid ? { ...it, ...cambios } : it)),
    );
  };

  const alternarDictadoVoz = (uid) => {
    if (!soportaVoz) {
      setErrorAviso("El dictado por voz no está disponible en este navegador.");
      return;
    }

    if (uidEscuchando === uid && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignorar
      }
      setUidEscuchando(null);
      return;
    }

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignorar
      }
    }

    const SpeechRec =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SpeechRec();
    rec.lang = "es-AR";
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      setUidEscuchando(uid);
      setErrorAviso("");
    };

    rec.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
      if (transcript) {
        setItems((prev) =>
          prev.map((it) => {
            if (it.uid !== uid) return it;
            const actual = it.descripcion.trim();
            return {
              ...it,
              descripcion: actual ? `${actual} ${transcript}` : transcript,
            };
          }),
        );
      }
    };

    rec.onerror = (event) => {
      console.error("Error de reconocimiento de voz:", event.error);
      setErrorAviso(
        "No se pudo capturar el audio. Revisá el permiso del micrófono.",
      );
      setUidEscuchando(null);
    };

    rec.onend = () => {
      setUidEscuchando(null);
    };

    recognitionRef.current = rec;
    rec.start();
  };

  const handleDescargarPdf = () => {
    setErrorAviso("");

    if (!clienteSeleccionado) {
      setErrorAviso("Seleccioná un cliente antes de descargar el PDF.");
      return;
    }

    const filasValidas = items.filter(
      (it) => it.descripcion.trim().length > 0 || Number(it.total || 0) > 0,
    );
    if (filasValidas.length === 0) {
      setErrorAviso(
        "Cargá al menos una descripción o un monto antes de generar el PDF.",
      );
      return;
    }

    const fechaActual = hoyISO();
    const fechaFormateada = formatearFechaCorta(fechaActual);

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const marginX = 14;
    let cursorY = 14;

    // 1. Encabezado de empresa (solo en PDF)
    dibujarLogoEnPdf(doc, marginX, cursorY, 16);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);
    doc.setTextColor(15, 23, 42);
    doc.text(EMPRESA_FICTICIA.nombre, marginX + 20, cursorY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text(EMPRESA_FICTICIA.rubro, marginX + 20, cursorY + 11.2);
    doc.text(
      `Tel: ${EMPRESA_FICTICIA.telefono}  ·  ${EMPRESA_FICTICIA.direccion}`,
      marginX + 20,
      cursorY + 16,
    );

    // Bloque derecho: Título PRESUPUESTO y Fecha
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(30, 58, 138);
    doc.text("PRESUPUESTO", pageWidth - marginX, cursorY + 6, {
      align: "right",
    });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(51, 65, 85);
    doc.text(`Fecha: ${fechaFormateada}`, pageWidth - marginX, cursorY + 12, {
      align: "right",
    });

    cursorY += 21;
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.line(marginX, cursorY, pageWidth - marginX, cursorY);
    cursorY += 6;

    // 2. Datos del Cliente, Campos y Molinos
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);

    const lineasCliente = [`Cliente: ${clienteSeleccionado.nombre}`];
    if (nombresCamposSeleccionados.length > 0) {
      lineasCliente.push(`Campos: ${nombresCamposSeleccionados.join(", ")}`);
    }
    if (nombresMolinosSeleccionados.length > 0) {
      lineasCliente.push(`Molinos: ${nombresMolinosSeleccionados.join(", ")}`);
    }

    const boxAltura = 6 + lineasCliente.length * 5.5;
    doc.roundedRect(
      marginX,
      cursorY,
      pageWidth - marginX * 2,
      boxAltura,
      2,
      2,
      "FD",
    );

    let textY = cursorY + 5.5;
    lineasCliente.forEach((linea, idx) => {
      doc.setFont("helvetica", idx === 0 ? "bold" : "normal");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(linea, marginX + 4, textY);
      textY += 5.5;
    });

    cursorY += boxAltura + 6;

    // 3. Tabla de tareas presupuestadas
    const bodyTabla = filasValidas.map((it) => [
      String(it.cantidad || "").trim(),
      String(it.descripcion || "").trim() || "-",
      formatearMoneda(it.total),
    ]);

    autoTable(doc, {
      startY: cursorY,
      margin: { left: marginX, right: marginX },
      head: [["Cant.", "Descripción", "Total"]],
      body: bodyTabla,
      theme: "grid",
      headStyles: {
        fillColor: [15, 23, 42],
        textColor: [255, 255, 255],
        fontStyle: "bold",
        fontSize: 9.5,
      },
      styles: {
        font: "helvetica",
        fontSize: 9.5,
        textColor: [15, 23, 42],
        cellPadding: 3.2,
        lineColor: [203, 213, 225],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: { cellWidth: 18, halign: "center" },
        1: { cellWidth: "auto" },
        2: { cellWidth: 38, halign: "right" },
      },
    });

    const finalTablaY = doc.lastAutoTable?.finalY || cursorY + 20;

    // 4. Cuadro de Subtotal, IVA 21% y TOTAL
    autoTable(doc, {
      startY: finalTablaY + 4,
      margin: { left: pageWidth - marginX - 82, right: marginX },
      body: [
        ["Subtotal", formatearMoneda(subtotal)],
        ["IVA (21%)", formatearMoneda(iva21)],
        ["TOTAL", formatearMoneda(totalGeneral)],
      ],
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 9.5,
        textColor: [15, 23, 42],
        cellPadding: 3,
        lineColor: [203, 213, 225],
        lineWidth: 0.25,
      },
      columnStyles: {
        0: { cellWidth: 42, fontStyle: "bold" },
        1: { cellWidth: 40, halign: "right", fontStyle: "bold" },
      },
      didParseCell: (data) => {
        if (data.row.index === 2) {
          data.cell.styles.fillColor = [241, 245, 249];
          data.cell.styles.fontSize = 10.5;
        }
      },
    });

    const finalTotalesY = doc.lastAutoTable?.finalY || finalTablaY + 32;

    // 5. Leyenda final de validez por 7 días (solo en PDF)
    const leyendaY = finalTotalesY + 10;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(30, 58, 138);
    doc.setLineWidth(0.8);
    doc.rect(marginX, leyendaY, pageWidth - marginX * 2, 11, "F");
    doc.line(marginX, leyendaY, marginX, leyendaY + 11);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text(
      `Este presupuesto es válido por 7 días a partir de la fecha ${fechaFormateada}.`,
      marginX + 4,
      leyendaY + 7,
    );

    const nombreArchivo = `${sanitizarNombreArchivo(
      `${clienteSeleccionado.nombre} - ${fechaActual}`,
    )}.pdf`;

    doc.save(nombreArchivo);
  };

  const handleLimpiarTodo = () => {
    setClienteId("");
    setCamposSeleccionados([]);
    setMolinosSeleccionados([]);
    setItems([crearItemVacio()]);
    setErrorAviso("");
  };

  return (
    <div style={styles.container}>
      <div style={styles.sheet}>
        {errorAviso && <div style={styles.errorMsg}>{errorAviso}</div>}

        {/* Cliente, Campos y Molinos alineados en horizontal (igual a AgregarTrabajo, sin botones + Nuevo) */}
        <div style={styles.rowAlineada}>
          <div style={styles.colBox}>
            <div style={styles.colHeader}>
              <div style={styles.sectionTitle}>1. Cliente</div>
            </div>

            <select
              value={clienteId}
              onChange={(e) => handleChangeCliente(e.target.value)}
              style={styles.select}
            >
              <option value="">Seleccionar cliente...</option>
              {clientes.map((cli) => (
                <option key={cli.id} value={cli.id}>
                  {cli.nombre}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.colBox}>
            <div style={styles.colHeader}>
              <div style={styles.sectionTitle}>
                2. Campos ({camposSeleccionados.length})
              </div>
            </div>

            {!clienteId ? (
              <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                Elegí un cliente.
              </span>
            ) : camposDisponibles.length === 0 ? (
              <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                Sin campos cargados.
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {camposDisponibles.map((cmp) => {
                  const activa = camposSeleccionados.includes(Number(cmp.id));
                  return (
                    <button
                      key={cmp.id}
                      type="button"
                      onClick={() => toggleCampo(cmp.id)}
                      style={styles.chip(activa)}
                    >
                      {activa ? "✓ " : ""}
                      {cmp.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div style={styles.colBox}>
            <div style={styles.colHeader}>
              <div style={styles.sectionTitle}>
                3. Molinos ({molinosSeleccionados.length})
              </div>
            </div>

            {camposSeleccionados.length === 0 ? (
              <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                Seleccioná uno o más campos.
              </span>
            ) : molinosDisponibles.length === 0 ? (
              <span style={{ fontSize: "0.84rem", color: "#64748b" }}>
                Sin molinos en el campo.
              </span>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {molinosDisponibles.map((mol) => {
                  const activa = molinosSeleccionados.includes(Number(mol.id));
                  return (
                    <button
                      key={mol.id}
                      type="button"
                      onClick={() => toggleMolino(mol.id)}
                      style={styles.chip(activa)}
                    >
                      {activa ? "✓ " : ""}
                      {mol.nombre}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Tabla de trabajos a presupuestar */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: "64px" }}>Cant.</th>
                <th style={styles.th}>Descripción</th>
                <th
                  style={{ ...styles.th, width: "145px", textAlign: "right" }}
                >
                  Total
                </th>
                <th
                  style={{ ...styles.th, width: "44px", textAlign: "center" }}
                >
                  —
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => {
                const escuchando = uidEscuchando === it.uid;
                return (
                  <tr key={it.uid}>
                    <td style={{ ...styles.td, width: "64px" }}>
                      <input
                        type="number"
                        step="any"
                        inputMode="decimal"
                        placeholder=""
                        value={it.cantidad}
                        onChange={(e) =>
                          actualizarItem(it.uid, { cantidad: e.target.value })
                        }
                        style={{ ...styles.input, padding: "8px 6px" }}
                      />
                    </td>

                    <td style={styles.td}>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <input
                          type="text"
                          placeholder="Escribí el trabajo o usá el micrófono..."
                          value={it.descripcion}
                          onChange={(e) =>
                            actualizarItem(it.uid, {
                              descripcion: e.target.value,
                            })
                          }
                          style={styles.input}
                        />
                        {soportaVoz && (
                          <button
                            type="button"
                            onClick={() => alternarDictadoVoz(it.uid)}
                            style={styles.btnMic(escuchando)}
                            title={
                              escuchando ? "Detener dictado" : "Dictar por voz"
                            }
                          >
                            {escuchando ? "⏹ Escuchando..." : "🎤 Voz"}
                          </button>
                        )}
                      </div>
                    </td>

                    <td style={{ ...styles.td, textAlign: "right" }}>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        placeholder="0.00"
                        value={it.total}
                        onChange={(e) =>
                          actualizarItem(it.uid, { total: e.target.value })
                        }
                        style={{ ...styles.input, textAlign: "right" }}
                      />
                    </td>

                    <td style={{ ...styles.td, textAlign: "center" }}>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => quitarFilaItem(it.uid)}
                          style={styles.btnQuitar}
                          title="Quitar fila"
                        >
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Botón "+" debajo de la lista para agregar otra tarea */}
        <div style={{ marginBottom: "14px" }}>
          <button type="button" onClick={agregarFilaItem} style={styles.btnMas}>
            +
          </button>
        </div>

        {/* Subtotal, IVA (21%) y TOTAL */}
        <div style={styles.totalesBox}>
          <table style={styles.totalesTable}>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: "0.88rem",
                    color: "#475569",
                    fontWeight: "600",
                  }}
                >
                  Subtotal
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #e2e8f0",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    textAlign: "right",
                  }}
                >
                  {formatearMoneda(subtotal)}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #cbd5e1",
                    fontSize: "0.88rem",
                    color: "#475569",
                    fontWeight: "600",
                  }}
                >
                  IVA (21%)
                </td>
                <td
                  style={{
                    padding: "8px 12px",
                    borderBottom: "1px solid #cbd5e1",
                    fontSize: "0.9rem",
                    fontWeight: "700",
                    textAlign: "right",
                  }}
                >
                  {formatearMoneda(iva21)}
                </td>
              </tr>
              <tr style={{ backgroundColor: "#f1f5f9" }}>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: "1rem",
                    fontWeight: "900",
                    color: "#0f172a",
                  }}
                >
                  TOTAL
                </td>
                <td
                  style={{
                    padding: "10px 12px",
                    fontSize: "1.05rem",
                    fontWeight: "900",
                    color: "#0f172a",
                    textAlign: "right",
                  }}
                >
                  {formatearMoneda(totalGeneral)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Acciones */}
        <div style={styles.accionesBarra}>
          <button
            type="button"
            onClick={handleLimpiarTodo}
            style={styles.btnLimpiar}
          >
            Limpiar
          </button>

          <button
            type="button"
            onClick={handleDescargarPdf}
            style={styles.btnPdf}
          >
            Descargar PDF
          </button>
        </div>
      </div>
    </div>
  );
}
