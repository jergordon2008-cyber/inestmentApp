/**
 * Cloud Sync Service
 * 
 * Abstraction layer between the app and the backend. Works in two modes:
 * - Firebase enabled: syncs user data to Firestore in real-time
 * - Firebase disabled: stays local-only via AsyncStorage (current MVP default)
 * 
 * Stores and services call into this rather than Firebase directly,
 * so we can swap backends without touching app code.
 * 
 * Sync strategy:
 * - Optimistic local writes (instant UI feedback)
 * - Background push to cloud (eventual consistency)
 * - Pull on app launch + manual refresh
 * - Conflict resolution: last-write-wins for MVP (we'll add CRDTs in v2)
 */

import { FIREBASE_ENABLED, initFirebase } from './firebase';
import { User, Portfolio, Trade } from '../types';

interface SyncQueueItem {
  id: string;
  type: 'user' | 'portfolio' | 'trade' | 'journal';
  action: 'create' | 'update' | 'delete';
  data: any;
  attempts: number;
  lastAttemptAt?: string;
}

class CloudSyncService {
  private syncQueue: SyncQueueItem[] = [];
  private isSyncing = false;
  private firebaseApp: any = null;
  
  async init() {
    if (FIREBASE_ENABLED) {
      this.firebaseApp = await initFirebase();
      // Start background sync loop
      this.startSyncLoop();
    }
  }
  
  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  /**
   * Queue a sync operation. Returns immediately — actual sync happens in background.
   */
  queueSync(item: Omit<SyncQueueItem, 'id' | 'attempts'>) {
    if (!FIREBASE_ENABLED) return; // Local-only mode, nothing to sync
    
    this.syncQueue.push({
      ...item,
      id: `sync_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      attempts: 0,
    });
  }
  
  /**
   * Manually trigger a sync. Useful for pull-to-refresh.
   */
  async forceSync(): Promise<{ success: boolean; itemsSynced: number; error?: string }> {
    if (!FIREBASE_ENABLED) {
      return { success: true, itemsSynced: 0 };
    }
    
    return this.processQueue();
  }
  
  /**
   * Pull all user data from cloud. Called on login.
   */
  async pullUserData(userId: string): Promise<{
    user: User | null;
    portfolio: Portfolio | null;
    trades: Trade[];
  } | null> {
    if (!FIREBASE_ENABLED || !this.firebaseApp) return null;
    
    // Uncomment when Firebase is wired up:
    /*
    const { getFirestore, doc, getDoc, collection, getDocs } = await import('firebase/firestore');
    const db = getFirestore(this.firebaseApp);
    
    const [userDoc, portfolioDocs, tradeDocs] = await Promise.all([
      getDoc(doc(db, 'users', userId)),
      getDocs(collection(db, 'users', userId, 'portfolios')),
      getDocs(collection(db, 'users', userId, 'trades')),
    ]);
    
    return {
      user: userDoc.exists() ? userDoc.data() as User : null,
      portfolio: portfolioDocs.docs[0]?.data() as Portfolio | null,
      trades: tradeDocs.docs.map(d => d.data() as Trade),
    };
    */
    
    return null;
  }
  
  /**
   * Get pending sync queue length (for UI indicators)
   */
  getPendingCount(): number {
    return this.syncQueue.length;
  }
  
  // ============================================================================
  // INTERNAL
  // ============================================================================
  
  private startSyncLoop() {
    // Try to flush queue every 30s
    setInterval(() => {
      if (!this.isSyncing && this.syncQueue.length > 0) {
        this.processQueue();
      }
    }, 30_000);
  }
  
  private async processQueue(): Promise<{ success: boolean; itemsSynced: number; error?: string }> {
    if (this.isSyncing) return { success: false, itemsSynced: 0, error: 'Already syncing' };
    if (!this.firebaseApp) return { success: false, itemsSynced: 0, error: 'Firebase not initialized' };
    
    this.isSyncing = true;
    let synced = 0;
    
    try {
      while (this.syncQueue.length > 0) {
        const item = this.syncQueue[0];
        
        // Uncomment when Firebase is wired up:
        /*
        const { getFirestore, doc, setDoc, deleteDoc } = await import('firebase/firestore');
        const db = getFirestore(this.firebaseApp);
        const collectionMap = {
          user: `users`,
          portfolio: `users/${item.data.userId}/portfolios`,
          trade: `users/${item.data.userId}/trades`,
          journal: `users/${item.data.userId}/journal`,
        };
        const path = `${collectionMap[item.type]}/${item.data.id}`;
        const ref = doc(db, path);
        
        if (item.action === 'delete') await deleteDoc(ref);
        else await setDoc(ref, item.data, { merge: true });
        */
        
        // For now, just simulate success in dev mode
        this.syncQueue.shift();
        synced++;
      }
      
      return { success: true, itemsSynced: synced };
    } catch (error: any) {
      // Increment attempt count on failed item
      if (this.syncQueue[0]) {
        this.syncQueue[0].attempts++;
        this.syncQueue[0].lastAttemptAt = new Date().toISOString();
        
        // Drop items that have failed 5+ times to prevent infinite retry
        if (this.syncQueue[0].attempts >= 5) {
          console.warn('[cloudSync] Dropping item after 5 failures:', this.syncQueue[0]);
          this.syncQueue.shift();
        }
      }
      
      return { success: false, itemsSynced: synced, error: error.message };
    } finally {
      this.isSyncing = false;
    }
  }
}

export const cloudSync = new CloudSyncService();
