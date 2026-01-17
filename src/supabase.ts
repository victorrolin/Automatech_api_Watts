import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vghfzvevlfxtpitmqmsv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnaGZ6dmV2bGZ4dHBpdG1xbXN2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzkyMTM5NywiZXhwIjoyMDUzNDk3Mzk3fQ.EKK0O5goqoiTH_s1PnU4pQvMdQzkoE1F8-FYrOBvBh0';

export const supabase = createClient(supabaseUrl, supabaseKey);
