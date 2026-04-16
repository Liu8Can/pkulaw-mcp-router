export interface PublicCatalogItem {
  alias: string;
  productName: string;
  pubProductId: string;
  subpageUrl: string;
  apiUuid: string;
  swaggerUrl: string;
  serviceUrl: string;
  serviceUrlWithVersion: string;
  difyUrl: string;
  servicePath: string;
}

interface ProductListResponse {
  data?: {
    content?: Array<{
      productName?: string;
      pubProductId?: string;
      goodsList?: Array<{
        apiUuid?: string;
      }>;
    }>;
  };
}

interface SwaggerResponse {
  servers?: Array<{
    url?: string;
  }>;
}

function normalizeAlias(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function serviceAliasFromUrl(serviceUrl: string, fallback: string): string {
  try {
    const pathname = new URL(serviceUrl).pathname;
    const alias = normalizeAlias(pathname.replaceAll('/', '_'));
    return alias || fallback;
  } catch {
    return fallback;
  }
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      'User-Agent': 'pkulaw-mcp-router-discovery',
    },
  });

  if (!response.ok) {
    throw new Error(`请求失败：${response.status} ${response.statusText} ${url}`);
  }

  return (await response.json()) as T;
}

function stripVersionSuffix(url: string): string {
  return url.replace(/\/\d+\.\d+\.\d+\/?$/, '');
}

export async function discoverPublicCatalog(): Promise<PublicCatalogItem[]> {
  const productListUrl =
    'https://gateway.pkulaw.com/publish-hub/marketplace/product/getAllProductWithGoods?platform=PCPlatform&product=API_SUBSCRIPTION&pageSize=100&isMcpProduct=1';
  const productResponse = await getJson<ProductListResponse>(productListUrl);
  const content = productResponse.data?.content ?? [];

  const results: PublicCatalogItem[] = [];

  for (const product of content) {
    const productName = String(product.productName ?? '').trim();
    const pubProductId = String(product.pubProductId ?? '').trim();
    const apiUuid = String(product.goodsList?.[0]?.apiUuid ?? '').trim();

    if (!productName || !pubProductId || !apiUuid) {
      continue;
    }

    const swaggerUrl = `https://mcp.pkulaw.com/wso/api/am/devportal/apis/${apiUuid}/swagger`;
    const swagger = await getJson<SwaggerResponse>(swaggerUrl);
    const serviceUrlWithVersion = String(swagger.servers?.[0]?.url ?? '').trim();
    if (!serviceUrlWithVersion) {
      continue;
    }

    const serviceUrl = stripVersionSuffix(serviceUrlWithVersion);
    const alias = serviceAliasFromUrl(serviceUrl, normalizeAlias(productName));

    results.push({
      alias,
      productName,
      pubProductId,
      subpageUrl: `https://mcp.pkulaw.com/apis/${pubProductId}`,
      apiUuid,
      swaggerUrl,
      serviceUrl,
      serviceUrlWithVersion,
      difyUrl: `${serviceUrl}/mcp`,
      servicePath: new URL(serviceUrlWithVersion).pathname,
    });
  }

  return results.sort((a, b) => a.productName.localeCompare(b.productName, 'zh-CN'));
}

