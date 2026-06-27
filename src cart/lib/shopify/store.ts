'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ShopifyCartItem {
  variantId: string;
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShopifyStore {
  cartId: string | null;
  checkoutUrl: string | null;
  cartItems: ShopifyCartItem[];
  isLoading: boolean;

  // Actions
  setCartId: (cartId: string | null) => void;
  setCheckoutUrl: (url: string | null) => void;
  addToCart: (item: ShopifyCartItem) => Promise<void>;
  removeFromCart: (variantId: string) => Promise<void>;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
  clearCart: () => void;
  goToCheckout: () => Promise<void>;
  refreshCart: () => Promise<void>;
}

export const useShopifyStore = create<ShopifyStore>()(
  persist(
    (set, get) => ({
      cartId: null,
      checkoutUrl: null,
      cartItems: [],
      isLoading: false,

      setCartId: (cartId) => set({ cartId }),
      setCheckoutUrl: (url) => set({ checkoutUrl: url }),

      addToCart: async (item) => {
        set({ isLoading: true });
        try {
          const { cartId, cartItems } = get();

          // Check if item already exists in local cart
          const existingIndex = cartItems.findIndex(i => i.variantId === item.variantId);

          let updatedItems;
          if (existingIndex >= 0) {
            updatedItems = [...cartItems];
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + item.quantity,
            };
          } else {
            updatedItems = [...cartItems, item];
          }

          // Sync with Shopify
          if (cartId) {
            const res = await fetch('/api/shopify/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'add',
                cartId,
                lines: [{ merchandiseId: item.variantId, quantity: item.quantity }],
              }),
            });
            const data = await res.json();
            if (data.cart) {
              set({ checkoutUrl: data.cart.checkoutUrl });
            }
          } else {
            // Create new Shopify cart
            const res = await fetch('/api/shopify/cart', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'create',
                lines: [{ merchandiseId: item.variantId, quantity: item.quantity }],
              }),
            });
            const data = await res.json();
            if (data.cart) {
              set({
                cartId: data.cart.id,
                checkoutUrl: data.cart.checkoutUrl,
              });
            }
          }

          set({ cartItems: updatedItems, isLoading: false });
        } catch (error) {
          console.error('Failed to add to Shopify cart:', error);
          set({ isLoading: false });
        }
      },

      removeFromCart: async (variantId) => {
        set({ isLoading: true });
        try {
          const { cartId, cartItems } = get();
          const updatedItems = cartItems.filter(i => i.variantId !== variantId);

          // Note: To remove from Shopify cart, we need the cart line ID
          // For simplicity, we'll rebuild the cart

          set({ cartItems: updatedItems, isLoading: false });
        } catch (error) {
          console.error('Failed to remove from Shopify cart:', error);
          set({ isLoading: false });
        }
      },

      updateQuantity: async (variantId, quantity) => {
        set({ isLoading: true });
        try {
          const { cartItems } = get();
          const updatedItems = cartItems.map(item =>
            item.variantId === variantId ? { ...item, quantity } : item
          );
          set({ cartItems: updatedItems, isLoading: false });
        } catch (error) {
          console.error('Failed to update Shopify cart:', error);
          set({ isLoading: false });
        }
      },

      clearCart: () => set({ cartId: null, checkoutUrl: null, cartItems: [] }),

      goToCheckout: async () => {
        const { cartId, cartItems, checkoutUrl } = get();

        if (checkoutUrl) {
          window.open(checkoutUrl, '_blank');
          return;
        }

        // Create checkout with all items
        set({ isLoading: true });
        try {
          const items = cartItems.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }));

          const res = await fetch('/api/shopify/checkout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, cartId }),
          });

          const data = await res.json();

          if (data.checkoutUrl) {
            set({ checkoutUrl: data.checkoutUrl, cartId: data.cartId });
            window.open(data.checkoutUrl, '_blank');
          }
        } catch (error) {
          console.error('Failed to create Shopify checkout:', error);
        } finally {
          set({ isLoading: false });
        }
      },

      refreshCart: async () => {
        const { cartId } = get();
        if (!cartId) return;

        try {
          const res = await fetch(`/api/shopify/cart?cartId=${encodeURIComponent(cartId)}`);
          const data = await res.json();

          if (data.cart) {
            set({ checkoutUrl: data.cart.checkoutUrl });
          }
        } catch (error) {
          console.error('Failed to refresh Shopify cart:', error);
        }
      },
    }),
    {
      name: 'shopify-cart',
      partialize: (state) => ({
        cartId: state.cartId,
        checkoutUrl: state.checkoutUrl,
        cartItems: state.cartItems,
      }),
    }
  )
);
