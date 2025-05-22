const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create .env files
const clientEnv = `REACT_APP_SUPABASE_URL=https://vzyjahpxhcmkwffrlybs.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6eWphaHB4aGNta3dmZnJseWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NDMxMDUsImV4cCI6MjA2MjIxOTEwNX0.rI0LLJ5QCtk4CXbSeVIxDqWYeyoTkjyBwgRcJ_RxVyE
REACT_APP_LINKTREE_URL=https://linktr.ee/BookShelvzz`;

const serverEnv = `PORT=5000
SUPABASE_URL=https://vzyjahpxhcmkwffrlybs.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ6eWphaHB4aGNta3dmZnJseWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NDMxMDUsImV4cCI6MjA2MjIxOTEwNX0.rI0LLJ5QCtk4CXbSeVIxDqWYeyoTkjyBwgRcJ_RxVyE
JWT_SECRET=your-secret-key-here`;

// Write .env files
fs.writeFileSync(path.join(__dirname, 'client', '.env'), clientEnv);
fs.writeFileSync(path.join(__dirname, 'server', '.env'), serverEnv);

console.log('Created .env files');

// Install dependencies and start servers
try {
  // Install client dependencies
  console.log('Installing client dependencies...');
  execSync('cd client && npm install', { stdio: 'inherit' });

  // Install server dependencies
  console.log('Installing server dependencies...');
  execSync('cd server && npm install', { stdio: 'inherit' });

  // Start the application
  console.log('Starting the application...');
  
  // Start server in background
  const server = execSync('cd server && npm start', { stdio: 'inherit', detached: true });
  server.unref();

  // Start client
  console.log('Starting client...');
  execSync('cd client && npm start', { stdio: 'inherit' });

} catch (error) {
  console.error('Error during setup:', error);
  process.exit(1);
} 