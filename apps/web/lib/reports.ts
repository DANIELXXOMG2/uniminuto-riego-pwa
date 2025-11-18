'use client';

// Dynamic imports inside functions to avoid SSR issues
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from './firebase';

export type Range = '7d' | '30d';

function dateNDaysAgo(days: number) {
  const now = new Date();
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

async function fetchHourlyReadings(sensorId: string, since: Date) {
  const ref = collection(db, 'sensors', sensorId, 'readingsHourly');
  const q = query(ref, orderBy('hour', 'desc'));
  const snap = await getDocs(q);

  const rows: { ts: Date; avg: number }[] = [];
  for (const d of snap.docs) {
    const data = d.data();
    const hourId: string | undefined = data.hour;
    if (!hourId || hourId.length < 13) continue;
    const yyyy = parseInt(hourId.slice(0, 4), 10);
    const mm = parseInt(hourId.slice(5, 7), 10);
    const dd = parseInt(hourId.slice(8, 10), 10);
    const HH = parseInt(hourId.slice(11, 13), 10);
    const ts = new Date(Date.UTC(yyyy, mm - 1, dd, HH, 0, 0));
    if (ts < since) break; // ordered desc
    const avg = typeof data.avg === 'number' ? data.avg : 0;
    rows.push({ ts, avg });
  }
  // return ascending
  return rows.sort((a, b) => a.ts.getTime() - b.ts.getTime());
}

function metricsFrom(values: number[]) {
  if (values.length === 0) return { avg: 0, min: 0, max: 0 };
  const sum = values.reduce((a, b) => a + b, 0);
  return {
    avg: +(sum / values.length).toFixed(1),
    min: +Math.min(...values).toFixed(1),
    max: +Math.max(...values).toFixed(1),
  };
}

export async function generateComparativeByLine(range: Range) {
  if (typeof window === 'undefined') return;
  const days = range === '7d' ? 7 : 30;
  const since = dateNDaysAgo(days);

  // read sensors list
  const sensorsSnap = await getDocs(collection(db, 'sensors'));
  const rows: { sensorId: string; title: string; avg: number; min: number; max: number; last: number }[] = [];

  for (const s of sensorsSnap.docs) {
    const sensorId = s.id;
    const title = (s.data().title as string) || sensorId;
    const readings = await fetchHourlyReadings(sensorId, since);
    const values = readings.map((r) => r.avg);
    const m = metricsFrom(values);
    const last = values.length > 0 ? values[values.length - 1] : 0;
    rows.push({ sensorId, title, avg: m.avg, min: m.min, max: m.max, last });
  }

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Historial Comparativo por Línea', 40, 40);
  doc.setFontSize(10);
  doc.text(`Rango: Últimos ${days} días`, 40, 58);
  doc.text(new Date().toLocaleString(), 40, 72);

  autoTable(doc, {
    startY: 90,
    head: [[ 'Línea', 'Promedio %', 'Mín %', 'Máx %', 'Último %' ]],
    body: rows.map(r => [ r.title, r.avg, r.min, r.max, r.last ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [34, 197, 94] },
  });

  doc.save(`comparativo-lineas-${range}.pdf`);
}

export async function generateDailyIrrigationSummary() {
  if (typeof window === 'undefined') return;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get irrigation lines for names and targets
  const linesSnap = await getDocs(collection(db, 'irrigationLines'));
  const lines = linesSnap.docs.map(d => {
    const data = d.data() as Record<string, unknown>;
    return {
      id: d.id,
      title: typeof data.title === 'string' ? data.title : undefined,
      targetHumidity: typeof data.targetHumidity === 'number' ? data.targetHumidity : undefined,
      isActive: typeof data.isActive === 'boolean' ? data.isActive : Boolean(data.isActive),
    };
  });

  // Map sensorId == line.id by convention; if not matching, will still produce empty metrics.
  const table: { title: string; target: number; avg: number; min: number; max: number; active: boolean }[] = [];

  for (const l of lines) {
    const sensorId = l.id; // assumption: 1:1 naming; adjust if mapping exists later
    const readings = await fetchHourlyReadings(sensorId, today);
    const values = readings.map(r => r.avg);
    const m = metricsFrom(values);
    table.push({
      title: l.title || l.id,
      target: typeof l.targetHumidity === 'number' ? l.targetHumidity : 0,
      avg: m.avg, min: m.min, max: m.max,
      active: !!l.isActive,
    });
  }

  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text('Resumen Diario de Riego', 40, 40);
  doc.setFontSize(10);
  doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 40, 58);

  autoTable(doc, {
    startY: 80,
    head: [[ 'Línea', 'Objetivo %', 'Promedio %', 'Mín %', 'Máx %', 'Activa' ]],
    body: table.map(r => [ r.title, r.target, r.avg, r.min, r.max, r.active ? 'Sí' : 'No' ]),
    styles: { fontSize: 10 },
    headStyles: { fillColor: [59, 130, 246] },
  });

  doc.save('resumen-diario-riego.pdf');
}
