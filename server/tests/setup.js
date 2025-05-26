const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Create test Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test user credentials
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpassword123'
};

// Test admin credentials
const TEST_ADMIN = {
  email: 'admin@example.com',
  password: 'adminpassword123'
};

// Global test setup
beforeAll(async () => {
  // Create test user
  const { data: user, error: userError } = await supabase.auth.signUp({
    email: TEST_USER.email,
    password: TEST_USER.password
  });

  if (userError) {
    throw userError;
  }

  // Create test admin
  const { data: admin, error: adminError } = await supabase.auth.signUp({
    email: TEST_ADMIN.email,
    password: TEST_ADMIN.password
  });

  if (adminError) {
    throw adminError;
  }

  // Set admin role
  await supabase
    .from('user_profiles')
    .update({ role: 'admin' })
    .eq('user_id', admin.user.id);

  // Store tokens
  global.testUserToken = user.session.access_token;
  global.testAdminToken = admin.session.access_token;
});

// Global test teardown
afterAll(async () => {
  // Clean up test data
  await supabase.auth.signOut();
});

// Test utilities
const createTestBook = async (token) => {
  const { data, error } = await supabase
    .from('books')
    .insert([{
      title: 'Test Book',
      author: 'Test Author',
      description: 'Test Description',
      genre: 'Fiction',
      price: 9.99,
      isbn: '978-0000000000'
    }])
    .select()
    .single();

  if (error) throw error;
  return data;
};

const createTestOrder = async (token, bookId) => {
  const { data, error } = await supabase
    .from('orders')
    .insert([{
      user_id: (await supabase.auth.getUser(token)).data.user.id,
      status: 'pending',
      total_amount: 9.99,
      payment_method: 'credit_card',
      shipping_address: {
        street: '123 Test St',
        city: 'Test City',
        state: 'Test State',
        country: 'Test Country',
        zip_code: '12345'
      }
    }])
    .select()
    .single();

  if (error) throw error;

  // Create order item
  await supabase
    .from('order_items')
    .insert([{
      order_id: data.id,
      book_id: bookId,
      quantity: 1,
      price: 9.99,
      total: 9.99
    }]);

  return data;
};

module.exports = {
  supabase,
  TEST_USER,
  TEST_ADMIN,
  createTestBook,
  createTestOrder
}; 