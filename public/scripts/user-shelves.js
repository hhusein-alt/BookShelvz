class UserShelves {
    constructor() {
        this.shelves = [];
        this.currentShelf = null;
        this.init();
    }

    async init() {
        // Load user's shelves
        await this.loadShelves();
        
        // Initialize shelf management UI
        this.initShelfManagement();
        
        // Listen for shelf events
        document.addEventListener('shelfCreated', (event) => {
            if (event.detail && event.detail.shelf) {
                this.addShelf(event.detail.shelf);
            }
        });

        document.addEventListener('shelfUpdated', (event) => {
            if (event.detail && event.detail.shelf) {
                this.updateShelf(event.detail.shelf);
            }
        });

        document.addEventListener('shelfDeleted', (event) => {
            if (event.detail && event.detail.shelfId) {
                this.deleteShelf(event.detail.shelfId);
            }
        });
    }

    async loadShelves() {
        try {
            const response = await fetch('/api/shelves');
            const data = await response.json();
            this.shelves = data;
            this.dispatchShelvesLoaded();
        } catch (error) {
            console.error('Failed to load shelves:', error);
        }
    }

    initShelfManagement() {
        const shelfManagement = document.getElementById('shelf-management');
        if (!shelfManagement) return;

        // Create shelf management UI
        shelfManagement.innerHTML = `
            <div class="shelf-management">
                <div class="shelf-list">
                    <h2>My Shelves</h2>
                    <div class="shelf-items"></div>
                    <button class="button" onclick="userShelves.showCreateShelfModal()">Create New Shelf</button>
                </div>
                <div class="shelf-content">
                    <div class="shelf-books"></div>
                </div>
            </div>
        `;

        // Update shelf list
        this.updateShelfList();
    }

    updateShelfList() {
        const shelfItems = document.querySelector('.shelf-items');
        if (!shelfItems) return;

        shelfItems.innerHTML = this.shelves.map(shelf => `
            <div class="shelf-item ${shelf.id === this.currentShelf?.id ? 'active' : ''}" 
                 onclick="userShelves.selectShelf('${shelf.id}')">
                <h3>${shelf.name}</h3>
                <p>${shelf.books.length} books</p>
                <div class="shelf-actions">
                    <button onclick="userShelves.editShelf('${shelf.id}')">Edit</button>
                    <button onclick="userShelves.deleteShelf('${shelf.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }

    async selectShelf(shelfId) {
        try {
            const response = await fetch(`/api/shelves/${shelfId}`);
            const shelf = await response.json();
            this.currentShelf = shelf;
            this.updateShelfContent();
            this.updateShelfList();
        } catch (error) {
            console.error('Failed to load shelf:', error);
        }
    }

    updateShelfContent() {
        const shelfBooks = document.querySelector('.shelf-books');
        if (!shelfBooks || !this.currentShelf) return;

        shelfBooks.innerHTML = `
            <h2>${this.currentShelf.name}</h2>
            <p class="shelf-description">${this.currentShelf.description || ''}</p>
            <div class="book-grid">
                ${this.currentShelf.books.map(book => `
                    <div class="book-card">
                        <img src="${book.cover}" alt="${book.title}">
                        <h3>${book.title}</h3>
                        <p>${book.author}</p>
                        <div class="book-actions">
                            <button onclick="userShelves.removeFromShelf('${book.id}')">Remove</button>
                            <button onclick="userShelves.openBook('${book.id}')">Read</button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    async createShelf(name, description) {
        try {
            const response = await fetch('/api/shelves', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, description })
            });

            const shelf = await response.json();
            this.shelves.push(shelf);
            this.updateShelfList();
            this.dispatchShelfCreated(shelf);
            return shelf;
        } catch (error) {
            console.error('Failed to create shelf:', error);
            throw error;
        }
    }

    async updateShelf(shelfId, updates) {
        try {
            const response = await fetch(`/api/shelves/${shelfId}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updates)
            });

            const updatedShelf = await response.json();
            this.shelves = this.shelves.map(shelf => 
                shelf.id === shelfId ? updatedShelf : shelf
            );

            if (this.currentShelf?.id === shelfId) {
                this.currentShelf = updatedShelf;
                this.updateShelfContent();
            }

            this.updateShelfList();
            this.dispatchShelfUpdated(updatedShelf);
            return updatedShelf;
        } catch (error) {
            console.error('Failed to update shelf:', error);
            throw error;
        }
    }

    async deleteShelf(shelfId) {
        try {
            await fetch(`/api/shelves/${shelfId}`, {
                method: 'DELETE'
            });

            this.shelves = this.shelves.filter(shelf => shelf.id !== shelfId);
            if (this.currentShelf?.id === shelfId) {
                this.currentShelf = null;
                this.updateShelfContent();
            }

            this.updateShelfList();
            this.dispatchShelfDeleted(shelfId);
        } catch (error) {
            console.error('Failed to delete shelf:', error);
            throw error;
        }
    }

    async addToShelf(bookId, shelfId) {
        try {
            const response = await fetch(`/api/shelves/${shelfId}/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ bookId })
            });

            const updatedShelf = await response.json();
            this.shelves = this.shelves.map(shelf => 
                shelf.id === shelfId ? updatedShelf : shelf
            );

            if (this.currentShelf?.id === shelfId) {
                this.currentShelf = updatedShelf;
                this.updateShelfContent();
            }

            this.updateShelfList();
            return updatedShelf;
        } catch (error) {
            console.error('Failed to add book to shelf:', error);
            throw error;
        }
    }

    async removeFromShelf(bookId) {
        if (!this.currentShelf) return;

        try {
            const response = await fetch(`/api/shelves/${this.currentShelf.id}/books/${bookId}`, {
                method: 'DELETE'
            });

            const updatedShelf = await response.json();
            this.shelves = this.shelves.map(shelf => 
                shelf.id === this.currentShelf.id ? updatedShelf : shelf
            );

            this.currentShelf = updatedShelf;
            this.updateShelfContent();
            this.updateShelfList();
        } catch (error) {
            console.error('Failed to remove book from shelf:', error);
            throw error;
        }
    }

    showCreateShelfModal() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Create New Shelf</h2>
                <form id="create-shelf-form">
                    <div class="form-group">
                        <label for="shelf-name">Name</label>
                        <input type="text" id="shelf-name" required>
                    </div>
                    <div class="form-group">
                        <label for="shelf-description">Description</label>
                        <textarea id="shelf-description"></textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="button">Create</button>
                        <button type="button" class="button button--outline" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#create-shelf-form');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = form.querySelector('#shelf-name').value;
            const description = form.querySelector('#shelf-description').value;

            try {
                await this.createShelf(name, description);
                modal.remove();
            } catch (error) {
                console.error('Failed to create shelf:', error);
            }
        });
    }

    editShelf(shelfId) {
        const shelf = this.shelves.find(s => s.id === shelfId);
        if (!shelf) return;

        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Edit Shelf</h2>
                <form id="edit-shelf-form">
                    <div class="form-group">
                        <label for="shelf-name">Name</label>
                        <input type="text" id="shelf-name" value="${shelf.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="shelf-description">Description</label>
                        <textarea id="shelf-description">${shelf.description || ''}</textarea>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="button">Save</button>
                        <button type="button" class="button button--outline" onclick="this.closest('.modal').remove()">Cancel</button>
                    </div>
                </form>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle form submission
        const form = modal.querySelector('#edit-shelf-form');
        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const name = form.querySelector('#shelf-name').value;
            const description = form.querySelector('#shelf-description').value;

            try {
                await this.updateShelf(shelfId, { name, description });
                modal.remove();
            } catch (error) {
                console.error('Failed to update shelf:', error);
            }
        });
    }

    openBook(bookId) {
        window.location.href = `/books/${bookId}`;
    }

    // Event dispatchers
    dispatchShelvesLoaded() {
        const event = new CustomEvent('shelvesLoaded', {
            detail: { shelves: this.shelves }
        });
        document.dispatchEvent(event);
    }

    dispatchShelfCreated(shelf) {
        const event = new CustomEvent('shelfCreated', {
            detail: { shelf }
        });
        document.dispatchEvent(event);
    }

    dispatchShelfUpdated(shelf) {
        const event = new CustomEvent('shelfUpdated', {
            detail: { shelf }
        });
        document.dispatchEvent(event);
    }

    dispatchShelfDeleted(shelfId) {
        const event = new CustomEvent('shelfDeleted', {
            detail: { shelfId }
        });
        document.dispatchEvent(event);
    }
}

// Initialize user shelves
const userShelves = new UserShelves();

// Export for use in other scripts
window.userShelves = userShelves; 