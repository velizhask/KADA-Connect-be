const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[ERROR] Supabase URL or service key is missing. Make sure to provide them in the .env file.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const testConnection = async () => {
  try {
    const { data, error } = await supabase.from('companies').select('id').limit(1);
    if (error) {
      console.error('[ERROR] Supabase connection test failed:', error.message);
      return false;
    }
    console.log('[SUCCESS] Supabase connection successful');
    return true;
  } catch (error) {
    console.error('[ERROR] Supabase connection test failed:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  testConnection,
};
