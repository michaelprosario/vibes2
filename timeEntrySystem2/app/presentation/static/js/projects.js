// Project Management functionality for the Projects page
class ProjectManager {
    constructor() {
        this.projects = [];
        this.filteredProjects = [];
        this.init();
    }

    async init() {
        await this.loadProjects();
        this.setupEventListeners();
        this.updateStats();
    }

    setupEventListeners() {
        // Filter and search listeners
        document.getElementById('status-filter').addEventListener('change', () => this.filterProjects());
        document.getElementById('search-projects').addEventListener('input', () => this.filterProjects());
        document.getElementById('sort-projects').addEventListener('change', () => this.sortProjects());
        
        // Form listeners
        document.getElementById('add-project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProject();
        });
        
        document.getElementById('edit-project-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.updateProject();
        });
    }

    async loadProjects() {
        try {
            const response = await fetch('/api/projects');
            if (response.ok) {
                this.projects = await response.json();
                this.filteredProjects = [...this.projects];
                this.renderProjects();
                this.updateStats();
            } else {
                console.error('Failed to load projects');
            }
        } catch (error) {
            console.error('Error loading projects:', error);
        }
    }

    async saveProject() {
        const formData = {
            name: document.getElementById('project-name').value,
            description: document.getElementById('project-description').value,
            color: document.getElementById('project-color').value,
            deadline: document.getElementById('project-deadline').value || null
        };

        try {
            const response = await fetch('/api/projects', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const newProject = await response.json();
                this.projects.push(newProject);
                this.filterProjects();
                this.updateStats();
                
                // Reset form and close modal
                document.getElementById('add-project-form').reset();
                bootstrap.Modal.getInstance(document.getElementById('addProjectModal')).hide();
                
                this.showAlert('Project created successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to create project', 'danger');
            }
        } catch (error) {
            console.error('Error creating project:', error);
            this.showAlert('Error creating project', 'danger');
        }
    }

    async updateProject() {
        const projectId = document.getElementById('edit-project-id').value;
        const formData = {
            name: document.getElementById('edit-project-name').value,
            description: document.getElementById('edit-project-description').value,
            color: document.getElementById('edit-project-color').value,
            deadline: document.getElementById('edit-project-deadline').value || null,
            status: document.getElementById('edit-project-status').value
        };

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const updatedProject = await response.json();
                const index = this.projects.findIndex(p => p.id === projectId);
                if (index !== -1) {
                    this.projects[index] = updatedProject;
                }
                this.filterProjects();
                this.updateStats();
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('editProjectModal')).hide();
                
                this.showAlert('Project updated successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to update project', 'danger');
            }
        } catch (error) {
            console.error('Error updating project:', error);
            this.showAlert('Error updating project', 'danger');
        }
    }

    async deleteProject(projectId) {
        if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.projects = this.projects.filter(p => p.id !== projectId);
                this.filterProjects();
                this.updateStats();
                this.showAlert('Project deleted successfully!', 'success');
            } else {
                const error = await response.json();
                this.showAlert(error.error || 'Failed to delete project', 'danger');
            }
        } catch (error) {
            console.error('Error deleting project:', error);
            this.showAlert('Error deleting project', 'danger');
        }
    }

    editProject(project) {
        document.getElementById('edit-project-id').value = project.id;
        document.getElementById('edit-project-name').value = project.name;
        document.getElementById('edit-project-description').value = project.description || '';
        document.getElementById('edit-project-color').value = project.color || '#0d6efd';
        document.getElementById('edit-project-deadline').value = project.deadline || '';
        document.getElementById('edit-project-status').value = project.status;

        const modal = new bootstrap.Modal(document.getElementById('editProjectModal'));
        modal.show();
    }

    filterProjects() {
        const statusFilter = document.getElementById('status-filter').value;
        const searchTerm = document.getElementById('search-projects').value.toLowerCase();

        this.filteredProjects = this.projects.filter(project => {
            const matchesStatus = !statusFilter || project.status === statusFilter;
            const matchesSearch = !searchTerm || 
                project.name.toLowerCase().includes(searchTerm) ||
                (project.description && project.description.toLowerCase().includes(searchTerm));
            
            return matchesStatus && matchesSearch;
        });

        this.sortProjects();
    }

    sortProjects() {
        const sortBy = document.getElementById('sort-projects').value;
        
        this.filteredProjects.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'updated_at':
                    return new Date(b.updated_at) - new Date(a.updated_at);
                case 'created_at':
                default:
                    return new Date(b.created_at) - new Date(a.created_at);
            }
        });

        this.renderProjects();
    }

    renderProjects() {
        const container = document.getElementById('projects-container');
        
        if (this.filteredProjects.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-folder-open fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">No projects found</h5>
                    <p class="text-muted">Create your first project to get started!</p>
                </div>
            `;
            return;
        }

        const projectsHTML = this.filteredProjects.map(project => {
            const statusBadge = this.getStatusBadge(project.status);
            const deadlineText = project.deadline ? 
                `<small class="text-muted"><i class="fas fa-calendar me-1"></i>${this.formatDate(project.deadline)}</small>` : '';
            
            return `
                <div class="card mb-3">
                    <div class="card-body">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <div class="project-color-indicator" style="background-color: ${project.color || '#0d6efd'}"></div>
                                    <h5 class="card-title mb-0">${project.name}</h5>
                                    ${statusBadge}
                                </div>
                                ${project.description ? `<p class="card-text text-muted">${project.description}</p>` : ''}
                                <div class="d-flex align-items-center gap-3">
                                    <small class="text-muted">
                                        <i class="fas fa-plus me-1"></i>Created ${this.formatDate(project.created_at)}
                                    </small>
                                    ${deadlineText}
                                </div>
                            </div>
                            <div class="col-md-4 text-md-end">
                                <div class="project-stats mb-2">
                                    <div class="stat-item">
                                        <span class="stat-value" id="project-hours-${project.id}">0h</span>
                                        <span class="stat-label">Total Time</span>
                                    </div>
                                </div>
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary" onclick="projectManager.editProject(${JSON.stringify(project).replace(/"/g, '&quot;')})">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" onclick="projectManager.deleteProject('${project.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = projectsHTML;
        
        // Load time stats for each project
        this.loadProjectTimeStats();
    }

    async loadProjectTimeStats() {
        for (const project of this.filteredProjects) {
            try {
                const response = await fetch(`/api/projects/${project.id}/time-stats`);
                if (response.ok) {
                    const stats = await response.json();
                    const element = document.getElementById(`project-hours-${project.id}`);
                    if (element) {
                        element.textContent = this.formatDuration(stats.total_hours || 0);
                    }
                }
            } catch (error) {
                console.error(`Error loading stats for project ${project.id}:`, error);
            }
        }
    }

    updateStats() {
        const activeProjects = this.projects.filter(p => p.status === 'active').length;
        const completedProjects = this.projects.filter(p => p.status === 'completed').length;
        
        document.getElementById('active-projects-count').textContent = activeProjects;
        document.getElementById('completed-projects-count').textContent = completedProjects;
        
        // Load total hours stats
        this.loadTotalStats();
    }

    async loadTotalStats() {
        try {
            const response = await fetch('/api/reports/summary');
            if (response.ok) {
                const stats = await response.json();
                document.getElementById('total-hours').textContent = this.formatDuration(stats.total_hours || 0);
                document.getElementById('this-week-hours').textContent = this.formatDuration(stats.week_hours || 0);
            }
        } catch (error) {
            console.error('Error loading total stats:', error);
        }
    }

    getStatusBadge(status) {
        const badges = {
            'active': '<span class="badge bg-success ms-2">Active</span>',
            'completed': '<span class="badge bg-primary ms-2">Completed</span>',
            'archived': '<span class="badge bg-secondary ms-2">Archived</span>'
        };
        return badges[status] || '';
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    formatDuration(hours) {
        if (hours < 1) {
            return Math.round(hours * 60) + 'm';
        }
        return Math.round(hours * 10) / 10 + 'h';
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

// Initialize project manager when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.projectManager = new ProjectManager();
});