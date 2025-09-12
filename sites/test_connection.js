// 使用内置的fetch API

async function testConnection() {
  try {
    console.log('Testing connection to authoring:8000...');
    const response = await fetch('http://authoring:8000/api/channels?site=aivoya.com&fields=id,slug,name,order');
    console.log('Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Channels count:', data.channels?.length || 0);
      console.log('Meta:', data.meta);
    } else {
      console.log('Response not ok:', response.status, response.statusText);
    }
  } catch (error) {
    console.error('Connection error:', error.message);
  }
}

testConnection();
