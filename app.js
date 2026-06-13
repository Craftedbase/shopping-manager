(function () {
  const STORAGE_KEY = "shopping-manager-v1";

  const defaultState = {
    units: [
      { id: "u-ml", name: "ml", base: 100 },
      { id: "u-g", name: "g", base: 100 },
      { id: "u-count", name: "個", base: 1 },
      { id: "u-pack", name: "袋", base: 1 }
    ],
    products: [],
    stores: [],
    purchases: [],
    shoppingItems: []
  };

  let state = loadState();
  let pendingProductImage = "";

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
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(defaultState),
        ...parsed,
        units: parsed.units?.length ? parsed.units : structuredClone(defaultState.units),
        shoppingItems: parsed.shoppingItems || []
      };
    } catch {
      return structuredClone(defaultState);
    }
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

  function renderOptions() {
    const selectedPurchaseProduct = byId("purchaseProduct").value;
    const selectedPurchaseStore = byId("purchaseStore").value;
    const selectedShoppingProduct = byId("shoppingProduct").value;
    const selectedShoppingStore = byId("shoppingStore").value;
    const sortedProducts = [...state.products].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "ja"));
    const sortedStores = [...state.stores].sort((a, b) => Number(b.favorite) - Number(a.favorite) || a.name.localeCompare(b.name, "ja"));
    const productOptions = sortedProducts
      .map((product) => `<option value="${product.id}">${escapeHtml(product.name)}</option>`)
      .join("");
    const storeOptions = sortedStores
      .map((store) => `<option value="${store.id}">${escapeHtml(store.name)}</option>`)
      .join("");
    const unitOptions = state.units
      .map((unit) => `<option value="${unit.id}">${escapeHtml(unit.name)} / ${unit.base}${escapeHtml(unit.name)}基準</option>`)
      .join("");

    byId("purchaseProduct").innerHTML = productOptions || "<option value=\"\">先に商品を登録</option>";
    byId("purchaseStore").innerHTML = storeOptions || "<option value=\"\">先に店舗を登録</option>";
    byId("shoppingProduct").innerHTML = `<option value="">メモ商品として追加</option>${productOptions}`;
    byId("shoppingStore").innerHTML = `<option value="">最安値店舗に任せる</option>${storeOptions}`;
    byId("productUnit").innerHTML = unitOptions;
    byId("purchaseProduct").value = selectedPurchaseProduct || sortedProducts[0]?.id || "";
    byId("purchaseStore").value = selectedPurchaseStore || getRecentStoreId() || sortedStores[0]?.id || "";
    byId("shoppingProduct").value = selectedShoppingProduct;
    byId("shoppingStore").value = selectedShoppingStore;
  }

  function renderDashboard() {
    const monthKey = today().slice(0, 7);
    const monthTotal = state.purchases
      .filter((purchase) => purchase.date.startsWith(monthKey))
      .reduce((sum, purchase) => sum + Number(purchase.price || 0), 0);
    const lowStock = getLowStockProducts();

    byId("monthTotal").textContent = money(monthTotal);
    byId("lowStockCount").textContent = lowStock.length;
    byId("productCount").textContent = state.products.length;
    byId("purchaseCount").textContent = state.purchases.length;

    byId("lowStockList").innerHTML = lowStock.length
      ? lowStock.map((product) => `
          <article class="item">
            <div class="item-header">
              <div>
                <p class="item-title">${escapeHtml(product.name)}</p>
                <p class="meta">在庫 ${product.stock} / 最低 ${product.minStock}</p>
              </div>
              <span class="badge danger">不足</span>
            </div>
          </article>
        `).join("")
      : "<div class=\"empty\">在庫不足の商品はありません。</div>";

    const recent = [...state.purchases]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
    byId("recentPurchases").innerHTML = recent.length
      ? recent.map(renderPurchaseItem).join("")
      : "<div class=\"empty\">購入ログはまだありません。</div>";
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
    byId("productList").innerHTML = state.products.length
      ? state.products.map((product) => {
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
      : "<div class=\"empty\">商品を登録してください。</div>";
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
      : "<div class=\"empty\">先に商品マスタを登録してください。</div>";
  }

  function renderStores() {
    byId("storeList").innerHTML = state.stores.length
      ? state.stores.map((store) => `
          <article class="item">
            <div class="item-header">
              <div>
                <p class="item-title">${escapeHtml(store.name)}</p>
                <p class="meta">${escapeHtml(store.type || "種別なし")}</p>
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
    renderDashboard();
    renderShoppingList();
    renderPurchases();
    renderInventory();
    renderProducts();
    renderStores();
    renderUnits();
    renderAnalysis();
    renderStoreHistory();
    renderProductStoreHistory();
    renderPurchaseHint();
    renderShareText();
  }

  function resetPurchaseForm() {
    byId("purchaseId").value = "";
    byId("purchaseDate").value = today();
    byId("purchaseQuantity").value = "1";
    byId("purchasePrice").value = "";
    byId("purchaseNote").value = "";
    const recentStoreId = getRecentStoreId();
    if (recentStoreId) byId("purchaseStore").value = recentStoreId;
    renderPurchaseHint();
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
    byId("storeId").value = "";
    byId("storeName").value = "";
    byId("storeType").value = "";
    byId("storeFavorite").checked = false;
  }

  function resetUnitForm() {
    byId("unitId").value = "";
    byId("unitName").value = "";
    byId("unitBase").value = "1";
  }

  function resetShoppingForm() {
    byId("shoppingProduct").value = "";
    byId("shoppingName").value = "";
    byId("shoppingStore").value = "";
  }

  function addEventListeners() {
    document.querySelectorAll(".tab").forEach((tab) => {
      tab.addEventListener("click", () => switchView(tab.dataset.view));
    });

    document.querySelectorAll("[data-jump]").forEach((button) => {
      button.addEventListener("click", () => switchView(button.dataset.jump));
    });

    document.querySelectorAll(".segment").forEach((segment) => {
      segment.addEventListener("click", () => {
        document.querySelectorAll(".segment").forEach((item) => item.classList.remove("active"));
        document.querySelectorAll(".master-view").forEach((item) => item.classList.remove("active"));
        segment.classList.add("active");
        byId(`${segment.dataset.master}Master`).classList.add("active");
      });
    });

    byId("purchaseForm").addEventListener("submit", savePurchase);
    byId("shoppingForm").addEventListener("submit", saveShoppingItem);
    byId("productForm").addEventListener("submit", saveProduct);
    byId("storeForm").addEventListener("submit", saveStore);
    byId("unitForm").addEventListener("submit", saveUnit);
    byId("cancelPurchaseEdit").addEventListener("click", resetPurchaseForm);
    byId("cancelProductEdit").addEventListener("click", resetProductForm);
    byId("cancelStoreEdit").addEventListener("click", resetStoreForm);
    byId("cancelUnitEdit").addEventListener("click", resetUnitForm);
    byId("purchaseSearch").addEventListener("input", renderPurchases);
    byId("purchaseProduct").addEventListener("change", renderPurchaseHint);
    byId("shareMode").addEventListener("change", renderShareText);
    byId("productImage").addEventListener("change", handleProductImageSelection);
    byId("copyShareText").addEventListener("click", copyShareText);
    byId("nativeShare").addEventListener("click", nativeShare);
    byId("clearCheckedItems").addEventListener("click", clearCheckedShoppingItems);
    byId("seedButton").addEventListener("click", seedSampleData);

    document.addEventListener("click", handleListActions);
    document.addEventListener("change", handleInventoryInputs);
  }

  function switchView(viewId) {
    document.querySelectorAll(".tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.view === viewId));
    document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  }

  function savePurchase(event) {
    event.preventDefault();
    if (!state.products.length || !state.stores.length) {
      alert("先に商品と店舗を登録してください。");
      return;
    }

    const id = byId("purchaseId").value || uid("purchase");
    const existing = state.purchases.find((purchase) => purchase.id === id);
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

    saveState();
    resetPurchaseForm();
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
    renderAll();
  }

  function saveStore(event) {
    event.preventDefault();
    const store = {
      id: byId("storeId").value || uid("store"),
      name: byId("storeName").value.trim(),
      type: byId("storeType").value.trim(),
      favorite: byId("storeFavorite").checked
    };

    upsert(state.stores, store);
    saveState();
    resetStoreForm();
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
    product.stock = Math.max(0, Number(product.stock || 0) + step);
    saveState();
    renderAll();
  }

  function updateProductStock(productId, key, value) {
    const product = productById(productId);
    if (!product) return;
    product[key] = Math.max(0, value);
    saveState();
    renderAll();
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
          storeName: store?.name || "店舗未定",
          sourceLabel: item.source === "auto" ? "在庫不足から自動追加" : "手動追加",
          priceLabel: row ? `目安 ${money(row.best.unitPrice)} / ${unitLabel(row.product)}` : ""
        };
      });
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
    byId("storeId").value = store.id;
    byId("storeName").value = store.name;
    byId("storeType").value = store.type || "";
    byId("storeFavorite").checked = Boolean(store.favorite);
  }

  function fillUnitForm(id) {
    const unit = unitById(id);
    if (!unit) return;
    byId("unitId").value = unit.id;
    byId("unitName").value = unit.name;
    byId("unitBase").value = unit.base;
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

  function seedSampleData() {
    if (state.products.length || state.stores.length || state.purchases.length) {
      if (!confirm("サンプルデータを追加しますか？")) return;
    }

    const milk = { id: uid("product"), name: "牛乳 1L", category: "食品", amount: 1000, unitId: "u-ml", stock: 0, minStock: 1, favorite: true };
    const eggs = { id: uid("product"), name: "卵 10個", category: "食品", amount: 10, unitId: "u-count", stock: 1, minStock: 1, favorite: true };
    const supermarket = { id: uid("store"), name: "Aスーパー", type: "スーパー", favorite: true };
    const drugstore = { id: uid("store"), name: "Bドラッグ", type: "ドラッグストア", favorite: true };
    state.products.push(milk, eggs);
    state.stores.push(supermarket, drugstore);
    state.purchases.push(
      { id: uid("purchase"), date: today(), productId: milk.id, storeId: supermarket.id, quantity: 1, price: 218, note: "" },
      { id: uid("purchase"), date: today(), productId: eggs.id, storeId: drugstore.id, quantity: 1, price: 238, note: "" }
    );
    saveState();
    renderAll();
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
  }

  byId("purchaseDate").value = today();
  addEventListeners();
  resetPurchaseForm();
  resetShoppingForm();
  renderAll();
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
