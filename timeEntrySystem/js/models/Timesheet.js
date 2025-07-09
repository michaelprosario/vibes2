class Timesheet {
    constructor(name, description = '') {
        this.id = this.generateId();
        this.name = name;
        this.description = description;
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.totalHours = 0;
        this.entryCount = 0;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    update(name, description) {
        this.name = name;
        this.description = description;
        this.updatedAt = new Date();
    }

    updateStats(totalHours, entryCount) {
        this.totalHours = totalHours;
        this.entryCount = entryCount;
        this.updatedAt = new Date();
    }

    getFormattedTotalHours() {
        const hours = Math.floor(this.totalHours);
        const minutes = Math.round((this.totalHours - hours) * 60);
        return `${hours}h ${minutes}m`;
    }

    getFormattedCreatedDate() {
        return this.createdAt.toLocaleDateString();
    }

    getFormattedUpdatedDate() {
        return this.updatedAt.toLocaleDateString();
    }

    isValidTimesheet() {
        return this.name && this.name.trim().length > 0;
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString(),
            totalHours: this.totalHours,
            entryCount: this.entryCount
        };
    }

    static fromJSON(data) {
        const timesheet = new Timesheet(data.name, data.description);
        timesheet.id = data.id;
        timesheet.createdAt = new Date(data.createdAt);
        timesheet.updatedAt = new Date(data.updatedAt);
        timesheet.totalHours = data.totalHours || 0;
        timesheet.entryCount = data.entryCount || 0;
        return timesheet;
    }
}