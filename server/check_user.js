const supabase = require('./config/supabase');

async function checkUser() {
  const emailToCheck = 'aadhya@gmail.com';
  console.log(`=== CHECKING FOR USER: ${emailToCheck} ===\n`);

  try {
    // 1. Check in public.users table
    const { data: dbUsers, error: dbErr } = await supabase
      .from('users')
      .select('*')
      .eq('email', emailToCheck);

    if (dbErr) {
      console.error("Error querying public.users:", dbErr.message);
    } else {
      console.log("1. Public.users Table Status:");
      if (dbUsers.length > 0) {
        console.log(`   FOUND! User record in database:`, JSON.stringify(dbUsers[0], null, 2));
      } else {
        console.log(`   NOT FOUND in public.users table.`);
      }
    }

    // 2. Check in public.creators table (just in case they registered as creator)
    if (dbUsers.length > 0) {
      const { data: creatorData, error: creatorErr } = await supabase
        .from('creators')
        .select('*')
        .eq('id', dbUsers[0].id);

      if (creatorErr) {
        console.error("Error querying public.creators:", creatorErr.message);
      } else {
        console.log("\n2. Public.creators Profile Status:");
        if (creatorData.length > 0) {
          console.log(`   FOUND creator profile:`, JSON.stringify(creatorData[0], null, 2));
        } else {
          console.log(`   No creator profile record found for this ID.`);
        }
      }
    }

    // 3. Check in Supabase Auth (admin panel auth schema)
    const { data: { users }, error: authErr } = await supabase.auth.admin.listUsers();
    if (authErr) {
      console.error("Error querying auth.users:", authErr.message);
    } else {
      const authUser = users.find(u => u.email.toLowerCase() === emailToCheck.toLowerCase());
      console.log("\n3. Supabase Auth System Status:");
      if (authUser) {
        console.log(`   FOUND in Supabase Auth:`);
        console.log(`   ID: ${authUser.id}`);
        console.log(`   Email confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`);
      } else {
        console.log(`   NOT FOUND in Supabase Auth.`);
      }
    }

  } catch (err) {
    console.error("System Error running check:", err.message);
  }
}

checkUser();
