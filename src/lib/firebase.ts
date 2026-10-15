/**
 * Firebase — project "public-tender".
 *
 * The web config below is the public, client-safe identifier set (Firebase
 * web configs are designed to ship in browser code; access is guarded by
 * Firebase Security Rules, not by secrecy of these values).
 *
 * Everything here is lazy and failure-tolerant by design:
 *  - modules load via dynamic import only when a feature first needs them;
 *  - if the Firebase project is unreachable, rate-limited or misconfigured
 *    (e.g. the Email/Password provider not yet enabled in the console),
 *    every helper resolves quietly to null/false and the product keeps
 *    working on its local stack (scrypt sessions, local vault).
 *
 * Used by:
 *  - FirebaseAnalytics  — page-view telemetry for the "public-tender" project
 *  - auth-screen        — best-effort identity mirror into Firebase Auth
 *                         + Google sign-in (signInWithGooglePopup)
 *  - dashboard New Run  — tender document uploads to Firebase Storage
 */

export const firebaseProjectId = "public-tender";

const firebaseConfig = {
  apiKey: "AIzaSyBZo3i75Zyel3TYKB5ya-LWtwRNRCpvqCg",
  authDomain: "public-tender.firebaseapp.com",
  projectId: "public-tender",
  storageBucket: "public-tender.firebasestorage.app",
  messagingSenderId: "755841617956",
  appId: "1:755841617956:web:7639c3e15c587830f9c8b1",
  measurementId: "G-4WV68QCHHL",
};

/* ── internals ─────────────────────────────────────────────────────────────── */

type FirebaseAppModule = typeof import("firebase/app");
type AuthModule = typeof import("firebase/auth");
type StorageModule = typeof import("firebase/storage");

let appPromise: Promise<import("firebase/app").FirebaseApp | null> | null = null;

function debugLog(scope: string, err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    const code =
      typeof err === "object" && err && "code" in err
        ? String((err as { code: unknown }).code)
        : "";
    // Expected when the Firebase console hasn't enabled a provider / domain yet.
    console.debug(`[firebase:${scope}] unavailable (${code || "error"}) — local stack carries on`);
  }
}

async function getApp(): Promise<import("firebase/app").FirebaseApp | null> {
  if (typeof window === "undefined") return null;
  if (!appPromise) {
    appPromise = (async () => {
      try {
        const mod: FirebaseAppModule = await import("firebase/app");
        return mod.getApps().length ? mod.getApp() : mod.initializeApp(firebaseConfig);
      } catch (err) {
        debugLog("app", err);
        return null;
      }
    })();
  }
  return appPromise;
}

async function getAuthLazy() {
  const app = await getApp();
  if (!app) return null;
  try {
    const mod: AuthModule = await import("firebase/auth");
    return { mod, auth: mod.getAuth(app) };
  } catch (err) {
    debugLog("auth", err);
    return null;
  }
}

async function getStorageLazy() {
  const app = await getApp();
  if (!app) return null;
  try {
    const mod: StorageModule = await import("firebase/storage");
    return { mod, storage: mod.getStorage(app) };
  } catch (err) {
    debugLog("storage", err);
    return null;
  }
}

/* ── Analytics ─────────────────────────────────────────────────────────────── */

let analyticsStarted = false;

/** Initialise Firebase Analytics once, in a supported browser, quietly. */
export async function initFirebaseAnalytics(): Promise<boolean> {
  if (analyticsStarted || typeof window === "undefined") return false;
  analyticsStarted = true;
  try {
    const app = await getApp();
    if (!app) return false;
    const mod: AnalyticsModule = await import("firebase/analytics");
    if (!(await mod.isSupported())) return false;
    mod.getAnalytics(app);
    return true;
  } catch (err) {
    debugLog("analytics", err);
    return false;
  }
}

type AnalyticsModule = typeof import("firebase/analytics");

/* ── Auth mirror ───────────────────────────────────────────────────────────── */

export interface FirebaseIdentityInput {
  name: string;
  email: string;
  password: string;
  mode: "login" | "register";
}

/**
 * Mirror a successful workspace sign-in/registration into Firebase Auth so
 * the "public-tender" project's user list matches the product's accounts.
 * Fire-and-forget: never blocks, never throws, never surfaces UI errors.
 */
