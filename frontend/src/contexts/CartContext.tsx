import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image: string;
  altText: string;
  addedAt: string;
}

export interface CartState {
  sessionId: string;
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  subtotal: number;
  taxAmount: number;
  taxRate: number;
  shippingAmount: number;
  discountCode?: string;
  discountAmount: number;
  loading: boolean;
  error?: string;
  shippingAddress?: {
    country: string;
    state: string;
    zipCode: string;
    city: string;
    address1: string;
    address2?: string;
  };
  lastUpdated: number;
}

type CartAction =
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'LOAD_CART'; cart: CartState }
  | { type: 'ADD_ITEM'; item: CartItem }
  | { type: 'UPDATE_ITEM'; productId: string; quantity: number }
  | { type: 'REMOVE_ITEM'; productId: string }
  | { type: 'CLEAR_CART' }
  | { type: 'APPLY_DISCOUNT'; discountCode: string; discountAmount: number }
  | { type: 'REMOVE_DISCOUNT' }
  | { type: 'UPDATE_SHIPPING_ADDRESS'; address: any }
  | { type: 'UPDATE_TOTALS'; subtotal: number; taxAmount: number; taxRate: number; shippingAmount: number }
  | { type: 'SYNC_FROM_STORAGE'; cart: Partial<CartState> };

const initialState: CartState = {
  sessionId: '',
  items: [],
  totalItems: 0,
  totalPrice: 0,
  subtotal: 0,
  taxAmount: 0,
  taxRate: 0,
  shippingAmount: 0,
  discountAmount: 0,
  loading: false,
  lastUpdated: Date.now()
};

// Helper function to calculate totals
const calculateTotals = (items: CartItem[], discountAmount: number = 0, taxRate: number = 0, shippingAmount: number = 0) => {
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const taxAmount = discountedSubtotal * taxRate;
  const totalPrice = discountedSubtotal + taxAmount + shippingAmount;
  
  return {
    totalItems,
    subtotal,
    totalPrice: Math.max(0, totalPrice),
    taxAmount
  };
};

function cartReducer(state: CartState, action: CartAction): CartState {
  let newState: CartState;
  
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false };
    
    case 'CLEAR_ERROR':
      return { ...state, error: undefined };
    
    case 'SYNC_FROM_STORAGE':
      return { ...state, ...action.cart, loading: false };
    
    case 'LOAD_CART':
      return { ...action.cart, loading: false };
    
    case 'ADD_ITEM': {
      const existingItemIndex = state.items.findIndex(
        item => item.productId === action.item.productId
      );
      
      let updatedItems;
      if (existingItemIndex >= 0) {
        updatedItems = [...state.items];
        updatedItems[existingItemIndex] = {
          ...updatedItems[existingItemIndex],
          quantity: updatedItems[existingItemIndex].quantity + action.item.quantity
        };
      } else {
        updatedItems = [...state.items, action.item];
      }
      
      const totals = calculateTotals(updatedItems, state.discountAmount, state.taxRate, state.shippingAmount);
      
      newState = {
        ...state,
        items: updatedItems,
        ...totals,
        loading: false,
        lastUpdated: Date.now()
      };
      return newState;
    }
    
    case 'UPDATE_ITEM': {
      const updatedItems = state.items.map(item =>
        item.productId === action.productId
          ? { ...item, quantity: action.quantity }
          : item
      ).filter(item => item.quantity > 0);
      
      const totals = calculateTotals(updatedItems, state.discountAmount, state.taxRate, state.shippingAmount);
      
      newState = {
        ...state,
        items: updatedItems,
        ...totals,
        loading: false,
        lastUpdated: Date.now()
      };
      return newState;
    }
    
    case 'REMOVE_ITEM': {
      const updatedItems = state.items.filter(item => item.productId !== action.productId);
      const totals = calculateTotals(updatedItems, state.discountAmount, state.taxRate, state.shippingAmount);
      
      newState = {
        ...state,
        items: updatedItems,
        ...totals,
        loading: false,
        lastUpdated: Date.now()
      };
      return newState;
    }
    
    case 'CLEAR_CART':
      newState = {
        ...state,
        items: [],
        totalItems: 0,
        totalPrice: 0,
        subtotal: 0,
        taxAmount: 0,
        shippingAmount: 0,
        discountCode: undefined,
        discountAmount: 0,
        loading: false,
        lastUpdated: Date.now()
      };
      return newState;
    
    case 'APPLY_DISCOUNT': {
      const totals = calculateTotals(state.items, action.discountAmount, state.taxRate, state.shippingAmount);
      newState = {
        ...state,
        discountCode: action.discountCode,
        discountAmount: action.discountAmount,
        ...totals,
        loading: false,
        lastUpdated: Date.now()
      };
      return newState;
    }
    
    case 'REMOVE_DISCOUNT': {
      const totals = calculateTotals(state.items, 0, state.taxRate, state.shippingAmount);
      newState = {
        ...state,
        discountCode: undefined,
        discountAmount: 0,
        ...totals,
        loading: false,
        lastUpdated: Date.now()
      };
      return newState;
    }
    
    case 'UPDATE_SHIPPING_ADDRESS':
      newState = {
        ...state,
        shippingAddress: action.address,
        lastUpdated: Date.now()
      };
      return newState;
    
    case 'UPDATE_TOTALS': {
      const totals = calculateTotals(state.items, state.discountAmount, action.taxRate, action.shippingAmount);
      newState = {
        ...state,
        taxRate: action.taxRate,
        shippingAmount: action.shippingAmount,
        ...totals,
        lastUpdated: Date.now()
      };
      return newState;
    }
    
    default:
      return state;
  }
}

