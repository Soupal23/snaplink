// utils/securityCheck.js
const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');
const validator = require('validator');

/**
 * Checks if a hostname resolves to a private, loopback, or internal IP address (SSRF Protection).
 */
async function isPrivateHost(hostname) {
  // Direct hostname checks for common internal names
  const blockedNames = ['localhost', 'loopback', '0.0.0.0'];
  if (blockedNames.includes(hostname.toLowerCase()) || hostname.endsWith('.local')) {
    return true;
  }

  try {
    // Resolve DNS hostname to IP address
    const addresses = await dns.lookup(hostname, { all: true });

    for (const record of addresses) {
      const ip = record.address;

      if (ipaddr.isValid(ip)) {
        const parsedIp = ipaddr.parse(ip);
        const range = parsedIp.range();

        // Block private, loopback, linkLocal, carrierGradeNat, etc.
        if (
          range === 'loopback' ||
          range === 'private' ||
          range === 'linkLocal' ||
          range === 'uniqueLocal' ||
          range === 'unspecified'
        ) {
          return true;
        }
      }
    }
  } catch (err) {
    // DNS resolution failure (invalid domain)
    throw new Error('Invalid host or unreachable domain.');
  }

  return false;
}

/**
 * Checks URL against Google Safe Browsing API (Phishing / Malware check)
 * Requires a free API Key from Google Cloud Console.
 */
async function isMaliciousUrl(targetUrl) {
  const apiKey = process.env.GOOGLE_SAFE_BROWSING_KEY;
  if (!apiKey) return false; // Skip if API key is not configured

  try {
    const response = await fetch(
      `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(4000),
        body: JSON.stringify({
          client: { clientId: 'snaplink', clientVersion: '1.0.0' },
          threatInfo: {
            threatTypes: ['MALWARE', 'SOCIAL_ENGINEERING', 'UNWANTED_SOFTWARE'],
            platformTypes: ['ANY_PLATFORM'],
            threatEntryTypes: ['URL'],
            threatEntries: [{ url: targetUrl }],
          },
        }),
      }
    );

    const data = await response.json();
    // If matches array exists and is not empty, it's flagged as dangerous
    return Boolean(data.matches && data.matches.length > 0);
  } catch (err) {
    console.error('Safe Browsing API check failed:', err);
    return false; // Fail open to avoid blocking valid URLs if the API is temporarily down
  }
}

module.exports = { isPrivateHost, isMaliciousUrl };