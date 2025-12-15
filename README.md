# Order Execution Engine

A high-performance order execution engine for **Solana DEX trading** with real-time WebSocket updates, intelligent routing, and concurrent order processing.

---

## Table of Contents

* [Overview](#overview)
* [Live Deployment](#live-deployment)
* [Live Testing Guide](#live-testing-guide)
* [Features](#features)
* [Architecture](#architecture)
* [Tech Stack](#tech-stack)
* [Getting Started](#getting-started)
* [API Documentation](#api-documentation)
* [Design Decisions](#design-decisions)
* [Performance Metrics](#performance-metrics)
* [License](#license)

---

## Overview

This order execution engine processes **market orders** with intelligent DEX routing between **Raydium** and **Meteora**. It provides real-time execution status updates via **WebSocket** and supports concurrent order processing with **exponential backoff retry logic**.

### Rationale for Market Orders

Market orders were selected for this implementation because they:

* Execute immediately at prevailing market prices
* Have straightforward execution semantics
* Clearly demonstrate the complete order lifecycle
* Represent the most commonly used order type in live trading systems

### Extensibility to Other Order Types

The system architecture is designed to support additional order types with minimal changes:

* **Limit Orders** through a price monitoring service
* **Sniper Orders** through a token launch detection service

---

## Live Deployment

**Base URL**

```
https://order-execution-engine-b99h.onrender.com
```

The application is deployed on **Render** using a microservices-style setup:

1. **Web Service** – Node.js + Fastify API
2. **Worker Service** – Background processor responsible for order execution
3. **Redis** – Managed instance for BullMQ-based job queues
4. **PostgreSQL** – Managed relational database for persistent storage

---

## Live Testing Guide

The system can be validated end-to-end as a black box (API → Worker → Database) using standard command-line tools such as `curl` and `wscat` against the live deployment.

### Infrastructure Health Check

Validate connectivity across the API, Redis, and PostgreSQL layers.

```bash
curl https://order-execution-engine-b99h.onrender.com/health
```

**Sample Response**

```json
{
  "status": "ok",
  "timestamp": "2025-12-15T09:10:04.284Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "worker": "running"
  }
}
```

---

### Create a Market Order

Submit a trade request (example: **10 SOL → USDC**). Input validation is handled by **Zod**, and the order is queued in **Redis** for asynchronous processing.

```bash
curl -X POST https://order-execution-engine-b99h.onrender.com/api/orders/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 10,
    "orderType": "market",
    "slippage": 1.0
  }'
```

**Sample Response**

```json
{
  "success": true,
  "orderId": "fab488a4-c1f3-47e2-a547-807c51a6f216",
  "message": "Order queued",
  "wsUrl": "/api/orders/execute?orderId=fab488a4-c1f3-47e2-a547-807c51a6f216"
}
```

---

### Real-Time Execution via WebSocket

Connect to the WebSocket endpoint to observe the execution lifecycle and final outcome.

```bash
wscat -c "wss://order-execution-engine-b99h.onrender.com/api/orders/execute?orderId=fab488a4-c1f3-47e2-a547-807c51a6f216"
```

If the order has already completed, the server immediately returns the final confirmed state.

**Sample Response**

```json
{
  "type": "ORDER_UPDATE",
  "status": "confirmed",
  "data": {
    "id": "fab488a4-c1f3-47e2-a547-807c51a6f216",
    "status": "confirmed",
    "selectedDex": "raydium",
    "executedPrice": "101.64240900",
    "amountOut": "1013.37481773",
    "txHash": "dDvGaEJNFgw47gJAWJohgtcZ3aaNQVUN2opR1p9cmbGs1fFMsQ8puGBTRbZngbR5Kb53qJkjMpoNRJ2wWA1cUdXj"
  }
}
```

This confirms successful routing, price computation, and transaction finalization.

---

### Verify Data Persistence

Retrieve the order record from **PostgreSQL** to confirm durable storage.

```bash
curl https://order-execution-engine-b99h.onrender.com/api/orders/fab488a4-c1f3-47e2-a547-807c51a6f216
```

**Sample Response**

```json
{
  "success": true,
  "order": {
    "id": "fab488a4-c1f3-47e2-a547-807c51a6f216",
    "status": "confirmed",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": "10.00000000",
    "executedPrice": "101.64240900",
    "txHash": "dDvGaEJNFgw47gJAWJohgtcZ3aaNQVUN2opR1p9cmbGs1fFMsQ8puGBTRbZngbR5Kb53qJkjMpoNRJ2wWA1cUdXj",
    "createdAt": "2025-12-15T09:10:18.852Z",
    "executedAt": "2025-12-15T09:10:22.460Z"
  }
}
```

---

## Features

### Core Capabilities

* Market order execution at best available price
* Intelligent DEX routing between Raydium and Meteora
* Real-time execution updates over WebSocket
* Concurrent processing of multiple orders
* Configurable rate limiting (default: 100 orders per minute)
* Exponential backoff retry strategy with up to three attempts
* Persistent order history with a full audit trail
* Simulated wrapped SOL handling for native SOL swaps

### Technical Highlights

* Unified HTTP to WebSocket upgrade pattern
* Queue-driven processing using BullMQ
* Cross-DEX price comparison
* Dual storage model with PostgreSQL and Redis
* Comprehensive automated test coverage
* Real-time operational statistics


---

## Architecture

```
Client
  │
  │ WebSocket
  ▼
Fastify Server
  │
  │ Order Routes
  │  - POST /api/orders/execute
  │  - GET  /api/orders
  │  - GET  /api/stats
  ▼
Order Service
  │
  ├── Redis / BullMQ Queue
  ├── PostgreSQL Storage
  ▼
Order Worker (10 concurrent executions)
  │
  ▼
DEX Router
  ├── Mock Raydium
  └── Mock Meteora
```

### Order Lifecycle

```
PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
                                          ↓
                                        FAILED
                                    (after 3 retries)
```

---

## Tech Stack

### Backend

* **Node.js (v18+)** – Runtime environment
* **TypeScript** – Static typing and improved developer experience
* **Fastify** – High-performance web framework with WebSocket support

### Database and Queue

* **PostgreSQL** – Persistent relational storage
* **Redis** – In-memory cache and queue backend
* **BullMQ** – Distributed job queue
* **TypeORM** – Object-relational mapping

### Testing

* **Vitest** – Unit testing framework
* **Supertest** – HTTP integration testing

### Validation

* **Zod** – Runtime schema validation

---

## Getting Started

### Prerequisites

* Node.js v18 or higher
* PostgreSQL 12 or higher
* Redis 6.2 or higher

---

### Installation

#### Clone the Repository

```bash
git clone https://github.com/therealparthiv/eterna-labs-order-execution-engine
cd order-execution-engine
```

#### Install Dependencies

```bash
npm install
```

#### Configure Environment Variables

```bash
cp .env.example .env
```

Edit the `.env` file with local credentials.

#### Create the Database

```bash
createdb order_engine
```

#### Run Migrations

```bash
npm run db:setup
```

#### Start Redis

Ensure Redis is running locally or via Docker.

#### Start the Development Server

```bash
npm run dev
```

The server will be available at `http://localhost:3000`.

---

## Run Tests

Execute the full test suite covering routing logic, validation, and helper utilities.

```bash
npm test
```

---

## API Documentation

### Submit Order

**POST /api/orders/execute**

Validates input, persists the order, and enqueues it for execution. Returns an `orderId` immediately.

```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 10,
  "orderType": "market",
  "slippage": 1.0
}
```

### Retrieve Order by ID

**GET /api/orders/:orderId**

### Retrieve Orders

**GET /api/orders?limit=50&offset=0**

### Retrieve Statistics

**GET /api/stats**

---

## Design Decisions

### Mock Execution Instead of Devnet Integration

A mock implementation with realistic latency and variance was chosen to emphasize system architecture, execution flow, and error handling without reliance on external blockchain dependencies.

### Unified HTTP and WebSocket Endpoint

A single endpoint is used for both HTTP submission and WebSocket streaming, resulting in a cleaner and more intuitive API surface.

### Queue-Based Execution Model

BullMQ backed by Redis enables controlled concurrency, high throughput, rate limiting, and automatic retries.

### Dual Storage Strategy

* PostgreSQL provides a durable, queryable audit log
* Redis supports fast in-memory state and job management

---

## Performance Metrics

* Throughput: 100+ orders per minute
* Concurrency: 10 simultaneous executions
* Latency:

    * Simulated execution time: approximately 3–5 seconds
    * WebSocket updates: under 100 milliseconds
* Reliability: Designed for greater than 99% success rate with retries

---

## License

MIT

---

## Author

**Parthiv V Nair**
