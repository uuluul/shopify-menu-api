const SHOP = 'the-so-good-kitchen-3.myshopify.com';
const API_VERSION = '2024-01';

async function getAccessToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  
  const response = await fetch(
    `https://${SHOP}/admin/oauth/access_token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials'
      })
    }
  );
  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  // 允許跨域（讓 Shopify 頁面可以呼叫）
  res.setHeader('Access-Control-Allow-Origin', 'https://hojiafoods.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await getAccessToken();
    
    // GET：讀取所有產品
    if (req.method === 'GET') {
      const response = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/products.json?limit=250`,
        { headers: { 'X-Shopify-Access-Token': token } }
      );
      const data = await response.json();
      return res.status(200).json(data.products);
    }
    
    // PUT：更新單一產品
    if (req.method === 'PUT') {
      const { id, title, price, description, status } = req.body;
      
      // 先更新產品基本資訊
      const productRes = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/products/${id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product: { id, title, body_html: description, status }
          })
        }
      );
      const productData = await productRes.json();
      
      // 如果有改價格，另外更新 variant
      if (price && productData.product.variants[0]) {
        const variantId = productData.product.variants[0].id;
        await fetch(
          `https://${SHOP}/admin/api/${API_VERSION}/variants/${variantId}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ variant: { id: variantId, price } })
          }
        );
      }
      
      return res.status(200).json({ success: true });
    }

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
