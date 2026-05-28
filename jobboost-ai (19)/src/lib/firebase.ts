import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  updateDoc,
  setDoc,
  getDoc,
  getDocFromServer
} from 'firebase/firestore';
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserFeedback } from '../types';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // לא זורקים שגיאה — כדי לא לקרוס listeners ולהציג "Uncaught Error: {...}" בדפדפן
}

export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
}

export async function logout() {
  await signOut(auth);
}

export function subscribeToAuth(callback: (user: User | null) => void) {
  return onAuthStateChanged(auth, callback);
}

export function generateJobId(job: any): string {
  if (job.id) return job.id;
  return `${job.company}-${job.title}`.replace(/\s+/g, '-').toLowerCase();
}

export async function getUserProfile(userId: string) {
  try {
    const docRef = doc(db, 'profiles', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `profiles/${userId}`);
    return null;
  }
}

export async function updateUserProfile(userId: string, data: any) {
  try {
    const docRef = doc(db, 'profiles', userId);
    await setDoc(docRef, {
      ...data,
      userId,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `profiles/${userId}`);
  }
}

export function subscribeToUserProfile(userId: string, callback: (profile: any) => void) {
  const docRef = doc(db, 'profiles', userId);
  return onSnapshot(docRef, (docSnap) => {
    if (docSnap.exists()) {
      callback(docSnap.data());
    } else {
      callback(null);
    }
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `profiles/${userId}`);
    callback(null);
  });
}

export async function toggleJobLike(userId: string, job: any) {
  const jobId = generateJobId(job);
  const savedJobRef = doc(db, 'savedJobs', `${userId}_${jobId}`);
  
  try {
    const docSnap = await getDoc(savedJobRef);
    if (docSnap.exists()) {
      await deleteDoc(savedJobRef);
      return { liked: false };
    } else {
      await setDoc(savedJobRef, {
        userId,
        jobId,
        jobData: job,
        createdAt: serverTimestamp()
      });
      return { liked: true };
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `savedJobs/${userId}_${jobId}`);
    return { liked: false };
  }
}

export function subscribeToSavedJobs(userId: string, callback: (jobs: any[]) => void) {
  const q = query(collection(db, 'savedJobs'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    callback(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'savedJobs');
    callback([]);
  });
}

export async function submitFeedback(feedback: Omit<UserFeedback, 'id' | 'createdAt'>) {
  try {
    const feedbackRef = collection(db, 'feedback');
    await addDoc(feedbackRef, {
      ...feedback,
      createdAt: serverTimestamp()
    });
    return { success: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'feedback');
    return { success: false };
  }
}

export async function saveJobAlert(alert: { userId: string, title: string, location: string, seniority: string, environment: string }) {
  try {
    const alertsRef = collection(db, 'jobAlerts');
    return await addDoc(alertsRef, {
      ...alert,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'jobAlerts');
    return null;
  }
}

export async function getJobAlerts(userId: string) {
  try {
    const alertsRef = collection(db, 'jobAlerts');
    const q = query(alertsRef, where('userId', '==', userId), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'jobAlerts');
    return [];
  }
}

export async function deleteJobAlert(alertId: string) {
  try {
    return await deleteDoc(doc(db, 'jobAlerts', alertId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `jobAlerts/${alertId}`);
  }
}

export function listenToNotifications(userId: string, callback: (notifications: any[]) => void) {
  const notificationsRef = collection(db, 'notifications');
  const q = query(
    notificationsRef, 
    where('userId', '==', userId), 
    orderBy('createdAt', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    callback(notifications);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, 'notifications');
    callback([]);
  });
}

export async function clearAllNotifications(userId: string) {
  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(d => deleteDoc(d.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, 'notifications');
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const docRef = doc(db, 'notifications', notificationId);
    return await updateDoc(docRef, { isRead: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `notifications/${notificationId}`);
  }
}

export async function createMockNotification(userId: string, job: any) {
  try {
    const notificationsRef = collection(db, 'notifications');
    return await addDoc(notificationsRef, {
      userId,
      type: 'job_match',
      jobData: job,
      isRead: false,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'notifications');
    return null;
  }
}
