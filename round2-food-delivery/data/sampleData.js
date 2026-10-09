/**
 * sampleData.js
 * In-memory data store for the Online Food Delivery Platform.
 * Contains initial restaurant records, menus, and an array for placed orders.
 */

// List of available restaurants and their menu items
const restaurants = [
  {
    id: 1,
    name: "Spice Garden",
    location: "Downtown",
    rating: 4.5,
    cuisine: "North Indian",
    menu: [
      { id: 101, name: "Paneer Butter Masala", price: 220, category: "Main Course" },
      { id: 102, name: "Butter Naan", price: 40, category: "Breads" },
      { id: 103, name: "Dal Makhani", price: 180, category: "Main Course" },
      { id: 104, name: "Jeera Rice", price: 120, category: "Rice" },
      { id: 105, name: "Gulab Jamun (2 pcs)", price: 60, category: "Dessert" }
    ]
  },
  {
    id: 2,
    name: "Pizza Napoli",
    location: "Uptown",
    rating: 4.7,
    cuisine: "Italian",
    menu: [
      { id: 201, name: "Margherita Pizza", price: 250, category: "Pizza" },
      { id: 202, name: "Farmhouse Special Pizza", price: 350, category: "Pizza" },
      { id: 203, name: "Garlic Breadsticks", price: 110, category: "Sides" },
      { id: 204, name: "White Sauce Pasta", price: 210, category: "Pasta" },
      { id: 205, name: "Choco Lava Cake", price: 90, category: "Dessert" }
    ]
  },
  {
    id: 3,
    name: "Dragon Wok",
    location: "Downtown",
    rating: 4.2,
    cuisine: "Chinese",
    menu: [
      { id: 301, name: "Veg Hakka Noodles", price: 150, category: "Noodles" },
      { id: 302, name: "Chilli Paneer Dry", price: 190, category: "Starters" },
      { id: 303, name: "Schezwan Fried Rice", price: 160, category: "Rice" },
      { id: 304, name: "Veg Manchurian Gravy", price: 170, category: "Main Course" },
      { id: 305, name: "Spring Rolls", price: 130, category: "Starters" }
    ]
  },
  {
    id: 4,
    name: "Burger Hub",
    location: "Suburbs",
    rating: 4.3,
    cuisine: "Fast Food",
    menu: [
      { id: 401, name: "Crispy Veg Burger", price: 99, category: "Burgers" },
      { id: 402, name: "Cheese Burst Burger", price: 149, category: "Burgers" },
      { id: 403, name: "Peri Peri French Fries", price: 89, category: "Sides" },
      { id: 404, name: "Cold Coffee", price: 79, category: "Beverages" }
    ]
  }
];

// In-memory array to store placed orders during runtime
const orders = [
  {
    orderId: 1000,
    customerId: "CUST101",
    restaurantId: 1,
    restaurantName: "Spice Garden",
    items: [
      { menuItemId: 101, name: "Paneer Butter Masala", price: 220, quantity: 1, itemTotal: 220 },
      { menuItemId: 102, name: "Butter Naan", price: 40, quantity: 2, itemTotal: 80 }
    ],
    totalAmount: 300,
    status: "DELIVERED",
    statusHistory: [
      { status: "PLACED", timestamp: new Date(Date.now() - 3600000).toISOString() },
      { status: "CONFIRMED", timestamp: new Date(Date.now() - 3000000).toISOString() },
      { status: "PREPARING", timestamp: new Date(Date.now() - 2400000).toISOString() },
      { status: "READY_FOR_PICKUP", timestamp: new Date(Date.now() - 1800000).toISOString() },
      { status: "OUT_FOR_DELIVERY", timestamp: new Date(Date.now() - 1200000).toISOString() },
      { status: "DELIVERED", timestamp: new Date(Date.now() - 600000).toISOString() }
    ],
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 600000).toISOString()
  }
];

// Auto-increment counter for order IDs starting at 1001
let nextOrderId = 1001;

function getNextOrderId() {
  return nextOrderId++;
}

module.exports = {
  restaurants,
  orders,
  getNextOrderId
};
