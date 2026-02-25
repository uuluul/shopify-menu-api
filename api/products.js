const SHOP = 'the-so-good-kitchen-3.myshopify.com';
const API_VERSION = '2024-01';

async function getAccessToken() {
  const response = await fetch(`https://${SHOP}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.SHOPIFY_CLIENT_ID,
      client_secret: process.env.SHOPIFY_CLIENT_SECRET,
      grant_type: 'client_credentials'
    })
  });
  if (!response.ok) throw new Error(`Token error ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.access_token;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const token = await getAccessToken();
    if (!token) return res.status(401).json({ error: 'Cannot get access token' });

    // GET：讀取所有產品
    if (req.method === 'GET') {
      const r = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/products.json?limit=250`, {
        headers: { 'X-Shopify-Access-Token': token }
      });
      const data = await r.json();
      return res.status(200).json(data.products || []);
    }

    // POST：新增產品
    if (req.method === 'POST') {
      const { title, price, body_html, status, image_base64, collection_id } = req.body;
      if (!title || !price) return res.status(400).json({ error: '缺少名稱或價格' });

      const productPayload = {
        product: {
          title,
          body_html: body_html || '',
          status: status || 'active',
          variants: [{ price: String(price), inventory_management: null }]
        }
      };

      if (image_base64) {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = image_base64.match(/^data:(image\/\w+);base64,/);
        const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'jpeg';
        productPayload.product.images = [{ attachment: base64Data, filename: 'product.' + ext }];
      }

      const r = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/products.json`, {
        method: 'POST',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      const data = await r.json();
      if (!data.product) return res.status(400).json({ error: JSON.stringify(data) });

      // 加入指定 Collection
      if (collection_id) {
        await fetch(`https://${SHOP}/admin/api/${API_VERSION}/collects.json`, {
          method: 'POST',
          headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            collect: {
              product_id: data.product.id,
              collection_id: collection_id
            }
          })
        });
      }

      return res.status(200).json({ success: true, product: data.product });
    }

    // PUT：更新產品
    if (req.method === 'PUT') {
      const { id, title, price, body_html, status, image_base64 } = req.body;

      const productPayload = {
        product: { id, title, body_html: body_html || '', status: status || 'active' }
      };

      if (image_base64) {
        const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
        const mimeMatch = image_base64.match(/^data:(image\/\w+);base64,/);
        const ext = mimeMatch ? mimeMatch[1].split('/')[1] : 'jpeg';
        productPayload.product.images = [{ attachment: base64Data, filename: 'product.' + ext }];
      }

      const productRes = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/products/${id}.json`, {
        method: 'PUT',
        headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
        body: JSON.stringify(productPayload)
      });
      const productData = await productRes.json();
      if (!productData.product) return res.status(400).json({ error: JSON.stringify(productData) });

      // 更新價格
      if (price !== undefined && productData.product.variants?.[0]) {
        const variantId = productData.product.variants[0].id;
        await fetch(`https://${SHOP}/admin/api/${API_VERSION}/variants/${variantId}.json`, {
          method: 'PUT',
          headers: { 'X-Shopify-Access-Token': token, 'Content-Type': 'application/json' },
          body: JSON.stringify({ variant: { id: variantId, price: String(price) } })
        });
      }

      return res.status(200).json({ success: true });
    }

    // DELETE：刪除產品
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const r = await fetch(`https://${SHOP}/admin/api/${API_VERSION}/products/${id}.json`, {
        method: 'DELETE',
        headers: { 'X-Shopify-Access-Token': token }
      });
      if (r.status === 200 || r.status === 204) return res.status(200).json({ success: true });
      const text = await r.text();
      return res.status(r.status).json({ error: text });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}
