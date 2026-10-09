/**
 * test-api.js
 * Automated test script to verify all REST API endpoints and response codes.
 * Runs in-process with Node.js http / fetch module.
 */

const http = require("http");
const app = require("./server");

const TEST_PORT = 3001;
let server;

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: "127.0.0.1",
      port: TEST_PORT,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

let passed = 0;
let failed = 0;

function assert(description, condition, details = "") {
  if (condition) {
    console.log(`  ✅ PASS: ${description}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${description}`);
    if (details) console.error(`     Details: ${JSON.stringify(details)}`);
    failed++;
  }
}

async function runTests() {
  console.log("====================================================");
  console.log("🧪 STARTING REST API AUTOMATED TEST SUITE");
  console.log("====================================================\n");

  server = app.listen(TEST_PORT);

  try {
    // -------------------------------------------------------------
    // Test 1: GET /api/restaurants (All restaurants)
    // -------------------------------------------------------------
    console.log("1. Testing GET /api/restaurants (Search Restaurants)");
    const res1 = await makeRequest("GET", "/api/restaurants");
    assert("Returns 200 OK for all restaurants", res1.status === 200, res1);
    assert("Returns a list of restaurants", Array.isArray(res1.body.data) && res1.body.data.length > 0, res1.body);

    // -------------------------------------------------------------
    // Test 2: GET /api/restaurants?location=Downtown (Filter by location)
    // -------------------------------------------------------------
    console.log("\n2. Testing GET /api/restaurants?location=Downtown (Filter)");
    const res2 = await makeRequest("GET", "/api/restaurants?location=Downtown");
    assert("Returns 200 OK for filtered restaurants", res2.status === 200, res2);
    assert("Returns only Downtown restaurants", res2.body.data.every(r => r.location === "Downtown"), res2.body);

    // -------------------------------------------------------------
    // Test 3: GET /api/restaurants/:restaurantId/menu (Success)
    // -------------------------------------------------------------
    console.log("\n3. Testing GET /api/restaurants/1/menu (Valid Restaurant Menu)");
    const res3 = await makeRequest("GET", "/api/restaurants/1/menu");
    assert("Returns 200 OK for valid restaurant menu", res3.status === 200, res3);
    assert("Returns menu items array with price and name", res3.body.menu && res3.body.menu.length > 0, res3.body);

    // -------------------------------------------------------------
    // Test 4: GET /api/restaurants/999/menu (Non-existent Restaurant - 404)
    // -------------------------------------------------------------
    console.log("\n4. Testing GET /api/restaurants/999/menu (Missing Restaurant 404)");
    const res4 = await makeRequest("GET", "/api/restaurants/999/menu");
    assert("Returns 404 Not Found for non-existent restaurant", res4.status === 404, res4);

    // -------------------------------------------------------------
    // Test 5: POST /api/orders (Place Order Success - 201)
    // -------------------------------------------------------------
    console.log("\n5. Testing POST /api/orders (Place Order Success)");
    const orderPayload = {
      customerId: "CUST500",
      restaurantId: 1,
      items: [
        { menuItemId: 101, quantity: 1 }, // Paneer Butter Masala (220)
        { menuItemId: 102, quantity: 2 }  // Butter Naan (40 * 2 = 80)
      ]
    };
    const res5 = await makeRequest("POST", "/api/orders", orderPayload);
    assert("Returns 201 Created for valid order placement", res5.status === 201, res5);
    assert("Calculates correct totalAmount (220 + 80 = 300)", res5.body.totalAmount === 300, res5.body);
    assert("Initial status is PLACED", res5.body.status === "PLACED", res5.body);
    const createdOrderId = res5.body.orderId;
    assert("Generated numeric unique orderId", typeof createdOrderId === "number" && createdOrderId >= 1001, res5.body);

    // -------------------------------------------------------------
    // Test 6: POST /api/orders (Invalid items / missing fields - 400 Bad Request)
    // -------------------------------------------------------------
    console.log("\n6. Testing POST /api/orders (Validation Errors - 400 Bad Request)");
    const res6a = await makeRequest("POST", "/api/orders", { customerId: "", restaurantId: 1, items: [] });
    assert("Returns 400 Bad Request when customerId or items are invalid", res6a.status === 400, res6a);

    const res6b = await makeRequest("POST", "/api/orders", {
      customerId: "CUST1",
      restaurantId: 1,
      items: [{ menuItemId: 101, quantity: -2 }]
    });
    assert("Returns 400 Bad Request for negative/invalid quantity", res6b.status === 400, res6b);

    const res6c = await makeRequest("POST", "/api/orders", {
      customerId: "CUST1",
      restaurantId: 1,
      items: [{ menuItemId: 9999, quantity: 1 }]
    });
    assert("Returns 404 Not Found for non-existent menuItemId in restaurant", res6c.status === 404, res6c);

    // -------------------------------------------------------------
    // Test 7: GET /api/orders/:orderId/status (Get Order Status - 200 & 404)
    // -------------------------------------------------------------
    console.log("\n7. Testing GET /api/orders/:orderId/status (Order Status)");
    const res7a = await makeRequest("GET", `/api/orders/${createdOrderId}/status`);
    assert("Returns 200 OK and status PLACED for created order", res7a.status === 200 && res7a.body.status === "PLACED", res7a);

    const res7b = await makeRequest("GET", "/api/orders/99999/status");
    assert("Returns 404 Not Found for non-existent order status check", res7b.status === 404, res7b);

    // -------------------------------------------------------------
    // Test 8: PATCH /api/orders/:orderId/status (Order Status Sequence Transitions)
    // -------------------------------------------------------------
    console.log("\n8. Testing PATCH /api/orders/:orderId/status (Sequence Transitions)");
    // Valid transition: PLACED -> CONFIRMED
    const res8a = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "CONFIRMED" });
    assert("Transition PLACED -> CONFIRMED returns 200 OK", res8a.status === 200 && res8a.body.currentStatus === "CONFIRMED", res8a);

    // Invalid transition: CONFIRMED -> DELIVERED (skipping stages)
    const res8b = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "DELIVERED" });
    assert("Invalid skip transition returns 400 Bad Request", res8b.status === 400, res8b);

    // Valid transition: CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED
    const res8c = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "PREPARING" });
    assert("Transition CONFIRMED -> PREPARING returns 200 OK", res8c.status === 200 && res8c.body.currentStatus === "PREPARING", res8c);

    const res8d = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "READY_FOR_PICKUP" });
    assert("Transition PREPARING -> READY_FOR_PICKUP returns 200 OK", res8d.status === 200 && res8d.body.currentStatus === "READY_FOR_PICKUP", res8d);

    const res8e = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "OUT_FOR_DELIVERY" });
    assert("Transition READY_FOR_PICKUP -> OUT_FOR_DELIVERY returns 200 OK", res8e.status === 200 && res8e.body.currentStatus === "OUT_FOR_DELIVERY", res8e);

    const res8f = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "DELIVERED" });
    assert("Transition OUT_FOR_DELIVERY -> DELIVERED returns 200 OK", res8f.status === 200 && res8f.body.currentStatus === "DELIVERED", res8f);

    // Terminal transition attempt: DELIVERED -> CANCELLED (should fail 400)
    const res8g = await makeRequest("PATCH", `/api/orders/${createdOrderId}/status`, { status: "CANCELLED" });
    assert("Attempting to modify DELIVERED order returns 400 Bad Request", res8g.status === 400, res8g);

    // -------------------------------------------------------------
    // Test 9: PATCH /api/orders/:orderId/cancel (Cancellation API - 200 & 409)
    // -------------------------------------------------------------
    console.log("\n9. Testing PATCH /api/orders/:orderId/cancel (Cancel Order API)");
    // Create new order to test valid cancellation
    const newOrderForCancel = await makeRequest("POST", "/api/orders", {
      customerId: "CUST600",
      restaurantId: 2,
      items: [{ menuItemId: 201, quantity: 1 }]
    });
    const cancelOrderId = newOrderForCancel.body.orderId;

    // Successful cancellation on PLACED order -> 200 OK
    const res9a = await makeRequest("PATCH", `/api/orders/${cancelOrderId}/cancel`, {
      reason: "Placed by mistake"
    });
    assert("Cancellation of PLACED order returns 200 OK", res9a.status === 200 && res9a.body.status === "CANCELLED", res9a);

    // Already cancelled order cancellation -> 409 Conflict
    const res9b = await makeRequest("PATCH", `/api/orders/${cancelOrderId}/cancel`, {
      reason: "Try again"
    });
    assert("Cancelling an already cancelled order returns 409 Conflict", res9b.status === 409, res9b);

    // Attempting to cancel already delivered order -> 409 Conflict
    const res9c = await makeRequest("PATCH", `/api/orders/${createdOrderId}/cancel`, {
      reason: "Too late"
    });
    assert("Cancelling DELIVERED order returns 409 Conflict", res9c.status === 409, res9c);

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log("\n====================================================");
    console.log(`📊 TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
    console.log("====================================================");

  } finally {
    if (server) {
      server.close(() => {
        process.exit(failed > 0 ? 1 : 0);
      });
    } else {
      process.exit(failed > 0 ? 1 : 0);
    }
  }
}

runTests();
