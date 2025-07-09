class TimeEntryApp {
    constructor() {
        this.databaseService = new DatabaseService();
        this.timesheetManager = null;
        this.timeEntryManager = null;
        this.exportService = null;
        this.uiController = null;
    }

    async initialize() {
        try {
            await this.databaseService.initialize();
            
            this.timesheetManager = new TimesheetManager(this.databaseService);
            this.timeEntryManager = new TimeEntryManager(this.databaseService);
            this.exportService = new ExportService(this.timesheetManager, this.timeEntryManager);
            this.uiController = new UIController(this.timesheetManager, this.timeEntryManager, this.exportService);
            
            window.uiController = this.uiController;
            
            await this.uiController.refreshTimesheets();
            
            this.setDefaultDate();
            
            console.log('Time Entry System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Time Entry System:', error);
            this.showInitializationError(error);
        }
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    showInitializationError(error) {
        const container = document.querySelector('.container');
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <h4>Initialization Error</h4>
            <p>Failed to initialize the Time Entry System: ${error.message}</p>
            <p>Please refresh the page to try again.</p>
        `;
        container.insertBefore(errorDiv, container.firstChild);
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const app = new TimeEntryApp();
    await app.initialize();
});