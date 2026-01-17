import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vghfzvevlfxtpitmqmsv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaGZ6dmV2bGZ4dHBpdG1xbXN2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzc5MjEzOTcsImV4cCI6MjA1MzQ5NzM5N30.Mj19WhQZdr6ESn9_umCZGwXCdC-knHao89hYMaohmag';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
