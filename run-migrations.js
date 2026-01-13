import { createClient } from '@supabase/supabase-js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Supabase credentials from environment or defaults
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://hvbjysojjrdkszuvczbc.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2Ymp5c29qanJka3N6dXZjemJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5MzE2NjYsImV4cCI6MjA3OTUwNzY2Nn0.mv-Lrl1fvXbwFSlgeNSex_HcGiEriOmcjthtrXRZpFA";

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration(sqlFile) {
  try {
    console.log(`Running migration: ${sqlFile}`);
    
    // Read the SQL file
    const sqlPath = join(__dirname, sqlFile);
    const sql = await readFile(sqlPath, 'utf8');
    
    // Split the SQL into individual statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      if (statement.startsWith('--') || statement.trim().length === 0) {
        continue; // Skip comments and empty statements
      }
      
      console.log(`Executing: ${statement.substring(0, 100)}...`);
      
      // For INSERT statements, we need to use the Supabase client differently
      if (statement.toUpperCase().startsWith('INSERT INTO')) {
        // Parse INSERT statement
        const match = statement.match(/INSERT INTO (\w+) \(([^)]+)\) VALUES \(([^)]+)\)/i);
        if (match) {
          const tableName = match[1];
          const columns = match[2].split(',').map(c => c.trim());
          const values = match[3].split(',').map(v => {
            const trimmed = v.trim();
            if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
              return trimmed.slice(1, -1); // Remove quotes
            }
            if (trimmed === 'true') return true;
            if (trimmed === 'false') return false;
            if (!isNaN(trimmed)) return Number(trimmed);
            return trimmed;
          });
          
          const data = {};
          columns.forEach((col, i) => {
            data[col] = values[i];
          });
          
          const { error } = await supabase.from(tableName).insert(data);
          if (error) {
            console.error(`Error inserting into ${tableName}:`, error);
          } else {
            console.log(`Successfully inserted into ${tableName}`);
          }
        }
      } else if (statement.toUpperCase().startsWith('CREATE TABLE')) {
        // For CREATE TABLE statements, we'll execute them as raw SQL
        const { error } = await supabase.rpc('execute_sql', { sql: statement });
        if (error) {
          console.error('Error creating table:', error);
        } else {
          console.log('Table created successfully');
        }
      } else {
        console.log(`Skipping statement: ${statement.substring(0, 50)}...`);
      }
    }
    
    console.log(`Migration ${sqlFile} completed successfully`);
  } catch (error) {
    console.error(`Error running migration ${sqlFile}:`, error);
  }
}

async function main() {
  console.log('Starting database migrations...');
  
  // Run the main schema migration
  await runMigration('database-schema.sql');
  
  // Run the pricing plans migration
  await runMigration('add-pricing-plans.sql');
  
  // Run the transactions table migration
  await runMigration('supabase/migrations/20240320_create_transactions_table.sql');
  
  console.log('All migrations completed!');
}

main();