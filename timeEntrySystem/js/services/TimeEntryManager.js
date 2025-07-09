class TimeEntryManager {
    constructor(databaseService) {
        this.db = databaseService;
        this.storeName = 'timeEntries';
    }

    async addEntry(timesheetId, project, startTime, endTime, date, notes, tags) {
        try {
            const entry = new TimeEntry(timesheetId, project, startTime, endTime, date, notes, tags);
            
            if (!entry.isValidEntry()) {
                throw new Error('Invalid time entry data');
            }

            await this.db.add(this.storeName, entry.toJSON());
            return entry;
        } catch (error) {
            console.error('Error adding time entry:', error);
            throw error;
        }
    }

    async updateEntry(id, project, startTime, endTime, date, notes, tags) {
        try {
            const existingEntry = await this.db.get(this.storeName, id);
            if (!existingEntry) {
                throw new Error('Time entry not found');
            }

            const entry = TimeEntry.fromJSON(existingEntry);
            entry.update(project, startTime, endTime, date, notes, tags);
            
            if (!entry.isValidEntry()) {
                throw new Error('Invalid time entry data');
            }

            await this.db.update(this.storeName, entry.toJSON());
            return entry;
        } catch (error) {
            console.error('Error updating time entry:', error);
            throw error;
        }
    }

    async deleteEntry(id) {
        try {
            await this.db.delete(this.storeName, id);
        } catch (error) {
            console.error('Error deleting time entry:', error);
            throw error;
        }
    }

    async getEntry(id) {
        try {
            const data = await this.db.get(this.storeName, id);
            return data ? TimeEntry.fromJSON(data) : null;
        } catch (error) {
            console.error('Error getting time entry:', error);
            throw error;
        }
    }

    async getEntriesByTimesheet(timesheetId) {
        try {
            const data = await this.db.getByIndex(this.storeName, 'timesheetId', timesheetId);
            return data.map(entry => TimeEntry.fromJSON(entry))
                      .sort((a, b) => new Date(b.date) - new Date(a.date) || b.startTime - a.startTime);
        } catch (error) {
            console.error('Error getting entries by timesheet:', error);
            throw error;
        }
    }

    async getEntriesByProject(timesheetId, project) {
        try {
            const allEntries = await this.getEntriesByTimesheet(timesheetId);
            return allEntries.filter(entry => 
                entry.project.toLowerCase().includes(project.toLowerCase())
            );
        } catch (error) {
            console.error('Error getting entries by project:', error);
            throw error;
        }
    }

    async getEntriesByDateRange(timesheetId, startDate, endDate) {
        try {
            const allEntries = await this.getEntriesByTimesheet(timesheetId);
            return allEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                const start = new Date(startDate);
                const end = new Date(endDate);
                return entryDate >= start && entryDate <= end;
            });
        } catch (error) {
            console.error('Error getting entries by date range:', error);
            throw error;
        }
    }

    async getFilteredEntries(timesheetId, filters = {}) {
        try {
            let entries = await this.getEntriesByTimesheet(timesheetId);

            if (filters.startDate) {
                const startDate = new Date(filters.startDate);
                entries = entries.filter(entry => new Date(entry.date) >= startDate);
            }

            if (filters.endDate) {
                const endDate = new Date(filters.endDate);
                entries = entries.filter(entry => new Date(entry.date) <= endDate);
            }

            if (filters.project) {
                entries = entries.filter(entry => 
                    entry.project.toLowerCase().includes(filters.project.toLowerCase())
                );
            }

            if (filters.tags && filters.tags.length > 0) {
                entries = entries.filter(entry => 
                    filters.tags.some(tag => entry.tags.includes(tag))
                );
            }

            return entries;
        } catch (error) {
            console.error('Error filtering entries:', error);
            throw error;
        }
    }

    async getTotalHours(timesheetId, filters = {}) {
        try {
            const entries = await this.getFilteredEntries(timesheetId, filters);
            return entries.reduce((total, entry) => total + entry.duration, 0);
        } catch (error) {
            console.error('Error calculating total hours:', error);
            throw error;
        }
    }

    async getProjectSummary(timesheetId, filters = {}) {
        try {
            const entries = await this.getFilteredEntries(timesheetId, filters);
            const summary = {};

            entries.forEach(entry => {
                if (!summary[entry.project]) {
                    summary[entry.project] = {
                        totalHours: 0,
                        entryCount: 0
                    };
                }
                summary[entry.project].totalHours += entry.duration;
                summary[entry.project].entryCount++;
            });

            return summary;
        } catch (error) {
            console.error('Error generating project summary:', error);
            throw error;
        }
    }

    async getDailySummary(timesheetId, filters = {}) {
        try {
            const entries = await this.getFilteredEntries(timesheetId, filters);
            const summary = {};

            entries.forEach(entry => {
                if (!summary[entry.date]) {
                    summary[entry.date] = {
                        totalHours: 0,
                        entryCount: 0,
                        projects: new Set()
                    };
                }
                summary[entry.date].totalHours += entry.duration;
                summary[entry.date].entryCount++;
                summary[entry.date].projects.add(entry.project);
            });

            Object.keys(summary).forEach(date => {
                summary[date].projects = Array.from(summary[date].projects);
            });

            return summary;
        } catch (error) {
            console.error('Error generating daily summary:', error);
            throw error;
        }
    }
}