interface CartContextType {
  state: CartState;
  addToCart: (product: any, quantity?: number) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  applyDiscount: (discountCode: string) => Promise<void>;
  removeDiscount: () => Promise<void>;
  updateShippingAddress: (address: any) => void;
  updateTaxAndShipping: (taxRate: number, shippingAmount: number) => void;
  loadCart: () => Promise<void>;
  syncFromLocalStorage: () => void;
  saveToLocalStorage: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Local storage key
const CART_STORAGE_KEY = 'icepaca-cart';
const CART_EXPIRY_DAYS = 30; // Cart expires after 30 days

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState);

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Save cart to localStorage
  const saveToLocalStorage = useCallback(() => {
    try {
      const cartData = {
        ...state,
        expiresAt: Date.now() + (CART_EXPIRY_DAYS * 24 * 60 * 60 * 1000)
      };
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartData));
    } catch (error) {
      console.error('Failed to save cart to localStorage:', error);
    }
  }, [state]);

  // Load cart from localStorage
  const syncFromLocalStorage = useCallback(() => {
    try {
      const storedCart = localStorage.getItem(CART_STORAGE_KEY);
      if (storedCart) {
        const cartData = JSON.parse(storedCart);
        
        // Check if cart has expired
        if (cartData.expiresAt && cartData.expiresAt > Date.now()) {
          dispatch({ type: 'SYNC_FROM_STORAGE', cart: cartData });
          return true;
        } else {
          localStorage.removeItem(CART_STORAGE_KEY);
        }
      }
    } catch (error) {
      console.error('Failed to load cart from localStorage:', error);
    }
    return false;
  }, []);

  // Initialize cart
  useEffect(() => {
    let sessionId = localStorage.getItem('cart-session-id');
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem('cart-session-id', sessionId);
    }

    // Try to load from localStorage first
    const loadedFromStorage = syncFromLocalStorage();
    
    if (!loadedFromStorage) {
      // If nothing in localStorage, load from API
      dispatch({ type: 'LOAD_CART', cart: { ...initialState, sessionId } });
      loadCart();
    } else {
      // Still sync with backend to ensure consistency
      loadCart();
    }
  }, [syncFromLocalStorage]);

  // Save to localStorage whenever cart changes
  useEffect(() => {
    if (state.sessionId && (state.items.length > 0 || state.lastUpdated > 0)) {
      saveToLocalStorage();
    }
  }, [state, saveToLocalStorage]);

  const loadCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) return;

      const response = await fetch(`${API_BASE}/cart/${sessionId}`);
      if (!response.ok) throw new Error('Failed to load cart');

      const cartData = await response.json();
      
      // Transform backend cart data to frontend format
      const items = cartData.items?.map((item: any) => ({
        productId: item.productId._id || item.productId,
        name: item.productId.name,
        price: item.price,
        quantity: item.quantity,
        image: item.productId.images?.[0]?.url || '/images/placeholder.jpg',
        altText: item.productId.images?.[0]?.altText || item.productId.name,
        addedAt: item.addedAt
      })) || [];

      dispatch({
        type: 'LOAD_CART',
        cart: {
          sessionId: sessionId,
          items,
          totalItems: cartData.totalItems || 0,
          totalPrice: cartData.totalPrice || 0,
          discountCode: cartData.discountCode,
          discountAmount: cartData.discountAmount || 0,
          loading: false
        }
      });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', error: 'Failed to load cart' });
    }
  };

  const addToCart = async (product: any, quantity: number = 1) => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) throw new Error('No session ID');

      const response = await fetch(`${API_BASE}/cart/${sessionId}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product._id || product.id,
          quantity
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add to cart');
      }

      // Reload cart after successful addition
      await loadCart();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  };

  const updateQuantity = async (productId: string, quantity: number) => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) throw new Error('No session ID');

      const response = await fetch(`${API_BASE}/cart/${sessionId}/update`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      await loadCart();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  };

  const removeFromCart = async (productId: string) => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) throw new Error('No session ID');

      const response = await fetch(`${API_BASE}/cart/${sessionId}/remove/${productId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove from cart');
      }

      await loadCart();
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  };

  const clearCart = async () => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) throw new Error('No session ID');

      const response = await fetch(`${API_BASE}/cart/${sessionId}/clear`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to clear cart');
      }

      dispatch({ type: 'CLEAR_CART' });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  };

  const applyDiscount = async (discountCode: string) => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true });
      
      const sessionId = localStorage.getItem('cart-session-id');
      if (!sessionId) throw new Error('No session ID');

      const response = await fetch(`${API_BASE}/cart/${sessionId}/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ discountCode })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply discount');
      }

      const data = await response.json();
      dispatch({
        type: 'APPLY_DISCOUNT',
        discountCode,
        discountAmount: data.cart.discountAmount
      });
    } catch (error: any) {
      dispatch({ type: 'SET_ERROR', error: error.message });
    }
  };

  const removeDiscount = async () => {
    dispatch({ type: 'REMOVE_DISCOUNT' });
  };

  const updateShippingAddress = (address: any) => {
    dispatch({ type: 'UPDATE_SHIPPING_ADDRESS', address });
  };

  const updateTaxAndShipping = (taxRate: number, shippingAmount: number) => {
    dispatch({ 
      type: 'UPDATE_TOTALS', 
      subtotal: state.subtotal,
      taxRate, 
      taxAmount: state.subtotal * taxRate,
      shippingAmount 
    });
  };

  return (
    <CartContext.Provider value={{
      state,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      applyDiscount,
      removeDiscount,
      updateShippingAddress,
      updateTaxAndShipping,
      loadCart,
      syncFromLocalStorage,
      saveToLocalStorage
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}