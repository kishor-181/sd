/**
 * routes/apiRoutes.js
 * Express router containing all REST API endpoints for the Online Food Delivery Platform.
 */

const express = require("express");
const router = express.Router();
const { restaurants, orders, getNextOrderId } = require("../data/sampleData");

// ============================================================================
// Order Status Transition Rules
// PLACED -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED
// CANCELLED is permitted from PLACED, CONFIRMED, or PREPARING
// ============================================================================
const VALID_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED"
];

const ALLOWED_TRANSITIONS = {
  PLACED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY_FOR_PICKUP", "CANCELLED"],
  READY_FOR_PICKUP: ["OUT_FOR_DELIVERY"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],   // Terminal state
  CANCELLED: []    // Terminal state
};

// ============================================================================
// TASK 1 - API 1: Search Restaurants
// Method: GET | Endpoint: /api/restaurants
// Query Params (Optional): ?location=Downtown
// ============================================================================
router.get("/restaurants", (req, res) => {
  try {
    const { location } = req.query;

    // If location query parameter is provided, filter restaurants (case-insensitive)
    if (location && location.trim() !== "") {
      const searchLocation = location.trim().toLowerCase();
      const filteredRestaurants = restaurants
        .filter((r) => r.location.toLowerCase().includes(searchLocation))
        .map((r) => ({
          id: r.id,
          name: r.name,
          location: r.location,
          rating: r.rating,
          cuisine: r.cuisine
        }));

      return res.status(200).json({
        success: true,
        count: filteredRestaurants.length,
        filter: { location },
        data: filteredRestaurants
      });
    }

    // Return all restaurants with basic summary fields
    const allRestaurants = restaurants.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      rating: r.rating,
      cuisine: r.cuisine
    }));

    return res.status(200).json({
      success: true,
      count: allRestaurants.length,
      data: allRestaurants
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while fetching restaurants"
    });
  }
});

// ============================================================================
// TASK 1 - API 2: Get Restaurant Menu
// Method: GET | Endpoint: /api/restaurants/:restaurantId/menu
// ============================================================================
router.get("/restaurants/:restaurantId/menu", (req, res) => {
  try {
    const restaurantId = parseInt(req.params.restaurantId, 10);

    // Validate that restaurantId is a valid number
    if (isNaN(restaurantId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid restaurant ID format. Must be a numeric ID."
      });
    }

    // Find restaurant by ID
    const restaurant = restaurants.find((r) => r.id === restaurantId);

    // If restaurant not found, return 404
    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: `Restaurant not found with ID: ${restaurantId}`
      });
    }

    // Return restaurant menu items
    return res.status(200).json({
      success: true,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      cuisine: restaurant.cuisine,
      menuCount: restaurant.menu.length,
      menu: restaurant.menu
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while fetching menu"
    });
  }
});

// ============================================================================
// TASK 1 - API 3 & TASK 3: Place an Order
// Method: POST | Endpoint: /api/orders
// Body: { customerId, restaurantId, items: [{ menuItemId, quantity }] }
// ============================================================================
router.post("/orders", (req, res) => {
  try {
    const { customerId, restaurantId, items } = req.body;

    // 1. Validate required top-level fields
    if (!customerId || typeof customerId !== "string" || customerId.trim() === "") {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid 'customerId'. It must be a non-empty string."
      });
    }

    if (restaurantId === undefined || restaurantId === null || isNaN(Number(restaurantId))) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid 'restaurantId'. It must be a valid number."
      });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid 'items'. It must be a non-empty array of items."
      });
    }

    // 2. Check if restaurant exists
    const numericRestaurantId = parseInt(restaurantId, 10);
    const restaurant = restaurants.find((r) => r.id === numericRestaurantId);

    if (!restaurant) {
      return res.status(404).json({
        success: false,
        error: `Restaurant not found with ID: ${restaurantId}`
      });
    }

    // 3. Validate each item and calculate total price
    let totalAmount = 0;
    const processedItems = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];

      // Support either menuItemId or itemId
      const itemId = item.menuItemId !== undefined ? item.menuItemId : item.itemId;
      const quantity = item.quantity;

      if (itemId === undefined || itemId === null || isNaN(Number(itemId))) {
        return res.status(400).json({
          success: false,
          error: `Item at index ${index} is missing a valid 'menuItemId'.`
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0) {
        return res.status(400).json({
          success: false,
          error: `Item at index ${index} has invalid quantity '${quantity}'. Quantity must be a positive integer.`
        });
      }

      // Check if menu item belongs to this restaurant
      const menuItem = restaurant.menu.find((m) => m.id === parseInt(itemId, 10));
      if (!menuItem) {
        return res.status(404).json({
          success: false,
          error: `Menu item with ID '${itemId}' not found in restaurant '${restaurant.name}' menu.`
        });
      }

      // Calculate item total using server-stored price
      const itemTotal = menuItem.price * quantity;
      totalAmount += itemTotal;

      processedItems.push({
        menuItemId: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: quantity,
        itemTotal: itemTotal
      });
    }

    // 4. Generate unique order ID and assemble new order object
    const newOrderId = getNextOrderId();
    const newOrder = {
      orderId: newOrderId,
      customerId: customerId.trim(),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      items: processedItems,
      totalAmount: totalAmount,
      status: "PLACED",
      statusHistory: [
        {
          status: "PLACED",
          timestamp: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 5. Store in memory
    orders.push(newOrder);

    // 6. Return standard Task 3 JSON response with 201 Created
    return res.status(201).json({
      message: "Order placed successfully",
      orderId: newOrder.orderId,
      status: newOrder.status,
      totalAmount: newOrder.totalAmount,
      restaurantName: newOrder.restaurantName,
      items: newOrder.items
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while placing order"
    });
  }
});

// ============================================================================
// TASK 1 - API 4: Get Order Status
// Method: GET | Endpoint: /api/orders/:orderId/status
// ============================================================================
router.get("/orders/:orderId/status", (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format. Must be a numeric ID."
      });
    }

    // Find order in memory array
    const order = orders.find((o) => o.orderId === orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order not found with ID: ${orderId}`
      });
    }

    return res.status(200).json({
      orderId: order.orderId,
      status: order.status,
      restaurantName: order.restaurantName,
      totalAmount: order.totalAmount,
      lastUpdated: order.updatedAt
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while fetching order status"
    });
  }
});

// ============================================================================
// TASK 5: Update Order Status
// Method: PATCH | Endpoint: /api/orders/:orderId/status
// Body: { status: "CONFIRMED" }
// Allowed sequence: PLACED -> CONFIRMED -> PREPARING -> READY_FOR_PICKUP -> OUT_FOR_DELIVERY -> DELIVERED
// ============================================================================
router.patch("/orders/:orderId/status", (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format. Must be a numeric ID."
      });
    }

    const { status: newStatus } = req.body;

    if (!newStatus || typeof newStatus !== "string") {
      return res.status(400).json({
        success: false,
        error: "Missing or invalid 'status' field in request body."
      });
    }

    const normalizedStatus = newStatus.trim().toUpperCase();

    // Validate that the requested status is recognized
    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status '${newStatus}'. Allowed statuses: ${VALID_STATUSES.join(", ")}`
      });
    }

    // Find order
    const order = orders.find((o) => o.orderId === orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order not found with ID: ${orderId}`
      });
    }

    const currentStatus = order.status;

    // Check if order is already in a terminal state
    if (currentStatus === "DELIVERED") {
      return res.status(400).json({
        success: false,
        error: "Cannot change status of an already DELIVERED order."
      });
    }

    if (currentStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        error: "Cannot change status of a CANCELLED order."
      });
    }

    // Check if transition is allowed
    const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedNextStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status transition from '${currentStatus}' to '${normalizedStatus}'. Allowed next status(es): ${
          allowedNextStatuses.length > 0 ? allowedNextStatuses.join(", ") : "None"
        }`
      });
    }

    // Update order status
    order.status = normalizedStatus;
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status: normalizedStatus,
      timestamp: order.updatedAt
    });

    return res.status(200).json({
      message: "Order status updated successfully",
      orderId: order.orderId,
      previousStatus: currentStatus,
      currentStatus: order.status,
      updatedAt: order.updatedAt
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while updating order status"
    });
  }
});

