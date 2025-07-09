class DatabaseService {
    constructor() {
        this.dbName = 'TimeEntrySystemDB';
        this.dbVersion = 2;
        this.db = null;
    }

    async initialize() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const oldVersion = event.oldVersion;
                
                // Clear existing stores if upgrading from version 1
                if (oldVersion < 2) {
                    // Delete old stores if they exist
                    if (db.objectStoreNames.contains('projects')) {
                        db.deleteObjectStore('projects');
                    }
                    if (db.objectStoreNames.contains('timeEntries')) {
                        db.deleteObjectStore('timeEntries');
                    }
                }
                
                // Create timesheets store
                if (!db.objectStoreNames.contains('timesheets')) {
                    const timesheetsStore = db.createObjectStore('timesheets', { keyPath: 'id' });
                    timesheetsStore.createIndex('name', 'name', { unique: false });
                    timesheetsStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
                
                // Create or recreate timeEntries store
                if (!db.objectStoreNames.contains('timeEntries')) {
                    const timeEntriesStore = db.createObjectStore('timeEntries', { keyPath: 'id' });
                    timeEntriesStore.createIndex('timesheetId', 'timesheetId', { unique: false });
                    timeEntriesStore.createIndex('project', 'project', { unique: false });
                    timeEntriesStore.createIndex('date', 'date', { unique: false });
                    timeEntriesStore.createIndex('startTime', 'startTime', { unique: false });
                }
            };
        });
    }

    async add(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.add(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async update(storeName, data) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.delete(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async get(storeName, id) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        return new Promise((resolve, reject) => {
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getByDateRange(storeName, startDate, endDate) {
        const transaction = this.db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const index = store.index('startTime');
        
        return new Promise((resolve, reject) => {
            const range = IDBKeyRange.bound(startDate, endDate);
            const request = index.getAll(range);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteAllByIndex(storeName, indexName, value) {
        const transaction = this.db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const index = store.index(indexName);
        
        return new Promise((resolve, reject) => {
            const request = index.openCursor(value);
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            request.onerror = () => reject(request.error);
        });
    }
}