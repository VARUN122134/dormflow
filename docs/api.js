const API = (() => {
  const BASE_URL = "https://dgiywszdgqwkhyamxjlm.supabase.co/functions/v1/warden-api";

  function getToken() {
    return localStorage.getItem("warden_token");
  }

  function setToken(token) {
    localStorage.setItem("warden_token", token);
  }

  function clearToken() {
    localStorage.removeItem("warden_token");
    localStorage.removeItem("warden_profile");
  }

  function getProfile() {
    const raw = localStorage.getItem("warden_profile");
    return raw ? JSON.parse(raw) : null;
  }

  function setProfile(profile) {
    localStorage.setItem("warden_profile", JSON.stringify(profile));
  }

  function requireAuth() {
    const token = getToken();
    if (!token) {
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  async function apiFetch(path, options = {}) {
    const token = getToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const url = `${BASE_URL}${path}`;
    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      clearToken();
      window.location.href = "login.html";
      throw new Error("Session expired");
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("spreadsheet") || contentType.includes("octet-stream")) {
      if (!response.ok) throw new Error("Download failed");
      return response.blob();
    }

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }

  return {
    async login(email, password) {
      const result = await apiFetch("/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      setToken(result.token);
      setProfile(result.profile);
      return result.profile;
    },

    async logout() {
      clearToken();
    },

    async getMe() {
      const data = await apiFetch("/me");
      setProfile(data.profile);
      return data.profile;
    },

    isAuthenticated() {
      return !!getToken();
    },

    getProfile,
    requireAuth,

    async getDashboardStats() {
      return apiFetch("/dashboard/stats");
    },

    async getDashboardAlerts() {
      return apiFetch("/dashboard/alerts");
    },

    async getCommodities() {
      return apiFetch("/inventory/commodities");
    },

    async getInventoryItems() {
      return apiFetch("/inventory/items");
    },

    async getInventoryFinancials() {
      return apiFetch("/inventory/financials");
    },

    async getRecentIssues() {
      return apiFetch("/inventory/recent-issues");
    },

    async logPurchase(data) {
      return apiFetch("/inventory/purchases", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async logUsage(data) {
      return apiFetch("/inventory/usage", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async createStockItem(data) {
      return apiFetch("/inventory/items", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateStockItem(id, data) {
      return apiFetch(`/inventory/items/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteStockItem(id) {
      return apiFetch(`/inventory/items/${id}`, { method: "DELETE" });
    },

    async getStudents(params = {}) {
      const qs = new URLSearchParams(params).toString();
      return apiFetch(`/students${qs ? "?" + qs : ""}`);
    },

    async getStudentStats() {
      return apiFetch("/students/stats");
    },

    async createStudent(data) {
      return apiFetch("/students", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateStudent(id, data) {
      return apiFetch(`/students/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteStudent(id) {
      return apiFetch(`/students/${id}`, { method: "DELETE" });
    },

    async getKitchenUnits() {
      return apiFetch("/kitchen-units");
    },

    async getVendors() {
      return apiFetch("/vendors");
    },

    async syncAttendance(records) {
      return apiFetch("/attendance/sync", {
        method: "POST",
        body: JSON.stringify({ records }),
      });
    },

    async getAttendance(date) {
      const qs = date ? `?date=${date}` : "";
      return apiFetch(`/attendance${qs}`);
    },

    async getMonthlyBills(month) {
      return apiFetch(`/reports/bills/${month}`);
    },

    async getMonthEndStatus() {
      return apiFetch("/reports/month-end/status");
    },

    async changePassword(currentPassword, newPassword) {
      return apiFetch("/profile/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
    },

    downloadExcelUrl(month) {
      const base = BASE_URL.replace("warden-api", "generate-excel");
      return `${base}?month=${month}`;
    },

    async downloadExcel(month) {
      const blob = await apiFetch(`/excel?month=${month}`);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Inventory_Report_${month}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    },
  };
})();
