const SHOP = 'the-so-good-kitchen-3.myshopify.com';
const API_VERSION = '2024-01';

async function getAccessToken() {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;

  const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'client_credentials'
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Token error ${response.status}: ${text}`);
  }

  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getAccessToken();
    if (!token) return res.status(401).json({ error: 'Cannot get access token' });

    // GET：讀取所有產品
    if (req.method === 'GET') {
      const response = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/products.json?limit=250`,
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
      const { id, title, price, body_html, status, image_base64 } = req.body;

      // 更新產品基本資訊
      const productPayload = {
        product: {
          id,
          title,
          body_html: body_html || '',
          status: status || 'active'
        }
      };

      // 如果有上傳新照片
      if (image_base64) {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = image_base64.match(/^data:(image\/\w+);base64,/);
        const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
        productPayload.product.images = [{
          attachment: base64Data,
          filename: 'product-image.' + mimeType.split('/')[1]
        }];
      }

      const productRes = await fetch(
        `https://${SHOP}/admin/api/${API_VERSION}/products/${id}.json`,
        {
          method: 'PUT',
          headers: {
            'X-Shopify-Access-Token': token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(productPayload)
        }
      );

      const productData = await productRes.json();
      if (!productData.product) {
        return res.status(400).json({ error: JSON.stringify(productData) });
      }

      // 更新價格
      if (price !== undefined && productData.product.variants?.[0]) {
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

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
