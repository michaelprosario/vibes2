// Reports and Analytics functionality
class ReportsManager {
    constructor() {
        this.currentData = null;
        this.timeChart = null;
        this.projectChart = null;
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupEventListeners();
        await this.loadReportData();
    }

    setupEventListeners() {
        document.getElementById('date-range').addEventListener('change', (e) => {
            this.toggleCustomDateRange(e.target.value);
            this.loadReportData();
        });

        document.getElementById('project-filter').addEventListener('change', () => {
            this.loadReportData();
        });

        document.getElementById('start-date').addEventListener('change', () => {
            this.loadReportData();
        });

        document.getElementById('end-date').addEventListener('change', () => {
            this.loadReportData();
        });
    }

    toggleCustomDateRange(range) {
        const customStartDate = document.getElementById('custom-start-date');
        const customEndDate = document.getElementById('custom-end-date');
        
        if (range === 'custom') {
            customStartDate.style.display = 'block';
            customEndDate.style.display = 'block';
        } else {
            customStartDate.style.display = 'none';
            customEndDate.style.display = 'none';
        }
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                const projects = await response.json();
                const projectFilter = document.getElementById('project-filter');
                
                projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.id;
                    option.textContent = project.name;
                    projectFilter.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async loadReportData() {
        const params = this.getReportParams();
        
        try {
            const response = await fetch(`/api/reports/detailed?${params}`);
            if (response.ok) {
                this.currentData = await response.json();
                this.updateSummaryCards();
                this.updateCharts();
                this.updateProjectBreakdown();
                this.updateDailyBreakdown();
                this.updateRecentEntries();
            } else {
                console.error('Failed to load report data');
            }
        } catch (error) {
            console.error('Error loading report data:', error);
        }
    }

    getReportParams() {
        const params = new URLSearchParams();
        
        const dateRange = document.getElementById('date-range').value;
        const projectFilter = document.getElementById('project-filter').value;
        
        if (dateRange === 'custom') {
            const startDate = document.getElementById('start-date').value;
            const endDate = document.getElementById('end-date').value;
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);
        } else {
            params.append('period', dateRange);
        }
        
        if (projectFilter) {
            params.append('project_id', projectFilter);
        }
        
        return params.toString();
    }

    updateSummaryCards() {
        if (!this.currentData) return;

        const { summary } = this.currentData;
        
        document.getElementById('total-time').textContent = this.formatDuration(summary.total_hours);
        document.getElementById('billable-time').textContent = this.formatDuration(summary.billable_hours);
        document.getElementById('avg-daily').textContent = this.formatDuration(summary.avg_daily_hours);
        document.getElementById('total-entries').textContent = summary.total_entries;
    }

    updateCharts() {
        if (!this.currentData) return;

        this.updateTimeChart();
        this.updateProjectChart();
    }

