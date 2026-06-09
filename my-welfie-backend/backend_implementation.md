# Implementation Plan -- Health Scan Backend

## Overview

React + FastAPI + PostgreSQL + Stripe system.

## Architecture

Frontend → Backend → DB → Payment Gateway

## Modules

-   Auth
-   Scan
-   Payment

## Key APIs

-   POST /auth/signup
-   POST /auth/login
-   POST /api/results
-   POST /payments/create-checkout-session
-   POST /payments/webhook

## DB Tables

users, scan_sessions, vital_readings, payments

## Business Logic

-   1 free scan
-   Paid = unlimited

## Steps

1.  Setup FastAPI
2.  Setup DB
3.  Build auth
4.  Implement scan flow
5.  Add payment
6.  Test system

## Payment Gateway

Stripe (replaced Razorpay). Uses Stripe Checkout Sessions + webhook verification.

## Notes

Auto-update docs when APIs or schema change.
