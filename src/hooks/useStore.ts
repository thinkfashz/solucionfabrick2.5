import { useState, useCallback, useEffect } from 'react';
import type { StoreProduct, CartItem } from '@/components/store/TiendaMercadoLibre';

/**
 * Hook para manejar carrito de compras e integración con presupuestos
 */
export function useStoreCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Restaura carrito desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem('store-cart');
    if (saved) {
      try {
        setCart(JSON.parse(saved));
      } catch (err) {
        console.error('Error loading cart:', err);
      }
    }
  }, []);

  // Guarda carrito en localStorage
  useEffect(() => {
    localStorage.setItem('store-cart', JSON.stringify(cart));
  }, [cart]);

  const addToCart = useCallback((product: StoreProduct, quantity: number = 1) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(item.quantity + quantity, product.stock),
              }
            : item
        );
      }
      return [...prev, { productId: product.id, product, quantity: Math.min(quantity, product.stock) }];
    });
  }, []);

  const updateQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== productId);
      }
      return prev.map((item) =>
        item.productId === productId
          ? { ...item, quantity }
          : item
      );
    });
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const getTotal = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  }, [cart]);

  const getCount = useCallback(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  /**
   * Convierte carrito en líneas de presupuesto
   */
  const convertToQuoteLines = useCallback((customization?: {
    serviceType?: string;
    area?: number;
    description?: string;
  }) => {
    return cart.map((item) => ({
      description: `${item.product.name}${customization?.description ? ` - ${customization.description}` : ''}`,
      quantity: item.quantity,
      unitPrice: item.product.price,
      category: customization?.serviceType || item.product.category || 'servicios',
      metadata: {
        productId: item.productId,
        mlItemId: item.product.mlItemId,
        storeSource: true,
        area: customization?.area,
      },
    }));
  }, [cart]);

  /**
   * Crea presupuesto desde carrito
   */
  const createQuoteFromCart = useCallback(
    async (customerName: string, customerEmail: string, customization?: any) => {
      if (cart.length === 0) {
        throw new Error('El carrito está vacío');
      }

      setLoading(true);
      try {
        const lines = convertToQuoteLines(customization);

        const res = await fetch('/api/quotes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName,
            customerEmail,
            lines,
          }),
        });

        if (!res.ok) throw new Error('Error creando presupuesto');

        const quote = (await res.json()) as { id: string; [key: string]: any };
        clearCart();

        return quote;
      } finally {
        setLoading(false);
      }
    },
    [cart, clearCart, convertToQuoteLines]
  );

  /**
   * Crea orden directa de compra
   */
  const checkout = useCallback(
    async (customerName: string, customerEmail: string) => {
      if (cart.length === 0) {
        throw new Error('El carrito está vacío');
      }

      setLoading(true);
      try {
        const lines = convertToQuoteLines();
        const total = getTotal();

        const res = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName,
            customerEmail,
            items: lines,
            total: Math.round(total * 1.19), // Con IVA
          }),
        });

        if (!res.ok) throw new Error('Error procesando compra');

        const order = (await res.json()) as { id: string; [key: string]: any };
        clearCart();

        return order;
      } finally {
        setLoading(false);
      }
    },
    [cart, clearCart, convertToQuoteLines, getTotal]
  );

  return {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    getTotal,
    getCount,
    convertToQuoteLines,
    createQuoteFromCart,
    checkout,
  };
}

/**
 * Hook para cargar productos de la tienda
 */
export function useStoreProducts() {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch('/api/store/products');
        if (!res.ok) throw new Error('Error loading products');

        const data = (await res.json()) as StoreProduct[];
        setProducts(data);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error desconocido';
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  return { products, loading, error };
}
