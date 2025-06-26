class FileStorageManager {
    constructor() {
        this.dbName = 'TobroWebFiles';
        this.dbVersion = 1;
        this.storeName = 'files';
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.error('Failed to open IndexedDB:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                console.log('IndexedDB initialized successfully');
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // Create object store for files
                if (!db.objectStoreNames.contains(this.storeName)) {
                    const store = db.createObjectStore(this.storeName, { keyPath: 'id' });
                    console.log('Created files object store');
                }
            };
        });
    }

    async storeFile(fileId, file, metadata = {}) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            
            const fileData = {
                id: fileId,
                file: file, // Store the actual File object
                metadata: {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    lastModified: file.lastModified,
                    ...metadata
                },
                timestamp: new Date().toISOString()
            };
            
            const request = store.put(fileData);
            
            request.onsuccess = () => {
                console.log(`File ${fileId} stored successfully`);
                resolve();
            };
            
            request.onerror = () => {
                console.error(`Failed to store file ${fileId}:`, request.error);
                reject(request.error);
            };
        });
    }

    async getFile(fileId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(fileId);
            
            request.onsuccess = () => {
                if (request.result) {
                    console.log(`File ${fileId} retrieved successfully`);
                    resolve(request.result);
                } else {
                    console.log(`File ${fileId} not found in storage`);
                    resolve(null);
                }
            };
            
            request.onerror = () => {
                console.error(`Failed to retrieve file ${fileId}:`, request.error);
                reject(request.error);
            };
        });
    }

    async deleteFile(fileId) {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.delete(fileId);
            
            request.onsuccess = () => {
                console.log(`File ${fileId} deleted successfully`);
                resolve();
            };
            
            request.onerror = () => {
                console.error(`Failed to delete file ${fileId}:`, request.error);
                reject(request.error);
            };
        });
    }

    async getAllFiles() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = () => {
                console.error('Failed to get all files:', request.error);
                reject(request.error);
            };
        });
    }

    async clearAllFiles() {
        if (!this.db) {
            await this.init();
        }

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readwrite');
            const store = transaction.objectStore(this.storeName);
            const request = store.clear();
            
            request.onsuccess = () => {
                console.log('All files cleared from storage');
                resolve();
            };
            
            request.onerror = () => {
                console.error('Failed to clear files:', request.error);
                reject(request.error);
            };
        });
    }

    // Get storage usage info
    async getStorageInfo() {
        if (!navigator.storage || !navigator.storage.estimate) {
            return { used: 0, available: 0, total: 0 };
        }

        try {
            const estimate = await navigator.storage.estimate();
            return {
                used: estimate.usage || 0,
                available: (estimate.quota || 0) - (estimate.usage || 0),
                total: estimate.quota || 0
            };
        } catch (error) {
            console.error('Failed to get storage estimate:', error);
            return { used: 0, available: 0, total: 0 };
        }
    }

    // Format storage size for display
    formatStorageSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Create global instance
window.fileStorage = new FileStorageManager(); 