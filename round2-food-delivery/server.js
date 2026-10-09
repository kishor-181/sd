/**
 * server.js
 * Main entry point for the Online Food Delivery Platform REST API.
 * Practical Assessment - Round 2
 */

const express = require("express");
const apiRoutes = require("./routes/apiRoutes");

const app = express();
const PORT = process.env.PORT || 3000;

const path = require("path");

// 1. Built-in middleware to parse incoming JSON payloads
app.use(express.json());

// 2. Serve static frontend files from public directory
app.use(express.static(path.join(__dirname, "public")));

// 3. Simple request logger middleware for practical demonstration & debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
  next();
});

// 4. API Info & Health Check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({
    message: "Welcome to the Online Food Delivery Platform REST API!",
    version: "1.0.0",
    status: "Active & Running",
    documentation: {
      searchRestaurants: "GET /api/restaurants?location={location}",
      getRestaurantMenu: "GET /api/restaurants/:restaurantId/menu",
      placeOrder: "POST /api/orders",
      getOrderStatus: "GET /api/orders/:orderId/status",
      updateOrderStatus: "PATCH /api/orders/:orderId/status",
      cancelOrder: "PATCH /api/orders/:orderId/cancel",
      getAllOrders: "GET /api/orders",
      getOrderDetails: "GET /api/orders/:orderId"
    }
  });
});

// 4. Mount API Routes
app.use("/api", apiRoutes);

// 5. Handle 404 for undefined endpoints
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// 6. Global error handler middleware
app.use((err, req, res, next) => {
  console.error("Unhandled Server Error:", err);
  res.status(500).json({
    success: false,
    error: "Internal Server Error",
    details: err.message || "An unexpected error occurred."
  });
});

// 7. Start the Express server only when executed directly (node server.js)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log("====================================================");
    console.log(`🚀 Food Delivery API Server is running on port ${PORT}`);
    console.log(`📍 Local URL: http://localhost:${PORT}`);
    console.log(`📄 Root Documentation: http://localhost:${PORT}/`);
    console.log(`🍔 Restaurants API: http://localhost:${PORT}/api/restaurants`);
    console.log("====================================================");
  });
}

module.exports = app;
