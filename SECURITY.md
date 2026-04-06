# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.6.x   | Yes       |
| < 0.6   | No        |

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please use [GitHub Private Vulnerability Reporting](https://github.com/callobuzz/cob-shopify-mcp/security/advisories/new) to report security issues.

You should receive an initial response within 48 hours. We will work with you to understand the issue and coordinate a fix before any public disclosure.

## Scope

This policy covers:

- The `cob-shopify-mcp` npm package
- Authentication and token handling (OAuth, static tokens, encrypted storage)
- GraphQL query injection or manipulation
- Rate limiter bypass
- Configuration parsing vulnerabilities (YAML, env vars)
- Dependency vulnerabilities

## Best Practices for Users

- Use **OAuth client credentials** auth instead of static tokens
- Enable **SQLite storage** with AES-256-GCM encryption for token storage
- Set `read_only: true` if you only need read operations
- Never commit `.env` files or Shopify credentials to version control
