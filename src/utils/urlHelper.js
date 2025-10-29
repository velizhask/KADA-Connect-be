/**
 * URL Helper Utilities
 * Converts external image URLs to proxy URLs to bypass CORS restrictions
 */

/**
 * Convert image URL to proxy URL if needed
 * @param {string} imageUrl - Original image URL
 * @param {string} baseUrl - Base URL of the API (optional, defaults to current domain)
 * @returns {string} - Proxy URL or original URL if no proxy needed
 */
function convertToProxyUrl(imageUrl, baseUrl = null) {
  console.log(`[URL Helper] Processing URL: ${imageUrl}`);

  // Return null or empty as-is
  if (!imageUrl || imageUrl.trim() === '') {
    console.log(`[URL Helper] URL is empty or null, returning as-is`);
    return imageUrl;
  }

  // If it's already a proxy URL, return as-is
  if (imageUrl.includes('/api/proxy/image')) {
    console.log(`[URL Helper] URL is already a proxy URL, returning as-is`);
    return imageUrl;
  }

  // If it's a relative URL, return as-is
  if (imageUrl.startsWith('/') || !imageUrl.startsWith('http')) {
    console.log(`[URL Helper] URL is relative or non-HTTP, returning as-is`);
    return imageUrl;
  }

  try {
    // Check if it's a Google Drive URL or other external URL that needs proxying
    const url = new URL(imageUrl);
    console.log(`[URL Helper] Parsed URL hostname: ${url.hostname}`);

    const needsProxy = [
      'drive.google.com',
      'lh3.googleusercontent.com',
      'cdn.pixabay.com',
      'images.unsplash.com',
      'images.pexels.com'
    ].some(domain => url.hostname.toLowerCase().includes(domain));

    console.log(`[URL Helper] Needs proxy: ${needsProxy} for domain: ${url.hostname}`);

    if (!needsProxy) {
      console.log(`[URL Helper] Domain not in proxy list, returning original URL`);
      return imageUrl; // Return original URL if no proxy needed
    }

    // Construct proxy URL
    const apiBaseUrl = baseUrl || process.env.API_BASE_URL || '';
    console.log(`[URL Helper] Using API base URL: ${apiBaseUrl}`);

    const proxyUrl = `${apiBaseUrl}/api/proxy/image?url=${encodeURIComponent(imageUrl)}`;

    console.log(`[URL Helper] Successfully converted to proxy URL: ${imageUrl} -> ${proxyUrl}`);
    return proxyUrl;

  } catch (error) {
    console.error('[URL Helper] Error converting URL:', error.message);
    return imageUrl; // Return original URL if conversion fails
  }
}

/**
 * Convert multiple image URLs in an object to proxy URLs
 * @param {Object} data - Object containing image URLs
 * @param {Array<string>} imageFields - Array of field names that contain image URLs
 * @param {string} baseUrl - Base URL of the API (optional)
 * @returns {Object} - Object with proxy URLs
 */
function convertImageUrlsToProxy(data, imageFields = ['logo', 'profilePhoto'], baseUrl = null) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const convertedData = { ...data };

  imageFields.forEach(field => {
    if (convertedData[field] && typeof convertedData[field] === 'string') {
      convertedData[field] = convertToProxyUrl(convertedData[field], baseUrl);
    }
  });

  return convertedData;
}

/**
 * Convert an array of objects with image URLs to proxy URLs
 * @param {Array} items - Array of objects containing image URLs
 * @param {Array<string>} imageFields - Array of field names that contain image URLs
 * @param {string} baseUrl - Base URL of the API (optional)
 * @returns {Array} - Array with proxy URLs
 */
function convertImageUrlsInArray(items, imageFields = ['logo', 'profilePhoto'], baseUrl = null) {
  if (!Array.isArray(items)) {
    return items;
  }

  return items.map(item => convertImageUrlsToProxy(item, imageFields, baseUrl));
}

module.exports = {
  convertToProxyUrl,
  convertImageUrlsToProxy,
  convertImageUrlsInArray
};