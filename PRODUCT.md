# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Self-hosting operators using CLI Proxy API to manage their own instances.

## Product Purpose

Hyeria is a React management client for CLI Proxy API v8. It helps operators understand their system and carry out management tasks. Success means they can clearly see operational state and manage the instance through a coherent UI.

## Positioning

An independent client focused on making operations clear; it is not a fork of, or endorsed by, CLI Proxy API or its official Management Center.

## Operating Context

The client runs in a browser and connects to a separately running CLI Proxy API v8 instance with its Management API enabled. Remote browser access depends on backend CORS configuration.

## Capabilities and Constraints

The client provides management views for dashboard, providers, auth files, OAuth, quota, logs, configuration, plugins, system status, and analytics. It does not proxy model traffic and does not support the deprecated `/v0/management` API. The management key is held in browser memory by default; opting into a remembered session uses browser persistence, which is not encryption. Plugin installation can download executable code onto the backend. Analytics are a live snapshot of in-memory API-key usage buckets, not durable history, and the client does not automatically consume the destructive usage queue. Static, management, and Pages demo builds must remain isolated; the demo uses synthetic data and an in-memory API, requests no credentials, sends no backend requests, and resets on reload.

## Brand Commitments

The product name is Hyeria. The requested web UI direction is pure black and Vercel-inspired, with Google Sans for general typography and Google Code Sans for monospace. Preserve light, white, dark, and system theme choices; make dark the default. Respect reduced-motion preferences.

## Evidence on Hand

The repository README and implementation are the available evidence for product behavior. The logo is a temporary text mark; no final logo is included. The interactive demo uses synthetic data and must not be represented as a real backend connection.

## Product Principles

- Make system state and management actions clear.
- Preserve safe handling of credentials and backend boundaries.
- Keep demo behavior isolated from real services and persistent storage.
- Preserve functionality across static, management, and demo builds.
