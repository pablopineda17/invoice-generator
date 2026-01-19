// Netlify serverless function to proxy Notion API requests
// This keeps the API key secure on the server side

const NOTION_API_KEY = process.env.NOTION_API_KEY;
const CLIENTS_DB = process.env.NOTION_CLIENTS_DB;
const INVOICES_DB = process.env.NOTION_INVOICES_DB;

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

// Helper to make Notion API requests
async function notionRequest(endpoint, method = 'GET', body = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json'
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`https://api.notion.com/v1${endpoint}`, options);
  return response.json();
}

// GET /api/notion?action=getClients - Fetch all clients
async function getClients() {
  const data = await notionRequest(`/databases/${CLIENTS_DB}/query`, 'POST', {
    sorts: [{ property: 'Name', direction: 'ascending' }]
  });

  // Transform Notion response to simple client objects
  const clients = data.results.map(page => ({
    id: page.id,
    name: page.properties.Name?.title?.[0]?.plain_text || '',
    email: page.properties.Email?.email || '',
    address: page.properties.Address?.rich_text?.[0]?.plain_text || '',
    city: page.properties.City?.rich_text?.[0]?.plain_text || '',
    state: page.properties.State?.rich_text?.[0]?.plain_text || '',
    zipCode: page.properties['Zip Code']?.rich_text?.[0]?.plain_text || '',
    country: page.properties.Country?.rich_text?.[0]?.plain_text || '',
    logo: page.properties.Logo?.files?.[0]?.file?.url || page.properties.Logo?.files?.[0]?.external?.url || ''
  }));

  return { clients };
}

// POST /api/notion?action=createClient - Create a new client
async function createClient(clientData) {
  const data = await notionRequest(`/pages`, 'POST', {
    parent: { database_id: CLIENTS_DB },
    properties: {
      'Name': { title: [{ text: { content: clientData.name || '' } }] },
      'Email': { email: clientData.email || null },
      'Address': { rich_text: [{ text: { content: clientData.address || '' } }] },
      'City': { rich_text: [{ text: { content: clientData.city || '' } }] },
      'State': { rich_text: [{ text: { content: clientData.state || '' } }] },
      'Zip Code': { rich_text: [{ text: { content: clientData.zipCode || '' } }] },
      'Country': { rich_text: [{ text: { content: clientData.country || '' } }] }
    }
  });

  return {
    success: true,
    client: {
      id: data.id,
      ...clientData
    }
  };
}

// POST /api/notion?action=saveInvoice - Save invoice to Notion
async function saveInvoice(invoiceData) {
  // Build properties object - only include fields that have values
  const properties = {
    'Invoice Number': { title: [{ text: { content: invoiceData.invoiceNumber || '' } }] }
  };

  // Add optional date fields
  if (invoiceData.issueDate) {
    properties['Issue Date'] = { date: { start: invoiceData.issueDate } };
  }
  if (invoiceData.dueDate) {
    properties['Due Date'] = { date: { start: invoiceData.dueDate } };
  }

  // Add text fields
  if (invoiceData.lineItems) {
    properties['Line Items'] = { rich_text: [{ text: { content: invoiceData.lineItems } }] };
  }
  if (invoiceData.notes) {
    properties['Notes'] = { rich_text: [{ text: { content: invoiceData.notes } }] };
  }
  if (invoiceData.customFooter) {
    properties['Custom Footer'] = { rich_text: [{ text: { content: invoiceData.customFooter } }] };
  }

  // Add number fields
  if (invoiceData.subtotal !== undefined) {
    properties['Subtotal'] = { number: parseFloat(invoiceData.subtotal) || 0 };
  }
  if (invoiceData.taxRate !== undefined) {
    properties['Tax Rate'] = { number: parseFloat(invoiceData.taxRate) || 0 };
  }
  if (invoiceData.taxAmount !== undefined) {
    properties['Tax Amount'] = { number: parseFloat(invoiceData.taxAmount) || 0 };
  }
  if (invoiceData.total !== undefined) {
    properties['Total'] = { number: parseFloat(invoiceData.total) || 0 };
  }

  // Add select fields
  if (invoiceData.currency) {
    properties['Currency'] = { select: { name: invoiceData.currency } };
  }
  if (invoiceData.status) {
    properties['Status'] = { select: { name: invoiceData.status } };
  }

  // Add client relation if provided
  if (invoiceData.clientId) {
    properties['Client'] = { relation: [{ id: invoiceData.clientId }] };
  }

  const data = await notionRequest(`/pages`, 'POST', {
    parent: { database_id: INVOICES_DB },
    properties
  });

  // Check for errors from Notion
  if (data.object === 'error') {
    throw new Error(data.message || 'Failed to create invoice in Notion');
  }

  return {
    success: true,
    invoiceId: data.id
  };
}

// Proxy image to avoid CORS issues
async function proxyImage(imageUrl) {
  const response = await fetch(imageUrl);
  const arrayBuffer = await response.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  const contentType = response.headers.get('content-type') || 'image/png';
  return {
    base64,
    contentType,
    dataUrl: `data:${contentType};base64,${base64}`
  };
}

// Main handler
exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const params = event.queryStringParameters || {};
    const action = params.action;

    let result;

    switch (action) {
      case 'getClients':
        result = await getClients();
        break;

      case 'createClient':
        const clientData = JSON.parse(event.body);
        result = await createClient(clientData);
        break;

      case 'saveInvoice':
        const invoiceData = JSON.parse(event.body);
        result = await saveInvoice(invoiceData);
        break;

      case 'proxyImage':
        const imageUrl = params.url;
        if (!imageUrl) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Missing url parameter' })
          };
        }
        result = await proxyImage(imageUrl);
        break;

      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action. Use: getClients, createClient, saveInvoice, or proxyImage' })
        };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Notion API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    };
  }
};
