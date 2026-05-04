// grant-pro.js — Grant Pro access to a user by email
// Usage: node grant-pro.js <email>
// Updates subscription_tier to 'pro' in Supabase profiles table

const SUPABASE_URL = 'https://auevehneizminspolipf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF1ZXZlaG5laXptaW5zcG9saXBmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzNTAyMzMsImV4cCI6MjA5MDkxMzAzMywiY3JlYXRlZEF0IjoiMjAyNi0wNC0wM1QxODo0Mjo0NS4wMjhaIn0.4mO5TfJwQDqE_EEyIq1d5I0aXKF1bE7w5o4wW1HKMPk';
// Service role key needed for admin operations (bypasses RLS)
// If you only have anon key, you'll need to use the Supabase dashboard SQL editor instead

const email = process.argv[2];

if (!email) {
  console.error('Usage: node grant-pro.js <email>');
  console.error('Example: node grant-pro.js jane@example.com');
  process.exit(1);
}

async function grantPro() {
  // Step 1: Find user by email in auth.users (need service role for this)
  // With anon key, we'll try to find the profile that matches
  // The user must have signed in at least once to have a profile
  
  console.log(`Looking up user: ${email}`);
  
  // First, we need to find the user ID. With anon key + RLS, we can't query auth.users
  // So we'll search profiles by email if that column exists, or use auth admin API
  
  // Option A: If profiles table has an email column
  let profileRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?select=id,email,subscription_tier&email=eq.${encodeURIComponent(email)}`, {
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
    }
  });
  
  let profiles = await profileRes.json();
  
  if (!profiles || profiles.length === 0) {
    // Option B: Try auth admin API (requires service role key)
    console.log('No profile found with anon key. This likely means:');
    console.log('1. The user hasn\'t signed up yet, OR');
    console.log('2. RLS blocks anon access to other users\' profiles');
    console.log('');
    console.log('EASIEST APPROACH: Run this SQL in Supabase Dashboard > SQL Editor:');
    console.log('');
    console.log(`-- Find user ID`);
    console.log(`SELECT id, email FROM auth.users WHERE email = '${email}';`);
    console.log('');
    console.log(`-- Grant Pro (replace USER_ID with the id from above)`);
    console.log(`UPDATE profiles SET subscription_tier = 'pro' WHERE id = 'USER_ID';`);
    console.log('');
    console.log(`-- Verify`);
    console.log(`SELECT id, email, subscription_tier FROM profiles WHERE email = '${email}';`);
    process.exit(1);
  }
  
  const userId = profiles[0].id;
  console.log(`Found user: ${userId} (current tier: ${profiles[0].subscription_tier || 'free'})`);
  
  // Step 2: Update to Pro
  const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles?id=eq.${userId}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ subscription_tier: 'pro' })
  });
  
  if (updateRes.ok) {
    const updated = await updateRes.json();
    console.log(`✅ Pro access granted for ${email}!`);
    console.log(`   Tier: ${updated[0]?.subscription_tier}`);
  } else {
    const err = await updateRes.text();
    console.log(`❌ Update failed (likely RLS): ${err}`);
    console.log('');
    console.log('Use Supabase Dashboard > SQL Editor instead:');
    console.log(`UPDATE profiles SET subscription_tier = 'pro' WHERE id = '${userId}';`);
  }
}

grantPro().catch(console.error);