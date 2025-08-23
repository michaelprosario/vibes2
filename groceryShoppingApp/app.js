/**
 * Main application class for the Grocery Shopping App
 */
class GroceryApp {
    constructor() {
        this.database = new GroceryDatabase();
        this.currentFilter = 'all';
        this.currentSort = 'dateAdded';
        this.editingItem = null;
        this.editModal = null;
        
        // Category configuration
        this.categories = {
            'produce': { name: 'Produce', color: 'success' },
            'dairy': { name: 'Dairy', color: 'info' },
            'meat': { name: 'Meat & Seafood', color: 'danger' },
            'pantry': { name: 'Pantry', color: 'warning' },
            'frozen': { name: 'Frozen', color: 'primary' },
            'bakery': { name: 'Bakery', color: 'secondary' },
            'beverages': { name: 'Beverages', color: 'success' },
            'snacks': { name: 'Snacks', color: 'info' },
            'household': { name: 'Household', color: 'dark' },
            'other': { name: 'Other', color: 'secondary' }
        };
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            await this.database.init();
            this.setupEventListeners();
            this.editModal = new bootstrap.Modal(document.getElementById('edit-modal'));
            await this.loadItems();
            await this.updateStats();
            console.log('Grocery Shopping App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to initialize the application. Please refresh the page.');
        }
    }

    /**
     * Set up event listeners for the application
     */
    setupEventListeners() {
        // Item form submission
        document.getElementById('item-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAddItem();
        });

        // Category filter
        document.getElementById('category-filter').addEventListener('change', (e) => {
            this.currentFilter = e.target.value;
            this.loadItems();
        });

        // Sort buttons
        document.getElementById('sort-name').addEventListener('click', () => {
            this.currentSort = 'name';
            this.loadItems();
            this.updateSortButtons('sort-name');
        });

        document.getElementById('sort-category').addEventListener('click', () => {
            this.currentSort = 'category';
            this.loadItems();
            this.updateSortButtons('sort-category');
        });

        // Clear buttons
        document.getElementById('clear-completed').addEventListener('click', () => {
            this.clearCompleted();
        });

        document.getElementById('clear-all').addEventListener('click', () => {
            this.clearAll();
        });

        // Edit form submission
        document.getElementById('save-edit').addEventListener('click', () => {
            this.handleSaveEdit();
        });
    }

    /**
     * Handle adding a new item
     */
    async handleAddItem() {
        try {
            const form = document.getElementById('item-form');
            const formData = new FormData(form);
            
            const item = {
                name: document.getElementById('item-name').value.trim(),
                quantity: parseInt(document.getElementById('item-quantity').value) || 1,
                category: document.getElementById('item-category').value,
                notes: document.getElementById('item-notes').value.trim()
            };

            if (!item.name) {
                this.showError('Item name is required');
                return;
            }

            await this.database.addItem(item);
            form.reset();
            document.getElementById('item-quantity').value = 1;
            await this.loadItems();
            await this.updateStats();
            this.showSuccess('Item added successfully');
        } catch (error) {
            console.error('Error adding item:', error);
            this.showError('Failed to add item');
        }
    }

    /**
     * Load and display items
     */
    async loadItems() {
        try {
            let items = await this.database.getAllItems();
            
            // Apply filter
            if (this.currentFilter !== 'all') {
                items = items.filter(item => item.category === this.currentFilter);
            }
            
            // Apply sort
            items = this.sortItems(items);
            
            this.renderItems(items);
        } catch (error) {
            console.error('Error loading items:', error);
            this.showError('Failed to load items');
        }
    }

    /**
     * Sort items based on current sort setting
     * @param {Array} items - Items to sort
     * @returns {Array} - Sorted items
     */
    sortItems(items) {
        return items.sort((a, b) => {
            switch (this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'category':
                    if (a.category === b.category) {
                        return a.name.localeCompare(b.name);
                    }
                    return a.category.localeCompare(b.category);
                default:
                    return new Date(b.dateAdded) - new Date(a.dateAdded);
            }
        });
    }

    /**
     * Render items in the shopping list
     * @param {Array} items - Items to render
     */
    renderItems(items) {
        const listContainer = document.getElementById('shopping-list');
        const emptyState = document.getElementById('empty-state');
        
        if (items.length === 0) {
            emptyState.style.display = 'block';
            listContainer.innerHTML = '';
            listContainer.appendChild(emptyState);
            return;
        }
        
        emptyState.style.display = 'none';
        
        const listHTML = items.map(item => this.createItemHTML(item)).join('');
        listContainer.innerHTML = listHTML;
        
        // Add event listeners for item actions
        this.setupItemEventListeners();
    }

    /**
     * Create HTML for a single item
     * @param {Object} item - The item data
     * @returns {string} - HTML string
     */
    createItemHTML(item) {
        const category = this.categories[item.category] || this.categories['other'];
        const completedClass = item.completed ? 'completed' : '';
        const checkedAttr = item.completed ? 'checked' : '';
        
        return `
            <div class="list-group-item d-flex justify-content-between align-items-center shopping-item ${completedClass}" data-id="${item.id}">
                <div class="d-flex align-items-center flex-grow-1">
                    <input class="form-check-input me-3" type="checkbox" ${checkedAttr} data-action="toggle" data-id="${item.id}">
                    <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-1">
                            <h6 class="mb-0 me-2">${this.escapeHtml(item.name)}</h6>
                            <span class="badge category-${item.category} category-badge me-2">
                                ${category.name}
                            </span>
                            <span class="item-quantity">×${item.quantity}</span>
                        </div>
                        ${item.notes ? `<small class="text-muted">${this.escapeHtml(item.notes)}</small>` : ''}
                    </div>
                </div>
                <div class="item-actions">
                    <button class="btn btn-outline-primary btn-sm me-2" data-action="edit" data-id="${item.id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" data-action="delete" data-id="${item.id}">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Set up event listeners for item actions
     */
    setupItemEventListeners() {
        const listContainer = document.getElementById('shopping-list');
        
        listContainer.addEventListener('click', async (e) => {
            const action = e.target.closest('[data-action]')?.dataset.action;
            const itemId = parseInt(e.target.closest('[data-action]')?.dataset.id);
            
            if (!action || !itemId) return;
            
            switch (action) {
                case 'toggle':
                    await this.toggleItem(itemId);
                    break;
                case 'edit':
                    await this.editItem(itemId);
                    break;
                case 'delete':
                    await this.deleteItem(itemId);
                    break;
            }
        });
        
        // Handle checkbox changes
        listContainer.addEventListener('change', async (e) => {
            if (e.target.type === 'checkbox' && e.target.dataset.action === 'toggle') {
                const itemId = parseInt(e.target.dataset.id);
                await this.toggleItem(itemId);
            }
        });
    }

    /**
     * Toggle item completion status
     * @param {number} itemId - ID of the item to toggle
     */
    async toggleItem(itemId) {
        try {
            const items = await this.database.getAllItems();
            const item = items.find(i => i.id === itemId);
            
            if (item) {
                item.completed = !item.completed;
                await this.database.updateItem(item);
                await this.loadItems();
                await this.updateStats();
            }
        } catch (error) {
            console.error('Error toggling item:', error);
            this.showError('Failed to update item');
        }
    }

    /**
     * Edit an item
     * @param {number} itemId - ID of the item to edit
     */
    async editItem(itemId) {
        try {
            const items = await this.database.getAllItems();
            const item = items.find(i => i.id === itemId);
            
            if (item) {
                this.editingItem = item;
                this.populateEditForm(item);
                this.editModal.show();
            }
        } catch (error) {
            console.error('Error editing item:', error);
            this.showError('Failed to load item for editing');
        }
    }

    /**
     * Populate the edit form with item data
     * @param {Object} item - The item to edit
     */
    populateEditForm(item) {
        document.getElementById('edit-name').value = item.name;
        document.getElementById('edit-quantity').value = item.quantity;
        document.getElementById('edit-category').value = item.category;
        document.getElementById('edit-notes').value = item.notes || '';
    }

    /**
     * Handle saving edited item
     */
    async handleSaveEdit() {
        try {
            if (!this.editingItem) return;
            
            const updatedItem = {
                ...this.editingItem,
                name: document.getElementById('edit-name').value.trim(),
                quantity: parseInt(document.getElementById('edit-quantity').value) || 1,
                category: document.getElementById('edit-category').value,
                notes: document.getElementById('edit-notes').value.trim()
            };
            
            if (!updatedItem.name) {
                this.showError('Item name is required');
                return;
            }
            
            await this.database.updateItem(updatedItem);
            this.editModal.hide();
            this.editingItem = null;
            await this.loadItems();
            await this.updateStats();
            this.showSuccess('Item updated successfully');
        } catch (error) {
            console.error('Error saving edit:', error);
            this.showError('Failed to update item');
        }
    }

    /**
     * Delete an item
     * @param {number} itemId - ID of the item to delete
     */
    async deleteItem(itemId) {
        try {
            if (confirm('Are you sure you want to delete this item?')) {
                await this.database.deleteItem(itemId);
                await this.loadItems();
                await this.updateStats();
                this.showSuccess('Item deleted successfully');
            }
        } catch (error) {
            console.error('Error deleting item:', error);
            this.showError('Failed to delete item');
        }
    }

    /**
     * Clear all completed items
     */
    async clearCompleted() {
        try {
            if (confirm('Are you sure you want to clear all completed items?')) {
                await this.database.deleteCompletedItems();
                await this.loadItems();
                await this.updateStats();
                this.showSuccess('Completed items cleared');
            }
        } catch (error) {
            console.error('Error clearing completed items:', error);
            this.showError('Failed to clear completed items');
        }
    }

    /**
     * Clear all items
     */
    async clearAll() {
        try {
            if (confirm('Are you sure you want to clear ALL items? This cannot be undone.')) {
                await this.database.deleteAllItems();
                await this.loadItems();
                await this.updateStats();
                this.showSuccess('All items cleared');
            }
        } catch (error) {
            console.error('Error clearing all items:', error);
            this.showError('Failed to clear all items');
        }
    }

    /**
     * Update statistics display
     */
    async updateStats() {
        try {
            const stats = await this.database.getStats();
            document.getElementById('total-items').textContent = stats.total;
            document.getElementById('completed-items').textContent = stats.completed;
            document.getElementById('remaining-items').textContent = stats.remaining;
        } catch (error) {
            console.error('Error updating stats:', error);
        }
    }

    /**
     * Update sort button states
     * @param {string} activeButtonId - ID of the active button
     */
    updateSortButtons(activeButtonId) {
        document.querySelectorAll('#sort-name, #sort-category').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(activeButtonId).classList.add('active');
    }

    /**
     * Show success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        this.showToast(message, 'success');
    }

    /**
     * Show error message
     * @param {string} message - Error message
     */
    showError(message) {
        this.showToast(message, 'danger');
    }

    /**
     * Show toast notification
     * @param {string} message - Message to show
     * @param {string} type - Toast type (success, danger, etc.)
     */
    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.querySelector('.toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            document.body.appendChild(toastContainer);
        }

        // Create toast element
        const toastId = 'toast-' + Date.now();
        const toastHTML = `
            <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="toast-header">
                    <span class="badge bg-${type} me-2"></span>
                    <strong class="me-auto">Grocery App</strong>
                    <button type="button" class="btn-close" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${this.escapeHtml(message)}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHTML);
        
        // Show toast
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
        toast.show();
        
        // Remove toast element after it's hidden
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} - Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new GroceryApp();
    app.init();
});
