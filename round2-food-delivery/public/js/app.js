/**
 * app.js
 * Frontend controller for the Online Food Delivery Platform.
 * Communicates directly with Express REST API endpoints.
 */

const ORDER_STEPS = [
  "PLACED",
  "CONFIRMED",
  "PREPARING",
  "READY_FOR_PICKUP",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
];

const STEP_ICONS = {
  PLACED: "📝",
  CONFIRMED: "✅",
  PREPARING: "🍳",
  READY_FOR_PICKUP: "🛍️",
  OUT_FOR_DELIVERY: "🛵",
  DELIVERED: "🎉",
  CANCELLED: "❌"
};

class FoodDeliveryApp {
  constructor() {
    this.restaurants = [];
    this.orders = [];
    this.activeRestaurant = null;
    this.cart = {
      restaurantId: null,
      restaurantName: "",
      items: {} // { menuItemId: { item, quantity } }
    };
    this.selectedOrderId = null;
    this.orderToCancelId = null;

    this.init();
  }

  async init() {
    this.bindEvents();
    await this.fetchRestaurants();
    await this.fetchOrders();
  }

  bindEvents() {
    // Search & filter events
    const searchInput = document.getElementById("location-search");
    const searchBtn = document.getElementById("search-btn");
    const resetFilterBtn = document.getElementById("reset-filter-btn");

    if (searchBtn) {
      searchBtn.addEventListener("click", () => {
        this.fetchRestaurants(searchInput.value.trim());
      });
    }

    if (searchInput) {
      searchInput.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          this.fetchRestaurants(searchInput.value.trim());
        }
      });
    }

    if (resetFilterBtn) {
      resetFilterBtn.addEventListener("click", () => {
        searchInput.value = "";
        this.setActiveChip("");
        this.fetchRestaurants("");
      });
    }

    // Quick filter chips
    document.querySelectorAll(".filter-chip").forEach((chip) => {
      chip.addEventListener("click", (e) => {
        const loc = e.target.getAttribute("data-location");
        if (searchInput) searchInput.value = loc;
        this.setActiveChip(loc);
        this.fetchRestaurants(loc);
      });
    });

    // Cart toggle buttons
    const cartToggleBtn = document.getElementById("cart-toggle-btn");
    const closeCartBtn = document.getElementById("close-cart-btn");
    const modalCheckoutBtn = document.getElementById("modal-checkout-btn");

    if (cartToggleBtn) cartToggleBtn.addEventListener("click", () => this.toggleCartDrawer(true));
    if (closeCartBtn) closeCartBtn.addEventListener("click", () => this.toggleCartDrawer(false));
    if (modalCheckoutBtn) {
      modalCheckoutBtn.addEventListener("click", () => {
        this.closeMenuModal();
        this.toggleCartDrawer(true);
      });
    }

    // Menu modal close
    const closeMenuModalBtn = document.getElementById("close-menu-modal");
    if (closeMenuModalBtn) {
      closeMenuModalBtn.addEventListener("click", () => this.closeMenuModal());
    }

    // Place Order button
    const placeOrderBtn = document.getElementById("place-order-btn");
    if (placeOrderBtn) {
      placeOrderBtn.addEventListener("click", () => this.placeOrder());
    }

    // Refresh orders button
    const refreshOrdersBtn = document.getElementById("refresh-orders-btn");
    if (refreshOrdersBtn) {
      refreshOrdersBtn.addEventListener("click", () => this.fetchOrders());
    }

    // Cancel modal dismissal & confirmation
    const closeCancelModalBtn = document.getElementById("close-cancel-modal");
    const cancelDismissBtn = document.getElementById("cancel-modal-dismiss-btn");
    const confirmCancelBtn = document.getElementById("confirm-cancel-api-btn");

    if (closeCancelModalBtn) closeCancelModalBtn.addEventListener("click", () => this.closeCancelModal());
    if (cancelDismissBtn) cancelDismissBtn.addEventListener("click", () => this.closeCancelModal());
    if (confirmCancelBtn) confirmCancelBtn.addEventListener("click", () => this.executeCancelOrder());
  }

  setActiveChip(location) {
    document.querySelectorAll(".filter-chip").forEach((c) => {
      if (c.getAttribute("data-location") === location) {
        c.classList.add("active");
      } else {
        c.classList.remove("active");
      }
    });
  }

  showToast(message, type = "info") {
    const container = document.getElementById("toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    const icon = type === "success" ? "✅" : type === "error" ? "❌" : "ℹ️";
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(100%)";
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  // =========================================================================
  // API Calls: Restaurants & Menus
  // =========================================================================
  async fetchRestaurants(locationFilter = "") {
    try {
      const countBadge = document.getElementById("restaurants-found-count");
      const grid = document.getElementById("restaurants-grid");

      if (countBadge) countBadge.textContent = "Fetching...";

      let url = "/api/restaurants";
      if (locationFilter) {
        url += `?location=${encodeURIComponent(locationFilter)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (res.ok && data.success) {
        this.restaurants = data.data;
        if (countBadge) {
          countBadge.textContent = `${this.restaurants.length} Restaurant${this.restaurants.length === 1 ? "" : "s"} Available`;
        }
        this.renderRestaurants(this.restaurants);
      } else {
        throw new Error(data.error || "Failed to load restaurants");
      }
    } catch (err) {
      console.error("fetchRestaurants error:", err);
      this.showToast(err.message, "error");
    }
  }

  renderRestaurants(restaurants) {
    const grid = document.getElementById("restaurants-grid");
    if (!grid) return;

    if (restaurants.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1/-1; text-align:center; padding: 40px;" class="empty-cart-msg">
          🍽️ No restaurants found for the selected filter. Try clearing your search.
        </div>
      `;
      return;
    }

    grid.innerHTML = restaurants
      .map(
        (r) => `
        <div class="restaurant-card" data-id="${r.id}">
          <div class="restaurant-top">
            <h3 class="restaurant-name">${r.name}</h3>
            <span class="rating-badge">⭐ ${r.rating.toFixed(1)}</span>
          </div>

          <div class="restaurant-meta">
            <span class="meta-pill cuisine">🥘 ${r.cuisine}</span>
            <span class="meta-pill location">📍 ${r.location}</span>
          </div>

          <button class="btn btn-primary btn-block" onclick="app.openRestaurantMenu(${r.id})">
            Browse Menu & Order ➔
          </button>
        </div>
      `
      )
      .join("");
  }

  async openRestaurantMenu(restaurantId) {
    try {
      const res = await fetch(`/api/restaurants/${restaurantId}/menu`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        this.showToast(data.error || "Failed to load menu", "error");
        return;
      }

      this.activeRestaurant = data;

      // Update modal titles
      document.getElementById("modal-restaurant-name").textContent = `${data.restaurantName} Menu`;
      document.getElementById("modal-cuisine-tag").textContent = data.cuisine;
      document.getElementById("modal-restaurant-location").textContent = `📍 Menu Items (${data.menuCount})`;

      // Render menu items
      const menuList = document.getElementById("menu-items-list");
      menuList.innerHTML = data.menu
        .map((item) => {
          const inCartQty = this.cart.items[item.id] ? this.cart.items[item.id].quantity : 0;
          return `
            <div class="menu-item-row" id="menu-row-${item.id}">
              <div class="item-info">
                <h4>${item.name}</h4>
                <div class="item-meta">Category: ${item.category || "General"}</div>
              </div>

              <div style="display:flex; align-items:center; gap: 16px;">
                <span class="item-price">₹${item.price}</span>
                <div class="qty-control">
                  <button class="qty-btn" onclick="app.updateItemQty(${data.restaurantId}, '${data.restaurantName}', ${JSON.stringify(item).replace(/"/g, '&quot;')}, -1)">-</button>
                  <span class="qty-count" id="menu-qty-${item.id}">${inCartQty}</span>
                  <button class="qty-btn" onclick="app.updateItemQty(${data.restaurantId}, '${data.restaurantName}', ${JSON.stringify(item).replace(/"/g, '&quot;')}, 1)">+</button>
                </div>
              </div>
            </div>
          `;
        })
        .join("");

      this.updateModalCartSummary();

      // Show modal
      const modal = document.getElementById("menu-modal");
      if (modal) modal.classList.remove("hidden");
    } catch (err) {
      console.error("openRestaurantMenu error:", err);
      this.showToast("Error loading menu", "error");
    }
  }

  closeMenuModal() {
    const modal = document.getElementById("menu-modal");
    if (modal) modal.classList.add("hidden");
  }

  // =========================================================================
  // Cart Management
  // =========================================================================
  updateItemQty(restaurantId, restaurantName, item, delta) {
    // If switching restaurant, confirm reset
    if (this.cart.restaurantId && this.cart.restaurantId !== restaurantId && Object.keys(this.cart.items).length > 0) {
      const confirmSwitch = confirm(
        `Your cart contains items from "${this.cart.restaurantName}". Would you like to clear your cart to order from "${restaurantName}"?`
      );
      if (!confirmSwitch) return;
      this.cart.items = {};
    }

    this.cart.restaurantId = restaurantId;
    this.cart.restaurantName = restaurantName;

    if (!this.cart.items[item.id]) {
      this.cart.items[item.id] = { item, quantity: 0 };
    }

    this.cart.items[item.id].quantity += delta;

    if (this.cart.items[item.id].quantity <= 0) {
      delete this.cart.items[item.id];
    }

    // Update UI counters
    const menuQtyEl = document.getElementById(`menu-qty-${item.id}`);
    if (menuQtyEl) {
      menuQtyEl.textContent = this.cart.items[item.id] ? this.cart.items[item.id].quantity : 0;
    }

    this.updateCartUI();
    this.updateModalCartSummary();
  }

  updateCartUI() {
    const cartBadge = document.getElementById("cart-badge");
    const cartHeaderTotal = document.getElementById("cart-total-header");
    const itemsList = document.getElementById("cart-items-container");
    const placeOrderBtn = document.getElementById("place-order-btn");
    const cartBanner = document.getElementById("cart-restaurant-info");
    const cartBannerName = document.getElementById("cart-restaurant-name");

    let totalCount = 0;
    let totalPrice = 0;
    const itemsArray = Object.values(this.cart.items);

    itemsArray.forEach(({ item, quantity }) => {
      totalCount += quantity;
      totalPrice += item.price * quantity;
    });

    if (cartBadge) cartBadge.textContent = totalCount;
    if (cartHeaderTotal) cartHeaderTotal.textContent = `₹${totalPrice}`;

    const subtotalEl = document.getElementById("cart-subtotal");
    const grandTotalEl = document.getElementById("cart-grand-total");
    if (subtotalEl) subtotalEl.textContent = `₹${totalPrice}`;
    if (grandTotalEl) grandTotalEl.textContent = `₹${totalPrice}`;

    if (placeOrderBtn) {
      placeOrderBtn.disabled = totalCount === 0;
    }

    if (totalCount > 0 && cartBanner && cartBannerName) {
      cartBanner.classList.remove("hidden");
      cartBannerName.textContent = this.cart.restaurantName;
    } else if (cartBanner) {
      cartBanner.classList.add("hidden");
    }

    if (!itemsList) return;

    if (itemsArray.length === 0) {
      itemsList.innerHTML = `<div class="empty-cart-msg">Your cart is currently empty. Pick some mouthwatering dishes!</div>`;
      return;
    }

    itemsList.innerHTML = itemsArray
      .map(
        ({ item, quantity }) => `
        <div class="cart-item-card">
          <div>
            <strong>${item.name}</strong>
            <div class="text-sm text-muted">₹${item.price} × ${quantity} = ₹${item.price * quantity}</div>
          </div>
          <div class="qty-control">
            <button class="qty-btn" onclick="app.updateItemQty(${this.cart.restaurantId}, '${this.cart.restaurantName}', ${JSON.stringify(item).replace(/"/g, '&quot;')}, -1)">-</button>
            <span class="qty-count">${quantity}</span>
            <button class="qty-btn" onclick="app.updateItemQty(${this.cart.restaurantId}, '${this.cart.restaurantName}', ${JSON.stringify(item).replace(/"/g, '&quot;')}, 1)">+</button>
          </div>
        </div>
      `
      )
      .join("");
  }

  updateModalCartSummary() {
    const countEl = document.getElementById("modal-cart-count");
    const totalEl = document.getElementById("modal-cart-total");

    let count = 0;
    let total = 0;

    Object.values(this.cart.items).forEach(({ item, quantity }) => {
      count += quantity;
      total += item.price * quantity;
    });

    if (countEl) countEl.textContent = `${count} item${count === 1 ? "" : "s"} in cart`;
    if (totalEl) totalEl.textContent = `₹${total}`;
  }

  toggleCartDrawer(open) {
    const drawer = document.getElementById("cart-drawer");
    if (!drawer) return;
    if (open) {
      this.updateCartUI();
      drawer.classList.remove("hidden");
    } else {
      drawer.classList.add("hidden");
    }
  }

  // =========================================================================
  // API Calls: Orders (POST, GET, PATCH status, PATCH cancel)
  // =========================================================================
  async placeOrder() {
    try {
      const customerIdInput = document.getElementById("customer-id-input");
      const customerId = customerIdInput ? customerIdInput.value.trim() : "CUST101";

      if (!customerId) {
        this.showToast("Please enter a valid Customer ID", "error");
        return;
      }

      const itemsPayload = Object.values(this.cart.items).map(({ item, quantity }) => ({
        menuItemId: item.id,
        quantity: quantity
      }));

      if (itemsPayload.length === 0) {
        this.showToast("Cart is empty!", "error");
        return;
      }

      const payload = {
        customerId: customerId,
        restaurantId: this.cart.restaurantId,
        items: itemsPayload
      };

      const placeOrderBtn = document.getElementById("place-order-btn");
      if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.textContent = "Placing order on server...";
      }

      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (res.status === 201) {
        this.showToast(`🎉 ${data.message}! Order #${data.orderId} Created`, "success");
        // Clear cart
        this.cart.items = {};
        this.updateCartUI();
        this.toggleCartDrawer(false);

        // Refresh orders list and focus on newly created order
        await this.fetchOrders();
        this.selectOrder(data.orderId);

        // Switch view to orders tab
        const ordersSection = document.getElementById("orders-section");
        if (ordersSection) ordersSection.scrollIntoView({ behavior: "smooth" });
      } else {
        this.showToast(data.error || "Failed to place order", "error");
      }
    } catch (err) {
      console.error("placeOrder error:", err);
      this.showToast("Server error while placing order", "error");
    } finally {
      const placeOrderBtn = document.getElementById("place-order-btn");
      if (placeOrderBtn) {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order (POST /api/orders)";
      }
    }
  }

  async fetchOrders() {
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();

      if (res.ok && data.success) {
        this.orders = data.orders.reverse(); // Show latest orders first
        const countBadge = document.getElementById("orders-count-badge");
        if (countBadge) countBadge.textContent = this.orders.length;

        this.renderOrdersList();

        if (this.selectedOrderId) {
          const current = this.orders.find((o) => o.orderId === this.selectedOrderId);
          if (current) this.renderOrderDetail(current);
        } else if (this.orders.length > 0) {
          this.selectOrder(this.orders[0].orderId);
        }
      }
    } catch (err) {
      console.error("fetchOrders error:", err);
    }
  }

  renderOrdersList() {
    const list = document.getElementById("orders-list");
    if (!list) return;

    if (this.orders.length === 0) {
      list.innerHTML = `<div class="text-muted text-sm text-center p-3">No orders placed yet.</div>`;
      return;
    }

    list.innerHTML = this.orders
      .map((o) => {
        const isActive = o.orderId === this.selectedOrderId ? "active" : "";
        const statusClass = `status-${o.status.toLowerCase()}`;
        return `
          <div class="order-card-compact ${isActive}" onclick="app.selectOrder(${o.orderId})">
            <div class="order-compact-top">
              <span class="order-id-label">#${o.orderId}</span>
              <span class="status-pill ${statusClass}">${o.status.replace(/_/g, " ")}</span>
            </div>
            <div class="order-compact-info">
              <span>${o.restaurantName}</span>
              <strong>₹${o.totalAmount}</strong>
            </div>
          </div>
        `;
      })
      .join("");
  }

  selectOrder(orderId) {
    this.selectedOrderId = orderId;
    this.renderOrdersList();

    const order = this.orders.find((o) => o.orderId === orderId);
    if (order) {
      this.renderOrderDetail(order);
    }
  }

  renderOrderDetail(order) {
    const emptyState = document.getElementById("no-order-selected");
    const detailCard = document.getElementById("active-order-detail");

    if (emptyState) emptyState.classList.add("hidden");
    if (detailCard) detailCard.classList.remove("hidden");

    const statusIndex = ORDER_STEPS.indexOf(order.status);
    const isCancelled = order.status === "CANCELLED";
    const isDelivered = order.status === "DELIVERED";

    // Progress bar width
    let progressPercent = 0;
    if (statusIndex >= 0) {
      progressPercent = (statusIndex / (ORDER_STEPS.length - 1)) * 100;
    }

    // Determine next allowed status
    let nextStatus = null;
    if (!isCancelled && statusIndex >= 0 && statusIndex < ORDER_STEPS.length - 1) {
      nextStatus = ORDER_STEPS[statusIndex + 1];
    }

    const canCancel = ["PLACED", "CONFIRMED", "PREPARING"].includes(order.status);

    detailCard.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px;">
        <div>
          <span class="meta-pill" style="margin-bottom:8px; display:inline-block;">Customer: ${order.customerId}</span>
          <h2 style="font-size: 1.6rem;">Order #${order.orderId}</h2>
          <p class="text-muted text-sm">Restaurant: <strong>${order.restaurantName}</strong> • Placed on: ${new Date(order.createdAt).toLocaleTimeString()}</p>
        </div>
        <div style="text-align:right;">
          <span class="status-pill status-${order.status.toLowerCase()}" style="font-size: 0.95rem; padding: 6px 14px;">
            ${STEP_ICONS[order.status] || "📦"} ${order.status.replace(/_/g, " ")}
          </span>
          <div style="font-size: 1.4rem; font-weight:800; color:#38bdf8; margin-top:6px;">₹${order.totalAmount}</div>
        </div>
      </div>

      ${
        isCancelled
          ? `
        <div style="background:rgba(244,63,94,0.15); border:1px solid rgba(244,63,94,0.3); padding:16px; border-radius:12px; margin: 20px 0;">
          <h4 style="color:#f43f5e; margin-bottom:4px;">❌ This Order Has Been Cancelled</h4>
          <p class="text-sm text-muted">Reason: <strong>${order.cancellationReason || "Customer cancellation"}</strong></p>
        </div>
      `
          : `
        <!-- Live Visual Stepper -->
        <div class="stepper-container">
          <div class="stepper-progress-bar" style="width: ${progressPercent}%;"></div>
          <div class="stepper">
            ${ORDER_STEPS.map((step, idx) => {
              let nodeClass = "";
              if (idx < statusIndex) nodeClass = "completed";
              else if (idx === statusIndex) nodeClass = "active";
              return `
                <div class="step-node ${nodeClass}">
                  <div class="step-circle">${STEP_ICONS[step]}</div>
                  <span class="step-label">${step.replace(/_/g, " ")}</span>
                </div>
              `;
            }).join("")}
          </div>
        </div>
      `
      }

      <!-- Order Items Summary Table -->
      <div style="margin: 24px 0;">
        <h4 style="margin-bottom: 12px; font-size:1rem; color:#cbd5e1;">Ordered Items (${order.items.length})</h4>
        <div style="background:var(--bg-glass); border:1px solid var(--border-glass); border-radius:12px; padding: 12px 16px;">
          ${order.items
            .map(
              (item) => `
            <div style="display:flex; justify-content:space-between; padding: 6px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
              <span>${item.name} × <strong>${item.quantity}</strong></span>
              <span>₹${item.price} each = <strong>₹${item.itemTotal}</strong></span>
            </div>
          `
            )
            .join("")}
        </div>
      </div>

      <!-- Action Controls -->
      <div class="order-actions-bar">
        ${
          nextStatus
            ? `
          <button class="btn btn-primary" onclick="app.advanceOrderStatus(${order.orderId}, '${nextStatus}')">
            ⚡ Advance Status to '${nextStatus.replace(/_/g, " ")}' ➔
          </button>
        `
            : isDelivered
            ? `
          <div class="text-green text-sm" style="display:flex; align-items:center; gap:6px;">
            🎉 Order successfully delivered to customer! (Terminal State)
          </div>
        `
            : ""
        }

        ${
          canCancel
            ? `
          <button class="btn btn-danger" onclick="app.promptCancelOrder(${order.orderId})">
            🛑 Cancel Order (PATCH /cancel)
          </button>
        `
            : !isCancelled
            ? `
          <span class="text-muted text-sm" style="align-self:center;">
            🔒 Cancellation locked for status '${order.status}'
          </span>
        `
            : ""
        }
      </div>
    `;
  }

  async advanceOrderStatus(orderId, newStatus) {
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();

      if (res.ok) {
        this.showToast(`Updated: Order #${orderId} ➔ ${newStatus}`, "success");
        await this.fetchOrders();
      } else {
        this.showToast(data.error || "Failed to update status", "error");
      }
    } catch (err) {
      console.error("advanceOrderStatus error:", err);
      this.showToast("Error updating order status", "error");
    }
  }

  promptCancelOrder(orderId) {
    this.orderToCancelId = orderId;
    document.getElementById("cancel-order-id-label").textContent = orderId;
    const cancelModal = document.getElementById("cancel-modal");
    if (cancelModal) cancelModal.classList.remove("hidden");
  }

  closeCancelModal() {
    this.orderToCancelId = null;
    const cancelModal = document.getElementById("cancel-modal");
    if (cancelModal) cancelModal.classList.add("hidden");
  }

  async executeCancelOrder() {
    if (!this.orderToCancelId) return;

    try {
      const reasonInput = document.getElementById("cancel-reason-input");
      const reason = reasonInput ? reasonInput.value.trim() : "";

      const res = await fetch(`/api/orders/${this.orderToCancelId}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Customer requested cancellation" })
      });

      const data = await res.json();

      this.closeCancelModal();

      if (res.status === 200) {
        this.showToast(`Order #${this.orderToCancelId} has been CANCELLED`, "success");
        await this.fetchOrders();
      } else if (res.status === 409) {
        this.showToast(data.error || "Conflict: Cannot cancel order", "error");
      } else {
        this.showToast(data.error || "Error cancelling order", "error");
      }
    } catch (err) {
      console.error("executeCancelOrder error:", err);
      this.showToast("Error during order cancellation", "error");
    }
  }

  // =========================================================================
  // REST API Sandbox Runner (Practical Assessment Testing)
  // =========================================================================
  async runSandbox(testKey) {
    const titleEl = document.getElementById("sandbox-req-title");
    const statusTag = document.getElementById("sandbox-status-tag");
    const outputEl = document.getElementById("sandbox-output");

    if (statusTag) {
      statusTag.textContent = "Executing...";
      statusTag.style.color = "#fbbf24";
    }

    let method = "GET";
    let url = "/api/restaurants";
    let body = null;
    let label = "";

    switch (testKey) {
      case "get-restaurants":
        label = "GET /api/restaurants (Search Restaurants)";
        url = "/api/restaurants";
        break;
      case "filter-restaurants":
        label = "GET /api/restaurants?location=Downtown (Filter)";
        url = "/api/restaurants?location=Downtown";
        break;
      case "get-menu-valid":
        label = "GET /api/restaurants/1/menu (Valid Menu - 200 OK)";
        url = "/api/restaurants/1/menu";
        break;
      case "get-menu-404":
        label = "GET /api/restaurants/999/menu (Missing Restaurant - 404)";
        url = "/api/restaurants/999/menu";
        break;
      case "place-order-valid":
        label = "POST /api/orders (Valid Order - 201 Created)";
        method = "POST";
        url = "/api/orders";
        body = {
          customerId: "EXAM_STUDENT",
          restaurantId: 1,
          items: [
            { menuItemId: 101, quantity: 1 },
            { menuItemId: 102, quantity: 2 }
          ]
        };
        break;
      case "place-order-400":
        label = "POST /api/orders (Invalid Quantity - 400 Bad Request)";
        method = "POST";
        url = "/api/orders";
        body = {
          customerId: "EXAM_STUDENT",
          restaurantId: 1,
          items: [{ menuItemId: 101, quantity: -1 }]
        };
        break;
      case "advance-status":
        label = "PATCH /api/orders/1000/status (Delivered Transition Attempt)";
        method = "PATCH";
        url = "/api/orders/1000/status";
        body = { status: "CONFIRMED" };
        break;
      case "cancel-409":
        label = "PATCH /api/orders/1000/cancel (Cancel Delivered - 409 Conflict)";
        method = "PATCH";
        url = "/api/orders/1000/cancel";
        body = { reason: "Trying to cancel delivered food" };
        break;
    }

    if (titleEl) titleEl.textContent = label;

    try {
      const options = {
        method,
        headers: { "Content-Type": "application/json" },
        ...(body ? { body: JSON.stringify(body) } : {})
      };

      const start = performance.now();
      const res = await fetch(url, options);
      const data = await res.json();
      const duration = Math.round(performance.now() - start);

      if (statusTag) {
        statusTag.textContent = `HTTP ${res.status} ${res.statusText} (${duration}ms)`;
        if (res.status >= 200 && res.status < 300) {
          statusTag.style.color = "#10b981";
        } else if (res.status >= 400 && res.status < 500) {
          statusTag.style.color = "#f43f5e";
        } else {
          statusTag.style.color = "#f59e0b";
        }
      }

      const formattedOutput = {
        request: {
          method,
          endpoint: url,
          ...(body ? { payload: body } : {})
        },
        response: {
          httpStatus: `${res.status} ${res.statusText}`,
          body: data
        }
      };

      if (outputEl) {
        outputEl.textContent = JSON.stringify(formattedOutput, null, 2);
      }

      // If we placed a new order, refresh order lists
      if (testKey === "place-order-valid") {
        await this.fetchOrders();
      }
    } catch (err) {
      if (statusTag) {
        statusTag.textContent = "Network / Client Error";
        statusTag.style.color = "#f43f5e";
      }
      if (outputEl) {
        outputEl.textContent = `Error executing request: ${err.message}`;
      }
    }
  }
}

// Instantiate App
const app = new FoodDeliveryApp();
window.app = app;
