
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, onSnapshot, Firestore, deleteDoc, updateDoc } from 'firebase/firestore';
import { Project } from '../types';

let app: FirebaseApp | undefined;
let db: Firestore | undefined;

export const isFirebaseInitialized = () => !!app;

export const initFirebase = (config: any) => {
  try {
    if (!getApps().length) {
      app = initializeApp(config);
    } else {
      app = getApp();
    }
    db = getFirestore(app);
    return true;
  } catch (error) {
    console.error("Firebase Initialization Error:", error);
    return false;
  }
};

// --- Real-time Listeners ---

export const subscribeToProjects = (onUpdate: (projects: Project[]) => void) => {
  if (!db) return () => {};
  
  const projectsRef = collection(db, 'projects');
  
  const unsubscribe = onSnapshot(projectsRef, (snapshot) => {
    const projects: Project[] = [];
    snapshot.forEach((doc) => {
      projects.push(doc.data() as Project);
    });
    onUpdate(projects);
  }, (error) => {
    console.error("Sync Error:", error);
  });

  return unsubscribe;
};

// --- CRUD Operations ---

export const saveProjectToCloud = async (project: Project) => {
  if (!db) return;
  try {
    await setDoc(doc(db, 'projects', project.id), project);
  } catch (e) {
    console.error("Error saving project:", e);
    throw e;
  }
};

export const deleteProjectFromCloud = async (projectId: string) => {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'projects', projectId));
  } catch (e) {
    console.error("Error deleting project:", e);
    throw e;
  }
};

export const syncLocalDataToCloud = async (localProjects: Project[]) => {
  if (!db) return;
  for (const p of localProjects) {
    await saveProjectToCloud(p);
  }
};
