class TimeEntry {
    constructor(timesheetId, project, startTime, endTime, date, notes = '', tags = []) {
        this.id = this.generateId();
        this.timesheetId = timesheetId;
        this.project = project;
        this.startTime = new Date(startTime);
        this.endTime = new Date(endTime);
        this.date = date;
        this.notes = notes;
        this.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.duration = this.calculateDuration();
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    calculateDuration() {
        return (this.endTime - this.startTime) / (1000 * 60 * 60);
    }

    update(project, startTime, endTime, date, notes, tags) {
        this.project = project;
        this.startTime = new Date(startTime);
        this.endTime = new Date(endTime);
        this.date = date;
        this.notes = notes;
        this.tags = Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim()).filter(tag => tag);
        this.duration = this.calculateDuration();
        this.updatedAt = new Date();
    }

    getFormattedDuration() {
        const hours = Math.floor(this.duration);
        const minutes = Math.round((this.duration - hours) * 60);
        return `${hours}h ${minutes}m`;
    }

    getFormattedStartTime() {
        return this.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getFormattedEndTime() {
        return this.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    getFormattedDate() {
        return new Date(this.date).toLocaleDateString();
    }

    getFormattedStartDateTime() {
        return this.startTime.toLocaleString();
    }

    getFormattedEndDateTime() {
        return this.endTime.toLocaleString();
    }

    isValidEntry() {
        return this.startTime < this.endTime && 
               this.project && 
               this.notes && 
               this.date &&
               this.timesheetId &&
               this.duration > 0;
    }

    toJSON() {
        return {
            id: this.id,
            timesheetId: this.timesheetId,
            project: this.project,
            startTime: this.startTime.toISOString(),
            endTime: this.endTime.toISOString(),
            date: this.date,
            notes: this.notes,
            tags: this.tags,
            duration: this.duration,
            createdAt: this.createdAt.toISOString(),
            updatedAt: this.updatedAt.toISOString()
        };
    }

    static fromJSON(data) {
        const entry = new TimeEntry(
            data.timesheetId,
            data.project,
            data.startTime,
            data.endTime,
            data.date,
            data.notes,
            data.tags
        );
        entry.id = data.id;
        entry.createdAt = new Date(data.createdAt);
        entry.updatedAt = new Date(data.updatedAt);
        return entry;
    }
}