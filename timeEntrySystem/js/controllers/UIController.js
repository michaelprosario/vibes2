class UIController {
    constructor(timesheetManager, timeEntryManager, exportService) {
        this.timesheetManager = timesheetManager;
        this.timeEntryManager = timeEntryManager;
        this.exportService = exportService;
        this.isEditMode = false;
        this.editingEntryId = null;
        
        this.initializeEventListeners();
        this.loadTimesheets();
        this.setCurrentDate();
    }

    initializeEventListeners() {
        this.setupTimesheetEventListeners();
        this.setupTimeEntryEventListeners();
        this.setupExportEventListeners();
        this.setupServiceEventListeners();
    }

    setupTimesheetEventListeners() {
        const createTimesheetBtn = document.getElementById('createTimesheetBtn');
        const deleteTimesheetBtn = document.getElementById('deleteTimesheetBtn');
        const timesheetSelect = document.getElementById('timesheetSelect');
        const timesheetNameInput = document.getElementById('timesheetName');

        createTimesheetBtn.addEventListener('click', () => this.handleCreateTimesheet());
        deleteTimesheetBtn.addEventListener('click', () => this.handleDeleteTimesheet());
        timesheetSelect.addEventListener('change', (e) => this.handleTimesheetSelection(e));
        
        timesheetNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleCreateTimesheet();
            }
        });
    }

    setupTimeEntryEventListeners() {
        const timeEntryForm = document.getElementById('timeEntryForm');
        const cancelEditBtn = document.getElementById('cancelEditBtn');

        timeEntryForm.addEventListener('submit', (e) => this.handleTimeEntrySubmit(e));
        cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    }

    setupExportEventListeners() {
        const exportJsonBtn = document.getElementById('exportJsonBtn');
        const exportCsvBtn = document.getElementById('exportCsvBtn');

        exportJsonBtn.addEventListener('click', () => this.handleExportJSON());
        exportCsvBtn.addEventListener('click', () => this.handleExportCSV());
    }

    setupServiceEventListeners() {
        this.timesheetManager.on('timesheetCreated', (timesheet) => {
            this.showSuccess(`Timesheet "${timesheet.name}" created successfully`);
            this.loadTimesheets();
            this.selectTimesheet(timesheet.id);
        });

        this.timesheetManager.on('timesheetDeleted', (timesheet) => {
            this.showSuccess(`Timesheet "${timesheet.name}" deleted successfully`);
            this.loadTimesheets();
            this.clearTimesheetSelection();
        });

        this.timeEntryManager.on('entryCreated', (entry) => {
            this.showSuccess('Time entry added successfully');
            this.renderTimeEntries();
            this.updateTimesheetHeader();
            this.updateTimesheetDropdown();
            this.clearTimeEntryForm();
        });

        this.timeEntryManager.on('entryUpdated', (entry) => {
            this.showSuccess('Time entry updated successfully');
            this.renderTimeEntries();
            this.updateTimesheetHeader();
            this.updateTimesheetDropdown();
            this.cancelEdit();
        });

        this.timeEntryManager.on('entryDeleted', (entry) => {
            this.showSuccess('Time entry deleted successfully');
            this.renderTimeEntries();
            this.updateTimesheetHeader();
            this.updateTimesheetDropdown();
        });

        this.timeEntryManager.on('error', (error) => {
            this.showError(error.message);
        });

        this.timesheetManager.on('error', (error) => {
            this.showError(error.message);
        });

        this.exportService.on('exportCompleted', (data) => {
            this.showSuccess(`Export completed: ${data.filename}`);
        });

        this.exportService.on('exportError', (error) => {
            this.showError(`Export failed: ${error.message}`);
        });
    }

    async handleCreateTimesheet() {
        const nameInput = document.getElementById('timesheetName');
        const name = nameInput.value.trim();

        if (!name) {
            this.showError('Please enter a timesheet name');
            return;
        }

        try {
            await this.timesheetManager.createTimesheet(name);
            nameInput.value = '';
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleDeleteTimesheet() {
        const timesheetSelect = document.getElementById('timesheetSelect');
        const timesheetId = timesheetSelect.value;

        if (!timesheetId) {
            this.showError('Please select a timesheet to delete');
            return;
        }

        if (!confirm('Are you sure you want to delete this timesheet? This action cannot be undone.')) {
            return;
        }

        try {
            await this.timesheetManager.deleteTimesheet(timesheetId);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleTimesheetSelection(event) {
        const timesheetId = event.target.value;
        
        if (!timesheetId) {
            this.clearTimesheetSelection();
            return;
        }

        try {
            const timesheet = await this.timesheetManager.getTimesheet(timesheetId);
            if (timesheet) {
                this.timeEntryManager.setCurrentTimesheet(timesheet);
                this.updateUIForSelectedTimesheet(timesheet);
                this.renderTimeEntries();
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleTimeEntrySubmit(event) {
        event.preventDefault();
        
        const formData = this.getTimeEntryFormData();
        if (!formData) return;

        try {
            if (this.isEditMode) {
                await this.timeEntryManager.updateTimeEntry(
                    this.editingEntryId,
                    formData.projectName,
                    formData.startTime,
                    formData.endTime,
                    formData.date,
                    formData.notes
                );
            } else {
                await this.timeEntryManager.createTimeEntry(
                    formData.projectName,
                    formData.startTime,
                    formData.endTime,
                    formData.date,
                    formData.notes
                );
            }
        } catch (error) {
            this.showError(error.message);
        }
    }

    getTimeEntryFormData() {
        const projectName = document.getElementById('projectName').value.trim();
        const startTime = document.getElementById('startTime').value;
        const endTime = document.getElementById('endTime').value;
        const date = document.getElementById('entryDate').value;
        const notes = document.getElementById('notes').value.trim();

        if (!projectName || !startTime || !endTime || !date) {
            this.showError('Please fill in all required fields');
            return null;
        }

        return { projectName, startTime, endTime, date, notes };
    }

    async handleExportJSON() {
        const currentTimesheet = this.timeEntryManager.getCurrentTimesheet();
        if (!currentTimesheet) {
            this.showError('Please select a timesheet to export');
            return;
        }

        try {
            this.exportService.exportTimesheetAsJSON(currentTimesheet);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async handleExportCSV() {
        const currentTimesheet = this.timeEntryManager.getCurrentTimesheet();
        if (!currentTimesheet) {
            this.showError('Please select a timesheet to export');
            return;
        }

        try {
            this.exportService.exportTimesheetAsCSV(currentTimesheet);
        } catch (error) {
            this.showError(error.message);
        }
    }

    async loadTimesheets() {
        try {
            const timesheets = await this.timesheetManager.getAllTimesheets();
            this.renderTimesheetOptions(timesheets);
        } catch (error) {
            this.showError('Failed to load timesheets: ' + error.message);
        }
    }

    renderTimesheetOptions(timesheets) {
        const timesheetSelect = document.getElementById('timesheetSelect');
        timesheetSelect.innerHTML = '<option value="">Select a timesheet...</option>';

        timesheets.forEach(timesheet => {
            const option = document.createElement('option');
            option.value = timesheet.id;
            option.textContent = `${timesheet.name} (${timesheet.getEntryCount()} entries)`;
            timesheetSelect.appendChild(option);
        });
    }

    selectTimesheet(timesheetId) {
        const timesheetSelect = document.getElementById('timesheetSelect');
        timesheetSelect.value = timesheetId;
        timesheetSelect.dispatchEvent(new Event('change'));
    }

    updateUIForSelectedTimesheet(timesheet) {
        document.getElementById('deleteTimesheetBtn').disabled = false;
        document.getElementById('exportJsonBtn').disabled = false;
        document.getElementById('exportCsvBtn').disabled = false;
        document.getElementById('addEntryBtn').disabled = false;
        
        const cardHeader = document.querySelector('#timeEntriesContainer').closest('.card').querySelector('.card-header');
        cardHeader.innerHTML = `
            <h3>Time Entries - ${timesheet.name}</h3>
            <small class="text-muted">
                ${timesheet.getEntryCount()} entries | 
                Total: ${timesheet.getFormattedTotalHours()}
            </small>
        `;
    }

    updateTimesheetHeader() {
        const currentTimesheet = this.timeEntryManager.getCurrentTimesheet();
        if (currentTimesheet) {
            const cardHeader = document.querySelector('#timeEntriesContainer').closest('.card').querySelector('.card-header');
            cardHeader.innerHTML = `
                <h3>Time Entries - ${currentTimesheet.name}</h3>
                <small class="text-muted">
                    ${currentTimesheet.getEntryCount()} entries | 
                    Total: ${currentTimesheet.getFormattedTotalHours()}
                </small>
            `;
        }
    }

    async updateTimesheetDropdown() {
        const currentTimesheet = this.timeEntryManager.getCurrentTimesheet();
        const currentTimesheetId = currentTimesheet ? currentTimesheet.id : null;
        
        try {
            const timesheets = await this.timesheetManager.getAllTimesheets();
            this.renderTimesheetOptions(timesheets);
            
            if (currentTimesheetId) {
                const timesheetSelect = document.getElementById('timesheetSelect');
                timesheetSelect.value = currentTimesheetId;
            }
        } catch (error) {
            console.error('Failed to update timesheet dropdown:', error);
        }
    }

    clearTimesheetSelection() {
        document.getElementById('deleteTimesheetBtn').disabled = true;
        document.getElementById('exportJsonBtn').disabled = true;
        document.getElementById('exportCsvBtn').disabled = true;
        document.getElementById('addEntryBtn').disabled = true;
        
        this.timeEntryManager.setCurrentTimesheet(null);
        this.renderTimeEntries();
        
        const cardHeader = document.querySelector('#timeEntriesContainer').closest('.card').querySelector('.card-header');
        cardHeader.innerHTML = `
            <h3>Time Entries</h3>
            <small class="text-muted">Select a timesheet to view entries</small>
        `;
    }

    renderTimeEntries() {
        const container = document.getElementById('timeEntriesContainer');
        const entries = this.timeEntryManager.getAllTimeEntries();

        if (entries.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted">
                    <i class="fas fa-clock fa-3x mb-3"></i>
                    <p>No time entries found</p>
                </div>
            `;
            return;
        }

        const entriesHTML = entries.map(entry => this.renderTimeEntryCard(entry)).join('');
        container.innerHTML = entriesHTML;
    }

    renderTimeEntryCard(entry) {
        return `
            <div class="card mb-3">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-3">
                            <h5 class="card-title mb-1">${this.escapeHtml(entry.projectName)}</h5>
                            <small class="text-muted">${entry.getFormattedDate()}</small>
                        </div>
                        <div class="col-md-3">
                            <p class="mb-0">
                                <i class="fas fa-clock"></i> ${entry.getFormattedTime()}
                            </p>
                            <small class="text-muted">Duration: ${entry.getFormattedDuration()}</small>
                        </div>
                        <div class="col-md-4">
                            <p class="mb-0">${this.escapeHtml(entry.notes || 'No notes')}</p>
                        </div>
                        <div class="col-md-2 text-end">
                            <button class="btn btn-sm btn-outline-primary me-2" onclick="uiController.editTimeEntry('${entry.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="uiController.deleteTimeEntry('${entry.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async editTimeEntry(entryId) {
        const entry = this.timeEntryManager.getTimeEntry(entryId);
        if (!entry) {
            this.showError('Time entry not found');
            return;
        }

        document.getElementById('projectName').value = entry.projectName;
        document.getElementById('startTime').value = entry.startTime;
        document.getElementById('endTime').value = entry.endTime;
        document.getElementById('entryDate').value = entry.date;
        document.getElementById('notes').value = entry.notes;

        this.isEditMode = true;
        this.editingEntryId = entryId;
        
        document.getElementById('addEntryBtn').innerHTML = '<i class="fas fa-save"></i> Update Entry';
        document.getElementById('cancelEditBtn').style.display = 'inline-block';
        
        document.getElementById('projectName').focus();
    }

    async deleteTimeEntry(entryId) {
        if (!confirm('Are you sure you want to delete this time entry?')) {
            return;
        }

        try {
            await this.timeEntryManager.deleteTimeEntry(entryId);
        } catch (error) {
            this.showError(error.message);
        }
    }

    cancelEdit() {
        this.isEditMode = false;
        this.editingEntryId = null;
        
        document.getElementById('addEntryBtn').innerHTML = '<i class="fas fa-plus"></i> Add Entry';
        document.getElementById('cancelEditBtn').style.display = 'none';
        
        this.clearTimeEntryForm();
    }

    clearTimeEntryForm() {
        document.getElementById('timeEntryForm').reset();
        this.setCurrentDate();
    }

    setCurrentDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('entryDate').value = today;
    }

    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    showError(message) {
        this.showAlert(message, 'danger');
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
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}