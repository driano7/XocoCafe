
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf-8');

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.trim();
    }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('Checking columns for table: products');
    const { data, error } = await supabase
        .from('products')
        .select('metadata,items')
        .limit(1);

    if (error) {
        console.error('Error querying columns:', error.message);
        if (error.message.includes('does not exist')) {
            console.log('CONFIRMED: Columns do not exist.');
        }
    } else {
        console.log('SUCCESS: Columns exist. Query returned:', data);
    }
}

checkColumns();
