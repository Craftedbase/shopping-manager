(function () {
  const STORAGE_KEY = "shopping-manager-v1";

  const defaultState = {
    units: [
      { id: "u-ml", name: "ml", base: 100 },
      { id: "u-g", name: "g", base: 100 },
      { id: "u-count", name: "個", base: 1 },
      { id: "u-pack", name: "袋", base: 1 }
    ],
    products: [
      {
        id: "sample-milk",
        name: "牛乳 1L",
        category: "食品",
        amount: 1000,
        unitId: "u-ml",
        stock: 1,
        minStock: 2,
        image: "",
        favorite: true
      },
      {
        id: "sample-yogurt",
        name: "プレーンヨーグルト 400g",
        category: "食品",
        amount: 400,
        unitId: "u-g",
        stock: 2,
        minStock: 1,
        image: "",
        favorite: true
      },
      {
        id: "sample-detergent",
        name: "洗濯洗剤 900ml",
        category: "日用品",
        amount: 900,
        unitId: "u-ml",
        stock: 0,
        minStock: 1,
        image: "",
        favorite: false
      },
      {
        id: "sample-rice",
        name: "無洗米 5kg",
        category: "食品",
        amount: 5000,
        unitId: "u-g",
        stock: 1,
        minStock: 1,
        image: "",
        favorite: false
      },
      {
        id: "sample-tissue",
        name: "ティッシュ 5箱",
        category: "日用品",
        amount: 5,
        unitId: "u-count",
        stock: 1,
        minStock: 2,
        image: "",
        favorite: false
      }
    ],
    stores: [
      { id: "sample-store-a", name: "青空スーパー", type: "スーパー", image: "", favorite: true },
      { id: "sample-store-b", name: "駅前ドラッグ", type: "ドラッグストア", image: "", favorite: true },
      { id: "sample-store-c", name: "週末マーケット", type: "スーパー", image: "", favorite: false }
    ],
    purchases: [
      {
        id: "sample-purchase-001",
        date: "2026-06-12",
        productId: "sample-milk",
        storeId: "sample-store-a",
        quantity: 1,
        price: 218,
        note: "通常価格"
      },
      {
        id: "sample-purchase-002",
        date: "2026-06-09",
        productId: "sample-yogurt",
        storeId: "sample-store-b",
        quantity: 1,
        price: 168,
        note: "アプリクーポン"
      },
      {
        id: "sample-purchase-003",
        date: "2026-06-05",
        productId: "sample-milk",
        storeId: "sample-store-c",
        quantity: 1,
        price: 205,
        note: "週末特売"
      },
      {
        id: "sample-purchase-004",
        date: "2026-06-03",
        productId: "sample-tissue",
        storeId: "sample-store-b",
        quantity: 1,
        price: 328,
        note: "まとめ買い候補"
      },
      {
        id: "sample-purchase-005",
        date: "2026-05-29",
        productId: "sample-detergent",
        storeId: "sample-store-b",
        quantity: 1,
        price: 398,
        note: "詰替"
      },
      {
        id: "sample-purchase-006",
        date: "2026-05-25",
        productId: "sample-milk",
        storeId: "sample-store-a",
        quantity: 1,
        price: 218,
        note: ""
      },
      {
        id: "sample-purchase-007",
        date: "2026-05-20",
        productId: "sample-rice",
        storeId: "sample-store-c",
        quantity: 1,
        price: 2380,
        note: "5kg"
      },
      {
        id: "sample-purchase-008",
        date: "2026-05-18",
        productId: "sample-yogurt",
        storeId: "sample-store-a",
        quantity: 1,
        price: 188,
        note: ""
      },
      {
        id: "sample-purchase-009",
        date: "2026-05-11",
        productId: "sample-milk",
        storeId: "sample-store-b",
        quantity: 1,
        price: 198,
        note: "特売"
      }
    ],
    shoppingItems: [
      {
        id: "sample-shopping-001",
        productId: "sample-yogurt",
        name: "プレーンヨーグルト 400g",
        storeId: "sample-store-b",
        checked: false,
        source: "manual"
      },
      {
        id: "sample-shopping-002",
        productId: "",
        name: "卵 10個",
        storeId: "",
        checked: false,
        source: "manual"
      }
    ],
    stockHistory: [
      {
        id: "sample-stock-001",
        productId: "sample-milk",
        productName: "牛乳 1L",
        before: 2,
        after: 1,
        reason: "在庫を減少",
        changedAt: "2026-06-12T20:15:00"
      },
      {
        id: "sample-stock-002",
        productId: "sample-detergent",
        productName: "洗濯洗剤 900ml",
        before: 1,
        after: 0,
        reason: "在庫数を編集",
        changedAt: "2026-06-10T09:30:00"
      },
      {
        id: "sample-stock-003",
        productId: "sample-tissue",
        productName: "ティッシュ 5箱",
        before: 2,
        after: 1,
        reason: "在庫を減少",
        changedAt: "2026-06-08T18:05:00"
      }
    ]
  };

  let state = loadState();
  let pendingProductImage = "";
  let pendingStoreImage = "";
  let linkedShoppingItemId = "";

  const yen = new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: "JPY",
    maximumFractionDigits: 0
  });

  const byId = (id) => document.getElementById(id);
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const money = (value) => yen.format(Number(value) || 0);

  function loadState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return structuredClone(defaultState);

    try {
      return normalizeState(JSON.parse(raw));
    } catch {
      return structuredClone(defaultState);
    }
  }

  function normalizeState(data) {
    if (!data || typeof data !== "object") {
      throw new Error("invalid state");
    }

    return {
      ...structuredClone(defaultState),
      ...data,
      units: Array.isArray(data.units) && data.units.length ? data.units : structuredClone(defaultState.units),
      products: Array.isArray(data.products) ? data.products : [],
      stores: Array.isArray(data.stores) ? data.stores : [],
      purchases: Array.isArray(data.purchases) ? data.purchases : [],
      shoppingItems: Array.isArray(data.shoppingItems) ? data.shoppingItems : [],
      stockHistory: Array.isArray(data.stockHistory) ? data.stockHistory : []
    };
  }

  function createEmptyState() {
    return {
      ...structuredClone(defaultState),
      products: [],
      stores: [],
      purchases: [],
      shoppingItems: [],
      stockHistory: []
    };
  }

  function resetWorkingForms() {
    pendingProductImage = "";
    pendingStoreImage = "";
    linkedShoppingItemId = "";
    resetPurchaseForm();
    resetProductForm();
    resetStoreForm();
    resetUnitForm();
    resetShoppingForm();
    closeShoppingPanel();
    closeMasterForm();
    byId("purchaseSearch").value = "";
    byId("productSearch").value = "";
    byId("purchaseProductSearch").value = "";
    byId("shoppingProductSearch").value = "";
    byId("purchaseCalendarMonth").value = today().slice(0, 7);
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      alert("保存容量が不足しています。商品画像を小さくするか、不要な画像を削除してください。");
    }
  }

  function productById(id) {
    return state.products.find((product) => product.id === id);
  }

  function storeById(id) {
    return state.stores.find((store) => store.id === id);
  }

  function unitById(id) {
    return state.units.find((unit) => unit.id === id);
  }

  function unitPrice(purchase, product) {
    const unit = unitById(product.unitId);
    const amount = Number(product.amount) || 0;
    const base = Number(unit?.base) || 1;
    const quantity = Number(purchase.quantity) || 1;
    if (!amount || !quantity) return 0;
    return (Number(purchase.price) / (amount * quantity)) * base;
  }

  function unitLabel(product) {
    const unit = unitById(product.unitId);
    if (!unit) return "";
    return `${unit.base}${unit.name}あたり`;
  }

  function productImageMarkup(product) {
    if (!product?.image) return "";
    return `<img class="product-thumb" src="${product.image}" alt="">`;
  }

  function storeImageMarkup(store) {
    if (!store?.image) return "";
    return `<img class="product-thumb" src="${store.image}" alt="">`;
  }

  function renderOptions() {
    const selectedPurchaseProduct = byId("purchaseProduct").value;
    const selectedPurchaseStore = byId("purchaseStore").value;
    const selectedShoppingProduct = byId("shoppingProduct").value;
    const selectedShoppingStore = byId("shoppingStore").value;
    const sortedProducts = [...state.products].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "ja"));
    const purchaseProducts = filterProducts(byId("purchaseProductSearch").value, sortedProducts);
    const shoppingProducts = filterProducts(byId("shoppingProductSearch").value, sortedProducts);
    const sortedStores = [...state.stores].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "ja"));
    const purchaseProductOptions = purchaseProducts
      .map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`)
      .join("");
    const shoppingProductOptions = shoppingProducts
      .map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`)
      .join("");
    const storeOptions = sortedStores
      .map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`)
      .join("");
    const unitOptions = state.units
      .map((unit) => `<option value="${unit.id}">${escapeHtml(unit.name)} / ${unit.base}${escapeHtml(unit.name)}基準</option>`)
      .join("");

    byId("purchaseProduct").innerHTML = purchaseProductOptions
      ? `<option value="">商品を選択</option>${purchaseProductOptions}`
      : `<option value="">${state.products.length ? "条件に合う商品なし" : "先に商品を登録"}</option>`;
    byId("purchaseStore").innerHTML = storeOptions || "<option value=\"\">先に店舗を登録</option>";
    byId("shoppingProduct").innerHTML = `<option value="">メモ商品として追加</option>${shoppingProductOptions}`;
    byId("shoppingStore").innerHTML = `<option value="">最安値店舗に任せる</option>${storeOptions}`;
    byId("productUnit").innerHTML = unitOptions;
    byId("purchaseProduct").value = selectedPurchaseProduct && purchaseProducts.some((product) => product.id === selectedPurchaseProduct)
      ? selectedPurchaseProduct
      : "";
    byId("purchaseStore").value = selectedPurchaseStore || getRecentStoreId() || sortedStores[0]?.id || "";
    byId("shoppingProduct").value = selectedShoppingProduct && shoppingProducts.some((product) => product.id === selectedShoppingProduct)
      ? selectedShoppingProduct
      : "";
    byId("shoppingStore").value = selectedShoppingStore;
  }

  function filterProducts(keyword, products = state.products) {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) return products;

    return products.filter((product) => {
      const haystack = `${product.name || ""} ${product.category || ""}`.toLowerCase();
      return haystack.includes(normalizedKeyword);
    });
  }

  function renderPurchases() {
    const keyword = byId("purchaseSearch").value.trim().toLowerCase();
    const purchases = [...state.purchases]
      .sort((a, b) => b.date.localeCompare(a.date))
      .filter((purchase) => {
        const product = productById(purchase.productId);
        const store = storeById(purchase.storeId);
        return !keyword ||
          product?.name.toLowerCase().includes(keyword) ||
          store?.name.toLowerCase().includes(keyword);
      });

    byId("purchaseList").innerHTML = purchases.length
      ? purchases.map(renderPurchaseItem).join("")
      : "<div class=\"empty\">条件に合う購入ログはありません。</div>";
  }

  function renderShoppingList() {
    ensureAutoShoppingItems();
    const items = getShoppingItemsWithDetails();
    byId("shoppingList").innerHTML = items.length
      ? items.map((item) => `
          <article class="item ${item.checked ? "checked" : ""}">
            <div class="item-header">
              <label class="check-item">
                <input type="checkbox" ${item.checked ? "checked" : ""} data-toggle-shopping="${item.id}">
                <span>
                  <span class="item-title">${escapeHtml(item.name)}</span>
                  <span class="meta">${escapeHtml(item.storeName)} / ${escapeHtml(item.sourceLabel)}</span>
                  ${item.priceLabel ? `<span class="meta">${escapeHtml(item.priceLabel)}</span>` : ""}
                </span>
              </label>
              <div class="item-actions">
                <button class="mini-button" type="button" data-input-shopping="${item.id}" aria-label="買物入力へ">入力</button>
                <button class="mini-button danger" type="button" data-delete-shopping="${item.id}" aria-label="削除">削</button>
              </div>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">買うものはありません。在庫不足の商品は自動で表示されます。</div>";
  }

  function renderPurchaseItem(purchase) {
    const product = productById(purchase.productId);
    const store = storeById(purchase.storeId);
    const price = product ? unitPrice(purchase, product) : 0;
    return `
      <article class="item">
        <div class="item-header">
          <div>
            <p class="item-title">${escapeHtml(product?.name || "削除済み商品")}</p>
            <p class="meta">${escapeHtml(store?.name || "削除済み店舗")} / ${purchase.date} / 数量 ${purchase.quantity}</p>
            <p class="meta">${product ? `${money(price)} / ${unitLabel(product)}` : ""}</p>
            ${purchase.note ? `<p class="meta">${escapeHtml(purchase.note)}</p>` : ""}
          </div>
          <div class="item-actions">
            <button class="mini-button" type="button" data-edit-purchase="${purchase.id}" aria-label="編集">編</button>
            <button class="mini-button danger" type="button" data-delete-purchase="${purchase.id}" aria-label="削除">削</button>
          </div>
        </div>
        <p class="price">${money(purchase.price)}</p>
      </article>
    `;
  }

  function renderProducts() {
    const products = filterProducts(byId("productSearch").value, state.products)
      .sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "ja"));
    byId("productList").innerHTML = products.length
      ? products.map((product) => {
          const unit = unitById(product.unitId);
          return `
          <article class="item">
            <div class="item-header">
              <div class="item-main">
                ${productImageMarkup(product)}
                <div>
                  <p class="item-title">${escapeHtml(product.name)}</p>
                  <p class="meta">${escapeHtml(product.category || "未分類")} / ${product.amount}${escapeHtml(unit?.name || "")}</p>
                </div>
              </div>
                <div class="item-actions">
                  ${product.favorite ? "<span class=\"badge\">定番</span>" : ""}
                  <button class="mini-button" type="button" data-edit-product="${product.id}" aria-label="編集">編</button>
                  <button class="mini-button danger" type="button" data-delete-product="${product.id}" aria-label="削除">削</button>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : `<div class="empty">${state.products.length ? "条件に合う商品はありません。" : "商品を登録してください。"}</div>`;
  }

  function renderInventory() {
    byId("inventoryList").innerHTML = state.products.length
      ? state.products.map((product) => {
          const unit = unitById(product.unitId);
          const isLow = Number(product.minStock) > 0 && Number(product.stock) <= Number(product.minStock);
          return `
            <article class="item">
              <div class="item-header">
                <div class="item-main">
                  ${productImageMarkup(product)}
                  <div>
                    <p class="item-title">${escapeHtml(product.name)}</p>
                    <p class="meta">${escapeHtml(product.category || "未分類")} / ${product.amount}${escapeHtml(unit?.name || "")}</p>
                    ${isLow ? "<span class=\"badge danger\">不足</span>" : "<span class=\"badge\">在庫あり</span>"}
                  </div>
                </div>
                <div class="stock-actions">
                  <button class="mini-button" type="button" data-stock-step="${product.id}" data-step="-1" aria-label="在庫を減らす">−</button>
                  <input class="stock-input" type="number" min="0" step="0.01" value="${product.stock || 0}" data-stock-input="${product.id}" aria-label="現在在庫">
                  <button class="mini-button" type="button" data-stock-step="${product.id}" data-step="1" aria-label="在庫を増やす">＋</button>
                </div>
              </div>
              <label>
                最低在庫
                <input type="number" min="0" step="0.01" value="${product.minStock || 0}" data-min-stock-input="${product.id}" aria-label="最低在庫">
              </label>
            </article>
          `;
        }).join("")
      : "<div class=\"empty\">先に商品を登録してください。</div>";
  }

  function renderStores() {
    byId("storeList").innerHTML = state.stores.length
      ? state.stores.map((store) => `
          <article class="item">
            <div class="item-header">
              <div class="item-main">
                ${storeImageMarkup(store)}
                <div>
                  <p class="item-title">${escapeHtml(store.name)}</p>
                  <p class="meta">${escapeHtml(store.type || "種別なし")}</p>
                </div>
              </div>
              <div class="item-actions">
                ${store.favorite ? "<span class=\"badge\">常用</span>" : ""}
                <button class="mini-button" type="button" data-edit-store="${store.id}" aria-label="編集">編</button>
                <button class="mini-button danger" type="button" data-delete-store="${store.id}" aria-label="削除">削</button>
              </div>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">店舗を登録してください。</div>";
  }

  function renderUnits() {
    byId("unitList").innerHTML = state.units.length
      ? state.units.map((unit) => `
          <article class="item">
            <div class="item-header">
              <div>
                <p class="item-title">${escapeHtml(unit.name)}</p>
                <p class="meta">単位価格基準: ${unit.base}${escapeHtml(unit.name)}あたり</p>
              </div>
              <div class="item-actions">
                <button class="mini-button" type="button" data-edit-unit="${unit.id}" aria-label="編集">編</button>
                <button class="mini-button danger" type="button" data-delete-unit="${unit.id}" aria-label="削除">削</button>
              </div>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">単位を登録してください。</div>";
  }

  function getAnalysis() {
    return state.products.map((product) => {
      const entries = state.purchases
        .filter((purchase) => purchase.productId === product.id)
        .map((purchase) => ({
          purchase,
          store: storeById(purchase.storeId),
          unitPrice: unitPrice(purchase, product)
        }))
        .sort((a, b) => a.unitPrice - b.unitPrice);

      const total = entries.reduce((sum, entry) => sum + entry.unitPrice, 0);
      return {
        product,
        entries,
        best: entries[0],
        average: entries.length ? total / entries.length : 0,
        last: [...entries].sort((a, b) => b.purchase.date.localeCompare(a.purchase.date))[0]
      };
    });
  }

  function renderStoreHistory() {
    const groups = state.stores.map((store) => {
      const purchases = state.purchases.filter((purchase) => purchase.storeId === store.id);
      const total = purchases.reduce((sum, purchase) => sum + Number(purchase.price || 0), 0);
      const last = [...purchases].sort((a, b) => b.date.localeCompare(a.date))[0];
      return { store, purchases, total, last };
    }).filter((group) => group.purchases.length)
      .sort((a, b) => b.total - a.total);

    byId("storeHistoryList").innerHTML = groups.length
      ? groups.map((group) => `
          <article class="item">
            <div class="item-header">
              <div>
                <p class="item-title">${escapeHtml(group.store.name)}</p>
                <p class="meta">${group.purchases.length}件 / 合計 ${money(group.total)} / 最終 ${group.last.date}</p>
                ${[...group.purchases].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map((purchase) => `
                  <p class="meta">${purchase.date} / ${escapeHtml(productById(purchase.productId)?.name || "削除済み商品")} / ${money(purchase.price)}</p>
                `).join("")}
              </div>
              <span class="badge">${escapeHtml(group.store.type || "店舗")}</span>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">購入ログを登録すると店舗別履歴が表示されます。</div>";
  }

  function renderProductStoreHistory() {
    const groups = state.products.map((product) => {
      const purchases = state.purchases.filter((purchase) => purchase.productId === product.id);
      const byStore = state.stores.map((store) => {
        const storePurchases = purchases.filter((purchase) => purchase.storeId === store.id);
        if (!storePurchases.length) return null;
        const last = [...storePurchases].sort((a, b) => b.date.localeCompare(a.date))[0];
        const min = Math.min(...storePurchases.map((purchase) => unitPrice(purchase, product)));
        return { store, count: storePurchases.length, last, min };
      }).filter(Boolean).sort((a, b) => a.min - b.min);
      return { product, byStore };
    }).filter((group) => group.byStore.length);

    byId("productStoreHistoryList").innerHTML = groups.length
      ? groups.map((group) => `
          <article class="item">
            <div class="item-main">
              ${productImageMarkup(group.product)}
              <div>
                <p class="item-title">${escapeHtml(group.product.name)}</p>
                ${group.byStore.map((entry) => `
                  <p class="meta">${escapeHtml(entry.store.name)}: ${entry.count}件 / 最安 ${money(entry.min)} / ${unitLabel(group.product)} / 最終 ${entry.last.date}</p>
                `).join("")}
              </div>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">購入ログを登録すると商品別の店舗履歴が表示されます。</div>";
  }

  function renderPurchaseCalendar() {
    const monthInput = byId("purchaseCalendarMonth");
    const month = monthInput.value || today().slice(0, 7);
    if (!monthInput.value) monthInput.value = month;

    const [year, monthNumber] = month.split("-").map(Number);
    const firstDate = new Date(year, monthNumber - 1, 1);
    const lastDate = new Date(year, monthNumber, 0);
    const startBlankDays = firstDate.getDay();
    const purchasesByDate = new Map();

    state.purchases
      .filter((purchase) => purchase.date.startsWith(month))
      .forEach((purchase) => {
        if (!purchasesByDate.has(purchase.date)) purchasesByDate.set(purchase.date, []);
        purchasesByDate.get(purchase.date).push(purchase);
      });

    const cells = ["日", "月", "火", "水", "木", "金", "土"].map((day) => `<div class="calendar-weekday">${day}</div>`);
    for (let index = 0; index < startBlankDays; index += 1) {
      cells.push("<div class=\"calendar-day empty-day\"></div>");
    }
    for (let day = 1; day <= lastDate.getDate(); day += 1) {
      const date = `${month}-${String(day).padStart(2, "0")}`;
      const purchases = purchasesByDate.get(date) || [];
      cells.push(`
        <div class="calendar-day ${purchases.length ? "has-purchase" : ""}">
          <span class="calendar-date">${day}</span>
          ${purchases.length ? `<span class="calendar-count">${purchases.length}件</span>` : ""}
          ${purchases.slice(0, 2).map((purchase) => `
            <span class="calendar-product">${escapeHtml(productById(purchase.productId)?.name || "削除済み商品")}</span>
          `).join("")}
        </div>
      `);
    }

    byId("purchaseCalendar").innerHTML = cells.join("");
  }

  function renderPurchaseFrequency() {
    const groups = state.products.map((product) => {
      const dates = [...new Set(state.purchases
        .filter((purchase) => purchase.productId === product.id)
        .map((purchase) => purchase.date))]
        .sort();
      if (!dates.length) return null;
      const intervals = dates.slice(1).map((date, index) => daysBetween(dates[index], date));
      const averageInterval = intervals.length
        ? intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length
        : null;
      return {
        product,
        count: dates.length,
        lastDate: dates[dates.length - 1],
        averageInterval
      };
    }).filter(Boolean)
      .sort((a, b) => b.lastDate.localeCompare(a.lastDate));

    byId("purchaseFrequencyList").innerHTML = groups.length
      ? groups.map((group) => `
          <article class="item">
            <div class="item-main">
              ${productImageMarkup(group.product)}
              <div>
                <p class="item-title">${escapeHtml(group.product.name)}</p>
                <p class="meta">${group.count}回購入 / 最終 ${group.lastDate}</p>
                <p class="meta">${group.averageInterval === null ? "購入間隔: まだ算出できません" : `平均 ${Math.round(group.averageInterval)}日に1回`}</p>
              </div>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">購入ログを登録すると購入頻度が表示されます。</div>";
  }

  function renderStockHistory() {
    const histories = [...state.stockHistory]
      .sort((a, b) => b.changedAt.localeCompare(a.changedAt))
      .slice(0, 30);

    byId("stockHistoryList").innerHTML = histories.length
      ? histories.map((history) => {
          const product = productById(history.productId);
          const unit = product ? unitById(product.unitId) : null;
          const unitName = unit?.name || "";
          const diff = Number(history.after) - Number(history.before);
          const diffLabel = `${diff > 0 ? "+" : ""}${diff}`;
          return `
            <article class="item">
              <div class="item-header">
                <div>
                  <p class="item-title">${escapeHtml(product?.name || history.productName || "削除済み商品")}</p>
                  <p class="meta">${formatDateTime(history.changedAt)} / ${escapeHtml(history.reason || "在庫変更")}</p>
                  <p class="meta">${history.before}${escapeHtml(unitName)} → ${history.after}${escapeHtml(unitName)}（${diffLabel}${escapeHtml(unitName)}）</p>
                </div>
              </div>
            </article>
          `;
        }).join("")
      : "<div class=\"empty\">在庫を変更すると履歴が表示されます。</div>";
  }

  function renderAnalysis() {
    const rows = getAnalysis().filter((row) => row.entries.length);
    byId("analysisList").innerHTML = rows.length
      ? rows.map((row) => `
          <article class="item">
            <div class="item-header">
              <div class="item-main">
                ${productImageMarkup(row.product)}
                <div>
                  <p class="item-title">${escapeHtml(row.product.name)}</p>
                  <p class="meta">最安値店舗: ${escapeHtml(row.best.store?.name || "不明")}</p>
                  <p class="meta">平均: ${money(row.average)} / ${unitLabel(row.product)}</p>
                  <p class="meta">直近: ${escapeHtml(row.last.store?.name || "不明")} ${money(row.last.purchase.price)}</p>
                </div>
              </div>
              <span class="badge">${row.entries.length}件</span>
            </div>
            <p class="price">${money(row.best.unitPrice)} / ${unitLabel(row.product)}</p>
          </article>
        `).join("")
      : "<div class=\"empty\">購入ログを登録すると分析が表示されます。</div>";
  }

  function getLowStockProducts() {
    return state.products.filter((product) => Number(product.minStock) > 0 && Number(product.stock) <= Number(product.minStock));
  }

  function generateShareText() {
    const mode = byId("shareMode").value;
    const lowStock = getLowStockProducts();
    const analysis = getAnalysis().filter((row) => row.entries.length);

    if (mode === "lowStock") {
      return ["在庫不足", "", ...lowStock.map((product) => `- ${product.name}（在庫 ${product.stock} / 最低 ${product.minStock}）`)]
        .join("\n")
        .trim() || "在庫不足の商品はありません。";
    }

    if (mode === "bestStores") {
      return ["最安値店舗まとめ", "", ...analysis.map((row) => (
        `- ${row.product.name}: ${row.best.store?.name || "不明"} ${money(row.best.unitPrice)} / ${unitLabel(row.product)}`
      ))].join("\n").trim() || "分析できる購入ログがありません。";
    }

    const byStore = new Map();
    getShoppingItemsWithDetails()
      .filter((item) => !item.checked)
      .forEach((item) => {
      const storeName = item.storeName || "店舗未定";
      if (!byStore.has(storeName)) byStore.set(storeName, []);
      byStore.get(storeName).push(item);
    });

    const lines = ["買い物リスト", ""];
    if (!byStore.size) {
      lines.push("在庫不足の商品はありません。");
    } else {
      byStore.forEach((products, storeName) => {
        lines.push(`【${storeName}】`);
        products.forEach((item) => {
          const price = item.priceLabel ? ` / ${item.priceLabel}` : "";
          lines.push(`- ${item.name}${price}`);
        });
        lines.push("");
      });
    }
    return lines.join("\n").trim();
  }

  function renderShareText() {
    byId("shareText").value = generateShareText();
  }

  function renderAll() {
    renderOptions();
    renderShoppingList();
    renderPurchases();
    renderInventory();
    renderProducts();
    renderStores();
    renderUnits();
    renderAnalysis();
    renderStoreHistory();
    renderProductStoreHistory();
    renderPurchaseCalendar();
    renderPurchaseFrequency();
    renderStockHistory();
    renderPurchaseHint();
    renderShareText();
  }

  function resetPurchaseForm(options = {}) {
    const keepDateStore = Boolean(options.keepDateStore);
    const selectedDate = byId("purchaseDate").value;
    const selectedStore = byId("purchaseStore").value;
    byId("purchaseId").value = "";
    byId("purchaseDate").value = keepDateStore && selectedDate ? selectedDate : today();
    byId("purchaseProductSearch").value = "";
    byId("purchaseProduct").value = "";
    byId("purchaseQuantity").value = "1";
    byId("purchasePrice").value = "";
    byId("purchaseNote").value = "";
    byId("purchaseStatus").textContent = "";
    linkedShoppingItemId = "";
    const recentStoreId = keepDateStore ? selectedStore : getRecentStoreId();
    if (recentStoreId) byId("purchaseStore").value = recentStoreId;
    renderPurchaseHint();
    if (options.focusProduct) {
      setTimeout(() => byId("purchaseProduct").focus(), 0);
    }
  }

  function resetProductForm() {
    pendingProductImage = "";
    byId("productId").value = "";
    byId("productName").value = "";
    byId("productCategory").value = "";
    byId("productAmount").value = "";
    byId("productImage").value = "";
    byId("productImageRemove").checked = false;
    renderProductImagePreview("");
    byId("productFavorite").checked = false;
  }

  function resetStoreForm() {
    pendingStoreImage = "";
    byId("storeId").value = "";
    byId("storeName").value = "";
    byId("storeType").value = "";
    byId("storeImage").value = "";
    byId("storeImageRemove").checked = false;
    renderStoreImagePreview("");
    byId("storeFavorite").checked = false;
  }

  function resetUnitForm() {
    byId("unitId").value = "";
    byId("unitName").value = "";
    byId("unitBase").value = "1";
  }

  function resetShoppingForm() {
    byId("shoppingProduct").value = "";
    byId("shoppingProductSearch").value = "";
    byId("shoppingName").value = "";
    byId("shoppingStore").value = "";
  }

  function addEventListeners() {
    document.querySelectorAll("[data-view-target]").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.viewTarget));
    });

    byId("menuButton").addEventListener("click", openMenu);
    document.querySelectorAll("[data-close-menu]").forEach((button) => {
      button.addEventListener("click", closeMenu);
    });
    document.querySelectorAll("[data-menu-master]").forEach((button) => {
      button.addEventListener("click", () => openMasterView(button.dataset.menuMaster));
    });

    document.querySelectorAll(".segment").forEach((segment) => {
      segment.addEventListener("click", () => {
        document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
        document.querySelectorAll(".master-view").forEach((item) => item.classList.remove("active"));
        segment.classList.add("active");
        byId(`${segment.dataset.master}Master`).classList.add("active");
        updateSettingsTitle(segment.dataset.master);
      });
    });

    byId("purchaseForm").addEventListener("submit", savePurchase);
    byId("shoppingForm").addEventListener("submit", saveShoppingItem);
    byId("productForm").addEventListener("submit", saveProduct);
    byId("storeForm").addEventListener("submit", saveStore);
    byId("unitForm").addEventListener("submit", saveUnit);
    byId("cancelPurchaseEdit").addEventListener("click", () => {
      resetPurchaseForm();
      renderAll();
    });
    byId("cancelProductEdit").addEventListener("click", () => {
      resetProductForm();
      closeMasterForm();
    });
    byId("cancelStoreEdit").addEventListener("click", () => {
      resetStoreForm();
      closeMasterForm();
    });
    byId("cancelUnitEdit").addEventListener("click", () => {
      resetUnitForm();
      closeMasterForm();
    });
    byId("purchaseSearch").addEventListener("input", renderPurchases);
    byId("purchaseProductSearch").addEventListener("input", () => {
      renderOptions();
      renderPurchaseHint();
    });
    byId("shoppingProductSearch").addEventListener("input", renderOptions);
    byId("productSearch").addEventListener("input", renderProducts);
    byId("purchaseCalendarMonth").addEventListener("change", renderPurchaseCalendar);
    byId("purchaseProduct").addEventListener("change", renderPurchaseHint);
    byId("shareMode").addEventListener("change", renderShareText);
    byId("productImage").addEventListener("change", handleProductImageSelection);
    byId("storeImage").addEventListener("change", handleStoreImageSelection);
    byId("copyShareText").addEventListener("click", copyShareText);
    byId("nativeShare").addEventListener("click", nativeShare);
    byId("clearCheckedItems").addEventListener("click", clearCheckedShoppingItems);
    byId("exportBackup").addEventListener("click", exportBackup);
    byId("importBackup").addEventListener("change", importBackup);
    byId("loadSampleData").addEventListener("click", loadSampleData);
    byId("initializeData").addEventListener("click", initializeData);
    byId("openActionButton").addEventListener("click", openActionPanel);
    document.querySelectorAll("[data-close-shopping-panel]").forEach((button) => {
      button.addEventListener("click", closeShoppingPanel);
    });
    document.querySelectorAll("[data-close-master-form]").forEach((button) => {
      button.addEventListener("click", closeMasterForm);
    });

    document.addEventListener("click", handleListActions);
    document.addEventListener("change", handleInventoryInputs);
  }

  function switchView(viewId) {
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
    closeShoppingPanel();
    closeMasterForm();
    closeMenu();
    updateActionButton();
  }

  function updateSettingsTitle(masterType) {
    const titles = {
      products: "商品登録",
      stores: "店舗登録",
      units: "単位登録"
    };
    byId("mastersTitle").textContent = titles[masterType] || "設定";
  }

  function openMenu() {
    byId("menuPanel").classList.add("open");
    byId("menuPanel").setAttribute("aria-hidden", "false");
  }

  function closeMenu() {
    byId("menuPanel").classList.remove("open");
    byId("menuPanel").setAttribute("aria-hidden", "true");
  }

  function openMasterView(masterType) {
    closeMenu();
    switchView("masters");
    setActiveMaster(masterType);
  }

  function setActiveMaster(masterType) {
    document.querySelectorAll(".master-view").forEach((item) => item.classList.remove("active"));
    byId(`${masterType}Master`).classList.add("active");
    updateSettingsTitle(masterType);
    updateActionButton();
  }

  function savePurchase(event) {
    event.preventDefault();
    if (!state.products.length || !state.stores.length) {
      alert("先に商品と店舗を登録してください。");
      return;
    }
    if (!byId("purchaseProduct").value || !byId("purchaseStore").value) {
      alert("商品と店舗を選択してください。");
      return;
    }

    const id = byId("purchaseId").value || uid("purchase");
    const existing = state.purchases.find((purchase) => purchase.id === id);
    const isContinuous = !existing && byId("purchaseContinuous").checked;
    const linkedItemId = !existing ? linkedShoppingItemId : "";
    const purchase = {
      id,
      date: byId("purchaseDate").value,
      productId: byId("purchaseProduct").value,
      storeId: byId("purchaseStore").value,
      quantity: Number(byId("purchaseQuantity").value),
      price: Number(byId("purchasePrice").value),
      note: byId("purchaseNote").value.trim()
    };

    if (existing) {
      Object.assign(existing, purchase);
    } else {
      state.purchases.push(purchase);
    }

    if (linkedItemId) {
      const linkedItem = state.shoppingItems.find((item) => item.id === linkedItemId);
      if (linkedItem) linkedItem.checked = true;
    }

    saveState();
    resetPurchaseForm({
      keepDateStore: isContinuous,
      focusProduct: isContinuous
    });
    byId("purchaseStatus").textContent = isContinuous
      ? "保存しました。次の商品を続けて入力できます。"
      : linkedItemId
        ? "保存しました。買い物リストを購入済みにしました。"
        : "保存しました。";
    renderAll();
  }

  function saveShoppingItem(event) {
    event.preventDefault();
    const productId = byId("shoppingProduct").value;
    const product = productById(productId);
    const name = byId("shoppingName").value.trim() || product?.name || "";
    if (!name) {
      alert("商品またはメモ商品を入力してください。");
      return;
    }

    state.shoppingItems.push({
      id: uid("shopping"),
      productId,
      name,
      storeId: byId("shoppingStore").value,
      checked: false,
      source: "manual"
    });
    saveState();
    resetShoppingForm();
    closeShoppingPanel();
    renderAll();
  }

  function saveProduct(event) {
    event.preventDefault();
    const id = byId("productId").value || uid("product");
    const existing = productById(id);
    const shouldRemoveImage = byId("productImageRemove").checked;
    const product = {
      id,
      name: byId("productName").value.trim(),
      category: byId("productCategory").value.trim(),
      amount: Number(byId("productAmount").value),
      unitId: byId("productUnit").value,
      stock: Number(existing?.stock || 0),
      minStock: Number(existing?.minStock || 0),
      image: shouldRemoveImage ? "" : pendingProductImage || existing?.image || "",
      favorite: byId("productFavorite").checked
    };

    upsert(state.products, product);
    saveState();
    resetProductForm();
    closeMasterForm();
    renderAll();
  }

  function saveStore(event) {
    event.preventDefault();
    const id = byId("storeId").value || uid("store");
    const existing = storeById(id);
    const shouldRemoveImage = byId("storeImageRemove").checked;
    const store = {
      id,
      name: byId("storeName").value.trim(),
      type: byId("storeType").value.trim(),
      image: shouldRemoveImage ? "" : pendingStoreImage || existing?.image || "",
      favorite: byId("storeFavorite").checked
    };

    upsert(state.stores, store);
    saveState();
    resetStoreForm();
    closeMasterForm();
    renderAll();
  }

  function saveUnit(event) {
    event.preventDefault();
    const unit = {
      id: byId("unitId").value || uid("unit"),
      name: byId("unitName").value.trim(),
      base: Number(byId("unitBase").value)
    };

    upsert(state.units, unit);
    saveState();
    resetUnitForm();
    closeMasterForm();
    renderAll();
  }

  function upsert(collection, item) {
    const index = collection.findIndex((entry) => entry.id === item.id);
    if (index >= 0) {
      collection[index] = item;
    } else {
      collection.push(item);
    }
  }

  function handleListActions(event) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const editPurchase = target.dataset.editPurchase;
    const deletePurchase = target.dataset.deletePurchase;
    const editProduct = target.dataset.editProduct;
    const deleteProduct = target.dataset.deleteProduct;
    const editStore = target.dataset.editStore;
    const deleteStore = target.dataset.deleteStore;
    const editUnit = target.dataset.editUnit;
    const deleteUnit = target.dataset.deleteUnit;
    const stockStep = target.dataset.stockStep;
    const toggleShopping = target.dataset.toggleShopping;
    const deleteShopping = target.dataset.deleteShopping;
    const inputShopping = target.dataset.inputShopping;

    if (inputShopping) return fillPurchaseFromShoppingItem(inputShopping);
    if (toggleShopping) return toggleShoppingItem(toggleShopping, target.checked);
    if (deleteShopping) return removeShoppingItem(deleteShopping);
    if (editPurchase) return fillPurchaseForm(editPurchase);
    if (deletePurchase) return removeItem("purchases", deletePurchase);
    if (editProduct) return fillProductForm(editProduct);
    if (deleteProduct) return removeItem("products", deleteProduct);
    if (editStore) return fillStoreForm(editStore);
    if (deleteStore) return removeItem("stores", deleteStore);
    if (editUnit) return fillUnitForm(editUnit);
    if (deleteUnit) return removeItem("units", deleteUnit);
    if (stockStep) return changeStock(stockStep, Number(target.dataset.step));
  }

  function handleInventoryInputs(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;

    const stockInput = target.dataset.stockInput;
    const minStockInput = target.dataset.minStockInput;
    if (stockInput) {
      updateProductStock(stockInput, "stock", Number(target.value || 0));
    }
    if (minStockInput) {
      updateProductStock(minStockInput, "minStock", Number(target.value || 0));
    }
  }

  function changeStock(productId, step) {
    const product = productById(productId);
    if (!product) return;
    const before = Number(product.stock || 0);
    product.stock = Math.max(0, before + step);
    recordStockHistory(product, before, product.stock, step > 0 ? "在庫を追加" : "在庫を減少");
    saveState();
    renderAll();
  }

  function updateProductStock(productId, key, value) {
    const product = productById(productId);
    if (!product) return;
    const before = Number(product[key] || 0);
    const after = Math.max(0, value);
    product[key] = after;
    if (key === "stock") {
      recordStockHistory(product, before, after, "在庫数を編集");
    }
    saveState();
    renderAll();
  }

  function recordStockHistory(product, before, after, reason) {
    if (Number(before) === Number(after)) return;
    state.stockHistory.unshift({
      id: uid("stock"),
      productId: product.id,
      productName: product.name,
      before: Number(before),
      after: Number(after),
      reason,
      changedAt: new Date().toISOString()
    });
    state.stockHistory = state.stockHistory.slice(0, 200);
  }

  function ensureAutoShoppingItems() {
    getLowStockProducts().forEach((product) => {
      const id = `auto-${product.id}`;
      if (!state.shoppingItems.some((item) => item.id === id)) {
        state.shoppingItems.push({
          id,
          productId: product.id,
          name: product.name,
          storeId: "",
          checked: false,
          source: "auto"
        });
      }
    });
  }

  function getShoppingItemsWithDetails() {
    const analysis = getAnalysis().filter((row) => row.entries.length);
    return state.shoppingItems
      .filter((item) => item.source !== "auto" || getLowStockProducts().some((product) => product.id === item.productId))
      .map((item) => {
        const product = productById(item.productId);
        const row = product ? analysis.find((entry) => entry.product.id === product.id) : null;
        const store = storeById(item.storeId) || row?.best.store;
        return {
          ...item,
          name: product?.name || item.name,
          resolvedStoreId: store?.id || "",
          storeName: store?.name || "店舗未定",
          sourceLabel: item.source === "auto" ? "在庫不足から自動追加" : "手動追加",
          priceLabel: row ? `目安 ${money(row.best.unitPrice)} / ${unitLabel(row.product)}` : ""
        };
      });
  }

  function fillPurchaseFromShoppingItem(id) {
    const item = getShoppingItemsWithDetails().find((entry) => entry.id === id);
    if (!item) return;
    if (!item.productId || !productById(item.productId)) {
      alert("購入入力へ連携するには、商品登録済みの商品を選択してください。");
      return;
    }

    switchView("log");
    resetPurchaseForm();
    linkedShoppingItemId = id;
    byId("purchaseDate").value = today();
    byId("purchaseProductSearch").value = "";
    renderOptions();
    byId("purchaseProduct").value = item.productId;
    if (item.resolvedStoreId) byId("purchaseStore").value = item.resolvedStoreId;
    byId("purchaseQuantity").value = "1";
    byId("purchasePrice").value = "";
    byId("purchaseNote").value = item.source === "auto" ? "買い物リストから入力" : "";
    byId("purchaseStatus").textContent = "買い物リストから入力中です。保存すると購入済みにします。";
    renderPurchaseHint();
    setTimeout(() => byId("purchasePrice").focus(), 0);
  }

  function toggleShoppingItem(id, checked) {
    const item = state.shoppingItems.find((entry) => entry.id === id);
    if (!item) return;
    item.checked = checked;
    saveState();
    renderAll();
  }

  function removeShoppingItem(id) {
    state.shoppingItems = state.shoppingItems.filter((item) => item.id !== id);
    saveState();
    renderAll();
  }

  function clearCheckedShoppingItems() {
    state.shoppingItems = state.shoppingItems.filter((item) => !item.checked || item.source === "auto");
    state.shoppingItems.forEach((item) => {
      if (item.source === "auto" && item.checked) item.checked = false;
    });
    saveState();
    renderAll();
  }

  function openActionPanel() {
    const activeView = document.querySelector(".view.active")?.id;
    if (activeView === "shopping") {
      openShoppingPanel();
      return;
    }
    if (activeView === "masters") {
      openMasterForm();
    }
  }

  function openShoppingPanel() {
    byId("shoppingAddPanel").classList.add("open");
    byId("shoppingAddPanel").setAttribute("aria-hidden", "false");
    byId("openActionButton").classList.add("hidden");
    byId("shoppingProduct").focus();
  }

  function closeShoppingPanel() {
    byId("shoppingAddPanel").classList.remove("open");
    byId("shoppingAddPanel").setAttribute("aria-hidden", "true");
    updateActionButton();
  }

  function openMasterForm() {
    const activeMaster = document.querySelector(".master-view.active")?.id;
    if (activeMaster === "productsMaster" && !byId("productId").value) resetProductForm();
    if (activeMaster === "storesMaster" && !byId("storeId").value) resetStoreForm();
    if (activeMaster === "unitsMaster" && !byId("unitId").value) resetUnitForm();
    byId("masters").classList.add("form-open");
    byId("openActionButton").classList.add("hidden");
    const focusTarget = {
      productsMaster: "productName",
      storesMaster: "storeName",
      unitsMaster: "unitName"
    }[activeMaster];
    if (focusTarget) byId(focusTarget).focus();
  }

  function closeMasterForm() {
    if (byId("masters").classList.contains("form-open")) {
      const activeMaster = document.querySelector(".master-view.active")?.id;
      if (activeMaster === "productsMaster") resetProductForm();
      if (activeMaster === "storesMaster") resetStoreForm();
      if (activeMaster === "unitsMaster") resetUnitForm();
    }
    byId("masters").classList.remove("form-open");
    updateActionButton();
  }

  function updateActionButton() {
    const activeView = document.querySelector(".view.active")?.id;
    const canAdd = activeView === "shopping" || activeView === "masters";
    const isPanelOpen = byId("shoppingAddPanel").classList.contains("open");
    const isMasterFormOpen = byId("masters").classList.contains("form-open");
    byId("openActionButton").classList.toggle("hidden", !canAdd || isPanelOpen || isMasterFormOpen);
    byId("openActionButton").setAttribute("aria-label", activeView === "masters" ? "登録項目を追加" : "買い物リストに追加");
    byId("homeButton").classList.toggle("hidden", activeView === "home" || isPanelOpen || isMasterFormOpen);
  }

  function renderPurchaseHint() {
    const product = productById(byId("purchaseProduct").value);
    if (!product) {
      byId("purchaseHint").textContent = "";
      return;
    }
    const entries = state.purchases
      .filter((purchase) => purchase.productId === product.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const row = getAnalysis().find((entry) => entry.product.id === product.id);
    const last = entries[0];
    const hints = [];
    if (last) hints.push(`前回 ${money(last.price)} / ${storeById(last.storeId)?.name || "不明"}`);
    if (row?.best) hints.push(`最安 ${money(row.best.unitPrice)} / ${unitLabel(product)} / ${row.best.store?.name || "不明"}`);
    byId("purchaseHint").textContent = hints.join(" ｜ ");
  }

  function getRecentStoreId() {
    return [...state.purchases].sort((a, b) => b.date.localeCompare(a.date))[0]?.storeId || "";
  }

  function fillPurchaseForm(id) {
    const purchase = state.purchases.find((entry) => entry.id === id);
    if (!purchase) return;
    switchView("log");
    byId("purchaseId").value = purchase.id;
    byId("purchaseDate").value = purchase.date;
    byId("purchaseProduct").value = purchase.productId;
    byId("purchaseStore").value = purchase.storeId;
    byId("purchaseQuantity").value = purchase.quantity;
    byId("purchasePrice").value = purchase.price;
    byId("purchaseNote").value = purchase.note || "";
  }

  function fillProductForm(id) {
    const product = productById(id);
    if (!product) return;
    openMasterView("products");
    pendingProductImage = "";
    byId("productId").value = product.id;
    byId("productName").value = product.name;
    byId("productCategory").value = product.category || "";
    byId("productAmount").value = product.amount;
    byId("productUnit").value = product.unitId;
    byId("productImage").value = "";
    byId("productImageRemove").checked = false;
    renderProductImagePreview(product.image || "");
    byId("productFavorite").checked = Boolean(product.favorite);
    openMasterForm();
  }

  async function handleProductImageSelection(event) {
    const file = event.target.files?.[0];
    if (!file) {
      pendingProductImage = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      byId("productImage").value = "";
      return;
    }

    try {
      pendingProductImage = await resizeImageFile(file);
      byId("productImageRemove").checked = false;
      renderProductImagePreview(pendingProductImage);
    } catch {
      alert("画像を読み込めませんでした。別の画像を選択してください。");
      byId("productImage").value = "";
    }
  }

  function renderProductImagePreview(src) {
    byId("productImagePreview").innerHTML = src
      ? `<img src="${src}" alt="">`
      : "画像なし";
  }

  async function handleStoreImageSelection(event) {
    const file = event.target.files?.[0];
    if (!file) {
      pendingStoreImage = "";
      return;
    }
    if (!file.type.startsWith("image/")) {
      alert("画像ファイルを選択してください。");
      byId("storeImage").value = "";
      return;
    }

    try {
      pendingStoreImage = await resizeImageFile(file);
      byId("storeImageRemove").checked = false;
      renderStoreImagePreview(pendingStoreImage);
    } catch {
      alert("画像を読み込めませんでした。別の画像を選択してください。");
      byId("storeImage").value = "";
    }
  }

  function renderStoreImagePreview(src) {
    byId("storeImagePreview").innerHTML = src
      ? `<img src="${src}" alt="">`
      : "画像なし";
  }

  function resizeImageFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("error", reject);
      reader.addEventListener("load", () => {
        const image = new Image();
        image.addEventListener("error", reject);
        image.addEventListener("load", () => {
          const maxSide = 900;
          const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
          const width = Math.max(1, Math.round(image.width * scale));
          const height = Math.max(1, Math.round(image.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const context = canvas.getContext("2d");
          if (!context) {
            resolve(String(reader.result || ""));
            return;
          }
          context.drawImage(image, 0, 0, width, height);
          resolve(canvas.toDataURL("image/jpeg", 0.82));
        });
        image.src = String(reader.result || "");
      });
      reader.readAsDataURL(file);
    });
  }

  function fillStoreForm(id) {
    const store = storeById(id);
    if (!store) return;
    openMasterView("stores");
    pendingStoreImage = "";
    byId("storeId").value = store.id;
    byId("storeName").value = store.name;
    byId("storeType").value = store.type || "";
    byId("storeImage").value = "";
    byId("storeImageRemove").checked = false;
    renderStoreImagePreview(store.image || "");
    byId("storeFavorite").checked = Boolean(store.favorite);
    openMasterForm();
  }

  function fillUnitForm(id) {
    const unit = unitById(id);
    if (!unit) return;
    openMasterView("units");
    byId("unitId").value = unit.id;
    byId("unitName").value = unit.name;
    byId("unitBase").value = unit.base;
    openMasterForm();
  }

  function removeItem(key, id) {
    if (!confirm("削除しますか？")) return;
    state[key] = state[key].filter((item) => item.id !== id);
    saveState();
    renderAll();
  }

  async function copyShareText() {
    const text = byId("shareText").value;
    await navigator.clipboard.writeText(text);
    byId("shareStatus").textContent = "コピーしました。";
  }

  async function nativeShare() {
    const text = byId("shareText").value;
    if (!navigator.share) {
      await copyShareText();
      byId("shareStatus").textContent = "共有メニュー非対応のためコピーしました。";
      return;
    }
    await navigator.share({ title: "買い物リスト", text });
  }

  function exportBackup(options = {}) {
    const exportedAt = new Date();
    const backup = {
      app: "ストマネ（在庫管理）",
      storageKey: STORAGE_KEY,
      version: 1,
      exportedAt: exportedAt.toISOString(),
      data: state
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = exportedAt.toISOString().slice(0, 19).replaceAll(":", "").replace("T", "-");
    const prefix = options.prefix || "stumane-backup";

    link.href = url;
    link.download = `${prefix}-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    byId("backupStatus").textContent = options.status || "バックアップファイルを作成しました。";
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const parsed = JSON.parse(await file.text());
      const restoredState = normalizeState(parsed.data || parsed);
      const shouldRestore = confirm("現在のデータをバックアップ内容で上書きします。よろしいですか？");

      if (!shouldRestore) return;

      state = restoredState;
      saveState();
      resetWorkingForms();
      renderAll();
      byId("backupStatus").textContent = "バックアップから復元しました。";
    } catch {
      alert("バックアップファイルを読み込めませんでした。");
      byId("backupStatus").textContent = "復元に失敗しました。";
    } finally {
      event.target.value = "";
    }
  }

  function loadSampleData() {
    closeMenu();
    const shouldLoad = confirm("現在のデータをサンプルデータで上書きします。よろしいですか？");
    if (!shouldLoad) return;

    const shouldBackup = confirm("サンプルデータ投入前にバックアップしますか？");
    if (shouldBackup) {
      exportBackup({
        prefix: "stumane-backup-before-sample",
        status: "サンプルデータ投入前バックアップファイルを作成しました。"
      });
    }

    const finalConfirm = confirm("サンプルデータを投入します。現在のデータはサンプルデータに置き換わります。");
    if (!finalConfirm) return;

    state = structuredClone(defaultState);
    saveState();
    resetWorkingForms();
    renderAll();
    switchView("home");
    alert("サンプルデータを投入しました。");
  }

  function initializeData() {
    closeMenu();
    const shouldInitialize = confirm("すべてのデータを削除しますが、本当によろしいですか？");
    if (!shouldInitialize) return;

    const shouldBackup = confirm("初期化前にバックアップしますか？");
    if (shouldBackup) {
      exportBackup({
        prefix: "stumane-backup-before-initialize",
        status: "初期化前バックアップファイルを作成しました。"
      });
    }

    const finalConfirm = confirm("初期化を実行します。商品、店舗、購入ログ、買い物リスト、在庫履歴を削除します。");
    if (!finalConfirm) return;

    state = createEmptyState();
    saveState();
    resetWorkingForms();
    renderAll();
    switchView("home");
    alert("初期化しました。");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  function daysBetween(startDate, endDate) {
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    return Math.max(0, Math.round((end - start) / 86400000));
  }

  function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  byId("purchaseDate").value = today();
  byId("purchaseCalendarMonth").value = today().slice(0, 7);
  addEventListeners();
  resetPurchaseForm();
  resetShoppingForm();
  renderAll();
  updateActionButton();
  registerServiceWorker();

  function registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return;
    if (location.protocol === "file:") return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        console.warn("Service Worker registration failed.");
      });
    });
  }
})();
