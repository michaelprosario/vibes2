class TimeEntry {
    constructor(projectName, startTime, endTime, date, notes = '') {
        this.id = this.generateId();
        this.projectName = projectName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.date = date;
        this.notes = notes;
        this.hours = this.calculateHours();
        this.createdAt = new Date().toISOString();
        this.updatedAt = new Date().toISOString();
    }

    generateId() {
        return 'entry_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    calculateHours() {
        if (!this.startTime || !this.endTime) {
            return 0;
        }

        const start = new Date(`${this.date}T${this.startTime}`);
        const end = new Date(`${this.date}T${this.endTime}`);
        
        if (end <= start) {
            return 0;
        }

        const diffInMs = end - start;
        return Math.round((diffInMs / (1000 * 60 * 60)) * 100) / 100;
    }

    update(projectName, startTime, endTime, date, notes = '') {
        this.projectName = projectName;
        this.startTime = startTime;
        this.endTime = endTime;
        this.date = date;
        this.notes = notes;
        this.hours = this.calculateHours();
        this.updatedAt = new Date().toISOString();
    }

    validate() {
        const errors = [];

        if (!this.projectName || this.projectName.trim() === '') {
            errors.push('Project name is required');
        }

        if (!this.startTime) {
            errors.push('Start time is required');
        }

        if (!this.endTime) {
            errors.push('End time is required');
        }

        if (!this.date) {
            errors.push('Date is required');
        }

        if (this.startTime && this.endTime && this.date) {
            const start = new Date(`${this.date}T${this.startTime}`);
            const end = new Date(`${this.date}T${this.endTime}`);
            
            if (end <= start) {
                errors.push('End time must be after start time');
            }
        }

        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }

    toJSON() {
        return {
            id: this.id,
            projectName: this.projectName,
            startTime: this.startTime,
            endTime: this.endTime,
            date: this.date,
            notes: this.notes,
            hours: this.hours,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt
        };
    }

    static fromJSON(data) {
        const entry = new TimeEntry(
            data.projectName,
            data.startTime,
            data.endTime,
            data.date,
            data.notes
        );
        entry.id = data.id;
        entry.createdAt = data.createdAt;
        entry.updatedAt = data.updatedAt;
        return entry;
    }

    getFormattedDuration() {
        const hours = Math.floor(this.hours);
        const minutes = Math.round((this.hours - hours) * 60);
        
        if (hours === 0) {
            return `${minutes}m`;
        } else if (minutes === 0) {
            return `${hours}h`;
        } else {
            return `${hours}h ${minutes}m`;
        }
    }

    getFormattedDate() {
        return new Date(this.date).toLocaleDateString();
    }

    getFormattedTime() {
        const formatTime = (time) => {
            const [hours, minutes] = time.split(':');
            const date = new Date();
            date.setHours(parseInt(hours), parseInt(minutes));
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        };

        return `${formatTime(this.startTime)} - ${formatTime(this.endTime)}`;
    }
}