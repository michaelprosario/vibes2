class TimeEntryManager {
    constructor(databaseService) {
        this.databaseService = databaseService;
        this.currentTimesheet = null;
        this.eventListeners = {};
    }

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    setCurrentTimesheet(timesheet) {
        this.currentTimesheet = timesheet;
        this.emit('timesheetChanged', timesheet);
    }

    getCurrentTimesheet() {
        return this.currentTimesheet;
    }

    async createTimeEntry(projectName, startTime, endTime, date, notes = '') {
        if (!this.currentTimesheet) {
            throw new Error('No timesheet selected');
        }

        try {
            const timeEntry = new TimeEntry(projectName, startTime, endTime, date, notes);
            const validation = timeEntry.validate();
            
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            this.currentTimesheet.addEntry(timeEntry);
            await this.databaseService.saveTimesheet(this.currentTimesheet);
            
            this.emit('entryCreated', timeEntry);
            this.emit('timesheetUpdated', this.currentTimesheet);
            
            return timeEntry;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async updateTimeEntry(entryId, projectName, startTime, endTime, date, notes = '') {
        if (!this.currentTimesheet) {
            throw new Error('No timesheet selected');
        }

        try {
            const updatedEntry = this.currentTimesheet.updateEntry(entryId, projectName, startTime, endTime, date, notes);
            await this.databaseService.saveTimesheet(this.currentTimesheet);
            
            this.emit('entryUpdated', updatedEntry);
            this.emit('timesheetUpdated', this.currentTimesheet);
            
            return updatedEntry;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async deleteTimeEntry(entryId) {
        if (!this.currentTimesheet) {
            throw new Error('No timesheet selected');
        }

        try {
            const deletedEntry = this.currentTimesheet.removeEntry(entryId);
            await this.databaseService.saveTimesheet(this.currentTimesheet);
            
            this.emit('entryDeleted', deletedEntry);
            this.emit('timesheetUpdated', this.currentTimesheet);
            
            return deletedEntry;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    getTimeEntry(entryId) {
        if (!this.currentTimesheet) {
            return null;
        }

        return this.currentTimesheet.getEntry(entryId);
    }

    getAllTimeEntries() {
        if (!this.currentTimesheet) {
            return [];
        }

        return this.currentTimesheet.getAllEntries();
    }

    getTimeEntriesByDate(date) {
        if (!this.currentTimesheet) {
            return [];
        }

        return this.currentTimesheet.getEntriesByDate(date);
    }

    getTimeEntriesByProject(projectName) {
        if (!this.currentTimesheet) {
            return [];
        }

        return this.currentTimesheet.getEntriesByProject(projectName);
    }

    getTotalHours() {
        if (!this.currentTimesheet) {
            return 0;
        }

        return this.currentTimesheet.getTotalHours();
    }

    getProjectSummary() {
        if (!this.currentTimesheet) {
            return [];
        }

        return this.currentTimesheet.getProjectSummary();
    }

    validateTimeEntry(projectName, startTime, endTime, date, notes = '') {
        try {
            const timeEntry = new TimeEntry(projectName, startTime, endTime, date, notes);
            return timeEntry.validate();
        } catch (error) {
            return {
                isValid: false,
                errors: [error.message]
            };
        }
    }

    async duplicateTimeEntry(entryId, newDate = null) {
        if (!this.currentTimesheet) {
            throw new Error('No timesheet selected');
        }

        try {
            const originalEntry = this.currentTimesheet.getEntry(entryId);
            if (!originalEntry) {
                throw new Error('Entry not found');
            }

            const duplicatedEntry = new TimeEntry(
                originalEntry.projectName,
                originalEntry.startTime,
                originalEntry.endTime,
                newDate || originalEntry.date,
                originalEntry.notes
            );

            this.currentTimesheet.addEntry(duplicatedEntry);
            await this.databaseService.saveTimesheet(this.currentTimesheet);
            
            this.emit('entryCreated', duplicatedEntry);
            this.emit('timesheetUpdated', this.currentTimesheet);
            
            return duplicatedEntry;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async bulkUpdateEntries(updates) {
        if (!this.currentTimesheet) {
            throw new Error('No timesheet selected');
        }

        try {
            const updatedEntries = [];
            
            for (const update of updates) {
                const entry = this.currentTimesheet.updateEntry(
                    update.id,
                    update.projectName,
                    update.startTime,
                    update.endTime,
                    update.date,
                    update.notes
                );
                updatedEntries.push(entry);
            }

            await this.databaseService.saveTimesheet(this.currentTimesheet);
            
            this.emit('entriesBulkUpdated', updatedEntries);
            this.emit('timesheetUpdated', this.currentTimesheet);
            
            return updatedEntries;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async bulkDeleteEntries(entryIds) {
        if (!this.currentTimesheet) {
            throw new Error('No timesheet selected');
        }

        try {
            const deletedEntries = [];
            
            for (const entryId of entryIds) {
                const entry = this.currentTimesheet.removeEntry(entryId);
                deletedEntries.push(entry);
            }

            await this.databaseService.saveTimesheet(this.currentTimesheet);
            
            this.emit('entriesBulkDeleted', deletedEntries);
            this.emit('timesheetUpdated', this.currentTimesheet);
            
            return deletedEntries;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    getEntriesByWeek(weekStart) {
        if (!this.currentTimesheet) {
            return [];
        }

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);

        return this.currentTimesheet.getAllEntries().filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate >= weekStart && entryDate <= weekEnd;
        });
    }

    getEntriesByMonth(year, month) {
        if (!this.currentTimesheet) {
            return [];
        }

        return this.currentTimesheet.getAllEntries().filter(entry => {
            const entryDate = new Date(entry.date);
            return entryDate.getFullYear() === year && entryDate.getMonth() === month;
        });
    }

    getStatistics() {
        if (!this.currentTimesheet) {
            return {
                totalEntries: 0,
                totalHours: 0,
                averageHoursPerEntry: 0,
                projectCount: 0,
                dateRange: null
            };
        }

        const entries = this.currentTimesheet.getAllEntries();
        const totalHours = this.currentTimesheet.getTotalHours();
        const projects = new Set(entries.map(entry => entry.projectName));
        const dateRange = this.currentTimesheet.getDateRange();

        return {
            totalEntries: entries.length,
            totalHours,
            averageHoursPerEntry: entries.length > 0 ? totalHours / entries.length : 0,
            projectCount: projects.size,
            dateRange
        };
    }

    hasCurrentTimesheet() {
        return this.currentTimesheet !== null;
    }

    isCurrentTimesheetEmpty() {
        return !this.currentTimesheet || this.currentTimesheet.isEmpty();
    }
}