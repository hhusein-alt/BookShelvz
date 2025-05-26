class AdminPanel {
    constructor() {
        this.isAdmin = false;
        this.init();
    }

    async init() {
        // Check if user is admin
        await this.checkAdminStatus();
        
        if (this.isAdmin) {
            // Initialize admin features
            this.initAdminFeatures();
        }
    }

    async checkAdminStatus() {
        try {
            const response = await fetch('/api/user/role');
            const data = await response.json();
            this.isAdmin = data.role === 'admin';
        } catch (error) {
            console.error('Failed to check admin status:', error);
            this.isAdmin = false;
        }
    }

    initAdminFeatures() {
        // Initialize admin dashboard
        this.initDashboard();
        
        // Initialize user management
        this.initUserManagement();
        
        // Initialize book management
        this.initBookManagement();
        
        // Initialize order management
        this.initOrderManagement();
        
        // Initialize analytics
        this.initAnalytics();
    }

    async initDashboard() {
        const dashboard = document.getElementById('admin-dashboard');
        if (!dashboard) return;

        try {
            // Fetch dashboard data
            const response = await fetch('/api/admin/dashboard');
            const data = await response.json();

            // Update dashboard UI
            this.updateDashboardUI(data);
        } catch (error) {
            console.error('Failed to initialize dashboard:', error);
        }
    }

    updateDashboardUI(data) {
        const dashboard = document.getElementById('admin-dashboard');
        if (!dashboard) return;

        dashboard.innerHTML = `
            <div class="dashboard-grid">
                <div class="dashboard-card">
                    <h3>Total Users</h3>
                    <p class="dashboard-number">${data.totalUsers}</p>
                </div>
                <div class="dashboard-card">
                    <h3>Total Books</h3>
                    <p class="dashboard-number">${data.totalBooks}</p>
                </div>
                <div class="dashboard-card">
                    <h3>Total Orders</h3>
                    <p class="dashboard-number">${data.totalOrders}</p>
                </div>
                <div class="dashboard-card">
                    <h3>Total Revenue</h3>
                    <p class="dashboard-number">$${data.totalRevenue}</p>
                </div>
            </div>
            <div class="dashboard-charts">
                <div class="chart-container">
                    <h3>Sales Over Time</h3>
                    <canvas id="salesChart"></canvas>
                </div>
                <div class="chart-container">
                    <h3>Top Categories</h3>
                    <canvas id="categoriesChart"></canvas>
                </div>
            </div>
        `;

        // Initialize charts
        this.initCharts(data);
    }

    initCharts(data) {
        // Sales chart
        const salesCtx = document.getElementById('salesChart')?.getContext('2d');
        if (salesCtx) {
            new Chart(salesCtx, {
                type: 'line',
                data: {
                    labels: data.salesOverTime.labels,
                    datasets: [{
                        label: 'Sales',
                        data: data.salesOverTime.data,
                        borderColor: '#3498db',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Categories chart
        const categoriesCtx = document.getElementById('categoriesChart')?.getContext('2d');
        if (categoriesCtx) {
            new Chart(categoriesCtx, {
                type: 'doughnut',
                data: {
                    labels: data.topCategories.labels,
                    datasets: [{
                        data: data.topCategories.data,
                        backgroundColor: [
                            '#3498db',
                            '#2ecc71',
                            '#e74c3c',
                            '#f1c40f',
                            '#9b59b6'
                        ]
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    async initUserManagement() {
        const userManagement = document.getElementById('user-management');
        if (!userManagement) return;

        try {
            // Fetch users
            const response = await fetch('/api/admin/users');
            const users = await response.json();

            // Update user management UI
            this.updateUserManagementUI(users);
        } catch (error) {
            console.error('Failed to initialize user management:', error);
        }
    }

    updateUserManagementUI(users) {
        const userManagement = document.getElementById('user-management');
        if (!userManagement) return;

        userManagement.innerHTML = `
            <div class="user-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Role</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>${user.id}</td>
                                <td>${user.name}</td>
                                <td>${user.email}</td>
                                <td>${user.role}</td>
                                <td>
                                    <button onclick="adminPanel.editUser('${user.id}')">Edit</button>
                                    <button onclick="adminPanel.deleteUser('${user.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async initBookManagement() {
        const bookManagement = document.getElementById('book-management');
        if (!bookManagement) return;

        try {
            // Fetch books
            const response = await fetch('/api/admin/books');
            const books = await response.json();

            // Update book management UI
            this.updateBookManagementUI(books);
        } catch (error) {
            console.error('Failed to initialize book management:', error);
        }
    }

    updateBookManagementUI(books) {
        const bookManagement = document.getElementById('book-management');
        if (!bookManagement) return;

        bookManagement.innerHTML = `
            <div class="book-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Title</th>
                            <th>Author</th>
                            <th>Price</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${books.map(book => `
                            <tr>
                                <td>${book.id}</td>
                                <td>${book.title}</td>
                                <td>${book.author}</td>
                                <td>$${book.price}</td>
                                <td>
                                    <button onclick="adminPanel.editBook('${book.id}')">Edit</button>
                                    <button onclick="adminPanel.deleteBook('${book.id}')">Delete</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async initOrderManagement() {
        const orderManagement = document.getElementById('order-management');
        if (!orderManagement) return;

        try {
            // Fetch orders
            const response = await fetch('/api/admin/orders');
            const orders = await response.json();

            // Update order management UI
            this.updateOrderManagementUI(orders);
        } catch (error) {
            console.error('Failed to initialize order management:', error);
        }
    }

    updateOrderManagementUI(orders) {
        const orderManagement = document.getElementById('order-management');
        if (!orderManagement) return;

        orderManagement.innerHTML = `
            <div class="order-list">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>User</th>
                            <th>Total</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${orders.map(order => `
                            <tr>
                                <td>${order.id}</td>
                                <td>${order.userName}</td>
                                <td>$${order.total}</td>
                                <td>${order.status}</td>
                                <td>
                                    <button onclick="adminPanel.viewOrder('${order.id}')">View</button>
                                    <button onclick="adminPanel.updateOrderStatus('${order.id}')">Update Status</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async initAnalytics() {
        const analytics = document.getElementById('admin-analytics');
        if (!analytics) return;

        try {
            // Fetch analytics data
            const response = await fetch('/api/admin/analytics');
            const data = await response.json();

            // Update analytics UI
            this.updateAnalyticsUI(data);
        } catch (error) {
            console.error('Failed to initialize analytics:', error);
        }
    }

    updateAnalyticsUI(data) {
        const analytics = document.getElementById('admin-analytics');
        if (!analytics) return;

        analytics.innerHTML = `
            <div class="analytics-grid">
                <div class="analytics-card">
                    <h3>User Growth</h3>
                    <canvas id="userGrowthChart"></canvas>
                </div>
                <div class="analytics-card">
                    <h3>Revenue by Category</h3>
                    <canvas id="revenueChart"></canvas>
                </div>
                <div class="analytics-card">
                    <h3>Top Books</h3>
                    <canvas id="topBooksChart"></canvas>
                </div>
                <div class="analytics-card">
                    <h3>User Engagement</h3>
                    <canvas id="engagementChart"></canvas>
                </div>
            </div>
        `;

        // Initialize analytics charts
        this.initAnalyticsCharts(data);
    }

    initAnalyticsCharts(data) {
        // User growth chart
        const userGrowthCtx = document.getElementById('userGrowthChart')?.getContext('2d');
        if (userGrowthCtx) {
            new Chart(userGrowthCtx, {
                type: 'line',
                data: {
                    labels: data.userGrowth.labels,
                    datasets: [{
                        label: 'New Users',
                        data: data.userGrowth.data,
                        borderColor: '#3498db',
                        tension: 0.1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Revenue chart
        const revenueCtx = document.getElementById('revenueChart')?.getContext('2d');
        if (revenueCtx) {
            new Chart(revenueCtx, {
                type: 'bar',
                data: {
                    labels: data.revenueByCategory.labels,
                    datasets: [{
                        label: 'Revenue',
                        data: data.revenueByCategory.data,
                        backgroundColor: '#2ecc71'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // Top books chart
        const topBooksCtx = document.getElementById('topBooksChart')?.getContext('2d');
        if (topBooksCtx) {
            new Chart(topBooksCtx, {
                type: 'horizontalBar',
                data: {
                    labels: data.topBooks.labels,
                    datasets: [{
                        label: 'Sales',
                        data: data.topBooks.data,
                        backgroundColor: '#e74c3c'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }

        // User engagement chart
        const engagementCtx = document.getElementById('engagementChart')?.getContext('2d');
        if (engagementCtx) {
            new Chart(engagementCtx, {
                type: 'radar',
                data: {
                    labels: data.userEngagement.labels,
                    datasets: [{
                        label: 'Engagement',
                        data: data.userEngagement.data,
                        backgroundColor: 'rgba(155, 89, 182, 0.2)',
                        borderColor: '#9b59b6'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false
                }
            });
        }
    }

    // User management methods
    async editUser(userId) {
        // Implement user editing logic
    }

    async deleteUser(userId) {
        // Implement user deletion logic
    }

    // Book management methods
    async editBook(bookId) {
        // Implement book editing logic
    }

    async deleteBook(bookId) {
        // Implement book deletion logic
    }

    // Order management methods
    async viewOrder(orderId) {
        // Implement order viewing logic
    }

    async updateOrderStatus(orderId) {
        // Implement order status update logic
    }
}

// Initialize admin panel
const adminPanel = new AdminPanel();

// Export for use in other scripts
window.adminPanel = adminPanel; 