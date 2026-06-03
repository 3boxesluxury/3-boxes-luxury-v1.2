/* =============================================
   3 BOXES LUXURY — Shopify Theme JavaScript
   ============================================= */

(function() {
  'use strict';

  // === DOM Ready ===
  document.addEventListener('DOMContentLoaded', init);

  function init() {
    initMobileNav();
    initCartDrawer();
    initProductGallery();
    initQuantitySelectors();
    initCollectionSort();
    initSearchForm();
    initAnimations();
    initCartCount();
  }

  // === Mobile Navigation ===
  function initMobileNav() {
    const nav = document.getElementById('mobile-nav');
    if (!nav) return;
    
    const openBtn = document.querySelector('[data-nav-open]');
    const closeBtns = nav.querySelectorAll('[data-nav-close]');
    
    if (openBtn) {
      openBtn.addEventListener('click', function() {
        nav.classList.add('active');
        nav.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    }
    
    closeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        nav.classList.remove('active');
        nav.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }

  // === Cart Drawer ===
  function initCartDrawer() {
    const drawer = document.getElementById('cart-drawer');
    if (!drawer) return;
    
    const openBtns = document.querySelectorAll('[data-cart-open]');
    const closeBtns = drawer.querySelectorAll('[data-cart-close]');
    
    openBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        loadCartDrawer();
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      });
    });
    
    closeBtns.forEach(function(btn) {
      btn.addEventListener('click', function() {
        drawer.classList.remove('active');
        drawer.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
      });
    });
  }

  function loadCartDrawer() {
    fetch('/cart.js')
      .then(function(res) { return res.json(); })
      .then(function(cart) {
        renderCartDrawer(cart);
      })
      .catch(function(err) { console.error('Cart load error:', err); });
  }

  function renderCartDrawer(cart) {
    var itemsContainer = document.getElementById('cart-drawer-items');
    var footerContainer = document.getElementById('cart-drawer-footer');
    
    if (!itemsContainer) return;
    
    if (cart.items.length === 0) {
      itemsContainer.innerHTML = '<div class="text-center py-8"><p style="color:#a8a29e">Your cart is empty</p></div>';
      if (footerContainer) footerContainer.innerHTML = '';
      return;
    }
    
    var html = '';
    cart.items.forEach(function(item) {
      html += '<div class="drawer-cart-item">';
      html += '  <div class="drawer-cart-item-image">';
      if (item.image) {
        html += '    <img src="' + item.image.replace(/(\.[^.]+)$/, '_120x$1') + '" alt="' + escapeHtml(item.title) + '">';
      }
      html += '  </div>';
      html += '  <div class="drawer-cart-item-info">';
      html += '    <div class="drawer-cart-item-title">' + escapeHtml(item.title) + '</div>';
      if (item.variant_title && item.variant_title !== 'Default Title') {
        html += '    <div class="drawer-cart-item-variant">' + escapeHtml(item.variant_title) + '</div>';
      }
      html += '    <div class="drawer-cart-item-price">' + formatMoney(item.line_price) + '</div>';
      html += '    <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.5rem">';
      html += '      <button class="quantity-btn" data-cart-change="' + item.key + '" data-qty="' + Math.max(0, item.quantity - 1) + '" style="width:28px;height:28px;font-size:0.75rem;border-radius:4px">−</button>';
      html += '      <span style="font-size:0.8125rem;color:#fef3c7">' + item.quantity + '</span>';
      html += '      <button class="quantity-btn" data-cart-change="' + item.key + '" data-qty="' + (item.quantity + 1) + '" style="width:28px;height:28px;font-size:0.75rem;border-radius:4px">+</button>';
      html += '    </div>';
      html += '  </div>';
      html += '</div>';
    });
    itemsContainer.innerHTML = html;
    
    // Footer
    if (footerContainer) {
      var footerHtml = '';
      footerHtml += '<div style="display:flex;justify-content:space-between;margin-bottom:1rem">';
      footerHtml += '  <span style="color:#a8a29e">Subtotal</span>';
      footerHtml += '  <span style="color:#fbbf24;font-weight:700">' + formatMoney(cart.total_price) + '</span>';
      footerHtml += '</div>';
      footerHtml += '<a href="/checkout" class="btn btn-primary w-full" style="display:flex;text-decoration:none">Checkout</a>';
      footerHtml += '<a href="/cart" class="btn btn-outline w-full" style="display:flex;text-decoration:none;margin-top:0.5rem">View Cart</a>';
      footerContainer.innerHTML = footerHtml;
    }
    
    // Bind cart change events
    itemsContainer.querySelectorAll('[data-cart-change]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var key = this.getAttribute('data-cart-change');
        var qty = parseInt(this.getAttribute('data-qty'));
        updateCartItem(key, qty);
      });
    });
  }

  function updateCartItem(key, quantity) {
    fetch('/cart/change.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: key, quantity: quantity })
    })
    .then(function(res) { return res.json(); })
    .then(function(cart) {
      renderCartDrawer(cart);
      updateCartCount(cart.item_count);
    });
  }

  // === Add to Cart (AJAX) ===
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    e.preventDefault();
    
    var form = btn.closest('form');
    if (!form) return;
    
    var formData = new FormData(form);
    btn.disabled = true;
    btn.textContent = 'Adding...';
    
    fetch('/cart/add.js', {
      method: 'POST',
      body: formData
    })
    .then(function(res) { return res.json(); })
    .then(function(item) {
      showToast('Added to cart!', 'success');
      loadCartDrawer();
      updateCartCountFromServer();
      
      // Open cart drawer
      var drawer = document.getElementById('cart-drawer');
      if (drawer) {
        drawer.classList.add('active');
        drawer.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
      }
    })
    .catch(function(err) {
      showToast('Failed to add item', 'error');
    })
    .finally(function() {
      btn.disabled = false;
      btn.textContent = btn.getAttribute('data-add-to-cart') || 'Add to Cart';
    });
  });

  // === Product Gallery ===
  function initProductGallery() {
    var mainImage = document.querySelector('.product-gallery-main img');
    var thumbs = document.querySelectorAll('.product-gallery-thumb');
    
    if (!mainImage || thumbs.length === 0) return;
    
    thumbs.forEach(function(thumb) {
      thumb.addEventListener('click', function() {
        var src = this.querySelector('img').getAttribute('src');
        var largeSrc = src.replace(/_(\d+)x/, '_800x');
        mainImage.src = largeSrc;
        mainImage.alt = this.querySelector('img').alt;
        
        thumbs.forEach(function(t) { t.classList.remove('active'); });
        this.classList.add('active');
      });
    });
  }

  // === Quantity Selectors ===
  function initQuantitySelectors() {
    document.addEventListener('click', function(e) {
      var btn = e.target.closest('.quantity-btn');
      if (!btn) return;
      
      var selector = btn.closest('.quantity-selector');
      if (!selector) return;
      
      var input = selector.querySelector('.quantity-input');
      if (!input) return;
      
      var currentVal = parseInt(input.value) || 1;
      
      if (btn.textContent.trim() === '−' || btn.textContent.trim() === '−') {
        input.value = Math.max(1, currentVal - 1);
      } else if (btn.textContent.trim() === '+' || btn.textContent.trim() === '+') {
        var max = parseInt(input.getAttribute('max')) || 999;
        input.value = Math.min(max, currentVal + 1);
      }
      
      // Trigger change event
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  // === Collection Sort ===
  function initCollectionSort() {
    var sortSelect = document.getElementById('SortBy');
    if (!sortSelect) return;
    
    sortSelect.addEventListener('change', function() {
      var url = new URL(window.location.href);
      url.searchParams.set('sort_by', this.value);
      window.location.href = url.toString();
    });
  }

  // === Search Form ===
  function initSearchForm() {
    var searchForm = document.querySelector('.header-search-form');
    if (!searchForm) return;
    
    searchForm.addEventListener('submit', function(e) {
      var input = this.querySelector('input[name="q"]');
      if (!input || !input.value.trim()) {
        e.preventDefault();
      }
    });
  }

  // === Scroll Animations ===
  function initAnimations() {
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('fade-in');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1 });
    
    document.querySelectorAll('.animate-on-scroll').forEach(function(el) {
      observer.observe(el);
    });
  }

  // === Cart Count ===
  function initCartCount() {
    updateCartCountFromServer();
  }

  function updateCartCountFromServer() {
    fetch('/cart.js')
      .then(function(res) { return res.json(); })
      .then(function(cart) {
        updateCartCount(cart.item_count);
      })
      .catch(function() {});
  }

  function updateCartCount(count) {
    var badges = document.querySelectorAll('.cart-count');
    badges.forEach(function(badge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    });
  }

  // === Toast Notification ===
  function showToast(message, type) {
    var existing = document.querySelector('.toast');
    if (existing) existing.remove();
    
    var toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = '<span class="toast-icon">' + (type === 'success' ? '✓' : '⚠') + '</span><span>' + escapeHtml(message) + '</span>';
    document.body.appendChild(toast);
    
    requestAnimationFrame(function() {
      toast.classList.add('active');
    });
    
    setTimeout(function() {
      toast.classList.remove('active');
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  // === Utility Functions ===
  function formatMoney(cents) {
    var format = window.theme && window.theme.moneyFormat || '${{amount}}';
    var value = (cents / 100).toFixed(2);
    return format.replace('{{amount}}', value).replace('{{amount_no_decimals}}', Math.floor(cents / 100));
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // === Wishlist (localStorage) ===
  window.toggleWishlist = function(handle, btn) {
    var wishlist = JSON.parse(localStorage.getItem('luxury_wishlist') || '[]');
    var index = wishlist.indexOf(handle);
    
    if (index > -1) {
      wishlist.splice(index, 1);
      btn.classList.remove('active');
      showToast('Removed from wishlist', 'success');
    } else {
      wishlist.push(handle);
      btn.classList.add('active');
      showToast('Added to wishlist!', 'success');
    }
    
    localStorage.setItem('luxury_wishlist', JSON.stringify(wishlist));
  };

  // Expose for inline onclick handlers
  window.loadCartDrawer = loadCartDrawer;

})();
