// Time Entry Management System - Main App
class TimeTracker {
    constructor() {
        this.userId = 'default_user';
        this.apiBase = '/api';
        this.runningTimer = null;
        this.projects = [];
        
        this.init();
    }
    
    init() {
        this.loadProjects();
        this.loadDailySummary();
        this.loadRecentEntries();
        this.loadQuickStats();
        this.checkRunningTimer();
        this.setupEventListeners();
        
        // Refresh running timer every 5 seconds
        setInterval(() => {
            if (this.runningTimer) {
                this.updateTimerDisplay();
            }
        }, 1000);
        
        // Refresh data every 30 seconds
        setInterval(() => {
            this.loadDailySummary();
            this.loadRecentEntries();
            this.loadQuickStats();
        }, 30000);
    }
    
    setupEventListeners() {
        // Timer controls
        document.getElementById('start-timer-btn')?.addEventListener('click', () => this.startTimer());
        document.getElementById('stop-timer-btn')?.addEventListener('click', () => this.stopTimer());
        
        // Manual entry form
        document.getElementById('add-entry-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveManualEntry();
        });
    }
    
    async loadProjects() {
        try {
            const response = await fetch(`${this.apiBase}/projects?user_id=${this.userId}&status=active`);
            const data = await response.json();
            
            if (response.ok) {
                this.projects = data.projects;
                this.populateProjectSelects();
            } else {
                this.showAlert('Error loading projects: ' + data.error, 'danger');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
            this.showAlert('Failed to load projects', 'danger');
        }
    }
    
    populateProjectSelects() {
        const selects = ['timer-project', 'entry-project'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            if (select) {
                select.innerHTML = '<option value="">Select Project...</option>';
                
                this.projects.forEach(project => {
                    const option = document.createElement('option');
                    option.value = project.project_id;
                    option.textContent = project.name;
                    select.appendChild(option);
                });
            }
        });
    }
    
    async loadDailySummary() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const response = await fetch(`${this.apiBase}/reports/daily-summary?user_id=${this.userId}&date=${today}`);
            const data = await response.json();
            
            if (response.ok) {
                this.renderDailySummary(data);
            } else {
                console.error('Error loading daily summary:', data.error);
            }
        } catch (error) {
            console.error('Error loading daily summary:', error);
        }
    }
    
    renderDailySummary(data) {
        const container = document.getElementById('daily-summary');
        if (!container) return;
        
        const html = `
            <div class="row text-center">
                <div class="col-md-3">
                    <div class="stat-item">
                        <div class="stat-value">${data.total_hours}</div>
                        <div class="stat-label">Hours Today</div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="stat-item">
                        <div class="stat-value">${data.entry_count}</div>
                        <div class="stat-label">Time Entries</div>
                    </div>
                </div>
                <div class="col-md-6">
                    <h6>Recent Activity</h6>
                    <div class="text-start">
                        ${data.entries.slice(0, 3).map(entry => `
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <div>
                                    <small class="text-muted">${entry.project_name}</small><br>
                                    <span class="fw-bold">${entry.description || 'No description'}</span>
                                </div>
                                <span class="duration-badge">${entry.duration}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    async loadRecentEntries() {
        try {
            const response = await fetch(`${this.apiBase}/time-entries?user_id=${this.userId}`);
            const data = await response.json();
            
            if (response.ok) {
                this.renderRecentEntries(data.entries.slice(0, 10));
            } else {
                console.error('Error loading recent entries:', data.error);
            }
        } catch (error) {
            console.error('Error loading recent entries:', error);
        }
    }
    
    renderRecentEntries(entries) {
        const container = document.getElementById('recent-entries');
        if (!container) return;
        
        if (entries.length === 0) {
            container.innerHTML = '<p class="text-muted text-center">No time entries found.</p>';
            return;
        }
        
        const html = entries.map(entry => {
            const project = this.projects.find(p => p.project_id === entry.project_id);
            const projectName = project ? project.name : 'Unknown Project';
            const projectColor = project ? project.color_code : '#6c757d';
            
            return `
                <div class="time-entry-item ${entry.is_running ? 'running' : ''}">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="flex-grow-1">
                            <div class="d-flex align-items-center mb-1">
                                <div class="project-color" style="background-color: ${projectColor}"></div>
                                <span class="fw-bold">${projectName}</span>
                                ${entry.is_running ? '<span class="badge bg-success ms-2">Running</span>' : ''}
                            </div>
                            <div class="text-muted">${entry.description || 'No description'}</div>
                            <small class="text-muted">
                                ${this.formatDateTime(entry.start_time)} - 
                                ${entry.end_time ? this.formatDateTime(entry.end_time) : 'Running'}
                            </small>
                        </div>
                        <div class="text-end">
                            <div class="duration-badge">${entry.is_running ? 'Running' : this.formatDuration(entry.duration_minutes)}</div>
                            <div class="mt-2">
                                <button class="btn btn-sm btn-outline-primary me-1" onclick="timeTracker.editEntry('${entry.entry_id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="timeTracker.deleteEntry('${entry.entry_id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = html;
    }
    
    async loadQuickStats() {
        try {
            const today = new Date().toISOString().split('T')[0];
            const weekStart = this.getWeekStart().toISOString().split('T')[0];
            
            const [dailyResponse, weeklyResponse] = await Promise.all([
                fetch(`${this.apiBase}/reports/daily-summary?user_id=${this.userId}&date=${today}`),
                fetch(`${this.apiBase}/reports/weekly-summary?user_id=${this.userId}&week_start=${weekStart}`)
            ]);
            
            const dailyData = await dailyResponse.json();
            const weeklyData = await weeklyResponse.json();
            
            if (dailyResponse.ok && weeklyResponse.ok) {
                this.renderQuickStats(dailyData, weeklyData);
            }
        } catch (error) {
            console.error('Error loading quick stats:', error);
        }
    }
    
    renderQuickStats(daily, weekly) {
        const container = document.getElementById('quick-stats');
        if (!container) return;
        
        const html = `
            <div class="stat-item">
                <div class="stat-value">${daily.total_hours}</div>
                <div class="stat-label">Hours Today</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${weekly.total_hours}</div>
                <div class="stat-label">Hours This Week</div>
            </div>
            <div class="stat-item">
                <div class="stat-value">${weekly.entry_count}</div>
                <div class="stat-label">Entries This Week</div>
            </div>
        `;
        
        container.innerHTML = html;
    }
    
    async checkRunningTimer() {
        try {
            const response = await fetch(`${this.apiBase}/time-entries/running?user_id=${this.userId}`);
            
            if (response.ok) {
                const data = await response.json();
                this.runningTimer = data;
                this.updateTimerUI(true);
                this.updateTimerDisplay();
            } else if (response.status === 404) {
                this.runningTimer = null;
                this.updateTimerUI(false);
            }
        } catch (error) {
            console.error('Error checking running timer:', error);
        }
    }
    
    async startTimer() {
        const projectId = document.getElementById('timer-project').value;
        const description = document.getElementById('timer-description').value;
        
        if (!projectId) {
            this.showAlert('Please select a project', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/time-entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    project_id: projectId,
                    description: description,
                    start_timer: true
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.runningTimer = data;
                this.updateTimerUI(true);
                this.showAlert('Timer started successfully!', 'success');
                this.loadRecentEntries(); // Refresh entries
            } else {
                this.showAlert('Error starting timer: ' + data.error, 'danger');
            }
        } catch (error) {
            console.error('Error starting timer:', error);
            this.showAlert('Failed to start timer', 'danger');
        }
    }
    
    async stopTimer() {
        if (!this.runningTimer) return;
        
        try {
            const response = await fetch(`${this.apiBase}/time-entries/${this.runningTimer.entry_id}/stop`, {
                method: 'POST'
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.runningTimer = null;
                this.updateTimerUI(false);
                this.showAlert('Timer stopped successfully!', 'success');
                this.loadDailySummary(); // Refresh summary
                this.loadRecentEntries(); // Refresh entries
                this.loadQuickStats(); // Refresh stats
            } else {
                this.showAlert('Error stopping timer: ' + data.error, 'danger');
            }
        } catch (error) {
            console.error('Error stopping timer:', error);
            this.showAlert('Failed to stop timer', 'danger');
        }
    }
    
    updateTimerUI(isRunning) {
        const startBtn = document.getElementById('start-timer-btn');
        const stopBtn = document.getElementById('stop-timer-btn');
        const timerDisplay = document.getElementById('timer-display');
        
        if (isRunning) {
            startBtn?.classList.add('d-none');
            stopBtn?.classList.remove('d-none');
            timerDisplay?.classList.add('running');
        } else {
            startBtn?.classList.remove('d-none');
            stopBtn?.classList.add('d-none');
            timerDisplay?.classList.remove('running');
            timerDisplay.textContent = '00:00:00';
        }
    }
    
    updateTimerDisplay() {
        if (!this.runningTimer) return;
        
        const startTime = new Date(this.runningTimer.start_time);
        const now = new Date();
        const elapsed = Math.floor((now - startTime) / 1000);
        
        const hours = Math.floor(elapsed / 3600);
        const minutes = Math.floor((elapsed % 3600) / 60);
        const seconds = elapsed % 60;
        
        const display = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = display;
    }
    
    async saveManualEntry() {
        const projectId = document.getElementById('entry-project').value;
        const description = document.getElementById('entry-description').value;
        const startTime = document.getElementById('entry-start-time').value;
        const endTime = document.getElementById('entry-end-time').value;
        
        if (!projectId || !startTime || !endTime) {
            this.showAlert('Please fill in all required fields', 'warning');
            return;
        }
        
        try {
            const response = await fetch(`${this.apiBase}/time-entries`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: this.userId,
                    project_id: projectId,
                    description: description,
                    start_time: startTime,
                    end_time: endTime
                })
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showAlert('Time entry added successfully!', 'success');
                document.getElementById('add-entry-form').reset();
                
                // Close modal
                const modal = bootstrap.Modal.getInstance(document.getElementById('addEntryModal'));
                modal?.hide();
                
                // Refresh data
                this.loadDailySummary();
                this.loadRecentEntries();
                this.loadQuickStats();
            } else {
                this.showAlert('Error adding entry: ' + data.error, 'danger');
            }
        } catch (error) {
            console.error('Error adding entry:', error);
            this.showAlert('Failed to add entry', 'danger');
        }
    }
    
    async deleteEntry(entryId) {
        if (!confirm('Are you sure you want to delete this time entry?')) return;
        
        try {
            const response = await fetch(`${this.apiBase}/time-entries/${entryId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                this.showAlert('Time entry deleted successfully!', 'success');
                this.loadDailySummary();
                this.loadRecentEntries();
                this.loadQuickStats();
            } else {
                const data = await response.json();
                this.showAlert('Error deleting entry: ' + data.error, 'danger');
            }
        } catch (error) {
            console.error('Error deleting entry:', error);
            this.showAlert('Failed to delete entry', 'danger');
        }
    }
    
    // Utility methods
    formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString();
    }
    
    formatDuration(minutes) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}:${mins.toString().padStart(2, '0')}`;
    }
    
    getWeekStart() {
        const today = new Date();
        const day = today.getDay();
        const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
        return new Date(today.setDate(diff));
    }
    
    showAlert(message, type = 'info') {
        // Create alert element
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.parentNode.removeChild(alertDiv);
            }
        }, 5000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.timeTracker = new TimeTracker();
});

// Global functions for HTML onclick handlers
function loadRecentEntries() {
    window.timeTracker.loadRecentEntries();
}

function saveManualEntry() {
    window.timeTracker.saveManualEntry();
}