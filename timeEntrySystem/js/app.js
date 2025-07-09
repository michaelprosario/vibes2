class TimeEntryApp {
    constructor() {
        this.databaseService = null;
        this.timesheetManager = null;
        this.timeEntryManager = null;
        this.exportService = null;
        this.uiController = null;
        this.initialized = false;
    }

    async initialize() {
        try {
            await this.setupServices();
            await this.setupDatabase();
            this.setupUIController();
            this.setupGlobalErrorHandling();
            this.initialized = true;
            
            console.log('Time Entry System initialized successfully');
        } catch (error) {
            console.error('Failed to initialize Time Entry System:', error);
            this.showInitializationError(error);
        }
    }

    async setupServices() {
        this.databaseService = new DatabaseService();
        this.timesheetManager = new TimesheetManager(this.databaseService);
        this.timeEntryManager = new TimeEntryManager(this.databaseService);
        this.exportService = new ExportService();
    }

    async setupDatabase() {
        try {
            await this.databaseService.initialize();
            console.log('Database initialized successfully');
        } catch (error) {
            console.error('Database initialization failed:', error);
            throw new Error('Failed to initialize database. Please check if IndexedDB is supported in your browser.');
        }
    }

    setupUIController() {
        this.uiController = new UIController(
            this.timesheetManager,
            this.timeEntryManager,
            this.exportService
        );
        
        window.uiController = this.uiController;
    }

    setupGlobalErrorHandling() {
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            this.handleGlobalError(event.error);
        });

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            this.handleGlobalError(event.reason);
        });
    }

    handleGlobalError(error) {
        if (this.uiController) {
            this.uiController.showError(`System error: ${error.message}`);
        } else {
            alert(`System error: ${error.message}`);
        }
    }

    showInitializationError(error) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'alert alert-danger';
        errorDiv.innerHTML = `
            <h4>Failed to Initialize Time Entry System</h4>
            <p>${error.message}</p>
            <p>Please refresh the page to try again.</p>
            <button onclick="location.reload()" class="btn btn-primary">Refresh Page</button>
        `;

        const container = document.querySelector('.container');
        if (container) {
            container.innerHTML = '';
            container.appendChild(errorDiv);
        }
    }

    async restart() {
        if (this.databaseService) {
            this.databaseService.close();
        }
        
        this.databaseService = null;
        this.timesheetManager = null;
        this.timeEntryManager = null;
        this.exportService = null;
        this.uiController = null;
        this.initialized = false;
        
        await this.initialize();
    }

    isInitialized() {
        return this.initialized;
    }

    getServices() {
        return {
            databaseService: this.databaseService,
            timesheetManager: this.timesheetManager,
            timeEntryManager: this.timeEntryManager,
            exportService: this.exportService,
            uiController: this.uiController
        };
    }

    async getSystemInfo() {
        try {
            const stats = await this.timesheetManager.getStatistics();
            return {
                initialized: this.initialized,
                databaseInitialized: this.databaseService ? this.databaseService.isInitialized() : false,
                statistics: stats,
                version: '1.0.0'
            };
        } catch (error) {
            console.error('Failed to get system info:', error);
            return {
                initialized: this.initialized,
                databaseInitialized: false,
                error: error.message
            };
        }
    }

    async backup() {
        try {
            if (!this.timesheetManager) {
                throw new Error('System not initialized');
            }
            
            const backupData = await this.timesheetManager.exportAllTimesheets();
            const backupString = JSON.stringify(backupData, null, 2);
            
            const blob = new Blob([backupString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `timesheet_backup_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            return { success: true, message: 'Backup completed successfully' };
        } catch (error) {
            console.error('Backup failed:', error);
            return { success: false, error: error.message };
        }
    }

    async restore(backupData) {
        try {
            if (!this.timesheetManager) {
                throw new Error('System not initialized');
            }
            
            const results = await this.timesheetManager.importTimesheets(backupData);
            
            if (this.uiController) {
                this.uiController.loadTimesheets();
            }
            
            return {
                success: true,
                imported: results.successful.length,
                failed: results.failed.length,
                results: results
            };
        } catch (error) {
            console.error('Restore failed:', error);
            return { success: false, error: error.message };
        }
    }

    async clearAllData() {
        try {
            if (!this.timesheetManager) {
                throw new Error('System not initialized');
            }
            
            if (!confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
                return { success: false, message: 'Operation cancelled' };
            }
            
            await this.timesheetManager.clearAllTimesheets();
            
            if (this.uiController) {
                this.uiController.loadTimesheets();
                this.uiController.clearTimesheetSelection();
            }
            
            return { success: true, message: 'All data cleared successfully' };
        } catch (error) {
            console.error('Clear data failed:', error);
            return { success: false, error: error.message };
        }
    }
}

let timeEntryApp;

document.addEventListener('DOMContentLoaded', async () => {
    timeEntryApp = new TimeEntryApp();
    await timeEntryApp.initialize();
});

window.timeEntryApp = timeEntryApp;