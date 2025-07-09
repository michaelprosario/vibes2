class ExportService {
    constructor() {
        this.eventListeners = {};
    }

    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }

    off(event, callback) {
        if (this.eventListeners[event]) {
            this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        }
    }

    emit(event, data) {
        if (this.eventListeners[event]) {
            this.eventListeners[event].forEach(callback => callback(data));
        }
    }

    exportTimesheetAsJSON(timesheet) {
        try {
            if (!timesheet) {
                throw new Error('No timesheet provided for export');
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                exportType: 'timesheet',
                format: 'json',
                data: timesheet.toJSON()
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = this.generateFilename(timesheet.name, 'json');
            
            this.downloadFile(jsonString, filename, 'application/json');
            
            this.emit('exportCompleted', { 
                type: 'json', 
                timesheet: timesheet.name, 
                filename 
            });
            
            return { success: true, filename, data: exportData };
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    exportTimesheetAsCSV(timesheet) {
        try {
            if (!timesheet) {
                throw new Error('No timesheet provided for export');
            }

            const entries = timesheet.getAllEntries();
            const csvContent = this.convertToCSV(entries, timesheet);
            const filename = this.generateFilename(timesheet.name, 'csv');
            
            this.downloadFile(csvContent, filename, 'text/csv');
            
            this.emit('exportCompleted', { 
                type: 'csv', 
                timesheet: timesheet.name, 
                filename 
            });
            
            return { success: true, filename, data: csvContent };
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    convertToCSV(entries, timesheet) {
        const headers = [
            'Project Name',
            'Date',
            'Start Time',
            'End Time',
            'Hours',
            'Notes',
            'Entry ID',
            'Created At',
            'Updated At'
        ];

        const csvRows = [headers.join(',')];
        
        csvRows.push(`# Timesheet: ${timesheet.name}`);
        csvRows.push(`# Total Entries: ${entries.length}`);
        csvRows.push(`# Total Hours: ${timesheet.getFormattedTotalHours()}`);
        csvRows.push(`# Export Date: ${new Date().toISOString()}`);
        csvRows.push('');

        entries.forEach(entry => {
            const row = [
                this.escapeCSVField(entry.projectName),
                entry.date,
                entry.startTime,
                entry.endTime,
                entry.hours,
                this.escapeCSVField(entry.notes),
                entry.id,
                entry.createdAt,
                entry.updatedAt
            ];
            csvRows.push(row.join(','));
        });

        if (entries.length === 0) {
            csvRows.push('No entries found');
        }

        return csvRows.join('\n');
    }

    escapeCSVField(field) {
        if (field === null || field === undefined) {
            return '';
        }
        
        const stringField = String(field);
        
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        
        return stringField;
    }

    generateFilename(timesheetName, extension) {
        const sanitizedName = timesheetName.replace(/[^a-zA-Z0-9\s-_]/g, '');
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `${sanitizedName}_${timestamp}.${extension}`;
    }

    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
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

    exportMultipleTimesheetsAsJSON(timesheets) {
        try {
            if (!timesheets || timesheets.length === 0) {
                throw new Error('No timesheets provided for export');
            }

            const exportData = {
                exportDate: new Date().toISOString(),
                exportType: 'multiple_timesheets',
                format: 'json',
                count: timesheets.length,
                data: timesheets.map(timesheet => timesheet.toJSON())
            };

            const jsonString = JSON.stringify(exportData, null, 2);
            const filename = `timesheets_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
            
            this.downloadFile(jsonString, filename, 'application/json');
            
            this.emit('exportCompleted', { 
                type: 'json', 
                count: timesheets.length, 
                filename 
            });
            
            return { success: true, filename, data: exportData };
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    exportProjectSummaryAsCSV(timesheet) {
        try {
            if (!timesheet) {
                throw new Error('No timesheet provided for export');
            }

            const projectSummary = timesheet.getProjectSummary();
            const headers = ['Project Name', 'Total Hours', 'Formatted Hours'];
            
            const csvRows = [headers.join(',')];
            
            csvRows.push(`# Project Summary for: ${timesheet.name}`);
            csvRows.push(`# Total Projects: ${projectSummary.length}`);
            csvRows.push(`# Overall Total: ${timesheet.getFormattedTotalHours()}`);
            csvRows.push(`# Export Date: ${new Date().toISOString()}`);
            csvRows.push('');

            projectSummary.forEach(project => {
                const row = [
                    this.escapeCSVField(project.project),
                    project.hours,
                    project.formattedHours
                ];
                csvRows.push(row.join(','));
            });

            if (projectSummary.length === 0) {
                csvRows.push('No projects found');
            }

            const csvContent = csvRows.join('\n');
            const filename = this.generateFilename(`${timesheet.name}_project_summary`, 'csv');
            
            this.downloadFile(csvContent, filename, 'text/csv');
            
            this.emit('exportCompleted', { 
                type: 'csv', 
                subType: 'project_summary',
                timesheet: timesheet.name, 
                filename 
            });
            
            return { success: true, filename, data: csvContent };
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    exportFilteredEntriesAsCSV(entries, filterDescription, timesheetName) {
        try {
            if (!entries || entries.length === 0) {
                throw new Error('No entries provided for export');
            }

            const headers = [
                'Project Name',
                'Date',
                'Start Time',
                'End Time',
                'Hours',
                'Notes',
                'Entry ID'
            ];

            const csvRows = [headers.join(',')];
            
            csvRows.push(`# Filtered Entries from: ${timesheetName}`);
            csvRows.push(`# Filter: ${filterDescription}`);
            csvRows.push(`# Total Entries: ${entries.length}`);
            csvRows.push(`# Export Date: ${new Date().toISOString()}`);
            csvRows.push('');

            entries.forEach(entry => {
                const row = [
                    this.escapeCSVField(entry.projectName),
                    entry.date,
                    entry.startTime,
                    entry.endTime,
                    entry.hours,
                    this.escapeCSVField(entry.notes),
                    entry.id
                ];
                csvRows.push(row.join(','));
            });

            const csvContent = csvRows.join('\n');
            const filename = this.generateFilename(`${timesheetName}_filtered_entries`, 'csv');
            
            this.downloadFile(csvContent, filename, 'text/csv');
            
            this.emit('exportCompleted', { 
                type: 'csv', 
                subType: 'filtered_entries',
                timesheet: timesheetName, 
                filename 
            });
            
            return { success: true, filename, data: csvContent };
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    generateTimesheetReport(timesheet, includeProjectSummary = true) {
        try {
            if (!timesheet) {
                throw new Error('No timesheet provided for report');
            }

            const entries = timesheet.getAllEntries();
            const projectSummary = timesheet.getProjectSummary();
            const dateRange = timesheet.getDateRange();
            
            const report = {
                timesheet: {
                    name: timesheet.name,
                    id: timesheet.id,
                    createdAt: timesheet.createdAt,
                    updatedAt: timesheet.updatedAt
                },
                summary: {
                    totalEntries: entries.length,
                    totalHours: timesheet.getTotalHours(),
                    formattedTotalHours: timesheet.getFormattedTotalHours(),
                    dateRange: dateRange,
                    projectCount: projectSummary.length
                },
                entries: entries.map(entry => ({
                    id: entry.id,
                    projectName: entry.projectName,
                    date: entry.date,
                    startTime: entry.startTime,
                    endTime: entry.endTime,
                    hours: entry.hours,
                    formattedDuration: entry.getFormattedDuration(),
                    notes: entry.notes
                }))
            };

            if (includeProjectSummary) {
                report.projectSummary = projectSummary;
            }

            return report;
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    exportTimesheetReportAsJSON(timesheet) {
        try {
            const report = this.generateTimesheetReport(timesheet);
            const jsonString = JSON.stringify(report, null, 2);
            const filename = this.generateFilename(`${timesheet.name}_report`, 'json');
            
            this.downloadFile(jsonString, filename, 'application/json');
            
            this.emit('exportCompleted', { 
                type: 'json', 
                subType: 'report',
                timesheet: timesheet.name, 
                filename 
            });
            
            return { success: true, filename, data: report };
        } catch (error) {
            this.emit('exportError', error);
            throw error;
        }
    }

    validateExportData(data) {
        const errors = [];
        
        if (!data) {
            errors.push('Export data is required');
        }
        
        if (data && typeof data.toJSON !== 'function') {
            errors.push('Export data must have a toJSON method');
        }
        
        return {
            isValid: errors.length === 0,
            errors: errors
        };
    }
}