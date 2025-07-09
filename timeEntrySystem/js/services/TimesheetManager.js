class TimesheetManager {
    constructor(databaseService) {
        this.db = databaseService;
        this.storeName = 'timesheets';
    }

    async createTimesheet(name, description) {
        try {
            const timesheet = new Timesheet(name, description);
            
            if (!timesheet.isValidTimesheet()) {
                throw new Error('Invalid timesheet data');
            }

            await this.db.add(this.storeName, timesheet.toJSON());
            return timesheet;
        } catch (error) {
            console.error('Error creating timesheet:', error);
            throw error;
        }
    }

    async updateTimesheet(id, name, description) {
        try {
            const existingTimesheet = await this.db.get(this.storeName, id);
            if (!existingTimesheet) {
                throw new Error('Timesheet not found');
            }

            const timesheet = Timesheet.fromJSON(existingTimesheet);
            timesheet.update(name, description);
            
            if (!timesheet.isValidTimesheet()) {
                throw new Error('Invalid timesheet data');
            }

            await this.db.update(this.storeName, timesheet.toJSON());
            return timesheet;
        } catch (error) {
            console.error('Error updating timesheet:', error);
            throw error;
        }
    }

    async deleteTimesheet(id) {
        try {
            await this.db.deleteAllByIndex('timeEntries', 'timesheetId', id);
            await this.db.delete(this.storeName, id);
        } catch (error) {
            console.error('Error deleting timesheet:', error);
            throw error;
        }
    }

    async getTimesheet(id) {
        try {
            const data = await this.db.get(this.storeName, id);
            return data ? Timesheet.fromJSON(data) : null;
        } catch (error) {
            console.error('Error getting timesheet:', error);
            throw error;
        }
    }

    async getAllTimesheets() {
        try {
            const data = await this.db.getAll(this.storeName);
            return data.map(timesheet => Timesheet.fromJSON(timesheet))
                      .sort((a, b) => b.updatedAt - a.updatedAt);
        } catch (error) {
            console.error('Error getting all timesheets:', error);
            throw error;
        }
    }

    async updateTimesheetStats(timesheetId) {
        try {
            const timeEntries = await this.db.getByIndex('timeEntries', 'timesheetId', timesheetId);
            const totalHours = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
            const entryCount = timeEntries.length;

            const timesheetData = await this.db.get(this.storeName, timesheetId);
            if (timesheetData) {
                const timesheet = Timesheet.fromJSON(timesheetData);
                timesheet.updateStats(totalHours, entryCount);
                await this.db.update(this.storeName, timesheet.toJSON());
                return timesheet;
            }
        } catch (error) {
            console.error('Error updating timesheet stats:', error);
            throw error;
        }
    }

    async getTimesheetWithStats(id) {
        try {
            const timesheet = await this.getTimesheet(id);
            if (timesheet) {
                await this.updateTimesheetStats(id);
                return await this.getTimesheet(id);
            }
            return null;
        } catch (error) {
            console.error('Error getting timesheet with stats:', error);
            throw error;
        }
    }

    async getAllTimesheetsWithStats() {
        try {
            const timesheets = await this.getAllTimesheets();
            
            for (const timesheet of timesheets) {
                await this.updateTimesheetStats(timesheet.id);
            }
            
            return await this.getAllTimesheets();
        } catch (error) {
            console.error('Error getting all timesheets with stats:', error);
            throw error;
        }
    }
}