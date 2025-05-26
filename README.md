# BookShelvz

A modern, scalable book management application with real-time features and robust security.

## Features

- 📚 Book management and organization
- 🔐 Secure authentication and authorization
- 🔄 Real-time updates with WebSocket
- 🚀 High performance with Redis caching
- 📊 Comprehensive logging and monitoring
- 🛡️ Advanced security features
- 📱 Responsive design
- 🔍 Full-text search
- 📈 Performance monitoring

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **Cache**: Redis
- **Real-time**: WebSocket
- **Security**: JWT, Helmet, Rate Limiting
- **Monitoring**: Winston, Sentry
- **Testing**: Jest, Supertest
- **Code Quality**: ESLint, Prettier, Husky

## Prerequisites

- Node.js >= 14.0.0
- PostgreSQL >= 12
- Redis >= 6.0
- npm or yarn

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/bookshelvz.git
   cd bookshelvz
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration

5. Set up the database:
   ```bash
   npm run setup:db
   ```

6. Start the development server:
   ```bash
   npm run dev
   ```

## Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm test` - Run tests
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run prepare` - Set up Git hooks

### Project Structure

```
bookshelvz/
├── client/             # Frontend code
├── server/             # Backend code
│   ├── controllers/    # Route controllers
│   ├── middleware/     # Custom middleware
│   ├── models/         # Database models
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   ├── utils/          # Utility functions
│   └── tests/          # Backend tests
├── shared/             # Shared code
└── docs/              # Documentation
```

### Code Style

This project uses ESLint and Prettier for code formatting. The configuration is in `.eslintrc.js` and `.prettierrc`.

### Git Workflow

1. Create a new branch for your feature
2. Make your changes
3. Run tests and linting
4. Create a pull request

## Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- path/to/test.js
```

## Security

- All API endpoints are protected with rate limiting
- JWT authentication for protected routes
- Input validation and sanitization
- XSS and CSRF protection
- Secure headers with Helmet
- SQL injection prevention

## Performance

- Redis caching for frequently accessed data
- Database query optimization
- Compression middleware
- Connection pooling
- Load balancing ready

## Monitoring

- Winston for logging
- Sentry for error tracking
- New Relic for performance monitoring
- Custom metrics collection

## Deployment

1. Set up environment variables
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a pull request

## License

This project is licensed under the ISC License.

## Support

For support, email support@bookshelvz.com or create an issue in the repository. 