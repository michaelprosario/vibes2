class DatabaseService {
    constructor(dbName = 'TimeEntryDB', version = 1) {
        this.dbName = dbName;
        this.version = version;
        this.db = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) {
            return this.db;
        }

        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                reject(new Error('IndexedDB is not supported in this browser'));
                return;
            }

            const request = indexedDB.open(this.dbName, this.version);

            request.onerror = () => {
                reject(new Error('Failed to open database: ' + request.error));
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.initialized = true;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('timesheets')) {
                    const timesheetStore = db.createObjectStore('timesheets', { keyPath: 'id' });
                    timesheetStore.createIndex('name', 'name', { unique: false });
                    timesheetStore.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }

    async saveTimesheet(timesheet) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timesheets'], 'readwrite');
            const store = transaction.objectStore('timesheets');
            const request = store.put(timesheet.toJSON());

            request.onsuccess = () => {
                resolve(timesheet);
            };

            request.onerror = () => {
                reject(new Error('Failed to save timesheet: ' + request.error));
            };
        });
    }

    async getTimesheet(id) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timesheets'], 'readonly');
            const store = transaction.objectStore('timesheets');
            const request = store.get(id);

            request.onsuccess = () => {
                if (request.result) {
                    resolve(Timesheet.fromJSON(request.result));
                } else {
                    resolve(null);
                }
            };

            request.onerror = () => {
                reject(new Error('Failed to get timesheet: ' + request.error));
            };
        });
    }

    async getAllTimesheets() {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timesheets'], 'readonly');
            const store = transaction.objectStore('timesheets');
            const request = store.getAll();

            request.onsuccess = () => {
                const timesheets = request.result.map(data => Timesheet.fromJSON(data));
                timesheets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                resolve(timesheets);
            };

            request.onerror = () => {
                reject(new Error('Failed to get all timesheets: ' + request.error));
            };
        });
    }

    async deleteTimesheet(id) {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timesheets'], 'readwrite');
            const store = transaction.objectStore('timesheets');
            const request = store.delete(id);

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Failed to delete timesheet: ' + request.error));
            };
        });
    }

    async updateTimesheet(timesheet) {
        return this.saveTimesheet(timesheet);
    }

    async searchTimesheets(query) {
        const timesheets = await this.getAllTimesheets();
        const lowerQuery = query.toLowerCase();

        return timesheets.filter(timesheet => 
            timesheet.name.toLowerCase().includes(lowerQuery) ||
            timesheet.entries.some(entry => 
                entry.projectName.toLowerCase().includes(lowerQuery) ||
                entry.notes.toLowerCase().includes(lowerQuery)
            )
        );
    }

    async getTimesheetsByDateRange(startDate, endDate) {
        const timesheets = await this.getAllTimesheets();
        
        return timesheets.filter(timesheet => {
            const timesheetDate = new Date(timesheet.createdAt);
            return timesheetDate >= startDate && timesheetDate <= endDate;
        });
    }

    async exportAllData() {
        const timesheets = await this.getAllTimesheets();
        
        return {
            exportDate: new Date().toISOString(),
            version: this.version,
            timesheets: timesheets.map(timesheet => timesheet.toJSON())
        };
    }

    async importData(data) {
        await this.initialize();

        if (!data.timesheets || !Array.isArray(data.timesheets)) {
            throw new Error('Invalid import data format');
        }

        const results = [];
        
        for (const timesheetData of data.timesheets) {
            try {
                const timesheet = Timesheet.fromJSON(timesheetData);
                await this.saveTimesheet(timesheet);
                results.push({ success: true, timesheet: timesheet });
            } catch (error) {
                results.push({ success: false, error: error.message, data: timesheetData });
            }
        }

        return results;
    }

    async clearAllData() {
        await this.initialize();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['timesheets'], 'readwrite');
            const store = transaction.objectStore('timesheets');
            const request = store.clear();

            request.onsuccess = () => {
                resolve(true);
            };

            request.onerror = () => {
                reject(new Error('Failed to clear all data: ' + request.error));
            };
        });
    }

    async getStatistics() {
        const timesheets = await this.getAllTimesheets();
        
        let totalEntries = 0;
        let totalHours = 0;
        const projectHours = {};
        
        timesheets.forEach(timesheet => {
            totalEntries += timesheet.getEntryCount();
            totalHours += timesheet.getTotalHours();
            
            timesheet.getProjectSummary().forEach(project => {
                if (projectHours[project.project]) {
                    projectHours[project.project] += project.hours;
                } else {
                    projectHours[project.project] = project.hours;
                }
            });
        });

        return {
            totalTimesheets: timesheets.length,
            totalEntries,
            totalHours,
            projectHours,
            averageEntriesPerTimesheet: timesheets.length > 0 ? totalEntries / timesheets.length : 0
        };
    }

    isInitialized() {
        return this.initialized;
    }

    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            this.initialized = false;
        }
    }
}