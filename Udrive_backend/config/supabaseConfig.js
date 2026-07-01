require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// সুপাবেস ক্লায়েন্ট ইনিশিয়েলাইজ করা
// আমাদের ডাটাবেস এর সাথে সংযোগ স্থাপন করা
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
);

module.exports = supabase;
