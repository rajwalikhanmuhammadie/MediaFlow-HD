import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  setPersistence,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  User 
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { DriveFileItem, DriveQuota } from '../types';

// Initialize Firebase App instance safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Ensure Firebase Auth persists across reloads/iframes
if (typeof window !== 'undefined') {
  setPersistence(auth, indexedDBLocalPersistence).catch(() => {
    setPersistence(auth, browserLocalPersistence).catch(() => {});
  });
}

// Configure Google OAuth Provider with Google Drive Scopes
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.addScope('https://www.googleapis.com/auth/drive');

// In-memory access token & user cache
let cachedAccessToken: string | null = null;
let cachedDriveUser: User | null = null;
let isSigningIn = false;
let hasExplicitlySignedOut = false;

interface StoredDriveSession {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  accessToken: string | null;
  updatedAt: number;
}

const IDB_NAME = 'MediaFlowDriveSessionDB';
const IDB_STORE = 'drive_sessions';
const IDB_KEY = 'active_drive_session';

function openDriveSessionDB(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function readIdbDriveSession(): Promise<StoredDriveSession | null> {
  const db = await openDriveSessionDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => {
        const res = req.result as StoredDriveSession | undefined;
        resolve(res && res.uid ? res : null);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeIdbDriveSession(session: StoredDriveSession): Promise<void> {
  const db = await openDriveSessionDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(session, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function clearIdbDriveSession(): Promise<void> {
  const db = await openDriveSessionDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.delete(IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

function hydrateUserFromStored(stored: StoredDriveSession): User {
  if (auth.currentUser && auth.currentUser.uid === stored.uid) {
    return auth.currentUser;
  }
  return {
    uid: stored.uid,
    email: stored.email,
    displayName: stored.displayName,
    photoURL: stored.photoURL,
    emailVerified: true,
    isAnonymous: false,
    metadata: {},
    providerData: [],
    refreshToken: '',
    tenantId: null,
    delete: async () => {},
    getIdToken: async () => '',
    getIdTokenResult: async () => ({} as any),
    reload: async () => {},
    toJSON: () => ({}),
    phoneNumber: null,
    providerId: 'google.com',
  } as unknown as User;
}

async function persistDriveSession(user: User, token: string | null): Promise<void> {
  const existingIdb = await readIdbDriveSession();
  const effectiveToken = token || cachedAccessToken || existingIdb?.accessToken || null;
  if (effectiveToken) {
    cachedAccessToken = effectiveToken;
  }
  cachedDriveUser = user;

  const payload: StoredDriveSession = {
    uid: user.uid,
    email: user.email || existingIdb?.email || null,
    displayName: user.displayName || existingIdb?.displayName || null,
    photoURL: user.photoURL || existingIdb?.photoURL || null,
    accessToken: effectiveToken,
    updatedAt: Date.now(),
  };

  await writeIdbDriveSession(payload);

  try {
    await fetch('/api/drive-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // Ignore network error during background sync
  }
}

async function restoreDriveSession(): Promise<{ user: User; accessToken: string | null } | null> {
  if (hasExplicitlySignedOut) return null;

  if (cachedDriveUser && cachedAccessToken) {
    return { user: cachedDriveUser, accessToken: cachedAccessToken };
  }

  // 1. Check browser IndexedDB first
  const idbSession = await readIdbDriveSession();
  if (idbSession && idbSession.uid) {
    if (idbSession.accessToken && !cachedAccessToken) {
      cachedAccessToken = idbSession.accessToken;
    }
    const hydrated = hydrateUserFromStored(idbSession);
    cachedDriveUser = hydrated;

    // If IndexedDB has both user and token, also make sure server is synced in background
    if (cachedAccessToken) {
      fetch('/api/drive-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(idbSession),
      }).catch(() => {});
      return { user: hydrated, accessToken: cachedAccessToken };
    }
  }

  // 2. Fallback to persistent server session (/api/drive-session survives iframe reloads & code edits)
  try {
    const res = await fetch('/api/drive-session', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.connected && data?.session?.uid) {
        const srvSession = data.session as StoredDriveSession;
        if (srvSession.accessToken) {
          cachedAccessToken = srvSession.accessToken;
        }
        const hydrated = hydrateUserFromStored(srvSession);
        cachedDriveUser = hydrated;
        await writeIdbDriveSession(srvSession);
        return { user: hydrated, accessToken: cachedAccessToken };
      }
    }
  } catch {
    // Ignore fetch error
  }

  if (cachedDriveUser) {
    return { user: cachedDriveUser, accessToken: cachedAccessToken };
  }

  return null;
}

/**
 * Initialize Auth state listener — preserves Google Drive connection across code edits & reloads
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  // Immediately attempt restoration from IndexedDB / server session so UI stays connected without flicker
  restoreDriveSession().then((restored) => {
    if (restored && restored.user && !hasExplicitlySignedOut) {
      if (onAuthSuccess) {
        onAuthSuccess(restored.user, restored.accessToken || '');
      }
    }
  });

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      hasExplicitlySignedOut = false;
      const restored = await restoreDriveSession();
      const tokenToUse = cachedAccessToken || restored?.accessToken || '';
      await persistDriveSession(user, tokenToUse || null);
      if (onAuthSuccess) {
        onAuthSuccess(user, tokenToUse);
      }
    } else {
      if (isSigningIn) return;
      // Before disconnecting, check if a persisted Drive session exists from before a code edit/reload
      if (!hasExplicitlySignedOut) {
        const restored = await restoreDriveSession();
        if (restored && restored.user) {
          if (onAuthSuccess) {
            onAuthSuccess(restored.user, restored.accessToken || '');
          }
          return;
        }
      }
      cachedAccessToken = null;
      cachedDriveUser = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Sign In with Google popup flow
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    hasExplicitlySignedOut = false;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token');
    }
    cachedAccessToken = credential.accessToken;
    cachedDriveUser = result.user;
    await persistDriveSession(result.user, cachedAccessToken);
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export interface DriveSessionStatus {
  isConnected: boolean;
  hasActiveToken: boolean;
  sessionSource: 'memory' | 'indexeddb' | 'server' | 'none';
  updatedAt: number | null;
  email: string | null;
  displayName: string | null;
}

/**
 * Inspect current Google Drive authentication and persistence status
 */
export const getDriveSessionStatus = async (): Promise<DriveSessionStatus> => {
  if (hasExplicitlySignedOut) {
    return {
      isConnected: false,
      hasActiveToken: false,
      sessionSource: 'none',
      updatedAt: null,
      email: null,
      displayName: null,
    };
  }

  if (cachedDriveUser && cachedAccessToken) {
    return {
      isConnected: true,
      hasActiveToken: true,
      sessionSource: 'memory',
      updatedAt: Date.now(),
      email: cachedDriveUser.email || null,
      displayName: cachedDriveUser.displayName || null,
    };
  }

  const idbSession = await readIdbDriveSession();
  if (idbSession && idbSession.uid) {
    if (idbSession.accessToken && !cachedAccessToken) {
      cachedAccessToken = idbSession.accessToken;
    }
    return {
      isConnected: true,
      hasActiveToken: Boolean(idbSession.accessToken || cachedAccessToken),
      sessionSource: 'indexeddb',
      updatedAt: idbSession.updatedAt || null,
      email: idbSession.email || null,
      displayName: idbSession.displayName || null,
    };
  }

  try {
    const res = await fetch('/api/drive-session', { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data?.connected && data?.session?.uid) {
        const srv = data.session as StoredDriveSession;
        if (srv.accessToken && !cachedAccessToken) {
          cachedAccessToken = srv.accessToken;
        }
        return {
          isConnected: true,
          hasActiveToken: Boolean(srv.accessToken || cachedAccessToken),
          sessionSource: 'server',
          updatedAt: srv.updatedAt || null,
          email: srv.email || null,
          displayName: srv.displayName || null,
        };
      }
    }
  } catch {
    // Ignore network error
  }

  if (auth.currentUser) {
    return {
      isConnected: true,
      hasActiveToken: Boolean(cachedAccessToken),
      sessionSource: 'memory',
      updatedAt: Date.now(),
      email: auth.currentUser.email || null,
      displayName: auth.currentUser.displayName || null,
    };
  }

  return {
    isConnected: false,
    hasActiveToken: false,
    sessionSource: 'none',
    updatedAt: null,
    email: null,
    displayName: null,
  };
};

/**
 * Manually Re-authorize Google Drive session (refreshes OAuth access token & updates persistent storage)
 */
export const reauthorizeDrive = async (): Promise<{ user: User; accessToken: string }> => {
  provider.setCustomParameters({ prompt: 'consent' });
  try {
    return await googleSignIn();
  } finally {
    provider.setCustomParameters({});
  }
};

/**
 * Get current access token (restoring from IndexedDB or server session if memory was reset by code edit)
 */
export const getAccessToken = async (): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  const restored = await restoreDriveSession();
  return restored?.accessToken || cachedAccessToken || null;
};

/**
 * Sign out from Google explicitly
 */
export const logout = async (): Promise<void> => {
  hasExplicitlySignedOut = true;
  cachedAccessToken = null;
  cachedDriveUser = null;
  await Promise.allSettled([
    signOut(auth),
    clearIdbDriveSession(),
    fetch('/api/drive-session', { method: 'DELETE' }),
  ]);
};

/**
 * Format bytes to readable string (e.g. 1.2 GB)
 */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/**
 * Get Google Drive storage quota and user details
 */
export async function getDriveQuota(): Promise<DriveQuota | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=user,storageQuota', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      if (res.status === 401) {
        cachedAccessToken = null;
      }
      throw new Error(`Failed to fetch Drive quota: ${res.statusText}`);
    }

    const data = await res.json();
    const quota = data.storageQuota || {};
    const usage = parseInt(quota.usage || '0', 10);
    const limit = parseInt(quota.limit || '16106127360', 10); // Default 15 GB
    const usageInDrive = parseInt(quota.usageInDrive || '0', 10);

    const percentage = limit > 0 ? Math.min(100, Math.round((usage / limit) * 100)) : 0;

    return {
      usage,
      limit,
      usageInDrive,
      usageFormatted: formatBytes(usage),
      limitFormatted: formatBytes(limit),
      percentage
    };
  } catch (err) {
    console.error('Error fetching Google Drive quota:', err);
    return null;
  }
}

/**
 * Find or create the dedicated app folder "Social Media Downloads"
 */
export async function getOrCreateAppFolder(): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    // 1. Search for existing folder
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='Social Media Downloads' and trashed=false&fields=files(id, name)`,
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Create the folder if not found
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: 'Social Media Downloads',
        mimeType: 'application/vnd.google-apps.folder',
        description: 'Media files downloaded via Social Media Downloader'
      })
    });

    if (createRes.ok) {
      const createdFolder = await createRes.json();
      return createdFolder.id;
    }
  } catch (err) {
    console.error('Error getting/creating Drive folder:', err);
  }
  return null;
}

/**
 * List files saved in Google Drive
 */
export async function listDriveFiles(): Promise<DriveFileItem[]> {
  const token = await getAccessToken();
  if (!token) return [];

  try {
    const folderId = await getOrCreateAppFolder();
    let query = "trashed=false and mimeType!='application/vnd.google-apps.folder'";
    if (folderId) {
      query += ` and ('${folderId}' in parents or description contains 'Social Media Downloader')`;
    }

    const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      query
    )}&orderBy=createdTime desc&pageSize=100&fields=files(id,name,mimeType,size,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink)`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      // Fallback query if specific query failed
      const fallbackUrl = `https://www.googleapis.com/drive/v3/files?q=trashed=false and mimeType!='application/vnd.google-apps.folder'&orderBy=createdTime desc&pageSize=50&fields=files(id,name,mimeType,size,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink)`;
      const fbRes = await fetch(fallbackUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (fbRes.ok) {
        const data = await fbRes.json();
        return data.files || [];
      }
      throw new Error(`Failed to list files: ${res.statusText}`);
    }

    const data = await res.json();
    return data.files || [];
  } catch (err) {
    console.error('Error listing Drive files:', err);
    return [];
  }
}

