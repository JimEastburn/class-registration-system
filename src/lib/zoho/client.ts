

const ZOHO_AUTH_URL = 'https://accounts.zoho.com/oauth/v2/token';
const ZOHO_API_BASE = 'https://www.zohoapis.com/books/v3';

interface ZohoTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiry: number | null = null;

export async function getZohoAccessToken(): Promise<string> {
    // Check in-memory cache first (for same-request reliability)
    if (cachedAccessToken && tokenExpiry && Date.now() < tokenExpiry) {
        return cachedAccessToken;
    }

    const clientId = process.env.ZOHO_CLIENT_ID;
    const clientSecret = process.env.ZOHO_CLIENT_SECRET;
    const refreshToken = process.env.ZOHO_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
        throw new Error('Missing Zoho credentials in environment variables');
    }

    try {
        const params = new URLSearchParams({
            refresh_token: refreshToken,
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: 'refresh_token',
        });

        const response = await fetch(`${ZOHO_AUTH_URL}?${params.toString()}`, {
            method: 'POST',
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Zoho Token Refresh Failed: ${response.status} ${errorText}`);
        }

        const data: ZohoTokenResponse = await response.json();
        
        cachedAccessToken = data.access_token;
        // Expire slightly before actual expiry (usually 1 hour) to be safe
        tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

        return data.access_token;
    } catch (error) {
        console.error('Error fetching Zoho access token:', error);
        throw error;
    }
}

interface ZohoFetchOptions extends RequestInit {
    params?: Record<string, string>;
}

export async function zohoFetch<T>(endpoint: string, options: ZohoFetchOptions = {}): Promise<T> {
    const token = await getZohoAccessToken();
    const organizationId = process.env.ZOHO_ORGANIZATION_ID;

    if (!organizationId) {
        throw new Error('Missing ZOHO_ORGANIZATION_ID');
    }

    const { params, ...fetchOptions } = options;
    const url = new URL(`${ZOHO_API_BASE}${endpoint}`);
    
    url.searchParams.append('organization_id', organizationId);
    if (params) {
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });
    }

    const headers = {
        'Authorization': `Zoho-oauthtoken ${token}`,
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
    };

    const response = await fetch(url.toString(), {
        ...fetchOptions,
        headers,
    });

    if (!response.ok) {
         // Try to parse error details
         let errorMessage = `Zoho API Error: ${response.status}`;
         try {
             const errorData = await response.json();
             errorMessage += ` - ${errorData.message || JSON.stringify(errorData)}`;
         } catch {
             errorMessage += ` - ${await response.text()}`;
         }
         throw new Error(errorMessage);
    }

    const data = await response.json();
    return data; // Usually { code: 0, message: 'success', status: '...' }
}
