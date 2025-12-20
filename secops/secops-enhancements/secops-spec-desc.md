Implement comprehensive security operations optimizations and enhancements for the BGCLive Replica application to address identified security gaps and improve overall system security posture. This feature encompasses authentication unification, infrastructure security hardening, data protection measures, operational monitoring, and compliance alignment based on industry best practices and OWASP guidelines.

Key security areas to optimize:
- Unify inconsistent authentication systems between backend (FastAPI JWT) and frontend (NextAuth)
- Implement proper security headers (HSTS, CSP, X-Frame-Options)
- Configure restrictive CORS policies instead of allowing all origins
- Add rate limiting to prevent brute force and DoS attacks
- Enhance input validation and sanitization for XSS prevention in chat features
- Implement security event logging and monitoring
- Add data encryption specifications for sensitive information
- Configure HTTPS enforcement and secure cookie settings
- Implement role-based access control improvements
- Add service worker security for PWA functionality
- Establish audit trails for user actions
- Implement secure error handling without information disclosure

The implementation should follow the priorities outlined in the research: high priority for critical security fixes, medium for operational security, and low for advanced features. All changes must maintain backward compatibility where possible and include proper testing for security enhancements.