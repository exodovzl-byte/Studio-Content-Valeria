import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from 'firebase/auth';
import { doc, getDocFromServer, getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Fallback to default persistence if restricted by browser storage settings
});
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

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

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

testConnection();

/**
 * Compresses an uploaded image file to a bounded JPEG data URL so it fits
 * safely within Firestore document size and blueprint maxLength limits.
 */
export function compressImageFile(
  file: File,
  maxDimension = 720,
  quality = 0.78
): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl =
        typeof reader.result === 'string' ? reader.result : '';
      if (!rawDataUrl) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const renderAt = (targetMax: number, q: number): string => {
          const scale = Math.min(
            1,
            targetMax / Math.max(img.width || 1, img.height || 1)
          );
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) return '';
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);
          return canvas.toDataURL('image/jpeg', q);
        };

        const attempts: Array<[number, number]> = [
          [maxDimension, quality],
          [maxDimension, 0.6],
          [Math.round(maxDimension * 0.78), 0.55],
          [Math.round(maxDimension * 0.6), 0.48],
          [540, 0.45],
        ];

        for (const [dim, q] of attempts) {
          const candidate = renderAt(dim, q);
          if (candidate && candidate.length <= 245000) {
            resolve(candidate);
            return;
          }
        }
        resolve('');
      };
      img.onerror = () =>
        resolve(rawDataUrl.length <= 245000 ? rawDataUrl : '');
      img.src = rawDataUrl;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}
