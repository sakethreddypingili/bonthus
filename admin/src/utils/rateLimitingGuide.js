/**
 * RATE LIMITING IMPLEMENTATION GUIDE
 * 
 * This file documents how to implement rate limiting to prevent:
 * - Brute force login attacks
 * - DoS (Denial of Service) attacks
 * - Account enumeration
 * - API abuse
 */

// ============================================
// OPTION 1: Using Supabase Edge Functions
// ============================================
// Create a new Edge Function: supabase/functions/authenticate

/*
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const rateLimit = new Map(); // IP -> {count, timestamp}
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const clientIP = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  const record = rateLimit.get(clientIP) || { count: 0, timestamp: now };

  // Reset if window expired
  if (now - record.timestamp > WINDOW_MS) {
    record.count = 0;
    record.timestamp = now;
  }

  // Check rate limit
  record.count++;
  if (record.count > MAX_ATTEMPTS) {
    return new Response(
      JSON.stringify({ error: 'Too many login attempts. Try again later.' }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  }

  rateLimit.set(clientIP, record);

  // Process login here
  const { email, password } = await req.json();
  // ... authentication logic ...

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
});
*/

// ============================================
// OPTION 2: Using a Backend Server (Node.js)
// ============================================
// Install: npm install express-rate-limit

/*
const rateLimit = require('express-rate-limit');
const express = require('express');

const app = express();

// Rate limit for login endpoint
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // max 5 requests per windowMs
  message: 'Too many login attempts. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for IP addresses you trust (e.g., your office)
    return false;
  },
  keyGenerator: (req) => {
    // Use IP address or email as key
    return req.ip || req.body.email;
  }
});

// Rate limit for API endpoints
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // max 100 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply limiters
app.post('/api/auth/login', loginLimiter, (req, res) => {
  // Handle login
});

app.use('/api/', apiLimiter);
*/

// ============================================
// OPTION 3: Using Frontend Throttling
// ============================================
// This is a CLIENT-SIDE only solution - NOT SUFFICIENT FOR PRODUCTION
// Use in addition to server-side rate limiting

/*
import { throttle } from 'lodash';

// Throttle login attempts to max 1 per second on client
const handleLogin = throttle(async (credentials) => {
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  } catch (error) {
    console.error('Login failed:', error);
  }
}, 1000);

// WARNING: Client-side throttling can be bypassed!
// Always enforce rate limiting server-side.
*/

// ============================================
// FRONTEND IMPLEMENTATION (Safe Error Handling)
// ============================================

export const setupRateLimitHandling = () => {
  /**
   * Handle 429 Too Many Requests errors
   * @param {Error} error - The error from fetch/axios
   * @returns {object} { shouldRetry, waitTime, message }
   */
  const handleRateLimitError = (error) => {
    if (error.status === 429) {
      // Extract retry-after header (in seconds)
      const retryAfter = parseInt(
        error.response?.headers?.['retry-after'] || '60'
      );

      return {
        shouldRetry: true,
        waitTime: retryAfter * 1000,
        message: `Too many requests. Please wait ${retryAfter} seconds before trying again.`
      };
    }
    return { shouldRetry: false, waitTime: 0, message: '' };
  };

  return { handleRateLimitError };
};

// ============================================
// SECURITY RECOMMENDATIONS
// ============================================

/*
1. IMPLEMENT SERVER-SIDE RATE LIMITING (Critical)
   - Rate limit per IP address
   - Rate limit per email address
   - Progressive delays (increase wait time with more failures)
   - Temporary account lock after N failed attempts

2. CAPTCHA INTEGRATION (High Priority)
   - Add reCAPTCHA after 3 failed login attempts
   - Use reCAPTCHA v3 (invisible, better UX)
   - Prevent automated attacks

3. MONITORING & ALERTS
   - Log failed authentication attempts
   - Alert on suspicious patterns:
     - Multiple failed attempts from same IP
     - Attempts to enumerate users (invalid emails)
     - Distributed attacks from multiple IPs
   - Use monitoring service (DataDog, LogRocket, Sentry)

4. ACCOUNT LOCKOUT STRATEGY
   - Temporary lock: 15 minutes after 5 failed attempts
   - Permanent lock: After 50 failed attempts in 24 hours (require admin unlock)
   - Force password reset on next successful login if too many failures
   - Email notification on suspicious activity

5. DATABASE LOGGING
   - Log all failed authentication attempts:
     * Timestamp
     * Email (hashed for privacy)
     * IP address
     * User agent
   - Implement retention policy (e.g., 90 days)
   - Enable full audit logging in Supabase

6. TWO-FACTOR AUTHENTICATION (2FA)
   - Implement TOTP (Time-based One-Time Password)
   - Send OTP via SMS/Email on first login from new device
   - Bypass option with backup codes

7. IP WHITELISTING (For Admin Access)
   - Restrict admin panel to known IP ranges
   - Require VPN for remote access
   - Log all admin access attempts

8. RATE LIMIT HEADERS
   - Include in all API responses:
     * X-RateLimit-Limit: 100
     * X-RateLimit-Remaining: 95
     * X-RateLimit-Reset: 1234567890
   - Helps clients understand rate limits

9. EXPONENTIAL BACKOFF (Client-Side)
   - After failed request, wait before retrying
   - Double wait time on each retry (1s, 2s, 4s, 8s...)
   - Max wait time: 60 seconds

10. DISTRIBUTED RATE LIMITING
    - For multi-server setup, use Redis
    - Track rate limits in Redis (shared across servers)
    - Prevents attackers from bypassing by targeting different servers
*/

export const rateLimitingChecklist = `
IMPLEMENTATION CHECKLIST:

Development:
□ Choose rate limiting solution (Edge Functions, backend, or both)
□ Define rate limit thresholds
□ Set up logging and monitoring
□ Test rate limiting works correctly

Before Production:
□ Implement server-side rate limiting
□ Add CAPTCHA for repeated failures
□ Set up alerts for suspicious patterns
□ Test with realistic attack scenarios
□ Configure account lockout policy
□ Enable detailed logging

Post-Deployment:
□ Monitor for attack patterns
□ Review logs regularly
□ Adjust thresholds based on legitimate usage
□ Keep dependencies updated
□ Document rate limiting policy for users
□ Test 2FA implementation
□ Implement IP whitelisting for admin
`;

console.log('Rate limiting configuration needed. See this file for implementation options.');
