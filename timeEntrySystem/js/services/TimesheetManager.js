class TimesheetManager {
    constructor(databaseService) {
        this.databaseService = databaseService;
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

    async createTimesheet(name) {
        try {
            if (!name || name.trim() === '') {
                throw new Error('Timesheet name is required');
            }

            const timesheet = new Timesheet(name.trim());
            const validation = timesheet.validate();
            
            if (!validation.isValid) {
                throw new Error(validation.errors.join(', '));
            }

            await this.databaseService.saveTimesheet(timesheet);
            
            this.emit('timesheetCreated', timesheet);
            
            return timesheet;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async updateTimesheet(timesheetId, newName) {
        try {
            const timesheet = await this.databaseService.getTimesheet(timesheetId);
            
            if (!timesheet) {
                throw new Error('Timesheet not found');
            }

            timesheet.updateName(newName);
            await this.databaseService.saveTimesheet(timesheet);
            
            this.emit('timesheetUpdated', timesheet);
            
            return timesheet;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async deleteTimesheet(timesheetId) {
        try {
            const timesheet = await this.databaseService.getTimesheet(timesheetId);
            
            if (!timesheet) {
                throw new Error('Timesheet not found');
            }

            await this.databaseService.deleteTimesheet(timesheetId);
            
            this.emit('timesheetDeleted', timesheet);
            
            return timesheet;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async getTimesheet(timesheetId) {
        try {
            const timesheet = await this.databaseService.getTimesheet(timesheetId);
            
            if (!timesheet) {
                return null;
            }

            return timesheet;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async getAllTimesheets() {
        try {
            const timesheets = await this.databaseService.getAllTimesheets();
            return timesheets;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async searchTimesheets(query) {
        try {
            const timesheets = await this.databaseService.searchTimesheets(query);
            return timesheets;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async duplicateTimesheet(timesheetId, newName = null) {
        try {
            const originalTimesheet = await this.databaseService.getTimesheet(timesheetId);
            
            if (!originalTimesheet) {
                throw new Error('Timesheet not found');
            }

            const duplicatedName = newName || `${originalTimesheet.name} (Copy)`;
            const duplicatedTimesheet = new Timesheet(duplicatedName);
            
            originalTimesheet.getAllEntries().forEach(entry => {
                const duplicatedEntry = new TimeEntry(
                    entry.projectName,
                    entry.startTime,
                    entry.endTime,
                    entry.date,
                    entry.notes
                );
                duplicatedTimesheet.addEntry(duplicatedEntry);
            });

            await this.databaseService.saveTimesheet(duplicatedTimesheet);
            
            this.emit('timesheetCreated', duplicatedTimesheet);
            
            return duplicatedTimesheet;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async getTimesheetsByDateRange(startDate, endDate) {
        try {
            const timesheets = await this.databaseService.getTimesheetsByDateRange(startDate, endDate);
            return timesheets;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async mergeTimesheets(sourceTimesheetIds, targetTimesheetId, deleteSource = false) {
        try {
            const targetTimesheet = await this.databaseService.getTimesheet(targetTimesheetId);
            
            if (!targetTimesheet) {
                throw new Error('Target timesheet not found');
            }

            const mergedEntries = [];
            
            for (const sourceId of sourceTimesheetIds) {
                const sourceTimesheet = await this.databaseService.getTimesheet(sourceId);
                
                if (!sourceTimesheet) {
                    continue;
                }

                sourceTimesheet.getAllEntries().forEach(entry => {
                    const newEntry = new TimeEntry(
                        entry.projectName,
                        entry.startTime,
                        entry.endTime,
                        entry.date,
                        entry.notes
                    );
                    targetTimesheet.addEntry(newEntry);
                    mergedEntries.push(newEntry);
                });

                if (deleteSource) {
                    await this.databaseService.deleteTimesheet(sourceId);
                    this.emit('timesheetDeleted', sourceTimesheet);
                }
            }

            await this.databaseService.saveTimesheet(targetTimesheet);
            
            this.emit('timesheetUpdated', targetTimesheet);
            this.emit('timesheetsMerged', { targetTimesheet, mergedEntries });
            
            return { targetTimesheet, mergedEntries };
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async getStatistics() {
        try {
            const stats = await this.databaseService.getStatistics();
            return stats;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async clearAllTimesheets() {
        try {
            await this.databaseService.clearAllData();
            this.emit('allTimesheetsCleared');
            return true;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async exportAllTimesheets() {
        try {
            const data = await this.databaseService.exportAllData();
            return data;
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async importTimesheets(data) {
        try {
            const results = await this.databaseService.importData(data);
            
            const successful = results.filter(result => result.success);
            const failed = results.filter(result => !result.success);
            
            if (successful.length > 0) {
                this.emit('timesheetsImported', successful);
            }
            
            return { successful, failed };
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    validateTimesheetName(name) {
        if (!name || name.trim() === '') {
            return {
                isValid: false,
                errors: ['Timesheet name is required']
            };
        }

        if (name.trim().length < 2) {
            return {
                isValid: false,
                errors: ['Timesheet name must be at least 2 characters long']
            };
        }

        if (name.trim().length > 100) {
            return {
                isValid: false,
                errors: ['Timesheet name cannot exceed 100 characters']
            };
        }

        return {
            isValid: true,
            errors: []
        };
    }

    async isTimesheetNameUnique(name, excludeId = null) {
        try {
            const timesheets = await this.getAllTimesheets();
            const normalizedName = name.trim().toLowerCase();
            
            return !timesheets.some(timesheet => 
                timesheet.id !== excludeId && 
                timesheet.name.toLowerCase() === normalizedName
            );
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async getRecentTimesheets(limit = 5) {
        try {
            const timesheets = await this.getAllTimesheets();
            return timesheets.slice(0, limit);
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async getTimesheetSummary(timesheetId) {
        try {
            const timesheet = await this.databaseService.getTimesheet(timesheetId);
            
            if (!timesheet) {
                return null;
            }

            return {
                id: timesheet.id,
                name: timesheet.name,
                totalEntries: timesheet.getEntryCount(),
                totalHours: timesheet.getTotalHours(),
                formattedTotalHours: timesheet.getFormattedTotalHours(),
                dateRange: timesheet.getDateRange(),
                projectSummary: timesheet.getProjectSummary(),
                isEmpty: timesheet.isEmpty(),
                createdAt: timesheet.createdAt,
                updatedAt: timesheet.updatedAt
            };
        } catch (error) {
            this.emit('error', error);
            throw error;
        }
    }

    async bulkOperations(operations) {
        const results = [];
        
        for (const operation of operations) {
            try {
                let result;
                
                switch (operation.type) {
                    case 'create':
                        result = await this.createTimesheet(operation.name);
                        break;
                    case 'update':
                        result = await this.updateTimesheet(operation.id, operation.name);
                        break;
                    case 'delete':
                        result = await this.deleteTimesheet(operation.id);
                        break;
                    default:
                        throw new Error(`Unknown operation type: ${operation.type}`);
                }
                
                results.push({ success: true, operation, result });
            } catch (error) {
                results.push({ success: false, operation, error: error.message });
            }
        }
        
        return results;
    }
}