# BookShelf

A modern web application for browsing and purchasing books with integrated social media payment processing.

## Features

- Browse and search books catalog
- Add books to shelf with WhatsApp/Instagram payment integration
- User shelves with PDF access
- Reading statistics and preferences
- Dynamic theme based on reading genres
- Admin panel for order management and PDF uploads

## Tech Stack

- Frontend: React + Tailwind CSS
- Backend: Node.js + Express
- Database: Supabase
- PDF Viewer: PDF.js

## Project Structure

```
bookshelf/
├── client/                 # React frontend
├── server/                 # Node.js backend
├── .env.example           # Example environment variables
└── README.md              # Project documentation
```

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```bash
   # Install backend dependencies
   cd server
   npm install

   # Install frontend dependencies
   cd ../client
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env` in both client and server directories
   - Fill in your Supabase credentials and other configuration

4. Start the development servers:
   ```bash
   # Start backend server
   cd server
   npm run dev

   # Start frontend server
   cd ../client
   npm start
   ```

## Environment Variables

### Backend (.env)
```
PORT=5000
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
JWT_SECRET=your_jwt_secret
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
REACT_APP_SUPABASE_URL=your_supabase_url
REACT_APP_SUPABASE_KEY=your_supabase_key
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 