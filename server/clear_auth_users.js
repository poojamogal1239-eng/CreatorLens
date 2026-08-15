const supabase = require('./config/supabase');

async function clearAuthUsers() {
  console.log("=== CLEARING SUPABASE AUTH USERS ===");
  
  try {
    // 1. List all users in Supabase Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      throw error;
    }
    
    console.log(`Found ${users.length} users in Supabase Auth.`);
    
    // 2. Loop and delete each user
    for (const user of users) {
      console.log(`Deleting user: ${user.email} (${user.id})...`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(user.id);
      if (delErr) {
        console.error(`Failed to delete ${user.email}:`, delErr.message);
      } else {
        console.log(`Successfully deleted ${user.email}`);
      }
    }
    
    console.log("=== SUPABASE AUTH USERS SUCCESSFULLY CLEARED ===");
  } catch (err) {
    console.error("Error clearing auth users:", err.message);
  }
}

clearAuthUsers();
