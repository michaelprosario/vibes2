class ExportService {
    constructor(timesheetManager, timeEntryManager) {
        this.timesheetManager = timesheetManager;
        this.timeEntryManager = timeEntryManager;
    }

    async exportTimesheetToJSON(timesheetId, filters = {}) {
        try {
            const timesheet = await this.timesheetManager.getTimesheetWithStats(timesheetId);
            const entries = await this.timeEntryManager.getFilteredEntries(timesheetId, filters);
            const totalHours = await this.timeEntryManager.getTotalHours(timesheetId, filters);
            const projectSummary = await this.timeEntryManager.getProjectSummary(timesheetId, filters);
            const dailySummary = await this.timeEntryManager.getDailySummary(timesheetId, filters);

            const exportData = {
                exportDate: new Date().toISOString(),
                timesheet: timesheet ? timesheet.toJSON() : null,
                filters: filters,
                summary: {
                    totalEntries: entries.length,
                    totalHours: totalHours,
                    projectSummary: projectSummary,
                    dailySummary: dailySummary
                },
                entries: entries.map(entry => entry.toJSON())
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = this.formatFilename(`${timesheet.name}_timesheet.json`, filters);
            this.downloadFile(jsonString, filename, 'application/json');
        } catch (error) {
            console.error('Error exporting timesheet to JSON:', error);
            throw error;
        }
    }

    async exportTimesheetToCSV(timesheetId, filters = {}) {
        try {
            const timesheet = await this.timesheetManager.getTimesheetWithStats(timesheetId);
            const entries = await this.timeEntryManager.getFilteredEntries(timesheetId, filters);
            
            const csvHeaders = [
                'Project Name',
                'Start Time',
                'End Time',
                'Date',
                'Hours',
                'Notes',
                'Tags',
                'Created At',
                'Updated At'
            ];

            const csvRows = entries.map(entry => [
                entry.project,
                entry.getFormattedStartDateTime(),
                entry.getFormattedEndDateTime(),
                entry.getFormattedDate(),
                entry.duration.toFixed(2),
                `"${entry.notes.replace(/"/g, '""')}"`,
                entry.tags.join(';'),
                entry.createdAt.toISOString(),
                entry.updatedAt.toISOString()
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.join(','))
                .join('\n');

            const filename = this.formatFilename(`${timesheet.name}_timesheet.csv`, filters);
            this.downloadFile(csvContent, filename, 'text/csv');
        } catch (error) {
            console.error('Error exporting timesheet to CSV:', error);
            throw error;
        }
    }

    async exportProjectSummaryToCSV(timesheetId, filters = {}) {
        try {
            const timesheet = await this.timesheetManager.getTimesheetWithStats(timesheetId);
            const projectSummary = await this.timeEntryManager.getProjectSummary(timesheetId, filters);
            
            const csvHeaders = ['Project', 'Total Hours', 'Entry Count'];
            const csvRows = Object.entries(projectSummary).map(([project, data]) => [
                project,
                data.totalHours.toFixed(2),
                data.entryCount
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.join(','))
                .join('\n');

            const filename = this.formatFilename(`${timesheet.name}_project_summary.csv`, filters);
            this.downloadFile(csvContent, filename, 'text/csv');
        } catch (error) {
            console.error('Error exporting project summary to CSV:', error);
            throw error;
        }
    }

    async exportDailySummaryToCSV(timesheetId, filters = {}) {
        try {
            const timesheet = await this.timesheetManager.getTimesheetWithStats(timesheetId);
            const dailySummary = await this.timeEntryManager.getDailySummary(timesheetId, filters);
            
            const csvHeaders = ['Date', 'Total Hours', 'Entry Count', 'Projects'];
            const csvRows = Object.entries(dailySummary).map(([date, data]) => [
                date,
                data.totalHours.toFixed(2),
                data.entryCount,
                data.projects.join(';')
            ]);

            const csvContent = [csvHeaders, ...csvRows]
                .map(row => row.join(','))
                .join('\n');

            const filename = this.formatFilename(`${timesheet.name}_daily_summary.csv`, filters);
            this.downloadFile(csvContent, filename, 'text/csv');
        } catch (error) {
            console.error('Error exporting daily summary to CSV:', error);
            throw error;
        }
    }

    async exportAllTimesheetsToJSON() {
        try {
            const timesheets = await this.timesheetManager.getAllTimesheetsWithStats();
            const exportData = {
                exportDate: new Date().toISOString(),
                timesheets: timesheets.map(timesheet => timesheet.toJSON()),
                totalTimesheets: timesheets.length
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = `all_timesheets_${new Date().toISOString().split('T')[0]}.json`;
            this.downloadFile(jsonString, filename, 'application/json');
        } catch (error) {
            console.error('Error exporting all timesheets to JSON:', error);
            throw error;
        }
    }

    downloadFile(content, filename, contentType) {
        const blob = new Blob([content], { type: contentType });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
    }

    formatFilename(baseFilename, filters) {
        let filename = baseFilename;
        const extension = filename.split('.').pop();
        const baseName = filename.replace(`.${extension}`, '');
        
        baseName.replace(/[^a-zA-Z0-9_-]/g, '_');
        
        let suffix = '';
        if (filters.startDate || filters.endDate) {
            suffix += '_filtered';
            if (filters.startDate) {
                suffix += `_from_${filters.startDate}`;
            }
            if (filters.endDate) {
                suffix += `_to_${filters.endDate}`;
            }
        }
        
        if (filters.project) {
            suffix += `_project_${filters.project.replace(/[^a-zA-Z0-9]/g, '_')}`;
        }
        
        const timestamp = new Date().toISOString().split('T')[0];
        return `${baseName}${suffix}_${timestamp}.${extension}`;
    }
}