/**
 * Upload a media item (via Blob or URL) directly to Google Drive
 */
export async function uploadMediaToDrive(options: {
  mediaUrl: string;
  filename: string;
  mimeType?: string;
  onProgress?: (progress: number) => void;
}): Promise<DriveFileItem> {
  let token = await getAccessToken();
  if (!token) {
    // If user is connected but OAuth token needs renewal, refresh via googleSignIn
    const refreshed = await googleSignIn();
    token = refreshed.accessToken;
  }

  const { mediaUrl, filename, mimeType, onProgress } = options;

  if (onProgress) onProgress(20);

  // Primary Path: Server-assisted extraction & direct Google Drive upload
  // Handles YouTube, TikTok, Instagram, Facebook, X, Pinterest, Reddit, and direct CDN links seamlessly
  try {
    let directUploadRes = await fetch('/api/drive-direct-upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mediaUrl,
        filename,
        mimeType,
        accessToken: token,
      }),
    });

    if (directUploadRes.status === 401) {
      cachedAccessToken = null;
      const refreshed = await googleSignIn();
      token = refreshed.accessToken;
      directUploadRes = await fetch('/api/drive-direct-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mediaUrl,
          filename,
          mimeType,
          accessToken: token,
        }),
      });
    }

    if (directUploadRes.ok) {
      const payload = await directUploadRes.json();
      if (payload?.success && payload?.file) {
        if (onProgress) onProgress(100);
        return payload.file as DriveFileItem;
      }
    }
  } catch (err) {
    console.warn('Server direct Drive upload fallback to client upload:', err);
  }

  if (onProgress) onProgress(40);

  // Fallback Path: Fetch resolved binary via /api/download-proxy or /api/download and upload from client
  let blob: Blob | null = null;
  const candidateEndpoints = [
    `/api/download-proxy?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`,
    mediaUrl.startsWith('/api/download')
      ? mediaUrl
      : `/api/download?url=${encodeURIComponent(mediaUrl)}&format=best`,
  ];

  for (const endpoint of candidateEndpoints) {
    try {
      const res = await fetch(endpoint);
      const ct = res.headers.get('content-type') || '';
      if (res.ok && !ct.includes('text/html') && !ct.includes('application/json')) {
        const b = await res.blob();
        if (b.size > 512) {
          blob = b;
          break;
        }
      }
    } catch {
      // Try next candidate
    }
  }

  if (!blob) {
    throw new Error('Could not download media file to upload to Google Drive. Please check the video link.');
  }

  if (onProgress) onProgress(65);

  const folderId = await getOrCreateAppFolder();
  const fileMime = mimeType || blob.type || 'video/mp4';

  const metadata: Record<string, any> = {
    name: filename,
    mimeType: fileMime,
    description: 'Downloaded via Social Media Downloader'
  };

  if (folderId) {
    metadata.parents = [folderId];
  }

  // Perform Multipart upload to Google Drive v3
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadataContentType = 'application/json; charset=UTF-8';
  const metadataContent = JSON.stringify(metadata);

  const fileArrayBuffer = await blob.arrayBuffer();
  const fileBytes = new Uint8Array(fileArrayBuffer);

  const encoder = new TextEncoder();
  const headerPart = encoder.encode(
    `${delimiter}Content-Type: ${metadataContentType}\r\n\r\n${metadataContent}${delimiter}Content-Type: ${fileMime}\r\n\r\n`
  );
  const footerPart = encoder.encode(closeDelimiter);

  const totalLength = headerPart.length + fileBytes.length + footerPart.length;
  const multipartBody = new Uint8Array(totalLength);
  multipartBody.set(headerPart, 0);
  multipartBody.set(fileBytes, headerPart.length);
  multipartBody.set(footerPart, headerPart.length + fileBytes.length);

  if (onProgress) onProgress(85);

  let uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    }
  );

  if (uploadRes.status === 401) {
    cachedAccessToken = null;
    const refreshed = await googleSignIn();
    token = refreshed.accessToken;
    uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,createdTime,webViewLink,webContentLink,thumbnailLink,iconLink',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary=${boundary}`
        },
        body: multipartBody
      }
    );
  }

  if (!uploadRes.ok) {
    const errorDetails = await uploadRes.text();
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errorDetails}`);
  }

  if (onProgress) onProgress(100);

  const uploadedFile: DriveFileItem = await uploadRes.json();
  return uploadedFile;
}

/**
 * Delete a file from Google Drive (Mandatory user confirmation must precede calling this)
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  let token = await getAccessToken();
  if (!token) {
    const refreshed = await googleSignIn();
    token = refreshed.accessToken;
  }

  let res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  if (res.status === 401) {
    cachedAccessToken = null;
    const refreshed = await googleSignIn();
    token = refreshed.accessToken;
    res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  if (!res.ok) {
    throw new Error(`Failed to delete file from Google Drive: ${res.statusText}`);
  }
  return true;
}