// ============================================================================
// TASK 6: Cancel Order API
// Method: PATCH | Endpoint: /api/orders/:orderId/cancel
// Body (Optional): { reason: "Customer changed mind" }
// Cancellation permitted only from: PLACED, CONFIRMED, PREPARING
// Returns 200 OK on success, 404 if not found, 409 Conflict if not permitted
// ============================================================================
router.patch("/orders/:orderId/cancel", (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format. Must be a numeric ID."
      });
    }

    const { reason } = req.body || {};

    // Find order
    const order = orders.find((o) => o.orderId === orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order not found with ID: ${orderId}`
      });
    }

    // Check if already cancelled
    if (order.status === "CANCELLED") {
      return res.status(409).json({
        success: false,
        error: "Conflict: Order is already cancelled."
      });
    }

    // Check if status allows cancellation
    const cancellableStatuses = ["PLACED", "CONFIRMED", "PREPARING"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(409).json({
        success: false,
        error: `Conflict: Cannot cancel order. Cancellation is not permitted once the order reaches status '${order.status}'. (Allowed only during PLACED, CONFIRMED, or PREPARING)`
      });
    }

    // Perform cancellation
    const previousStatus = order.status;
    order.status = "CANCELLED";
    order.cancellationReason = (reason && typeof reason === "string" && reason.trim()) ? reason.trim() : "Cancelled by user";
    order.updatedAt = new Date().toISOString();
    order.statusHistory.push({
      status: "CANCELLED",
      reason: order.cancellationReason,
      timestamp: order.updatedAt
    });

    return res.status(200).json({
      message: "Order cancelled successfully",
      orderId: order.orderId,
      previousStatus: previousStatus,
      status: order.status,
      cancellationReason: order.cancellationReason,
      cancelledAt: order.updatedAt
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while cancelling order"
    });
  }
});

// ============================================================================
// Helper API: Get All Orders / Single Order Details
// Method: GET | Endpoint: /api/orders
// ============================================================================
router.get("/orders", (req, res) => {
  try {
    const { customerId } = req.query;

    if (customerId) {
      const customerOrders = orders.filter((o) => o.customerId.toLowerCase() === customerId.trim().toLowerCase());
      return res.status(200).json({
        success: true,
        count: customerOrders.length,
        orders: customerOrders
      });
    }

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while fetching orders"
    });
  }
});

// ============================================================================
// Helper API: Get Full Details of a Specific Order
// Method: GET | Endpoint: /api/orders/:orderId
// ============================================================================
router.get("/orders/:orderId", (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);

    if (isNaN(orderId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid order ID format. Must be a numeric ID."
      });
    }

    const order = orders.find((o) => o.orderId === orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: `Order not found with ID: ${orderId}`
      });
    }

    return res.status(200).json({
      success: true,
      order: order
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: "Internal Server Error while fetching order details"
    });
  }
});

module.exports = router;
