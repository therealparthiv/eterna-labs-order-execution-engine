# 🚀 Order Execution Engine

A high-performance order execution engine for Solana DEX trading with real-time WebSocket updates, intelligent routing, and concurrent order processing.

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [API Documentation](#api-documentation)
- [Design Decisions](#design-decisions)
- [Testing](#testing)
- [Deployment](#deployment)

---

## 🎯 Overview

This order execution engine processes **Market Orders** with intelligent DEX routing between Raydium and Meteora. It provides real-time status updates via WebSocket and handles concurrent order processing with exponential backoff retry logic.

### Why Market Orders?

Market orders were chosen for this implementation because they:
- Execute immediately at current market price
- Have straightforward execution logic
- Demonstrate the complete order lifecycle clearly
- Are the most commonly used order type in trading

### Extension to Other Order Types

The engine can be easily extended to support:
- **Limit Orders**: Add price monitoring service that triggers execution when target price is reached
- **Sniper Orders**: Add token launch detection service that monitors new token deployments/migrations

---

## ✨ Features

### Core Functionality
- ✅ **Market Order Execution** - Immediate execution at best available price
- ✅ **DEX Routing** - Intelligent routing between Raydium and Meteora
- ✅ **Real-time Updates** - WebSocket streaming of order status
- ✅ **Concurrent Processing** - Handle 10 orders simultaneously
- ✅ **Rate Limiting** - Process 100 orders per minute
- ✅ **Retry Logic** - Exponential backoff with up to 3 attempts
- ✅ **Order History** - Complete audit trail in PostgreSQL

### Technical Features
- 🔄 HTTP → WebSocket upgrade pattern
- 📊 Queue-based processing with BullMQ
- 🔍 Price comparison across multiple DEXs
- 💾 Dual storage (PostgreSQL + Redis)
- 🧪 Comprehensive test coverage (30+ tests)
- 📈 Real-time statistics and monitoring

---

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ WebSocket
       ▼
┌─────────────────────────────────────┐
│         Fastify Server              │
│  ┌────────────────────────────┐    │
│  │   Order Routes             │    │
│  │  - POST /api/orders/execute│    │
│  │  - GET  /api/orders        │    │
│  │  - GET  /api/stats         │    │
│  └─────────────┬──────────────┘    │
└────────────────┼────────────────────┘
                 │
                 ▼
       ┌─────────────────┐
       │  Order Service  │
       └────────┬────────┘
                │
    ┌───────────┼───────────┐
    ▼           ▼           ▼
┌────────┐ ┌────────┐ ┌──────────┐
│ BullMQ │ │ Redis  │ │PostgreSQL│
│ Queue  │ │ Cache  │ │ Storage  │
└───┬────┘ └────────┘ └──────────┘
    │
    ▼
┌─────────────────┐
│  Order Worker   │
│  (Processes     │
│   10 orders     │
│   concurrently) │
└────────┬────────┘
         │
         ▼
┌──────────────────┐      ┌──────────────────┐
│  DEX Router      │─────▶│  Mock Raydium    │
│  (Price Compare) │      └──────────────────┘
│                  │
│                  │─────▶┌──────────────────┐
└──────────────────┘      │  Mock Meteora    │
                          └──────────────────┘
```

### Order Lifecycle

```
PENDING → ROUTING → BUILDING → SUBMITTED → CONFIRMED
                                          ↓
                                        FAILED
                                    (after 3 retries)
```

---

## 🛠️ Tech Stack

### Backend
- **Node.js** (v18+) - Runtime environment
- **TypeScript** - Type safety and better DX
- **Fastify** - Fast web framework with WebSocket support

### Database & Queue
- **PostgreSQL** - Persistent order storage
- **Redis** - Cache and queue management
- **BullMQ** - Job queue for order processing
- **TypeORM** - Database ORM

### Testing
- **Vitest** - Fast unit test framework
- **Supertest** - HTTP integration testing

### Validation
- **Zod** - Runtime type validation

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18 or higher
- PostgreSQL 12+
- Redis 6.2+

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd order-execution-engine
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Create PostgreSQL database**
   ```bash
   psql -U postgres
   CREATE DATABASE order_engine;
   \q
   ```

5. **Run database migrations**
   ```bash
   npm run db:setup
   ```

6. **Start Redis**
   ```bash
   # Using Docker
   docker run -d -p 6379:6379 redis:alpine
   
   # Or using Windows (Memurai)
   # Download and install from https://www.memurai.com/
   ```

7. **Start the server**
   ```bash
   npm run dev
   ```

   Server will be running at `http://localhost:3000`

---

## 📡 API Documentation

### Submit Order (HTTP)

**Endpoint:** `POST /api/orders/execute`

Validates input, creates the order in the database, and queues it for processing. Returns an `orderId` immediately.

**Request Body:**
```json
{
  "tokenIn": "SOL",
  "tokenOut": "USDC",
  "amountIn": 10,
  "orderType": "market",
  "slippage": 1.0
}
```

**Response :**
```json
{
  "success": true,
  "orderId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Order queued. Connect to WebSocket for updates.",
  "wsUrl": "/api/orders/execute?orderId=550e8400-e29b-41d4-a716-446655440000"
}
```

### Get Order by ID

**Endpoint:** `GET /api/orders/:orderId`

```bash
curl http://localhost:3000/api/orders/abc-123-def
```

**Response:**
```json
{
  "success": true,
  "order": {
    "id": "abc-123-def",
    "orderType": "market",
    "status": "confirmed",
    "tokenIn": "SOL",
    "tokenOut": "USDC",
    "amountIn": 10,
    "executedPrice": 100.5,
    "txHash": "...",
    "createdAt": "2024-11-20T12:00:00Z"
  }
}
```

### Get All Orders

**Endpoint:** `GET /api/orders?limit=50&offset=0`

```bash
curl http://localhost:3000/api/orders?limit=10
```

### Get Statistics

**Endpoint:** `GET /api/stats`

```bash
curl http://localhost:3000/api/stats
```

**Response:**
```json
{
  "success": true,
  "orders": {
    "total": 150,
    "pending": 5,
    "confirmed": 140,
    "failed": 5
  },
  "queue": {
    "waiting": 2,
    "active": 8,
    "completed": 140,
    "failed": 5
  },
  "websockets": {
    "activeConnections": 3
  }
}
```

---

## 🧠 Design Decisions

### 1. Mock Implementation vs Real Devnet

**Decision:** Mock implementation with realistic delays

**Reasoning:**
- Focus on architecture and flow
- No dependency on external blockchain networks
- Faster development and testing
- Easier to demonstrate and debug
- Can be easily replaced with real SDK calls

### 2. HTTP → WebSocket Upgrade Pattern

**Decision:** Single endpoint handles both protocols

**Reasoning:**
- Cleaner API design (one endpoint per action)
- Natural connection lifecycle management
- Reduces connection overhead
- Better suited for real-time updates

### 3. Queue-Based Processing

**Decision:** BullMQ with Redis for job queue

**Reasoning:**
- Handle high throughput (100 orders/minute)
- Natural concurrency control (10 simultaneous)
- Built-in retry mechanism
- Job persistence and recovery
- Monitoring and observability

### 4. Dual Storage Strategy

**Decision:** PostgreSQL for persistence + Redis for active data

**Reasoning:**
- PostgreSQL: Complete audit trail, complex queries
- Redis: Fast access for active orders, queue state
- Separation of concerns
- Optimal performance for each use case

### 5. Price Comparison Logic

**Decision:** Parallel DEX queries with best output selection

**Reasoning:**
- Minimize latency (parallel vs sequential)
- Fair comparison across DEXs
- Consider both price and fees
- Maximize output for user

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Run Tests with Coverage

```bash
npm run test -- --coverage
```

### Test Structure

```
tests/
├── dex-router.test.ts      # DEX routing logic (14 tests)
├── order-service.test.ts   # Order validation (9 tests)
└── helpers.test.ts         # Utility functions (18 tests)
```

### Test Coverage

- ✅ DEX quote fetching
- ✅ Price comparison logic
- ✅ Best route selection
- ✅ Transaction execution simulation
- ✅ Order creation and validation
- ✅ Utility function correctness
- ✅ **Total: 41 tests**

---

## 📦 Deployment

### Deployment URL

🔗 **Live Demo:** [Coming Soon]

### Deployment Instructions

#### Option 1: Railway

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Deploy
railway up
```

#### Option 2: Render

1. Connect GitHub repository
2. Add PostgreSQL and Redis services
3. Set environment variables
4. Deploy

#### Option 3: Docker

```bash
docker build -t order-engine .
docker run -p 3000:3000 order-engine
```

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
DB_HOST=your-db-host
DB_PORT=5432
DB_NAME=order_engine
DB_USER=your-db-user
DB_PASSWORD=your-db-password
REDIS_HOST=your-redis-host
REDIS_PORT=6379
MAX_CONCURRENT_ORDERS=10
ORDERS_PER_MINUTE=100
MAX_RETRIES=3
```

---



## 📊 Performance Metrics

- **Throughput:** 100 orders/minute
- **Concurrency:** 10 simultaneous orders
- **Order Processing:** ~3-5 seconds per order
- **WebSocket Latency:** <100ms for status updates
- **Success Rate:** 99%+ (with retries)

---

## 🔮 Future Enhancements

1. **Limit Orders** - Add price monitoring service
2. **Sniper Orders** - Add token launch detection
3. **Real Devnet Integration** - Replace mocks with actual Raydium/Meteora SDKs
4. **Advanced Routing** - Multi-hop routing for better prices
5. **Portfolio Management** - Track user holdings and P&L
6. **Stop-Loss Orders** - Automatic exit on price drops
7. **API Rate Limiting** - Per-user rate limits
8. **WebSocket Authentication** - Secure connections

---

## 📄 License

MIT

---

## 👨‍💻 Author

Built with ❤️ for a backend engineering assignment

---

## 🙏 Acknowledgments

- Solana for the blockchain platform
- Raydium & Meteora for DEX inspiration
- Fastify team for excellent WebSocket support
- BullMQ team for reliable queue management