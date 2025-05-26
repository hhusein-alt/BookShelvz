class PurchaseManager {
    constructor() {
        this.cart = [];
        this.init();
    }

    init() {
        // Load cart from localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            this.cart = JSON.parse(savedCart);
        }

        // Listen for add to cart events
        document.addEventListener('addToCart', (event) => {
            if (event.detail && event.detail.book) {
                this.addToCart(event.detail.book);
            }
        });

        // Listen for remove from cart events
        document.addEventListener('removeFromCart', (event) => {
            if (event.detail && event.detail.bookId) {
                this.removeFromCart(event.detail.bookId);
            }
        });
    }

    addToCart(book) {
        // Check if book is already in cart
        const existingItem = this.cart.find(item => item.id === book.id);
        if (existingItem) {
            console.warn('Book already in cart');
            return;
        }

        // Add book to cart
        this.cart.push({
            id: book.id,
            title: book.title,
            author: book.author,
            price: book.price,
            cover: book.cover,
            addedAt: new Date().toISOString()
        });

        // Save cart to localStorage
        this.saveCart();

        // Dispatch cart updated event
        this.dispatchCartUpdated();
    }

    removeFromCart(bookId) {
        this.cart = this.cart.filter(item => item.id !== bookId);
        this.saveCart();
        this.dispatchCartUpdated();
    }

    clearCart() {
        this.cart = [];
        this.saveCart();
        this.dispatchCartUpdated();
    }

    saveCart() {
        localStorage.setItem('cart', JSON.stringify(this.cart));
    }

    getCart() {
        return this.cart;
    }

    getCartTotal() {
        return this.cart.reduce((total, item) => total + item.price, 0);
    }

    async initiatePurchase() {
        try {
            // Create order in database
            const order = await this.createOrder();
            
            // Process payment
            const paymentResult = await this.processPayment(order);
            
            if (paymentResult.success) {
                // Update order status
                await this.updateOrderStatus(order.id, 'completed');
                
                // Clear cart
                this.clearCart();
                
                // Show success message
                this.showSuccessMessage(order);
                
                return { success: true, order };
            } else {
                throw new Error(paymentResult.error);
            }
        } catch (error) {
            console.error('Purchase failed:', error);
            this.showErrorMessage(error);
            return { success: false, error: error.message };
        }
    }

    async createOrder() {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                items: this.cart,
                total: this.getCartTotal()
            })
        });

        if (!response.ok) {
            throw new Error('Failed to create order');
        }

        return response.json();
    }

    async processPayment(order) {
        // This is a placeholder for actual payment processing
        // In a real application, you would integrate with a payment provider
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({ success: true });
            }, 1000);
        });
    }

    async updateOrderStatus(orderId, status) {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status })
        });

        if (!response.ok) {
            throw new Error('Failed to update order status');
        }

        return response.json();
    }

    showSuccessMessage(order) {
        const event = new CustomEvent('purchaseSuccess', {
            detail: { order }
        });
        document.dispatchEvent(event);
    }

    showErrorMessage(error) {
        const event = new CustomEvent('purchaseError', {
            detail: { error: error.message }
        });
        document.dispatchEvent(event);
    }

    dispatchCartUpdated() {
        const event = new CustomEvent('cartUpdated', {
            detail: {
                cart: this.cart,
                total: this.getCartTotal()
            }
        });
        document.dispatchEvent(event);
    }
}

// Initialize purchase manager
const purchaseManager = new PurchaseManager();

// Export for use in other scripts
window.purchaseManager = purchaseManager; 