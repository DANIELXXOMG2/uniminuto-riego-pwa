import type { ServiceAccount } from "firebase-admin";
import { App, applicationDefault, cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "node:fs";
import path from "node:path";

let cachedApp: App | null = null;

function readServiceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    const parsed = JSON.parse(raw) as ServiceAccount & { private_key?: string };
    if (typeof parsed.privateKey === "string") {
      parsed.privateKey = parsed.privateKey.replace(/\\n/g, "\n");
    }
    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }
    return parsed;
  }

  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;
  const projectId =
    process.env.FIREBASE_ADMIN_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (clientEmail && privateKey && projectId) {
    return {
      projectId,
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    } satisfies ServiceAccount;
  }

  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ??
    path.resolve(process.cwd(), "..", "functions", "serviceAccountKey.json");

  if (fs.existsSync(serviceAccountPath)) {
    const fileContents = fs.readFileSync(serviceAccountPath, "utf-8");
    const parsed = JSON.parse(fileContents) as ServiceAccount & {
      private_key?: string;
    };

    if (typeof parsed.privateKey === "string") {
      parsed.privateKey = parsed.privateKey.replace(/\\n/g, "\n");
    }

    if (typeof parsed.private_key === "string") {
      parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    }

    return parsed;
  }

  return null;
}

function initFirebaseAdmin(): App {
  if (cachedApp) {
    return cachedApp;
  }

  if (getApps().length > 0) {
    cachedApp = getApp();
    return cachedApp;
  }

  const serviceAccount = readServiceAccountFromEnv();

  if (serviceAccount) {
    cachedApp = initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.projectId,
    });
    return cachedApp;
  }

  try {
    cachedApp = initializeApp({
      credential: applicationDefault(),
    });
  } catch (error) {
    console.warn(
      "[firebase-admin] applicationDefault() no disponible, inicializando con configuración por defecto.",
      error
    );
    cachedApp = initializeApp();
  }

  return cachedApp;
}

export const adminApp = initFirebaseAdmin();
export const db = getFirestore(adminApp);
