import { json, error, corsPreflight } from '../_lib/db';
import { requireAuth } from '../_lib/auth';

export const config = { runtime: 'edge' };

export interface WarrantyItem {
  name: string;
  type: string;
  startDate?: string;
  endDate?: string;
  status: string;
  deliveryType?: string;
  description?: string;
}

export interface WarrantyLookupResponse {
  success: boolean;
  manufacturer: string;
  serialNumber: string;
  productName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  planName?: string;
  deliveryType?: string;
  supportUrl: string;
  requiresManualVerification?: boolean;
  message?: string;
  allWarranties?: WarrantyItem[];
}

/**
 * Query Lenovo PC Support for warranty details by Serial Number.
 */
async function lookupLenovo(serialNumber: string): Promise<WarrantyLookupResponse> {
  const cleanSn = serialNumber.trim();
  if (!cleanSn) throw new Error('Serial number is required');

  const prodRes = await fetch(
    `https://pcsupport.lenovo.com/in/en/api/v4/mse/getproducts?productId=${encodeURIComponent(cleanSn)}`,
    {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    }
  );

  if (!prodRes.ok) {
    throw new Error(`Lenovo product lookup failed with status ${prodRes.status}`);
  }

  const prods = (await prodRes.json()) as Array<{ Id: string; Name: string; Serial: string }>;
  if (!prods || prods.length === 0 || !prods[0]?.Id) {
    throw new Error(`No Lenovo product found for serial number "${cleanSn}"`);
  }

  const product = prods[0];
  const warrantyUrl = `https://pcsupport.lenovo.com/in/en/products/${product.Id.toLowerCase()}/warranty`;

  const pageRes = await fetch(warrantyUrl, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  });

  if (!pageRes.ok) {
    throw new Error(`Lenovo warranty page returned status ${pageRes.status}`);
  }

  const html = await pageRes.text();
  const match = html.match(/var\s+ds_warranties\s*=\s*(?:window\.ds_warranties\s*\|\|\s*)?(\{[\s\S]*?\});/);

  if (!match) {
    throw new Error('Could not parse warranty details from Lenovo support page');
  }

  const data = JSON.parse(match[1]);
  const rawList: any[] = [
    ...(Array.isArray(data.ContractWarranties) ? data.ContractWarranties : []),
    ...(Array.isArray(data.UpmaWarranties) ? data.UpmaWarranties : []),
    ...(Array.isArray(data.BaseWarranties) ? data.BaseWarranties : []),
  ];

  const allWarranties: WarrantyItem[] = rawList.map((w) => ({
    name: String(w.Name || w.WarrentyType || 'Standard Warranty'),
    type: String(w.Type || w.Category || 'WARRANTY'),
    startDate: String(w.Start || w.StartDate || ''),
    endDate: String(w.End || w.EndDate || ''),
    status: w.Status === 1 || w.StatusV2 === 'Active' ? 'Active' : 'Expired',
    deliveryType: String(w.DeliveryType || ''),
    description: String(w.Description || ''),
  }));

  // Find the primary / longest active warranty
  let primary = allWarranties.find((w) => w.name.toLowerCase().includes('premier') && w.status === 'Active');
  if (!primary) {
    primary = allWarranties
      .filter((w) => !w.name.toLowerCase().includes('battery'))
      .sort((a, b) => (String(b.endDate) > String(a.endDate) ? 1 : -1))[0];
  }
  if (!primary && allWarranties.length > 0) {
    primary = allWarranties[0];
  }

  return {
    success: true,
    manufacturer: 'Lenovo',
    serialNumber: product.Serial || cleanSn,
    productName: product.Name,
    startDate: primary?.startDate || undefined,
    endDate: primary?.endDate || undefined,
    status: primary?.status || 'Active',
    planName: primary?.name || 'Standard Warranty',
    deliveryType: primary?.deliveryType || undefined,
    supportUrl: 'https://pcsupport.lenovo.com/in/en/warranty-lookup#/',
    allWarranties,
  };
}

/**
 * Query Dell support or handle Dell TechDirect API.
 */
async function lookupDell(serviceTag: string): Promise<WarrantyLookupResponse> {
  const cleanTag = serviceTag.trim().toUpperCase();
  if (!cleanTag) throw new Error('Dell Service Tag is required');

  const clientId = process.env.DELL_CLIENT_ID;
  const clientSecret = process.env.DELL_CLIENT_SECRET;

  if (clientId && clientSecret) {
    try {
      const authRes = await fetch('https://apigtwb2c.us.dell.com/auth/oauth/v2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
        }),
      });

      if (authRes.ok) {
        const authData = (await authRes.json()) as { access_token?: string };
        const token = authData.access_token;
        if (token) {
          const apiRes = await fetch(
            `https://apigtwb2c.us.dell.com/PROD/sbil/eapi/v5/asset-entitlements?servicetags=${encodeURIComponent(cleanTag)}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
              },
            }
          );

          if (apiRes.ok) {
            const apiData: any = await apiRes.json();
            const entitlements = Array.isArray(apiData) ? apiData[0]?.entitlements : apiData?.entitlements;
            if (Array.isArray(entitlements) && entitlements.length > 0) {
              const latest = entitlements.sort((a: any, b: any) =>
                String(b.endDate) > String(a.endDate) ? 1 : -1
              )[0];
              return {
                success: true,
                manufacturer: 'Dell',
                serialNumber: cleanTag,
                productName: apiData[0]?.productLineDescription || undefined,
                startDate: latest.startDate?.split('T')[0],
                endDate: latest.endDate?.split('T')[0],
                status: new Date(latest.endDate) >= new Date() ? 'Active' : 'Expired',
                planName: latest.serviceLevelDescription || 'Dell Support',
                supportUrl: `https://www.dell.com/support/contractservices/en-in`,
              };
            }
          }
        }
      }
    } catch {
      /* Fall back to web portal redirect below */
    }
  }

  // Dell web portal fallback
  return {
    success: true,
    manufacturer: 'Dell',
    serialNumber: cleanTag,
    supportUrl: 'https://www.dell.com/support/contractservices/en-in',
    requiresManualVerification: true,
    message: 'Dell protects web lookups with Akamai. Use the link to check your warranty status on Dell Support Services.',
  };
}

export default async function handler(req: Request) {
  if (req.method === 'OPTIONS') return corsPreflight();

  const auth = await requireAuth(req);
  if (auth instanceof Response) return auth;

  const url = new URL(req.url);
  const serialNumber = (url.searchParams.get('serialNumber') || url.searchParams.get('serial') || '').trim();
  const manufacturer = (url.searchParams.get('manufacturer') || '').trim().toLowerCase();

  if (!serialNumber) {
    return error('Serial number is required', 400);
  }

  try {
    if (manufacturer.includes('dell')) {
      const result = await lookupDell(serialNumber);
      return json(result);
    }

    // Default to Lenovo or if manufacturer contains lenovo/thinkpad
    const result = await lookupLenovo(serialNumber);
    return json(result);
  } catch (err: any) {
    return error(err?.message || 'Warranty lookup failed', 400);
  }
}
