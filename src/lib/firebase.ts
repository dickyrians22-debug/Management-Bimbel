import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  getDocFromServer,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App instance
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

try {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }

  auth = getAuth(app);

  // Use custom databaseId if configured, or default
  const databaseId =
    firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId.trim() !== ''
      ? firebaseConfig.firestoreDatabaseId.trim()
      : '(default)';

  try {
    // Auto-detect long polling allows seamless fallback for iframes and proxies without premature connection drop errors
    db = initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
      },
      databaseId
    );
  } catch {
    db = getFirestore(app, databaseId);
  }
} catch (error) {
  console.warn('Firebase initialization notice:', error);
}

// Validate Connection to Firestore (Per skill guidelines, with delayed startup to allow initial handshake)
async function testConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && (error.message.includes('the client is offline') || error.message.includes('unavailable') || error.message.includes('Failed to get document from server'))) {
      console.warn('Firestore operating in offline/cached mode. Local data will remain active.');
    }
  }
}

// Allow initial network/websocket handshake to complete before testing server reachability
if (typeof window !== 'undefined') {
  setTimeout(() => {
    testConnection();
  }, 2000);
} else {
  testConnection();
}

export { app, db, auth };

// Operation types for error diagnostics
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

let quotaExceeded = false;
const quotaListeners = new Set<(exceeded: boolean) => void>();

export function isFirestoreQuotaError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as any)?.code;
  return (
    code === 'resource-exhausted' ||
    msg.toLowerCase().includes('quota exceeded') ||
    msg.toLowerCase().includes('resource-exhausted')
  );
}

export function getIsQuotaExceeded(): boolean {
  return quotaExceeded;
}

export function subscribeQuotaState(cb: (exceeded: boolean) => void): () => void {
  quotaListeners.add(cb);
  cb(quotaExceeded);
  return () => quotaListeners.delete(cb);
}

export function notifyQuotaExceeded() {
  if (!quotaExceeded) {
    quotaExceeded = true;
    console.warn(
      'Firestore quota limit reached (code=resource-exhausted). Switching seamlessly to LocalStorage mode.'
    );
    quotaListeners.forEach((cb) => {
      try {
        cb(true);
      } catch (e) {
        console.warn('Quota listener error:', e);
      }
    });
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  if (isFirestoreQuotaError(error)) {
    notifyQuotaExceeded();
    return;
  }

  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Info:', JSON.stringify(errInfo));
}

// Collection constants
export const COLLECTIONS = {
  STUDENTS: 'students',
  ATTENDANCE: 'attendance',
  INCOMES: 'incomes',
  EXPENSES: 'expenses',
  USERS: 'users',
  SETTINGS: 'settings',
  PROSPECTIVE_STUDENTS: 'prospective_students',
} as const;

export type CollectionKey = keyof typeof COLLECTIONS;

/**
 * Realtime subscription listener for any Firestore collection with graceful offline handling
 */
export function subscribeToCollection<T>(
  collectionName: string,
  onUpdate: (data: T[]) => void,
  onError?: (error: Error) => void
): () => void {
  if (!db || quotaExceeded) {
    return () => {};
  }

  try {
    const colRef = collection(db, collectionName);
    let unsubscribed = false;
    let internalUnsubscribe: (() => void) | null = null;

    internalUnsubscribe = onSnapshot(
      colRef,
      (snapshot) => {
        if (unsubscribed) return;
        const items: T[] = [];
        snapshot.forEach((docSnap) => {
          items.push({
            ...docSnap.data(),
            id: docSnap.id,
          } as unknown as T);
        });
        onUpdate(items);
      },
      (error) => {
        if (isFirestoreQuotaError(error)) {
          notifyQuotaExceeded();
          unsubscribed = true;
          try {
            if (internalUnsubscribe) internalUnsubscribe();
          } catch {}
        }
        handleFirestoreError(error, OperationType.GET, collectionName);
        if (onError) onError(error);
      }
    );

    return () => {
      unsubscribed = true;
      try {
        if (internalUnsubscribe) internalUnsubscribe();
      } catch {}
    };
  } catch (err: any) {
    if (isFirestoreQuotaError(err)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(err, OperationType.GET, collectionName);
    if (onError) onError(err);
    return () => {};
  }
}

/**
 * Save / Update a single document in Firestore
 */
export async function syncDocToFirestore<T extends { id: string }>(
  collectionName: string,
  docId: string,
  data: T
): Promise<void> {
  if (!db || quotaExceeded) return;
  try {
    const docRef = doc(db, collectionName, docId);
    // Sanitize undefined fields which Firestore rejects
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(docRef, cleanData, { merge: true });
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.WRITE, `${collectionName}/${docId}`);
  }
}

/**
 * Delete a document in Firestore
 */
export async function deleteDocFromFirestore(
  collectionName: string,
  docId: string
): Promise<void> {
  if (!db || quotaExceeded) return;
  try {
    const docRef = doc(db, collectionName, docId);
    await deleteDoc(docRef);
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.DELETE, `${collectionName}/${docId}`);
  }
}

/**
 * Batch upload / seed initial data to Firestore
 */
export async function batchSeedToFirestore(
  collectionName: string,
  items: Array<{ id: string } & Record<string, any>>
): Promise<void> {
  if (!db || quotaExceeded || !items || items.length === 0) return;
  try {
    const batch = writeBatch(db);
    items.forEach((item) => {
      const docRef = doc(db, collectionName, item.id);
      const cleanData = JSON.parse(JSON.stringify(item));
      batch.set(docRef, cleanData, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

/**
 * Replace all documents in a Firestore collection with a new set of items
 */
export async function replaceAllInCollection(
  collectionName: string,
  newItems: Array<{ id: string } & Record<string, any>>
): Promise<void> {
  if (!db || quotaExceeded) return;
  try {
    const colRef = collection(db, collectionName);
    const existingSnap = await getDocs(colRef);
    
    // Batch delete existing
    const deleteBatch = writeBatch(db);
    existingSnap.forEach((docSnap) => {
      deleteBatch.delete(docSnap.ref);
    });
    await deleteBatch.commit();

    // Batch insert new items
    if (newItems.length > 0) {
      const insertBatch = writeBatch(db);
      newItems.forEach((item) => {
        const docRef = doc(db, collectionName, item.id);
        const cleanData = JSON.parse(JSON.stringify(item));
        insertBatch.set(docRef, cleanData);
      });
      await insertBatch.commit();
    }
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.WRITE, collectionName);
  }
}

/**
 * Clear all documents in a Firestore collection
 */
export async function clearFirestoreCollection(collectionName: string): Promise<void> {
  if (!db || quotaExceeded) return;
  try {
    const colRef = collection(db, collectionName);
    const existingSnap = await getDocs(colRef);
    if (existingSnap.empty) return;
    
    const deleteBatch = writeBatch(db);
    existingSnap.forEach((docSnap) => {
      deleteBatch.delete(docSnap.ref);
    });
    await deleteBatch.commit();
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.DELETE, collectionName);
  }
}

/**
 * Check if collection has documents in Firestore
 */
export async function checkCollectionCount(collectionName: string): Promise<number> {
  if (!db || quotaExceeded) return -1;
  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);
    return snapshot.size;
  } catch (error) {
    if (isFirestoreQuotaError(error)) {
      notifyQuotaExceeded();
    }
    handleFirestoreError(error, OperationType.GET, collectionName);
    return -1;
  }
}
