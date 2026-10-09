# Online Food Delivery Platform REST API – Round 2

A beginner-friendly, high-performance REST API built with **Node.js** and **Express.js** for an Online Food Delivery Platform. Designed for practical examinations and REST API evaluation assessments.

---

## 🛠️ Technology Stack

- **Runtime**: [Node.js](https://nodejs.org/) (v16+)
- **Framework**: [Express.js](https://expressjs.com/) (v4.19+)
- **Language**: JavaScript (ES6+)
- **Storage**: In-memory JavaScript arrays (No external database required)
- **API Client**: Postman / cURL / Browser

---

## 📁 Project Structure

```text
round2-food-delivery/
├── package.json          # Project dependencies and npm scripts
├── server.js             # Express app setup, middleware, and server start
├── data/
│   └── sampleData.js     # In-memory restaurants, menus, and orders array
├── routes/
│   └── apiRoutes.js      # REST API route handlers, status transitions & validation
├── test-api.js           # Automated end-to-end test suite
└── README.md             # Complete documentation and Postman testing guide
```

---

## 🚀 Step-by-Step Installation & Execution Guide

### Step 1: Open Terminal & Navigate to Project Directory
```bash
cd round2-food-delivery
```

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Start the Server
```bash
npm start
```
*Alternatively, for auto-reload during development:*
```bash
npm run dev
```

The server will start listening at:
`http://localhost:3000`

### Step 4: Run the Automated Test Suite
To automatically test all endpoints and HTTP status codes:
```bash
npm test
```

---

## 🔄 Order Lifecycle & Status Sequence

Orders follow a strict business workflow:

```text
[ PLACED ] ──> [ CONFIRMED ] ──> [ PREPARING ] ──> [ READY_FOR_PICKUP ] ──> [ OUT_FOR_DELIVERY ] ──> [ DELIVERED ]
    │                │                 │
    ▼                ▼                 ▼
[ CANCELLED ]   [ CANCELLED ]    [ CANCELLED ]
```

### Transition & Cancellation Rules
1. **Normal Flow**: `PLACED` → `CONFIRMED` → `PREPARING` → `READY_FOR_PICKUP` → `OUT_FOR_DELIVERY` → `DELIVERED`.
2. **Cancellation**: Permitted only when the order is in `PLACED`, `CONFIRMED`, or `PREPARING` status.
3. **Restricted Cancellation**: Once an order reaches `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, or `DELIVERED`, cancellation returns **`409 Conflict`**.
4. **Terminal States**: `DELIVERED` and `CANCELLED` cannot be changed further.

---

## 📮 Complete Postman API Testing Guide

Import or test the following endpoints one by one in Postman:

---

### 1. Search Restaurants
- **Goal**: Fetch list of restaurants or filter by location.
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/restaurants`
- **Optional Query Parameter**: `?location=Downtown`

#### Example Request 1 (All Restaurants):
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/restaurants`
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "success": true,
  "count": 4,
  "data": [
    {
      "id": 1,
      "name": "Spice Garden",
      "location": "Downtown",
      "rating": 4.5,
      "cuisine": "North Indian"
    },
    {
      "id": 2,
      "name": "Pizza Napoli",
      "location": "Uptown",
      "rating": 4.7,
      "cuisine": "Italian"
    },
    {
      "id": 3,
      "name": "Dragon Wok",
      "location": "Downtown",
      "rating": 4.2,
      "cuisine": "Chinese"
    },
    {
      "id": 4,
      "name": "Burger Hub",
      "location": "Suburbs",
      "rating": 4.3,
      "cuisine": "Fast Food"
    }
  ]
}
```

#### Example Request 2 (Filter by Location):
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/restaurants?location=Downtown`
- **Status Code**: `200 OK`

---

### 2. Get Restaurant Menu
- **Goal**: Fetch menu items and prices for a specific restaurant.
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/restaurants/:restaurantId/menu`

#### Success Test (Valid Restaurant):
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/restaurants/1/menu`
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "success": true,
  "restaurantId": 1,
  "restaurantName": "Spice Garden",
  "cuisine": "North Indian",
  "menuCount": 5,
  "menu": [
    {
      "id": 101,
      "name": "Paneer Butter Masala",
      "price": 220,
      "category": "Main Course"
    },
    {
      "id": 102,
      "name": "Butter Naan",
      "price": 40,
      "category": "Breads"
    },
    {
      "id": 103,
      "name": "Dal Makhani",
      "price": 180,
      "category": "Main Course"
    },
    {
      "id": 104,
      "name": "Jeera Rice",
      "price": 120,
      "category": "Rice"
    },
    {
      "id": 105,
      "name": "Gulab Jamun (2 pcs)",
      "price": 60,
      "category": "Dessert"
    }
  ]
}
```

#### Error Test (Restaurant Not Found):
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/restaurants/999/menu`
- **Status Code**: `404 Not Found`
- **Response**:
```json
{
  "success": false,
  "error": "Restaurant not found with ID: 999"
}
```

---

### 3. Place an Order
- **Goal**: Place an order, calculate total amount dynamically based on menu prices, generate unique ID, and save to in-memory store.
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/orders`
- **Headers**: `Content-Type: application/json`

#### Success Test (Valid Order):
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/orders`
- **Request Body (raw JSON)**:
```json
{
  "customerId": "CUST101",
  "restaurantId": 1,
  "items": [
    {
      "menuItemId": 101,
      "quantity": 1
    },
    {
      "menuItemId": 102,
      "quantity": 2
    }
  ]
}
```
- **Status Code**: `201 Created`
- **Response**:
```json
{
  "message": "Order placed successfully",
  "orderId": 1001,
  "status": "PLACED",
  "totalAmount": 300,
  "restaurantName": "Spice Garden",
  "items": [
    {
      "menuItemId": 101,
      "name": "Paneer Butter Masala",
      "price": 220,
      "quantity": 1,
      "itemTotal": 220
    },
    {
      "menuItemId": 102,
      "name": "Butter Naan",
      "price": 40,
      "quantity": 2,
      "itemTotal": 80
    }
  ]
}
```

#### Error Test 1 (Missing Fields / Invalid Quantity):
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/orders`
- **Request Body**:
```json
{
  "customerId": "CUST101",
  "restaurantId": 1,
  "items": [
    {
      "menuItemId": 101,
      "quantity": -5
    }
  ]
}
```
- **Status Code**: `400 Bad Request`
- **Response**:
```json
{
  "success": false,
  "error": "Item at index 0 has invalid quantity '-5'. Quantity must be a positive integer."
}
```

#### Error Test 2 (Menu Item Not in Restaurant):
- **Method**: `POST`
- **URL**: `http://localhost:3000/api/orders`
- **Request Body**:
```json
{
  "customerId": "CUST101",
  "restaurantId": 1,
  "items": [
    {
      "menuItemId": 9999,
      "quantity": 1
    }
  ]
}
```
- **Status Code**: `404 Not Found`
- **Response**:
```json
{
  "success": false,
  "error": "Menu item with ID '9999' not found in restaurant 'Spice Garden' menu."
}
```

---

### 4. Get Order Status
- **Goal**: Fetch the current order status by Order ID.
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/orders/:orderId/status`

#### Success Test:
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "orderId": 1001,
  "status": "PLACED",
  "restaurantName": "Spice Garden",
  "totalAmount": 300,
  "lastUpdated": "2026-10-09T07:20:59.737Z"
}
```

#### Error Test (Order Not Found):
- **Method**: `GET`
- **URL**: `http://localhost:3000/api/orders/88888/status`
- **Status Code**: `404 Not Found`
- **Response**:
```json
{
  "success": false,
  "error": "Order not found with ID: 88888"
}
```

---

### 5. Update Order Status
- **Goal**: Progress an order along the status lifecycle pipeline.
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/:orderId/status`
- **Headers**: `Content-Type: application/json`

#### Step 5A: Confirm Order (`PLACED` → `CONFIRMED`)
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Body**:
```json
{
  "status": "CONFIRMED"
}
```
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "message": "Order status updated successfully",
  "orderId": 1001,
  "previousStatus": "PLACED",
  "currentStatus": "CONFIRMED",
  "updatedAt": "2026-10-09T07:20:59.745Z"
}
```

#### Step 5B: Prepare Order (`CONFIRMED` → `PREPARING`)
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Body**: `{ "status": "PREPARING" }`
- **Status Code**: `200 OK`

#### Step 5C: Ready for Pickup (`PREPARING` → `READY_FOR_PICKUP`)
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Body**: `{ "status": "READY_FOR_PICKUP" }`
- **Status Code**: `200 OK`

#### Step 5D: Out for Delivery (`READY_FOR_PICKUP` → `OUT_FOR_DELIVERY`)
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Body**: `{ "status": "OUT_FOR_DELIVERY" }`
- **Status Code**: `200 OK`

#### Step 5E: Delivered (`OUT_FOR_DELIVERY` → `DELIVERED`)
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Body**: `{ "status": "DELIVERED" }`
- **Status Code**: `200 OK`

#### Error Test (Invalid Jump / Transition):
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/status`
- **Body**: `{ "status": "CONFIRMED" }`
- **Status Code**: `400 Bad Request`
- **Response**:
```json
{
  "success": false,
  "error": "Cannot change status of an already DELIVERED order."
}
```

---

### 6. Cancel Order
- **Goal**: Cancel an order if it is in a cancellable status (`PLACED`, `CONFIRMED`, `PREPARING`).
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/:orderId/cancel`
- **Headers**: `Content-Type: application/json`

#### Success Test (Cancel Order in PLACED or CONFIRMED):
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1002/cancel`
- **Body**:
```json
{
  "reason": "Customer changed delivery address"
}
```
- **Status Code**: `200 OK`
- **Response**:
```json
{
  "message": "Order cancelled successfully",
  "orderId": 1002,
  "previousStatus": "PLACED",
  "status": "CANCELLED",
  "cancellationReason": "Customer changed delivery address",
  "cancelledAt": "2026-10-09T07:20:59.750Z"
}
```

#### Conflict Test (Cancelling Out-for-Delivery or Delivered Order):
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1001/cancel`
- **Body**: `{ "reason": "No longer needed" }`
- **Status Code**: `409 Conflict`
- **Response**:
```json
{
  "success": false,
  "error": "Conflict: Cannot cancel order. Cancellation is not permitted once the order reaches status 'DELIVERED'. (Allowed only during PLACED, CONFIRMED, or PREPARING)"
}
```

#### Conflict Test (Cancelling Already Cancelled Order):
- **Method**: `PATCH`
- **URL**: `http://localhost:3000/api/orders/1002/cancel`
- **Status Code**: `409 Conflict`
- **Response**:
```json
{
  "success": false,
  "error": "Conflict: Order is already cancelled."
}
```

---

## 📊 Summary of HTTP Status Codes Used

| Status Code | Meaning | Endpoint Context |
|---|---|---|
| **200 OK** | Request succeeded | `GET` restaurants, menu, status; `PATCH` status update, cancel |
| **201 Created** | Resource created | `POST /api/orders` |
| **400 Bad Request** | Invalid inputs / invalid transitions | Invalid quantity, missing fields, illegal status transitions |
| **404 Not Found** | Resource does not exist | Non-existent restaurant ID, menuItem ID, or order ID |
| **409 Conflict** | Business rule conflict | Attempting to cancel an order that is already `READY_FOR_PICKUP`, `OUT_FOR_DELIVERY`, or `DELIVERED` |
| **500 Internal Server Error** | Unexpected server crash | Global error handler fallback |

---

## 🎓 Practical Examination Notes

1. **In-Memory Store**: Data resets upon restarting the server, which makes it ideal for testing isolated runs without needing database migration.
2. **Server-Side Price Calculation**: Protects against client-side tampering by computing totals directly from `sampleData.js` item prices.
3. **Idempotent / Validated Transitions**: State machine ensures orders cannot skip mandatory preparation steps or be modified after terminal states.
