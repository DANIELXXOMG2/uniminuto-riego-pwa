import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { db } from "@/lib/firebase-admin";

interface RawSensorReading {
  sensorId?: string;
  id?: string;
  value?: number;
  valueVWC?: number;
  humidity?: number;
  timestamp?: number | string | { seconds?: number; nanoseconds?: number };
}

interface IngestRequestBody {
  lineId?: string;
  lineTitle?: string;
  humidity?: number;
  isActive?: boolean;
  sensorIds?: string[];
  sensorReadings?: RawSensorReading[];
  readings?: RawSensorReading[];
  sensors?: RawSensorReading[];
}

interface NormalizedReading {
  sensorId: string;
  value: number;
  timestamp: Timestamp;
}

function normalizeTimestamp(value: RawSensorReading["timestamp"]): Timestamp {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Timestamp.fromMillis(value);
  }

  if (typeof value === "string") {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) {
      return Timestamp.fromMillis(parsed);
    }
  }

  if (value && typeof value === "object" && ("seconds" in value || "nanoseconds" in value)) {
    const seconds = typeof value.seconds === "number" ? value.seconds : 0;
    const nanos = typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
    return Timestamp.fromMillis(seconds * 1000 + Math.floor(nanos / 1_000_000));
  }

  return Timestamp.now();
}

function normalizeReadings(payload: IngestRequestBody): NormalizedReading[] {
  const candidateGroups = [payload.sensorReadings, payload.readings, payload.sensors].filter(
    Array.isArray
  ) as RawSensorReading[][];

  const normalized: NormalizedReading[] = [];

  for (const group of candidateGroups) {
    for (const raw of group) {
      if (!raw || typeof raw !== "object") continue;

      const sensorId = typeof raw.sensorId === "string" ? raw.sensorId : typeof raw.id === "string" ? raw.id : null;
      if (!sensorId) continue;

      const rawValue =
        typeof raw.valueVWC === "number"
          ? raw.valueVWC
          : typeof raw.value === "number"
          ? raw.value
          : typeof raw.humidity === "number"
          ? raw.humidity
          : null;

      if (rawValue === null || Number.isNaN(rawValue)) continue;

      normalized.push({
        sensorId,
        value: rawValue,
        timestamp: normalizeTimestamp(raw.timestamp),
      });
    }
  }

  return normalized;
}

export async function POST(req: Request) {
  let body: IngestRequestBody;
  try {
    body = (await req.json()) as IngestRequestBody;
  } catch (error) {
    console.error("[API][ingest] JSON inválido recibido", error);
    return NextResponse.json(
      { success: false, error: "El cuerpo de la petición debe ser JSON válido." },
      { status: 400 }
    );
  }

  try {

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, error: "Payload inválido. Envía un JSON con los datos del sensor." },
        { status: 400 }
      );
    }

    const lineId = typeof body.lineId === "string" ? body.lineId : undefined;
    if (!lineId) {
      return NextResponse.json(
        { success: false, error: "Falta el campo lineId en la solicitud." },
        { status: 400 }
      );
    }

    const readings = normalizeReadings(body);
    const resolvedHumidity =
      typeof body.humidity === "number" && Number.isFinite(body.humidity)
        ? body.humidity
        : readings.length > 0
        ? readings.reduce((total, reading) => total + reading.value, 0) / readings.length
        : undefined;

    if (readings.length === 0 && typeof resolvedHumidity !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "No se proporcionaron lecturas ni un valor de humedad agregado para actualizar.",
        },
        { status: 400 }
      );
    }

    const batch = db.batch();
    const lineRef = db.collection("irrigationLines").doc(lineId);

    const lineUpdate: Record<string, unknown> = {
      lastUpdated: FieldValue.serverTimestamp(),
    };

    if (typeof resolvedHumidity === "number" && Number.isFinite(resolvedHumidity)) {
      lineUpdate.humidity = Number(resolvedHumidity.toFixed(2));
    }

    if (typeof body.isActive === "boolean") {
      lineUpdate.isActive = body.isActive;
    }

    if (typeof body.lineTitle === "string" && body.lineTitle.trim()) {
      lineUpdate.title = body.lineTitle.trim();
    }

    if (Array.isArray(body.sensorIds)) {
      const sanitizedSensorIds = body.sensorIds.filter((id) => typeof id === "string" && id.trim().length > 0);
      if (sanitizedSensorIds.length > 0) {
        lineUpdate.sensorIds = sanitizedSensorIds;
      }
    }

    batch.set(lineRef, lineUpdate, { merge: true });

    for (const reading of readings) {
      const sensorRef = db.collection("sensors").doc(reading.sensorId);
      batch.set(
        sensorRef,
        {
          lastReading: reading.value,
          lastReadingTime: reading.timestamp,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const readingRef = sensorRef.collection("readings").doc();
      batch.set(readingRef, {
        valueVWC: reading.value,
        timestamp: reading.timestamp,
        ingestedAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();

    const configRef = db.collection("system").doc("config");
    const configSnap = await configRef.get();

    if (!configSnap.exists) {
      console.error(
        "CRITICAL: system/config document not found. Arduino will use its default values."
      );
      return NextResponse.json({ success: true, config: null }, { status: 200 });
    }

    const configData = configSnap.data() ?? {};

    return NextResponse.json(
      {
        success: true,
        config: {
          defaultInterval: configData.defaultReadingIntervalSeconds ?? null,
          activeInterval: configData.activeIrrigationIntervalSeconds ?? null,
          autoMode: configData.autoIrrigationEnabled ?? null,
          threshold: configData.irrigationMoistureThreshold ?? null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[API][ingest] Error procesando la solicitud", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Error desconocido procesando datos",
      },
      { status: 500 }
    );
  }
}
