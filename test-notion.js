// Quick test script to check Notion connection
const { Client } = require('@notionhq/client');
require('dotenv').config({ path: '.env.local' });

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID;

console.log('Testing Notion connection...');
console.log('Database ID:', NOTION_DATABASE_ID);
console.log('Token starts with:', NOTION_TOKEN?.substring(0, 10) + '...');

const notion = new Client({
  auth: NOTION_TOKEN,
});

async function test() {
  try {
    console.log('\n1. Testing database retrieval...');
    const database = await notion.databases.retrieve({ database_id: NOTION_DATABASE_ID });
    console.log('✅ Database found:', database.title?.[0]?.plain_text || 'Untitled');
    console.log('Database properties:', Object.keys(database.properties || {}).join(', '));
    
    console.log('\n2. Testing database query...');
    const query = await notion.databases.query({
      database_id: NOTION_DATABASE_ID,
      page_size: 1,
    });
    console.log('✅ Query successful. Results:', query.results.length);
    
    console.log('\n✅ All tests passed!');
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.status) {
      console.error('HTTP status:', error.status);
    }
  }
}

test();
