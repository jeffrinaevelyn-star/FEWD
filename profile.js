document.addEventListener("DOMContentLoaded", function () {
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  const loggedIn = sessionStorage.getItem("loggedIn") === "true";
  const currentUser = getCurrentUser();

  initializeProfileTrigger(loggedIn, currentUser, currentPage);
  initializeProfilePage(loggedIn, currentUser, currentPage);
});

function initializeProfileTrigger(loggedIn, currentUser, currentPage) {
  const profileTrigger = document.querySelector('.nav-icons a[aria-label="Register"], .nav-icons a[aria-label="Login"], .nav-icons a[aria-label="Profile"], .nav-icons a[aria-label="Open profile"]');

  if (!profileTrigger) {
    return;
  }

  profileTrigger.classList.add("profile-link");
  profileTrigger.innerHTML = loggedIn && currentUser ? buildLoggedInIconMarkup(currentUser) : '<i class="fa-regular fa-user"></i>';

  if (!loggedIn || !currentUser) {
    profileTrigger.setAttribute("href", currentPage === "login.html" ? "login.html" : "register.html");
    profileTrigger.setAttribute("aria-label", currentPage === "login.html" ? "Login" : "Register");
    profileTrigger.setAttribute("title", "Register or login");
    profileTrigger.classList.remove("logged-in");
    return;
  }

  profileTrigger.setAttribute("href", "profile.html");
  profileTrigger.setAttribute("aria-label", "Profile");
  profileTrigger.setAttribute("title", "View profile");
  profileTrigger.classList.add("logged-in");
}

function initializeProfilePage(loggedIn, currentUser, currentPage) {
  if (currentPage !== "profile.html") {
    return;
  }

  const guestState = document.getElementById("profile-guest-state");
  const profileContent = document.getElementById("profile-content");
  const avatar = document.getElementById("profile-page-avatar");
  const welcomeMessage = document.getElementById("profile-page-welcome");
  const detailGrid = document.getElementById("profile-page-details");
  const ordersSection = document.getElementById("profile-orders-section");
  const ordersList = document.getElementById("profile-orders-list");
  const logoutButton = document.getElementById("profile-logout-button");

  if (!guestState || !profileContent || !avatar || !welcomeMessage || !detailGrid || !ordersSection || !ordersList || !logoutButton) {
    return;
  }

  if (!loggedIn || !currentUser) {
    guestState.hidden = false;
    profileContent.hidden = true;
    return;
  }

  guestState.hidden = true;
  profileContent.hidden = false;
  avatar.textContent = getProfileInitial(currentUser);
  welcomeMessage.textContent = "Hi, " + (currentUser.username || currentUser.name || "there") + ". Here are your account details.";
  detailGrid.innerHTML = [
    createProfileRow("Full name", currentUser.name || "Not provided"),
    createProfileRow("Username", currentUser.username || "Not provided"),
    createProfileRow("Email", currentUser.email || "Not provided"),
    createProfileRow("Phone", currentUser.phone || "Not provided"),
    createProfileRow("Date of birth", formatDateValue(currentUser.dob)),
    createProfileRow("Registered", formatDateTimeValue(currentUser.registeredAt)),
    createProfileRow("Last login", formatDateTimeValue(currentUser.lastLoginAt))
  ].join("");
  renderOrderHistory(currentUser.email, ordersSection, ordersList);

  logoutButton.addEventListener("click", function () {
    handleLogout();
  });
}

function getCurrentUser() {
  const storedUser = JSON.parse(localStorage.getItem("currentUser") || "null");
  const email = (localStorage.getItem("userEmail") || storedUser?.email || "").trim();

  if (!email) {
    return null;
  }

  return {
    id: localStorage.getItem("userId") || storedUser?.id || "",
    name: localStorage.getItem("userFullName") || storedUser?.name || "",
    username: localStorage.getItem("userName") || storedUser?.username || "",
    email: email,
    phone: localStorage.getItem("userPhone") || storedUser?.phone || "",
    dob: localStorage.getItem("userDob") || storedUser?.dob || "",
    registeredAt: storedUser?.registeredAt || "",
    lastLoginAt: storedUser?.lastLoginAt || ""
  };
}

