# Security Policy

## Supported Versions

Security fixes are applied to the current `main` branch and the latest published release.

## Reporting a Vulnerability

Please do not report security vulnerabilities, credentials, private Sitecore URLs, or authentication data in a public GitHub issue.

Use GitHub's private vulnerability reporting or a private contact method for the repository maintainers. Include:

- a description of the issue
- affected files or versions
- steps to reproduce without sharing secrets
- the potential impact
- any suggested mitigation

Please allow maintainers reasonable time to investigate and prepare a fix before public disclosure.

## Sensitive Test Data

Use `.env` for local Sitecore endpoints and credentials. Keep authentication state, browser profiles, logs, screenshots, traces, and reports out of commits. The repository ignore rules are designed to help, but contributors should review `git status` before committing.
