---
time: 20
sidebar_position: 11
title: API Security
description: Security best practices for backend API endpoints
---

# API Security

When implementing backend services for the Soroban Cookbook (such as the newsletter endpoint), follow these security best practices to prevent common vulnerabilities.

## CSRF Protection

Cross-Site Request Forgery (CSRF) attacks trick users into performing unintended actions on trusted sites. The newsletter endpoint uses CSRF tokens to prevent this.

### Token Validation

All state-changing requests (POST, PUT, DELETE) must validate the CSRF token:

1. **Extract Token**: Read from `X-CSRF-Token` request header
2. **Verify Match**: Compare against session/stored token
3. **Reject Invalid**: Return `403 Forbidden` if token is missing or invalid
4. **Optional Rotation**: Generate new token for next request

### Backend Example (Node.js/Express)

```javascript
const crypto = require('crypto');
const session = require('express-session');

// Middleware to validate CSRF token
function validateCSRFToken(req, res, next) {
  const clientToken = req.headers['x-csrf-token'];
  const serverToken = req.session.csrfToken;

  // 1. Verify token exists
  if (!clientToken || !serverToken) {
    return res.status(403).json({ error: 'CSRF token missing' });
  }

  // 2. Verify tokens match
  if (!crypto.timingSafeEqual(clientToken, serverToken)) {
    return res.status(403).json({ error: 'CSRF token invalid' });
  }

  // 3. Verify Origin header
  const origin = req.get('Origin') || req.get('Referer');
  if (origin && !origin.includes(req.get('Host'))) {
    return res.status(403).json({ error: 'Origin mismatch' });
  }

  // 4. Optional: Rotate token for next request
  req.session.csrfToken = crypto.randomBytes(32).toString('hex');

  next();
}

// Newsletter endpoint
app.post('/api/newsletter', validateCSRFToken, async (req, res) => {
  try {
    const { email } = req.body;

    // Validate email
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'Invalid email' });
    }

    // Sanitize email
    const sanitizedEmail = email.trim().toLowerCase();
    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Subscribe user (e.g., add to mailing list)
    await subscribeToNewsletter(sanitizedEmail);

    res.status(200).json({ message: 'Successfully subscribed' });
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Backend Example (Python/Flask)

```python
from flask import Flask, request, session, jsonify
from flask_session import Session
import secrets
import re
from functools import wraps

app = Flask(__name__)
app.config['SESSION_TYPE'] = 'filesystem'
Session(app)

def validate_csrf_token(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        client_token = request.headers.get('X-CSRF-Token')
        server_token = session.get('csrf_token')

        # 1. Verify token exists
        if not client_token or not server_token:
            return jsonify({'error': 'CSRF token missing'}), 403

        # 2. Verify tokens match (timing-safe comparison)
        if not secrets.compare_digest(client_token, server_token):
            return jsonify({'error': 'CSRF token invalid'}), 403

        # 3. Verify Origin header
        origin = request.headers.get('Origin') or request.headers.get('Referer')
        if origin and request.host not in origin:
            return jsonify({'error': 'Origin mismatch'}), 403

        # 4. Optional: Rotate token
        session['csrf_token'] = secrets.token_hex(32)

        return f(*args, **kwargs)

    return decorated_function

def is_valid_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9.!#$%&\'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$'
    return re.match(pattern, email) is not None

@app.route('/api/newsletter', methods=['POST'])
@validate_csrf_token
def newsletter_subscribe():
    try:
        data = request.get_json()

        # Validate email exists
        email = data.get('email', '').strip().lower()
        if not email:
            return jsonify({'error': 'Email required'}), 400

        # Validate email format
        if not is_valid_email(email):
            return jsonify({'error': 'Invalid email format'}), 400

        # Subscribe user
        subscribe_to_newsletter(email)

        return jsonify({'message': 'Successfully subscribed'}), 200

    except Exception as error:
        print(f'Newsletter subscription error: {error}')
        return jsonify({'error': 'Internal server error'}), 500
```

## Input Validation

Always validate and sanitize user input to prevent injection attacks.

### Email Validation

```javascript
function isValidEmail(email) {
  const regex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  return regex.test(email);
}

function sanitizeEmail(email) {
  return email.trim().toLowerCase();
}
```

### Best Practices

- ✅ Validate type (string, number, object)
- ✅ Validate length (min/max)
- ✅ Validate format (regex for emails, URLs)
- ✅ Trim whitespace
- ✅ Normalize case (lowercase for emails)
- ✅ Reject unexpected fields
- ❌ Never trust user input
- ❌ Don't rely on client-side validation alone

## CORS Configuration

Control which origins can make requests to your API.

### Recommended Settings

```javascript
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [
    'https://soroban-cookbook.dev',
    'https://www.soroban-cookbook.dev',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 3600,
};

app.use(cors(corsOptions));
```

### Key Points

- **origin**: Whitelist specific domains, never use `*` for POST endpoints
- **credentials**: `true` allows cookies with requests
- **methods**: Only allow necessary HTTP methods
- **allowedHeaders**: Include custom CSRF header
- **exposedHeaders**: Allow client to read CSRF token response header

## Rate Limiting

Prevent abuse by limiting request rates.

### Implementation

```javascript
const rateLimit = require('express-rate-limit');

const newsletterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per window
  message: 'Too many subscription attempts, please try again later',
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  skip: (req) => {
    // Skip rate limiting for certain IPs if needed
    return false;
  },
});

app.post('/api/newsletter', newsletterLimiter, validateCSRFToken, newsletter_handler);
```

## Error Handling

Return appropriate error responses without exposing sensitive information.

### Good Error Responses

```javascript
// ✅ Good - generic message
res.status(400).json({ error: 'Invalid request' });

// ✅ Good - specific to user
res.status(409).json({ error: 'Email already subscribed' });

// ❌ Bad - reveals implementation details
res.status(500).json({ error: 'Database connection failed' });

// ❌ Bad - stack trace in production
res.status(500).json({ error: error.stack });
```

### Error Logging

Log detailed errors internally but return generic messages to clients:

```javascript
try {
  // Process request
} catch (error) {
  // Log internally (includes stack trace)
  logger.error('Newsletter subscription failed', {
    email: email,
    error: error.message,
    stack: error.stack,
  });

  // Return generic message to client
  res.status(500).json({ error: 'Internal server error' });
}
```

## HTTPS Enforcement

Always use HTTPS in production to encrypt data in transit.

### Redirect HTTP to HTTPS

```javascript
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    res.redirect(301, `https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### HSTS Header

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

## Security Headers

Include security headers in all responses:

```javascript
app.use((req, res, next) => {
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // XSS protection (legacy)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Control referrer information
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Control feature access
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});
```

## Dependency Security

Keep dependencies up to date and audit for vulnerabilities.

### Regular Updates

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Update dependencies
npm update

# Check for outdated packages
npm outdated
```

### Lockfile Management

- ✅ Commit lockfiles (package-lock.json, yarn.lock)
- ✅ Use exact versions in production
- ❌ Use semver ranges (^, ~) for production dependencies

## Deployment Checklist

- [ ] Enable HTTPS (all connections)
- [ ] Enable HSTS header
- [ ] Configure CORS whitelist
- [ ] Set up rate limiting
- [ ] Validate CSRF tokens
- [ ] Input validation on all endpoints
- [ ] Error logging configured
- [ ] Security headers set
- [ ] Dependencies audited
- [ ] Database credentials in environment variables
- [ ] API keys in environment variables
- [ ] Monitoring/alerting configured
- [ ] Backup strategy in place

## Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [CSRF Prevention](https://owasp.org/www-community/attacks/csrf)