    updateTimeChart() {
        const ctx = document.getElementById('timeChart').getContext('2d');
        const { daily_breakdown } = this.currentData;
        
        if (this.timeChart) {
            this.timeChart.destroy();
        }

        const labels = daily_breakdown.map(day => this.formatDate(day.date));
        const data = daily_breakdown.map(day => day.total_hours);

        this.timeChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Hours Worked',
                    data: data,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + 'h';
                            }
                        }
                    }
                },
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const hours = Math.floor(context.parsed.y);
                                const minutes = Math.round((context.parsed.y - hours) * 60);
                                return `${hours}h ${minutes}m`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateProjectChart() {
        const ctx = document.getElementById('projectChart').getContext('2d');
        const { project_breakdown } = this.currentData;
        
        if (this.projectChart) {
            this.projectChart.destroy();
        }

        if (!project_breakdown || project_breakdown.length === 0) {
            // Show empty state
            ctx.fillStyle = '#6c757d';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('No data available', ctx.canvas.width / 2, ctx.canvas.height / 2);
            return;
        }

        const labels = project_breakdown.map(project => project.project_name);
        const data = project_breakdown.map(project => project.total_hours);
        const colors = this.generateColors(project_breakdown.length);

        this.projectChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const hours = Math.floor(context.parsed);
                                const minutes = Math.round((context.parsed - hours) * 60);
                                const percentage = ((context.parsed / data.reduce((a, b) => a + b, 0)) * 100).toFixed(1);
                                return `${context.label}: ${hours}h ${minutes}m (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    updateProjectBreakdown() {
        const tbody = document.getElementById('project-breakdown');
        const { project_breakdown } = this.currentData;
        
        if (!project_breakdown || project_breakdown.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = project_breakdown.map(project => `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="project-color-indicator me-2" style="background-color: ${project.project_color || '#0d6efd'}"></div>
                        ${project.project_name}
                    </div>
                </td>
                <td>${this.formatDuration(project.total_hours)}</td>
                <td>${project.entry_count}</td>
                <td>${this.formatDuration(project.avg_entry_duration)}</td>
                <td>${this.formatDate(project.first_entry)}</td>
                <td>${this.formatDate(project.last_entry)}</td>
            </tr>
        `).join('');
    }

    updateDailyBreakdown() {
        const tbody = document.getElementById('daily-breakdown');
        const { daily_breakdown } = this.currentData;
        
        if (!daily_breakdown || daily_breakdown.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No data available</td></tr>';
            return;
        }

        tbody.innerHTML = daily_breakdown.map(day => `
            <tr>
                <td>${this.formatDate(day.date)}</td>
                <td>${this.formatDuration(day.total_hours)}</td>
                <td>${day.entry_count}</td>
                <td>${day.project_count}</td>
                <td>${day.most_active_project || '-'}</td>
            </tr>
        `).join('');
    }

    updateRecentEntries() {
        const container = document.getElementById('recent-entries');
        const { recent_entries } = this.currentData;
        
        if (!recent_entries || recent_entries.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No recent entries</p>';
            return;
        }

        container.innerHTML = recent_entries.map(entry => `
            <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                <div>
                    <strong>${entry.project_name}</strong>
                    ${entry.description ? `<br><small class="text-muted">${entry.description}</small>` : ''}
                </div>
                <div class="text-end">
                    <div>${this.formatDuration(entry.duration_hours)}</div>
                    <small class="text-muted">${this.formatDateTime(entry.start_time)}</small>
                </div>
            </div>
        `).join('');
    }

    async exportToPDF() {
        try {
            const params = this.getReportParams();
            const response = await fetch(`/api/reports/export/pdf?${params}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `time-report-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showAlert('PDF export completed successfully!', 'success');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            this.showAlert('Failed to export PDF', 'danger');
        }
    }

    async exportToCSV() {
        try {
            const params = this.getReportParams();
            const response = await fetch(`/api/reports/export/csv?${params}`, {
                method: 'GET'
            });
            
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = `time-report-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                this.showAlert('CSV export completed successfully!', 'success');
            } else {
                throw new Error('Export failed');
            }
        } catch (error) {
            console.error('Error exporting CSV:', error);
            this.showAlert('Failed to export CSV', 'danger');
        }
    }

    generateColors(count) {
        const colors = [
            '#0d6efd', '#6f42c1', '#6610f2', '#d63384', '#dc3545',
            '#fd7e14', '#ffc107', '#198754', '#20c997', '#0dcaf0'
        ];
        
        const result = [];
        for (let i = 0; i < count; i++) {
            result.push(colors[i % colors.length]);
        }
        return result;
    }

    formatDuration(hours) {
        if (!hours || hours === 0) return '0h 0m';
        
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        
        if (h === 0) return `${m}m`;
        if (m === 0) return `${h}h`;
        return `${h}h ${m}m`;
    }

    formatDate(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleDateString();
    }

    formatDateTime(dateString) {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString();
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

// Initialize reports manager when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.reportsManager = new ReportsManager();
});