export async function syncFirebaseIdentity(input: FirebaseIdentityInput): Promise<boolean> {
  try {
    const pair = await getAuthLazy();
    if (!pair) return false;
    const { mod, auth } = pair;
    if (input.mode === "register") {
      const cred = await mod.createUserWithEmailAndPassword(auth, input.email, input.password);
      if (cred.user && input.name) await mod.updateProfile(cred.user, { displayName: input.name });
    } else {
      await mod.signInWithEmailAndPassword(auth, input.email, input.password);
    }
    return true;
  } catch (err) {
    debugLog(input.mode, err);
    return false;
  }
}

/* ── Google sign-in ────────────────────────────────────────────────────────── */

export interface GoogleIdentity {
  uid: string;
  name: string;
  email: string;
}

/**
 * Open the Firebase Google sign-in popup for the "public-tender" project.
 * Resolves to the signed-in Google identity, or null when anything goes
 * wrong (Google provider not yet enabled in the console, popup blocked or
 * closed, network down, 15s budget exceeded) — callers decide how to carry
 * on; no fallback identity is ever granted.
 */
export async function signInWithGooglePopup(): Promise<GoogleIdentity | null> {
  try {
    const pair = await getAuthLazy();
    if (!pair) return null;
    const { mod, auth } = pair;
    const provider = new mod.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    const popup = mod.signInWithPopup(auth, provider).then(
      (cred) => {
        const user = cred.user;
        if (!user.email) return null;
        return { uid: user.uid, name: user.displayName ?? "", email: user.email };
      },
      (err) => {
        debugLog("google-signin", err);
        return null;
      }
    );

    /* Hard budget: a never-resolving popup must not hang the flow. */
    let timer: ReturnType<typeof setTimeout> | undefined;
    const budget = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), 15_000);
    });
    const result = await Promise.race([popup, budget]);
    if (timer) clearTimeout(timer);
    return result;
  } catch (err) {
    debugLog("google-signin", err);
    return null;
  }
}

/* ── Storage — tender document uploads ─────────────────────────────────────── */

/** Storage forbids `#`, `[`, `]`, `*`, `?` in object paths. */
function safeName(name: string): string {
  return name.replace(/[#\[\]\*\?]/g, "_").replace(/\s+/g, "-");
}

export interface TenderUploadResult {
  path: string;
  url: string;
  bytes: number;
}

/**
 * Upload one tender document to Firebase Storage under tenders/{ref}/.
 * Uses a resumable task with a hard 15s budget: if the bucket rejects
 * (fresh projects deny unauthenticated writes by default) or hangs, the
 * task is cancelled and null returned — callers fall back to the local
 * vault without ceremony.
 */
export async function uploadTenderDocument(
  tenderRef: string,
  file: File
): Promise<TenderUploadResult | null> {
  try {
    const pair = await getStorageLazy();
    if (!pair) return null;
    const { mod, storage } = pair;
    const objectPath = `tenders/${safeName(tenderRef)}/${Date.now()}-${safeName(file.name)}`;
    const objectRef = mod.ref(storage, objectPath);
    const task = mod.uploadBytesResumable(objectRef, file, {
      contentType: file.type || "application/octet-stream",
      customMetadata: { tenderRef, originalName: file.name },
    });

    return await new Promise<TenderUploadResult | null>((resolve) => {
      const budget = setTimeout(() => {
        try {
          task.cancel();
        } catch {
          /* already terminal */
        }
        resolve(null);
      }, 15_000);

      task.then(
        async (snap) => {
          clearTimeout(budget);
          try {
            const url = await mod.getDownloadURL(snap.ref);
            resolve({
              path: objectPath,
              url,
              bytes: snap.metadata.size ? Number(snap.metadata.size) : file.size,
            });
          } catch {
            resolve(null);
          }
        },
        () => {
          clearTimeout(budget);
          resolve(null);
        }
      );
    });
  } catch (err) {
    debugLog("storage.upload", err);
    return null;
  }
}

/** True once the Firebase app has been initialised in this browser. */
export async function firebaseAvailable(): Promise<boolean> {
  return (await getApp()) !== null;
}
