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

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await getAccessToken();

    if (!token) {
      return res.status(401).json({ error: 'Cannot get access token' });
    }

    // GET：讀取所有產品
    if (req.method === 'GET') {
      const response = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/products.json?limit=250&status=active`,
        { headers: { 'X-Shopify-Access-Token': token } }
      );

      if (!response.ok) {
        const text = await response.text();
        return res.status(response.status).json({ error: text });
      }

      const data = await response.json();
      return res.status(200).json(data.products || []);
    }

    // PUT：更新產品
    if (req.method === 'PUT') {
      const { id, title, price, body_html, status } = req.body;

      const productRes = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/products/${id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            product: { id, title, body_html: body_html || '', status: status || 'active' }
          })
        }
      );

      const productData = await productRes.json();

      // 更新價格
      if (price && productData.product?.variants?.[0]) {
        const variantId = productData.product.variants[0].id;
        await fetch(
          `https://${SHOP}/admin/api/${API_VERSION}/variants/${variantId}.json`,
          {
            method: 'PUT',
            headers: {
              'X-Shopify-Access-Token': token,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ variant: { id: variantId, price: String(price) } })
          }
        );
      }

      return res.status(200).json({ success: true, product: productData.product });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
