// Timesheet Management functionality
class TimesheetManager {
    constructor() {
        this.timesheets = [];
        this.filteredTimesheets = [];
        this.currentTimesheet = null;
        this.init();
    }

    async init() {
        await this.loadTimesheets();
        this.setupEventListeners();
        this.updateStats();
    }

    setupEventListeners() {
        // Filter and search listeners
        document.getElementById('status-filter').addEventListener('change', () => this.filterTimesheets());
        document.getElementById('period-filter').addEventListener('change', () => this.filterTimesheets());
        document.getElementById('sort-timesheets').addEventListener('change', () => this.sortTimesheets());
        
        // Form listeners
        document.getElementById('create-timesheet-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createTimesheet();
        });

        // Auto-calculate period end when start date changes
        document.getElementById('period-start').addEventListener('change', (e) => {
            this.calculatePeriodEnd(e.target.value);
        });
    }

    calculatePeriodEnd(startDate) {
        if (!startDate) return;
        
        const start = new Date(startDate);
        // Calculate end date as 6 days later (weekly timesheet)
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        
        document.getElementById('period-end').value = end.toISOString().split('T')[0];
    }

    async loadTimesheets() {
        try {
            const response = await fetch('/api/timesheets?user_id=default_user');
            if (response.ok) {
                this.timesheets = await response.json();
                this.filteredTimesheets = [...this.timesheets];
                this.renderTimesheets();
                this.updateStats();
            } else {
                console.error('Failed to load timesheets');
            }
        } catch (error) {
            console.error('Error loading timesheets:', error);
        }
    }

    async createTimesheet() {
        const formData = {
            user_id: 'default_user',
            period_start: document.getElementById('period-start').value,
            period_end: document.getElementById('period-end').value,
            notes: document.getElementById('timesheet-notes').value
        };

        try {
            const response = await fetch('/api/timesheets', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newTimesheet = await response.json();
                this.timesheets.push(newTimesheet);
                this.filterTimesheets();
                this.updateStats();
                
                // Reset form and close modal
                document.getElementById('create-timesheet-form').reset();
                bootstrap.Modal.getInstance(document.getElementById('createTimesheetModal')).hide();
                
                this.showAlert('Timesheet created successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to create timesheet', 'danger');
            }
        } catch (error) {
            console.error('Error creating timesheet:', error);
            this.showAlert('Error creating timesheet', 'danger');
        }
    }

    async viewTimesheet(timesheetId) {
        try {
            const response = await fetch(`/api/timesheets/${timesheetId}`);
            if (response.ok) {
                this.currentTimesheet = await response.json();
                await this.loadTimesheetEntries(timesheetId);
                this.renderTimesheetDetails();
                
                const modal = new bootstrap.Modal(document.getElementById('viewTimesheetModal'));
                modal.show();
            } else {
                this.showAlert('Failed to load timesheet details', 'danger');
            }
        } catch (error) {
            console.error('Error loading timesheet:', error);
            this.showAlert('Error loading timesheet', 'danger');
        }
    }

    async loadTimesheetEntries(timesheetId) {
        try {
            const response = await fetch(`/api/timesheets/${timesheetId}/entries`);
            if (response.ok) {
                this.currentTimesheet.entries = await response.json();
            } else {
                this.currentTimesheet.entries = [];
            }
        } catch (error) {
            console.error('Error loading timesheet entries:', error);
            this.currentTimesheet.entries = [];
        }
    }

    renderTimesheetDetails() {
        if (!this.currentTimesheet) return;

        const container = document.getElementById('timesheet-details');
        const timesheet = this.currentTimesheet;
        
        const totalHours = timesheet.entries.reduce((sum, entry) => sum + entry.duration_hours, 0);
        const statusBadge = this.getStatusBadge(timesheet.status);

        container.innerHTML = `
            <div class="row mb-3">
                <div class="col-md-6">
                    <h6>Period</h6>
                    <p>${this.formatDate(timesheet.period_start)} - ${this.formatDate(timesheet.period_end)}</p>
                </div>
                <div class="col-md-3">
                    <h6>Status</h6>
                    <p>${statusBadge}</p>
                </div>
                <div class="col-md-3">
                    <h6>Total Hours</h6>
                    <p class="text-primary fw-bold">${this.formatDuration(totalHours)}</p>
                </div>
            </div>
            
            ${timesheet.notes ? `
                <div class="mb-3">
                    <h6>Notes</h6>
                    <p class="text-muted">${timesheet.notes}</p>
                </div>
            ` : ''}
            
            <div class="mb-3">
                <h6>Time Entries (${timesheet.entries.length})</h6>
                ${this.renderTimesheetEntriesTable()}
            </div>
        `;

        // Update modal buttons based on status
        this.updateModalButtons();
    }

    renderTimesheetEntriesTable() {
        if (!this.currentTimesheet.entries || this.currentTimesheet.entries.length === 0) {
            return '<p class="text-muted">No time entries in this timesheet</p>';
        }

        return `
            <div class="table-responsive">
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Project</th>
                            <th>Description</th>
                            <th>Duration</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.currentTimesheet.entries.map(entry => `
                            <tr>
                                <td>${this.formatDate(entry.start_time)}</td>
                                <td>${entry.project_name || 'Unknown'}</td>
                                <td>${entry.description || '-'}</td>
                                <td>${this.formatDuration(entry.duration_hours)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    updateModalButtons() {
        const submitBtn = document.getElementById('submit-timesheet-btn');
        const recallBtn = document.getElementById('recall-timesheet-btn');
        
        if (this.currentTimesheet.status === 'draft') {
            submitBtn.style.display = 'inline-block';
            recallBtn.style.display = 'none';
        } else if (this.currentTimesheet.status === 'submitted') {
            submitBtn.style.display = 'none';
            recallBtn.style.display = 'inline-block';
        } else {
            submitBtn.style.display = 'none';
            recallBtn.style.display = 'none';
        }
    }

    async submitTimesheet() {
        if (!this.currentTimesheet) return;

        try {
            const response = await fetch(`/api/timesheets/${this.currentTimesheet.id}/submit`, {
                method: 'POST'
            });

            if (response.ok) {
                this.currentTimesheet.status = 'submitted';
                this.updateTimesheetInList();
                this.updateModalButtons();
                this.updateStats();
                this.showAlert('Timesheet submitted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to submit timesheet', 'danger');
            }
        } catch (error) {
            console.error('Error submitting timesheet:', error);
            this.showAlert('Error submitting timesheet', 'danger');
        }
    }

    async recallTimesheet() {
        if (!this.currentTimesheet) return;

        try {
            const response = await fetch(`/api/timesheets/${this.currentTimesheet.id}/recall`, {
                method: 'POST'
            });

            if (response.ok) {
                this.currentTimesheet.status = 'draft';
                this.updateTimesheetInList();
                this.updateModalButtons();
                this.updateStats();
                this.showAlert('Timesheet recalled successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to recall timesheet', 'danger');
            }
        } catch (error) {
            console.error('Error recalling timesheet:', error);
            this.showAlert('Error recalling timesheet', 'danger');
        }
    }

    updateTimesheetInList() {
        const index = this.timesheets.findIndex(t => t.id === this.currentTimesheet.id);
        if (index !== -1) {
            this.timesheets[index] = { ...this.currentTimesheet };
            this.filterTimesheets();
        }
    }

    async deleteTimesheet(timesheetId) {
        if (!confirm('Are you sure you want to delete this timesheet? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/timesheets/${timesheetId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.timesheets = this.timesheets.filter(t => t.id !== timesheetId);
                this.filterTimesheets();
                this.updateStats();
                this.showAlert('Timesheet deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to delete timesheet', 'danger');
            }
        } catch (error) {
            console.error('Error deleting timesheet:', error);
            this.showAlert('Error deleting timesheet', 'danger');
        }
    }

    filterTimesheets() {
        const statusFilter = document.getElementById('status-filter').value;
        const periodFilter = document.getElementById('period-filter').value;

        this.filteredTimesheets = this.timesheets.filter(timesheet => {
            const matchesStatus = !statusFilter || timesheet.status === statusFilter;
            
            let matchesPeriod = true;
            if (periodFilter === 'current') {
                const now = new Date();
                const start = new Date(timesheet.period_start);
                const end = new Date(timesheet.period_end);
                matchesPeriod = now >= start && now <= end;
            } else if (periodFilter === 'last') {
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                const start = new Date(timesheet.period_start);
                matchesPeriod = start <= lastWeek;
            }
            
            return matchesStatus && matchesPeriod;
        });

        this.sortTimesheets();
    }

    sortTimesheets() {
        const sortBy = document.getElementById('sort-timesheets').value;
        
        this.filteredTimesheets.sort((a, b) => {
            switch (sortBy) {
                case 'period_start':
                    return new Date(b.period_start) - new Date(a.period_start);
                case 'status':
                    return a.status.localeCompare(b.status);
                case 'created_at':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        this.renderTimesheets();
    }

    renderTimesheets() {
        const container = document.getElementById('timesheets-container');
        
        if (this.filteredTimesheets.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No timesheets found</h5>
                    <p class="text-muted">Create your first timesheet to get started!</p>
                </div>
            `;
            return;
        }

        const timesheetsHTML = this.filteredTimesheets.map(timesheet => {
            const statusBadge = this.getStatusBadge(timesheet.status);
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <h5 class="card-title mb-0">
                                        ${this.formatDate(timesheet.period_start)} - ${this.formatDate(timesheet.period_end)}
                                    </h5>
                                    ${statusBadge}
                                </div>
                                ${timesheet.notes ? `<p class="card-text text-muted">${timesheet.notes}</p>` : ''}
                                <small class="text-muted">
                                    <i class="fas fa-plus me-1"></i>Created ${this.formatDate(timesheet.created_at)}
                                </small>
                            </div>
                            <div class="col-md-4 text-md-end">
                                <div class="timesheet-stats mb-2">
                                    <div class="stat-item">
                                        <span class="stat-value" id="timesheet-hours-${timesheet.id}">-</span>
                                        <span class="stat-label">Total Hours</span>
                                    </div>
                                </div>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="timesheetManager.viewTimesheet('${timesheet.id}')">
                                        <i class="fas fa-eye"></i>
                                    </button>
                                    ${timesheet.status === 'draft' ? `
                                        <button class="btn btn-sm btn-outline-danger" onclick="timesheetManager.deleteTimesheet('${timesheet.id}')">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = timesheetsHTML;
        
        // Load hours for each timesheet
        this.loadTimesheetHours();
    }

    async loadTimesheetHours() {
        for (const timesheet of this.filteredTimesheets) {
            try {
                const response = await fetch(`/api/timesheets/${timesheet.id}/entries`);
                if (response.ok) {
                    const entries = await response.json();
                    const totalHours = entries.reduce((sum, entry) => sum + entry.duration_hours, 0);
                    const element = document.getElementById(`timesheet-hours-${timesheet.id}`);
                    if (element) {
                        element.textContent = this.formatDuration(totalHours);
                    }
                }
            } catch (error) {
                console.error(`Error loading hours for timesheet ${timesheet.id}:`, error);
            }
        }
    }

    updateStats() {
        const totalTimesheets = this.timesheets.length;
        const submittedTimesheets = this.timesheets.filter(t => t.status === 'submitted' || t.status === 'approved').length;
        const draftTimesheets = this.timesheets.filter(t => t.status === 'draft').length;
        
        document.getElementById('total-timesheets').textContent = totalTimesheets;
        document.getElementById('submitted-timesheets').textContent = submittedTimesheets;
        document.getElementById('draft-timesheets').textContent = draftTimesheets;
        
        // Calculate current period hours
        this.calculateCurrentPeriodHours();
    }

    async calculateCurrentPeriodHours() {
        try {
            const now = new Date();
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - now.getDay()); // Start of current week
            
            const response = await fetch(`/api/reports/weekly-summary?user_id=default_user&week_start=${weekStart.toISOString().split('T')[0]}`);
            if (response.ok) {
                const data = await response.json();
                document.getElementById('this-period-hours').textContent = this.formatDuration(data.total_hours || 0);
            }
        } catch (error) {
            console.error('Error calculating current period hours:', error);
        }
    }

    getStatusBadge(status) {
        const badges = {
            'draft': '<span class="badge bg-warning ms-2">Draft</span>',
            'submitted': '<span class="badge bg-info ms-2">Submitted</span>',
            'approved': '<span class="badge bg-success ms-2">Approved</span>',
            'rejected': '<span class="badge bg-danger ms-2">Rejected</span>'
        };
        return badges[status] || '';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatDuration(hours) {
        if (!hours || hours === 0) return '0h';
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    }

    showAlert(message, type = 'info') {
        const alertContainer = document.querySelector('.container');
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show mt-3`;
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        alertContainer.insertBefore(alert, alertContainer.firstChild);
        
        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
    }
}

// Initialize timesheet manager when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.timesheetManager = new TimesheetManager();
});