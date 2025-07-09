class Timesheet {
    constructor(name) {
        this.id = this.generateId();
        this.name = name;
        this.entries = [];
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    generateId() {
        return 'timesheet_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addEntry(timeEntry) {
        if (!(timeEntry instanceof TimeEntry)) {
            throw new Error('Entry must be an instance of TimeEntry');
        }

        const validation = timeEntry.validate();
        if (!validation.isValid) {
            throw new Error('Invalid time entry: ' + validation.errors.join(', '));
        }

        this.entries.push(timeEntry);
        this.updatedAt = new Date().toISOString();
        return timeEntry;
    }

    removeEntry(entryId) {
        const index = this.entries.findIndex(entry => entry.id === entryId);
        if (index === -1) {
            throw new Error('Entry not found');
        }

        const removedEntry = this.entries.splice(index, 1)[0];
        this.updatedAt = new Date().toISOString();
        return removedEntry;
    }

    updateEntry(entryId, projectName, startTime, endTime, date, notes = '') {
        const entry = this.entries.find(entry => entry.id === entryId);
        if (!entry) {
            throw new Error('Entry not found');
        }

        entry.update(projectName, startTime, endTime, date, notes);
        const validation = entry.validate();
        if (!validation.isValid) {
            throw new Error('Invalid time entry: ' + validation.errors.join(', '));
        }

        this.updatedAt = new Date().toISOString();
        return entry;
    }

    getEntry(entryId) {
        return this.entries.find(entry => entry.id === entryId);
    }

    getAllEntries() {
        return [...this.entries];
    }

    getEntriesByDate(date) {
        return this.entries.filter(entry => entry.date === date);
    }

    getEntriesByProject(projectName) {
        return this.entries.filter(entry => 
            entry.projectName.toLowerCase().includes(projectName.toLowerCase())
        );
    }

    getTotalHours() {
        return this.entries.reduce((total, entry) => total + entry.hours, 0);
    }

    getFormattedTotalHours() {
        const totalHours = this.getTotalHours();
        const hours = Math.floor(totalHours);
        const minutes = Math.round((totalHours - hours) * 60);
        
        if (hours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    }

    getProjectSummary() {
        const projectHours = {};
        
        this.entries.forEach(entry => {
            if (projectHours[entry.projectName]) {
                projectHours[entry.projectName] += entry.hours;
            } else {
                projectHours[entry.projectName] = entry.hours;
            }
        });

        return Object.entries(projectHours).map(([project, hours]) => ({
            project,
            hours,
            formattedHours: this.formatHours(hours)
        }));
    }

    formatHours(hours) {
        const wholeHours = Math.floor(hours);
        const minutes = Math.round((hours - wholeHours) * 60);
        
        if (wholeHours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${wholeHours}h`;
        } else {
            return `${wholeHours}h ${minutes}m`;
        }
    }

    validate() {
        const errors = [];

        if (!this.name || this.name.trim() === '') {
            errors.push('Timesheet name is required');
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    updateName(newName) {
        if (!newName || newName.trim() === '') {
            throw new Error('Timesheet name is required');
        }
        
        this.name = newName.trim();
        this.updatedAt = new Date().toISOString();
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            entries: this.entries.map(entry => entry.toJSON()),
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromJSON(data) {
        const timesheet = new Timesheet(data.name);
        timesheet.id = data.id;
        timesheet.createdAt = data.createdAt;
        timesheet.updatedAt = data.updatedAt;
        
        if (data.entries) {
            timesheet.entries = data.entries.map(entryData => TimeEntry.fromJSON(entryData));
        }
        
        return timesheet;
    }

    getDateRange() {
        if (this.entries.length === 0) {
            return null;
        }

        const dates = this.entries.map(entry => new Date(entry.date));
        const minDate = new Date(Math.min.apply(null, dates));
        const maxDate = new Date(Math.max.apply(null, dates));

        return {
            start: minDate.toLocaleDateString(),
            end: maxDate.toLocaleDateString()
        };
    }

    getEntryCount() {
        return this.entries.length;
    }

    isEmpty() {
        return this.entries.length === 0;
    }
}