function buildLoggedInIconMarkup(user) {
  return [
    '<i class="fa-solid fa-user" aria-hidden="true"></i>',
    '<span class="profile-status-dot" aria-hidden="true"></span>'
  ].join("");
}

function getProfileInitial(user) {
  const source = (user.username || user.name || user.email || "U").trim();
  return source.charAt(0).toUpperCase();
}

function createProfileRow(label, value) {
  return [
    '<div class="profile-detail-row">',
    "  <span>" + escapeHtml(label) + "</span>",
    "  <strong>" + escapeHtml(value) + "</strong>",
    "</div>"
  ].join("");
}

function renderOrderHistory(email, section, list) {
  const orders = JSON.parse(localStorage.getItem(getOrderHistoryStorageKey(email)) || "[]");
  section.hidden = false;

  if (!orders.length) {
    list.innerHTML = '<div class="profile-order-empty">No previous orders yet. Your completed coffee orders will appear here.</div>';
    return;
  }
  list.innerHTML = orders
    .slice()
    .reverse()
    .map(function (order) {
      const itemsMarkup = (order.items || [])
        .map(function (item) {
          return '<li>' + escapeHtml(item.name || "Item") + ' x ' + escapeHtml(String(item.quantity || 1)) + "</li>";
        })
        .join("");

      return [
        '<article class="profile-order-card">',
        '  <div class="profile-order-top">',
        '    <div>',
        '      <p class="profile-order-date">' + escapeHtml(formatDateTimeValue(order.orderedAt)) + "</p>",
        '      <h3>Order #' + escapeHtml(String(order.id || "0000")) + "</h3>",
        "    </div>",
        '    <strong class="profile-order-total">' + escapeHtml(formatCurrency(order.total)) + "</strong>",
        "  </div>",
        '  <ul class="profile-order-items">' + itemsMarkup + "</ul>",
        '  <p class="profile-order-meta">Delivery to ' + escapeHtml(order.deliveryLocation || "Saved address") + "</p>",
        "</article>"
      ].join("");
    })
    .join("");
}

function getOrderHistoryStorageKey(email) {
  return "velvetOrders:" + String(email || "").trim().toLowerCase();
}

function handleLogout() {
  const activeEmail = (localStorage.getItem("userEmail") || "").trim().toLowerCase();
  const currentCart = JSON.parse(localStorage.getItem("cartItems") || "[]");
  const appliedVoucher = JSON.parse(localStorage.getItem("appliedVoucher") || "null");

  if (activeEmail) {
    localStorage.setItem("cartItems:" + activeEmail, JSON.stringify(currentCart));

    if (appliedVoucher) {
      localStorage.setItem("appliedVoucher:" + activeEmail, JSON.stringify(appliedVoucher));
    } else {
      localStorage.removeItem("appliedVoucher:" + activeEmail);
    }
  }

  sessionStorage.removeItem("loggedIn");
  sessionStorage.setItem("guestCartItems", JSON.stringify(currentCart));
  localStorage.removeItem("loggedIn");
  localStorage.removeItem("userId");
  localStorage.removeItem("userName");
  localStorage.removeItem("userFullName");
  localStorage.removeItem("userEmail");
  localStorage.removeItem("userPhone");
  localStorage.removeItem("userDob");
  localStorage.removeItem("birthdayOfferCode");
  localStorage.removeItem("currentUser");
  localStorage.setItem("cartItems", JSON.stringify(currentCart));
  localStorage.removeItem("appliedVoucher");

  window.location.href = "index.html";
}

function formatDateValue(value) {
  if (!value) {
    return "Not provided";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function formatDateTimeValue(value) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatCurrency(value) {
  return "$" + Number(value || 0).toFixed(2);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
