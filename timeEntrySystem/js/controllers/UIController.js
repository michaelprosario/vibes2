class UIController {
    constructor(timesheetManager, timeEntryManager, exportService) {
        this.timesheetManager = timesheetManager;
        this.timeEntryManager = timeEntryManager;
        this.exportService = exportService;
        this.currentTimesheetId = null;
        this.currentEditId = null;
        this.currentEditType = null;
        this.currentFilters = {};
        this.initializeEventListeners();
    }

    initializeEventListeners() {
        const timesheetForm = document.getElementById('timesheetForm');
        const saveTimesheetBtn = document.getElementById('saveTimesheetBtn');
        const timeEntryForm = document.getElementById('timeEntryForm');
        const startTimeInput = document.getElementById('startTime');
        const endTimeInput = document.getElementById('endTime');
        const exportJsonBtn = document.getElementById('exportJson');
        const exportCsvBtn = document.getElementById('exportCsv');
        const applyFiltersBtn = document.getElementById('applyFilters');
        const clearFiltersBtn = document.getElementById('clearFilters');
        const cancelEditBtn = document.getElementById('cancelEdit');

        saveTimesheetBtn.addEventListener('click', this.handleTimesheetSave.bind(this));
        timeEntryForm.addEventListener('submit', this.handleTimeEntrySubmit.bind(this));
        startTimeInput.addEventListener('change', this.calculateHours.bind(this));
        endTimeInput.addEventListener('change', this.calculateHours.bind(this));
        exportJsonBtn.addEventListener('click', this.handleExportJson.bind(this));
        exportCsvBtn.addEventListener('click', this.handleExportCsv.bind(this));
        applyFiltersBtn.addEventListener('click', this.handleApplyFilters.bind(this));
        clearFiltersBtn.addEventListener('click', this.handleClearFilters.bind(this));
        cancelEditBtn.addEventListener('click', this.handleCancelEdit.bind(this));
    }

    async handleTimesheetSave() {
        const name = document.getElementById('timesheetName').value;
        const description = document.getElementById('timesheetDescription').value;

        try {
            if (this.currentEditType === 'timesheet') {
                await this.timesheetManager.updateTimesheet(this.currentEditId, name, description);
                this.showAlert('Timesheet updated successfully!', 'success');
                this.cancelEdit();
            } else {
                await this.timesheetManager.createTimesheet(name, description);
                this.showAlert('Timesheet created successfully!', 'success');
            }
            
            this.clearTimesheetForm();
            await this.refreshTimesheets();
            
            const modal = bootstrap.Modal.getInstance(document.getElementById('timesheetModal'));
            modal.hide();
        } catch (error) {
            this.showAlert(`Error: ${error.message}`, 'danger');
        }
    }

    async handleTimeEntrySubmit(event) {
        event.preventDefault();
        
        if (!this.currentTimesheetId) {
            this.showAlert('Please select a timesheet first', 'warning');
            return;
        }

        const project = document.getElementById('project').value;
        const date = document.getElementById('date').value;
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const notes = document.getElementById('notes').value;
        const tags = document.getElementById('tags').value;

        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(`${date}T${endTime}`);

        try {
            if (this.currentEditType === 'timeEntry') {
                await this.timeEntryManager.updateEntry(
                    this.currentEditId, project, startDateTime, endDateTime, date, notes, tags
                );
                this.showAlert('Time entry updated successfully!', 'success');
                this.cancelEdit();
            } else {
                await this.timeEntryManager.addEntry(
                    this.currentTimesheetId, project, startDateTime, endDateTime, date, notes, tags
                );
                this.showAlert('Time entry added successfully!', 'success');
            }
            
            this.clearTimeEntryForm();
            await this.refreshTimeEntries();
            await this.refreshTimesheets();
        } catch (error) {
            this.showAlert(`Error: ${error.message}`, 'danger');
        }
    }

    calculateHours() {
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const calculatedHours = document.getElementById('calculatedHours');

        if (startTime && endTime) {
            const start = new Date(`2000-01-01T${startTime}`);
            const end = new Date(`2000-01-01T${endTime}`);
            const hours = (end - start) / (1000 * 60 * 60);
            
            if (hours > 0) {
                calculatedHours.value = `${hours.toFixed(2)} hours`;
            } else {
                calculatedHours.value = 'Invalid time range';
            }
        } else {
            calculatedHours.value = '';
        }
    }

    async handleExportJson() {
        if (!this.currentTimesheetId) {
            this.showAlert('Please select a timesheet first', 'warning');
            return;
        }

        try {
            await this.exportService.exportTimesheetToJSON(this.currentTimesheetId, this.currentFilters);
            this.showAlert('JSON export completed!', 'success');
        } catch (error) {
            this.showAlert(`Export failed: ${error.message}`, 'danger');
        }
    }

    async handleExportCsv() {
        if (!this.currentTimesheetId) {
            this.showAlert('Please select a timesheet first', 'warning');
            return;
        }

        try {
            await this.exportService.exportTimesheetToCSV(this.currentTimesheetId, this.currentFilters);
            this.showAlert('CSV export completed!', 'success');
        } catch (error) {
            this.showAlert(`Export failed: ${error.message}`, 'danger');
        }
    }

    async handleApplyFilters() {
        const startDate = document.getElementById('filterStartDate').value;
        const endDate = document.getElementById('filterEndDate').value;
        const project = document.getElementById('filterProject').value;

        this.currentFilters = {};
        if (startDate) this.currentFilters.startDate = startDate;
        if (endDate) this.currentFilters.endDate = endDate;
        if (project) this.currentFilters.project = project;

        await this.refreshTimeEntries();
    }

    async handleClearFilters() {
        this.currentFilters = {};
        document.getElementById('filterStartDate').value = '';
        document.getElementById('filterEndDate').value = '';
        document.getElementById('filterProject').value = '';
        await this.refreshTimeEntries();
    }

    handleCancelEdit() {
        this.cancelEdit();
    }

    async selectTimesheet(id) {
        this.currentTimesheetId = id;
        await this.refreshCurrentTimesheetInfo();
        await this.refreshTimeEntries();
        this.showTimeEntryInterface();
    }

    async editTimesheet(id) {
        try {
            const timesheet = await this.timesheetManager.getTimesheet(id);
            if (!timesheet) {
                this.showAlert('Timesheet not found', 'danger');
                return;
            }

            this.currentEditId = id;
            this.currentEditType = 'timesheet';
            
            document.getElementById('timesheetName').value = timesheet.name;
            document.getElementById('timesheetDescription').value = timesheet.description;
            document.getElementById('timesheetModalTitle').textContent = 'Edit Timesheet';
            
            const modal = new bootstrap.Modal(document.getElementById('timesheetModal'));
            modal.show();
        } catch (error) {
            this.showAlert(`Error loading timesheet: ${error.message}`, 'danger');
        }
    }

    async deleteTimesheet(id) {
        if (!confirm('Are you sure you want to delete this timesheet? This will also delete all associated time entries.')) {
            return;
        }

        try {
            await this.timesheetManager.deleteTimesheet(id);
            this.showAlert('Timesheet deleted successfully!', 'success');
            
            if (this.currentTimesheetId === id) {
                this.currentTimesheetId = null;
                this.hideTimeEntryInterface();
            }
            
            await this.refreshTimesheets();
        } catch (error) {
            this.showAlert(`Error deleting timesheet: ${error.message}`, 'danger');
        }
    }

    async editTimeEntry(id) {
        try {
            const entry = await this.timeEntryManager.getEntry(id);
            if (!entry) {
                this.showAlert('Time entry not found', 'danger');
                return;
            }

            this.currentEditId = id;
            this.currentEditType = 'timeEntry';
            
            document.getElementById('project').value = entry.project;
            document.getElementById('date').value = entry.date;
            document.getElementById('startTime').value = entry.startTime.toTimeString().slice(0, 5);
            document.getElementById('endTime').value = entry.endTime.toTimeString().slice(0, 5);
            document.getElementById('notes').value = entry.notes;
            document.getElementById('tags').value = entry.tags.join(', ');
            
            this.calculateHours();
            
            document.querySelector('#timeEntryForm button[type="submit"]').textContent = 'Update Entry';
            document.getElementById('cancelEdit').style.display = 'inline-block';
            
            document.getElementById('timeEntryFormCard').scrollIntoView({ behavior: 'smooth' });
        } catch (error) {
            this.showAlert(`Error loading time entry: ${error.message}`, 'danger');
        }
    }

    async deleteTimeEntry(id) {
        if (!confirm('Are you sure you want to delete this time entry?')) {
            return;
        }

        try {
            await this.timeEntryManager.deleteEntry(id);
            this.showAlert('Time entry deleted successfully!', 'success');
            await this.refreshTimeEntries();
            await this.refreshTimesheets();
        } catch (error) {
            this.showAlert(`Error deleting time entry: ${error.message}`, 'danger');
        }
    }

    cancelEdit() {
        this.currentEditId = null;
        this.currentEditType = null;
        this.clearTimeEntryForm();
        this.clearTimesheetForm();
        document.querySelector('#timeEntryForm button[type="submit"]').textContent = 'Add Entry';
        document.getElementById('cancelEdit').style.display = 'none';
        document.getElementById('timesheetModalTitle').textContent = 'Create New Timesheet';
    }

    clearTimeEntryForm() {
        document.getElementById('timeEntryForm').reset();
        document.getElementById('calculatedHours').value = '';
    }

    clearTimesheetForm() {
        document.getElementById('timesheetForm').reset();
    }

    showTimeEntryInterface() {
        document.getElementById('timeEntryFormCard').style.display = 'block';
        document.getElementById('filterExportCard').style.display = 'block';
        document.getElementById('timeEntriesCard').style.display = 'block';
    }

    hideTimeEntryInterface() {
        document.getElementById('timeEntryFormCard').style.display = 'none';
        document.getElementById('filterExportCard').style.display = 'none';
        document.getElementById('timeEntriesCard').style.display = 'none';
        document.getElementById('currentTimesheetInfo').innerHTML = '<p class="text-muted">No timesheet selected</p>';
    }

    async refreshTimesheets() {
        try {
            const timesheets = await this.timesheetManager.getAllTimesheetsWithStats();
            this.renderTimesheets(timesheets);
        } catch (error) {
            this.showAlert(`Error loading timesheets: ${error.message}`, 'danger');
        }
    }

    async refreshCurrentTimesheetInfo() {
        if (!this.currentTimesheetId) return;

        try {
            const timesheet = await this.timesheetManager.getTimesheetWithStats(this.currentTimesheetId);
            if (timesheet) {
                document.getElementById('currentTimesheetInfo').innerHTML = `
                    <h6>${timesheet.name}</h6>
                    <p class="text-muted mb-1">${timesheet.description || 'No description'}</p>
                    <small class="text-muted">
                        <strong>Total:</strong> ${timesheet.getFormattedTotalHours()}<br>
                        <strong>Entries:</strong> ${timesheet.entryCount}
                    </small>
                `;
            }
        } catch (error) {
            console.error('Error refreshing current timesheet info:', error);
        }
    }

    async refreshTimeEntries() {
        if (!this.currentTimesheetId) return;

        try {
            const entries = await this.timeEntryManager.getFilteredEntries(this.currentTimesheetId, this.currentFilters);
            const totalHours = await this.timeEntryManager.getTotalHours(this.currentTimesheetId, this.currentFilters);
            
            this.renderTimeEntries(entries);
            this.updateTotalHours(totalHours);
        } catch (error) {
            this.showAlert(`Error loading time entries: ${error.message}`, 'danger');
        }
    }

    renderTimesheets(timesheets) {
        const container = document.getElementById('timesheetsList');
        
        if (timesheets.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-clipboard" style="font-size: 3rem;"></i>
                    <p class="mt-2">No timesheets yet. Create your first timesheet!</p>
                </div>
            `;
            return;
        }

        const timesheetsHTML = timesheets.map(timesheet => this.renderTimesheet(timesheet)).join('');
        container.innerHTML = timesheetsHTML;
    }

    renderTimesheet(timesheet) {
        const isSelected = this.currentTimesheetId === timesheet.id;
        const selectedClass = isSelected ? 'border-primary bg-light' : '';
        
        return `
            <div class="card mb-2 ${selectedClass}">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h6 class="card-title mb-1">${timesheet.name}</h6>
                            <p class="card-text text-muted mb-1">${timesheet.description || 'No description'}</p>
                            <small class="text-muted">Created: ${timesheet.getFormattedCreatedDate()}</small>
                        </div>
                        <div class="col-md-3">
                            <div class="text-center">
                                <div class="fw-bold">${timesheet.getFormattedTotalHours()}</div>
                                <small class="text-muted">${timesheet.entryCount} entries</small>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="btn-group w-100" role="group">
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="uiController.selectTimesheet('${timesheet.id}')">
                                    ${isSelected ? '<i class="bi bi-check-circle"></i> Selected' : '<i class="bi bi-circle"></i> Select'}
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-secondary" onclick="uiController.editTimesheet('${timesheet.id}')">
                                    <i class="bi bi-pencil"></i>
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="uiController.deleteTimesheet('${timesheet.id}')">
                                    <i class="bi bi-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTimeEntries(entries) {
        const container = document.getElementById('timeEntriesList');
        
        if (entries.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="bi bi-clock-history" style="font-size: 3rem;"></i>
                    <p class="mt-2">No time entries found.</p>
                </div>
            `;
            return;
        }

        const entriesHTML = entries.map(entry => this.renderTimeEntry(entry)).join('');
        container.innerHTML = entriesHTML;
    }

    renderTimeEntry(entry) {
        const tagsHTML = entry.tags.length > 0 
            ? entry.tags.map(tag => `<span class="badge bg-secondary me-1">${tag}</span>`).join('')
            : '<span class="text-muted">No tags</span>';

        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row">
                        <div class="col-md-8">
                            <h6 class="card-title">${entry.project}</h6>
                            <p class="card-text">${entry.notes}</p>
                            <div class="mb-2">${tagsHTML}</div>
                            <small class="text-muted">
                                <strong>Date:</strong> ${entry.getFormattedDate()} | 
                                <strong>Time:</strong> ${entry.getFormattedStartTime()} - ${entry.getFormattedEndTime()}
                            </small>
                        </div>
                        <div class="col-md-4 text-end">
                            <div class="mb-2">
                                <span class="badge bg-primary fs-6">${entry.getFormattedDuration()}</span>
                            </div>
                            <div class="btn-group" role="group">
                                <button type="button" class="btn btn-sm btn-outline-primary" onclick="uiController.editTimeEntry('${entry.id}')">
                                    <i class="bi bi-pencil"></i> Edit
                                </button>
                                <button type="button" class="btn btn-sm btn-outline-danger" onclick="uiController.deleteTimeEntry('${entry.id}')">
                                    <i class="bi bi-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    updateTotalHours(totalHours) {
        const totalElement = document.getElementById('totalHours');
        totalElement.textContent = `Total: ${totalHours.toFixed(2)} hours`;
    }

    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alertDiv, container.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }
}