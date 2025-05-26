const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY; // Use anon key or service role key based on needs

if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or Key is not defined in environment variables.');
  // In a real application, you might want to throw an error or handle this differently
  // process.exit(1); // Exiting process is a strong measure, use with caution
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase; 