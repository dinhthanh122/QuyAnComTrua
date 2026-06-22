import * as dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function getOpenAPI() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`;
  const res = await fetch(url);
  const json = await res.json();
  const defs = json.definitions;
  
  if (defs) {
    console.log("All tables:");
    console.log(Object.keys(defs));
  } else {
    console.log("Not found in definitions");
  }
}
getOpenAPI();
