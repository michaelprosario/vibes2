/**
 * Database class for managing IndexedDB operations
 */
class GroceryDatabase {
    constructor() {
        this.dbName = 'GroceryShoppingDB';
        this.dbVersion = 1;
        this.db = null;
    }

    /**
     * Initialize the database
     * @returns {Promise<void>}
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                reject(new Error('Database failed to open'));
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                this.createObjectStores();
            };
        });
    }

    /**
     * Create object stores for the database
     */
    createObjectStores() {
        // Items store
        if (!this.db.objectStoreNames.contains('items')) {
            const itemStore = this.db.createObjectStore('items', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
            itemStore.createIndex('category', 'category', { unique: false });
            itemStore.createIndex('completed', 'completed', { unique: false });
            itemStore.createIndex('dateAdded', 'dateAdded', { unique: false });
        }

        // Categories store (for future enhancement)
        if (!this.db.objectStoreNames.contains('categories')) {
            const categoryStore = this.db.createObjectStore('categories', { 
                keyPath: 'id', 
                autoIncrement: true 
            });
        }
    }

    /**
     * Add a new item to the database
     * @param {Object} item - The item to add
     * @returns {Promise<number>} - The ID of the added item
     */
    async addItem(item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            
            const itemData = {
                ...item,
                completed: false,
                dateAdded: new Date(),
                dateModified: new Date()
            };
            
            const request = store.add(itemData);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to add item'));
            };
        });
    }

    /**
     * Get all items from the database
     * @returns {Promise<Array>} - Array of all items
     */
    async getAllItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const request = store.getAll();
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to get items'));
            };
        });
    }

    /**
     * Update an existing item
     * @param {Object} item - The item to update
     * @returns {Promise<void>}
     */
    async updateItem(item) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            
            const itemData = {
                ...item,
                dateModified: new Date()
            };
            
            const request = store.put(itemData);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('Failed to update item'));
            };
        });
    }

    /**
     * Delete an item from the database
     * @param {number} id - The ID of the item to delete
     * @returns {Promise<void>}
     */
    async deleteItem(id) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('Failed to delete item'));
            };
        });
    }

    /**
     * Delete all completed items
     * @returns {Promise<void>}
     */
    async deleteCompletedItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const index = store.index('completed');
            const request = index.openCursor(IDBKeyRange.only(true));
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                } else {
                    resolve();
                }
            };
            
            request.onerror = () => {
                reject(new Error('Failed to delete completed items'));
            };
        });
    }

    /**
     * Delete all items
     * @returns {Promise<void>}
     */
    async deleteAllItems() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readwrite');
            const store = transaction.objectStore('items');
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = () => {
                reject(new Error('Failed to delete all items'));
            };
        });
    }

    /**
     * Get items by category
     * @param {string} category - The category to filter by
     * @returns {Promise<Array>} - Array of items in the category
     */
    async getItemsByCategory(category) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['items'], 'readonly');
            const store = transaction.objectStore('items');
            const index = store.index('category');
            const request = index.getAll(category);
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onerror = () => {
                reject(new Error('Failed to get items by category'));
            };
        });
    }

    /**
     * Get statistics about items
     * @returns {Promise<Object>} - Statistics object
     */
    async getStats() {
        try {
            const items = await this.getAllItems();
            const completed = items.filter(item => item.completed).length;
            const total = items.length;
            const remaining = total - completed;
            
            return {
                total,
                completed,
                remaining,
                categories: this.getCategoryStats(items)
            };
        } catch (error) {
            throw new Error('Failed to get statistics');
        }
    }

    /**
     * Get category statistics
     * @param {Array} items - Array of items
     * @returns {Object} - Category statistics
     */
    getCategoryStats(items) {
        const stats = {};
        items.forEach(item => {
            if (!stats[item.category]) {
                stats[item.category] = { total: 0, completed: 0 };
            }
            stats[item.category].total++;
            if (item.completed) {
                stats[item.category].completed++;
            }
        });
        return stats;
    }
}
