'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    MercadoPago: new (publicKey: string) => {
      createCardToken: (data: {
        cardNumber: string;
        cardholderName: string;
        cardExpirationMonth: string;
        cardExpirationYear: string;
        securityCode: string;
        identificationType: string;
        identificationNumber: string;
      }) => Promise<{ id: string }>;
      // Resolves the real `payment_method_id` from the card BIN (first 6
      // digits). Lets us accept ANY card brand the merchant has enabled in
      // Mercado Pago (Visa & Visa Débito, Mastercard & Mastercard Débito,
      // Amex, Diners, Magna, Maestro, RedCompra, etc.) instead of relying
      // on a 3-prefix heuristic that misclassifies debit cards as `visa`.
      getPaymentMethods: (data: { bin: string }) => Promise<{
        results?: Array<{
          id: string;
          payment_type_id?: string;
          name?: string;
        }>;
      }>;
    };
    gsap: {
      fromTo: (el: HTMLElement | null, from: object, to: object) => void;
      to: (el: HTMLElement | string | null, props: object) => void;
    };
  }
}
import { useSearchParams } from 'next/navigation';
import { CART_SESSION_KEY } from '@/context/CartContext';
import { useSiteContent } from '@/hooks/useSiteContent';
import { 
  ArrowLeft, ShieldCheck, Lock, Truck, 
  CheckCircle2, ChevronRight, Fingerprint,
  Wifi, Battery, Wrench, Check, Building2, Copy, ExternalLink,
  CreditCard, RefreshCw
} from 'lucide-react';

// ── Bank account data (configurable via env vars) ──────────────────────────
const BANK_INFO = {
  bank:       process.env.NEXT_PUBLIC_BANK_NAME           ?? 'Banco de Chile',
  holder:     process.env.NEXT_PUBLIC_BANK_ACCOUNT_HOLDER ?? 'Soluciones Fabrick SpA',
  rut:        process.env.NEXT_PUBLIC_BANK_ACCOUNT_RUT    ?? '77.890.123-4',
  type:       process.env.NEXT_PUBLIC_BANK_ACCOUNT_TYPE   ?? 'Cuenta Corriente',
  number:     process.env.NEXT_PUBLIC_BANK_ACCOUNT_NUMBER ?? '0123456789',
  email:      process.env.NEXT_PUBLIC_BANK_ACCOUNT_EMAIL  ?? 'pagos@solucionesfabrick.cl',
};

// --- COMPONENTE FUEGOS ARTIFICIALES PREMIUM ---
const PremiumFireworks = () => {
  const particles = Array.from({ length: 90 }); 
  return (
    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 overflow-hidden">
      {particles.map((_, i) => {
        const angle = (i * 360) / particles.length + (Math.random() * 10 - 5);
        const velocity = 50 + Math.random() * 300;
        const tx = Math.cos((angle * Math.PI) / 180) * velocity;
        const ty = Math.sin((angle * Math.PI) / 180) * velocity;
        const colors = ['#FACC15', '#FDE047', '#FFFFFF', '#D97706'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = Math.random() * 3 + 1;
        const delay = Math.random() * 0.3;
        
        return (
          <div 
            key={i}
            className="absolute rounded-full opacity-0"
            style={{
              width: `${size}px`,
              height: `${size}px`,
              backgroundColor: color,
              boxShadow: `0 0 ${size * 3}px ${color}`,
              '--tx': `${tx}px`,
              '--ty': `${ty}px`,
              animation: `explode-premium 2.5s cubic-bezier(0.16, 1, 0.3, 1) ${delay}s forwards`
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
};

// ── Copy-to-clipboard helper ──────────────────────────────────────────────
function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-black/50 p-4 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-1">{label}</p>
        <p className="text-white text-sm font-mono font-bold truncate">{value}</p>
      </div>
      <button
        onClick={copy}
        className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all ${copied ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400' : 'border-white/10 text-zinc-400 hover:border-yellow-400/30 hover:text-yellow-400'}`}
      >
        {copied ? <Check size={12} /> : <Copy size={12} />}
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}

// Pre-computed star field for the processing overlay (stable across renders).
const STAR_FIELD = Array.from({ length: 24 }).map((_, i) => ({
  top: (i * 37) % 100,
  left: (i * 53) % 100,
  size: (i % 3) + 1,
  delay: (i % 7) * 0.35,
}));

interface StoredCartItem {
  product: {
    id: string;
    name: string;
    price: number;
    image_url?: string;
    category_id?: string;
    discount_percentage?: number;
  };
  quantity: number;
}

const CheckoutApp = () => {
  const searchParams = useSearchParams();
  // CMS-driven copy for steps, success/pending/rejected messages, and legal note.
  // Defaults mirror the previous hardcoded literals, so empty rows render
  // the same UI as before.
  const checkoutCms = useSiteContent('checkout');
  const [step, setStep] = useState(1); 
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const stepContentRef = useRef<HTMLDivElement>(null);
  
  // Payment method selection: 'mercadopago' | 'transfer'
  const [paymentMethod, setPaymentMethod] = useState<'mercadopago' | 'transfer'>('mercadopago');
  
  // Transfer order state
  const [transferOrderId, setTransferOrderId] = useState('');
  const [transferOrderCreating, setTransferOrderCreating] = useState(false);
  const [transferOrderReady, setTransferOrderReady] = useState(false);
  const [transferOrderStatus, setTransferOrderStatus] = useState('pendiente');
  const [transferOrderTotal, setTransferOrderTotal] = useState(0);
  const [secureConnectionProgress, setSecureConnectionProgress] = useState(0);

  // Real-time Mercado Pago gateway status — driven by /api/payments/mp-status.
  // Replaces the previous "fake" setInterval that animated 0→100% regardless
  // of upstream availability. The connection bar now mirrors what the server
  // actually observes when reaching api.mercadopago.com on every poll.
  type MpStatus = 'idle' | 'checking' | 'ok' | 'unconfigured' | 'unreachable' | 'invalid_token';
  type MpMode = 'production' | 'sandbox' | 'unknown';
  interface MpStatusInfo {
    status: MpStatus;
    publicKey: string;
    hasAccessToken: boolean;
    reachable: boolean;
    latencyMs: number | null;
    message: string;
    checkedAt: number;
    mode: MpMode;
  }
  const [mpStatus, setMpStatus] = useState<MpStatusInfo>({
    status: 'idle',
    publicKey: '',
    hasAccessToken: false,
    reachable: false,
    latencyMs: null,
    message: '',
    checkedAt: 0,
    mode: 'unknown',
  });

  // Estados del Procesamiento Final de Compra
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);
  // Real outcome from Mercado Pago (only set after the server-side charge call):
  //   'idle'      → no payment attempt yet (initial state)
  //   'pending'   → MP returned pending/in_process/authorized
  //   'rejected'  → MP rejected the charge or our server failed
  // Success is represented by `isSuccess` to keep backwards compatibility with
  // existing UI; rejection/pending are shown as overlay variants.
  const [paymentOutcome, setPaymentOutcome] = useState<'idle' | 'pending' | 'rejected'>('idle');
  const [paymentRejectionMessage, setPaymentRejectionMessage] = useState('');

  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingHouseNumber, setShippingHouseNumber] = useState('');
  const [shippingRegion, setShippingRegion] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [locationSuggestion, setLocationSuggestion] = useState<{ address: string; region: string } | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCVC, setCardCVC] = useState('');
  // Cardholder's identification (RUT in Chile). Mercado Pago requires a
  // real value here when tokenizing — sending '0' makes MP reject the
  // token for most issuers, so we ask the user for it.
  const [cardRut, setCardRut] = useState('');
  const [cardFlipped, setCardFlipped] = useState(false);
  // Hosted Checkout Pro fallback — guarantees every card brand and method
  // MP supports works, even when the inline form is too strict.
  const [hostedRedirecting, setHostedRedirecting] = useState(false);
  const [mpSubStep, setMpSubStep] = useState(1); // 1: card number, 2: holder + expiry + CVC, 3: review
  const [checkoutError, setCheckoutError] = useState('');
  const [orderId, setOrderId] = useState('');
  const [mpPaymentId, setMpPaymentId] = useState<string | null>(null);

  // ── Cart: prefer sessionStorage cart (multi-product), fallback to URL params ──
  const [cartItems, setCartItems] = useState<StoredCartItem[]>([]);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CART_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredCartItem[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCartItems(parsed);
          return;
        }
      }
    } catch { /* Ignore */ }
    // Fall back to URL params (single product)
    const urlProduct: StoredCartItem = {
      product: {
        id: searchParams.get('productId') || 'FBK-01',
        name: searchParams.get('name') || 'Cerradura Biométrica Titanio V2',
        price: Number(searchParams.get('price') || 189900),
        image_url: searchParams.get('img') || 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop',
        category_id: searchParams.get('category') || '',
      },
      quantity: 1,
    };
    setCartItems([urlProduct]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived: first product (for legacy single-product display) and cart totals
  const product = cartItems[0]
    ? {
        id: cartItems[0].product.id,
        name: cartItems[0].product.name,
        category: cartItems[0].product.category_id || 'Producto',
        price: cartItems[0].product.price,
        shipping: 0,
        image: cartItems[0].product.image_url || 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop',
      }
    : {
        id: 'FBK-01',
        name: 'Cerradura Biométrica Titanio V2',
        category: 'Seguridad Smart Home',
        price: 189900,
        shipping: 0,
        image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop',
      };

  const cartTotal = cartItems.reduce((s, i) => {
    const discount = i.product.discount_percentage || 0;
    return s + i.product.price * (1 - discount / 100) * i.quantity;
  }, 0);
  const cartItemCount = cartItems.reduce((s, i) => s + i.quantity, 0);

  const formatCardDisplay = (n: string) => {
    const clean = n.replace(/\D/g, '').padEnd(16, '•');
    return [clean.slice(0,4), clean.slice(4,8), clean.slice(8,12), clean.slice(12,16)].join(' ');
  };

  const detectCardBrand = (n: string): { name: string; gradient: string } => {
    const d = n.replace(/\D/g, '');
    if (/^4/.test(d)) return { name: 'VISA', gradient: 'from-[#1a237e] via-[#283593] to-[#1565c0]' };
    if (/^5[1-5]/.test(d) || /^2[2-7]/.test(d)) return { name: 'MC', gradient: 'from-[#1a1a1a] via-[#2d2d2d] to-[#1a1a1a]' };
    if (/^3[47]/.test(d)) return { name: 'AMEX', gradient: 'from-[#006fcf] via-[#0077b6] to-[#0096c7]' };
    return { name: '', gradient: 'from-zinc-900 via-zinc-800 to-zinc-900' };
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.match(/.{1,4}/g)?.join(' ') ?? raw;
    setCardNumber(formatted);
  };

  const returnedPaymentStatus =
    searchParams.get('payment_status') ||
    searchParams.get('status') ||
    searchParams.get('collection_status') ||
    '';
  const returnedOrderId =
    searchParams.get('external_reference') ||
    searchParams.get('merchant_order_id') ||
    '';

  const requestSatelliteAutofill = () => {
    if (!navigator.geolocation) {
      setLocationError('Tu navegador no soporta geolocalización.');
      return;
    }

    setLocationError('');
    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(`/api/location/reverse?lat=${latitude}&lon=${longitude}`);
          const payload = await response.json();

          if (!response.ok || !payload?.data) {
            setLocationError('No se pudo obtener tu dirección automáticamente.');
            return;
          }

          const d = payload.data;
          // Separate street from house number so the user sees them in different fields
          const streetOnly = (d.road || '').toString().trim();
          const houseNumber = (d.houseNumber || '').toString().trim();
          const suggestedAddress = [
            streetOnly,
            d.city,
            d.postcode,
            d.country,
          ]
            .filter(Boolean)
            .join(', ');

          setLocationSuggestion({
            address: suggestedAddress || d.displayName || '',
            region: d.region || '',
          });
        } catch {
          setLocationError('Error al consultar el servicio de ubicación.');
        } finally {
          setLocationLoading(false);
        }
      },
      () => {
        setLocationLoading(false);
        setLocationError('No se obtuvo permiso de ubicación.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    const loadGSAP = async () => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
      script.onload = () => setGsapLoaded(true);
      document.head.appendChild(script);
    };
    loadGSAP();
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (returnedOrderId) {
      setOrderId(returnedOrderId);
    }

    if (!returnedPaymentStatus) {
      return;
    }

    const normalized = returnedPaymentStatus.toLowerCase();
    // The processing overlay (`{isProcessing && ...}`) is what hosts the
    // success / pending / rejection panels, so we keep it open here. Note this
    // also fixes a latent pre-existing bug where the success screen returned
    // from MP back-redirects was never visible because the overlay was closed
    // first.
    setIsProcessing(true);

    if (['success', 'approved'].includes(normalized)) {
      setCheckoutError('');
      setProcessProgress(100);
      setPaymentOutcome('idle');
      setIsSuccess(true);
      return;
    }

    setIsSuccess(false);
    setProcessProgress(0);
    setStep(3);

    if (['pending', 'in_process', 'in_mediation', 'authorized'].includes(normalized)) {
      setPaymentOutcome('pending');
      setPaymentRejectionMessage(
        'Mercado Pago indicó que el pago quedó pendiente. Te avisaremos por email cuando se acredite.',
      );
      return;
    }

    setPaymentOutcome('rejected');
    setPaymentRejectionMessage(
      'Mercado Pago no aprobó el pago. Puedes intentarlo nuevamente con otra tarjeta o usar transferencia bancaria.',
    );
  }, [returnedOrderId, returnedPaymentStatus]);

  useEffect(() => {
    if (!gsapLoaded || !window.gsap) return;
    
    window.gsap.fromTo('.animate-fade-up', 
      { y: 30, opacity: 0 }, 
      { y: 0, opacity: 1, duration: 0.8, stagger: 0.1, ease: 'power3.out' }
    );

    window.gsap.to('.product-float', {
      y: -10,
      duration: 2,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }, [gsapLoaded]);

  const changeStep = (newStep: number) => {
    if (!window.gsap || !stepContentRef.current) {
      setStep(newStep);
      return;
    }
    window.gsap.to(stepContentRef.current, {
      opacity: 0,
      x: -20,
      duration: 0.3,
      onComplete: () => {
        setStep(newStep);
        window.gsap.fromTo(stepContentRef.current,
          { opacity: 0, x: 20 },
          { opacity: 1, x: 0, duration: 0.4, ease: 'power2.out' }
        );
      }
    });
  };

  // ── Real-time secure-connection probe ──────────────────────────────────────
  //
  // While the payment step is visible, poll `/api/payments/mp-status` so the
  // bar (Fabrick → Mercado Pago → Banco) animates with the actual reachability
  // of the gateway, not a fake clock. Progress is derived from the live
  // result:
  //   - idle/checking      → smoothly animate from current to 25% (Fabrick OK)
  //   - reachable          → 60% (Mercado Pago reached)
  //   - reachable + token  → 100% (we can authorize through MP, all green)
  //   - unreachable        → drop progress and let the bar show the failure
  //                          colour state controlled below.
  // The probe self-aborts on unmount and re-polls every 8 s to give a true
  // "real-time" feel without hammering MP.
  useEffect(() => {
    if (step !== 3) return;

    let cancelled = false;
    let pollTimer: ReturnType<typeof setInterval> | null = null;
    // `progressTimer` is shared by every call to `animateTo` in this effect's
    // lifetime. Hoisting it here (rather than redeclaring inside `animateTo`)
    // makes the lifecycle obvious: a new animation always cancels the previous
    // one, and the effect-cleanup function always clears whatever is current.
    let progressTimer: ReturnType<typeof setInterval> | null = null;

    const stopProgress = () => {
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
    };

    const animateTo = (target: number) => {
      stopProgress();
      progressTimer = setInterval(() => {
        if (cancelled) {
          stopProgress();
          return;
        }
        setSecureConnectionProgress((prev) => {
          if (prev === target) {
            stopProgress();
            return prev;
          }
          const delta = target - prev;
          const stepSize = Math.max(1, Math.ceil(Math.abs(delta) / 6));
          return delta > 0 ? Math.min(target, prev + stepSize) : Math.max(target, prev - stepSize);
        });
      }, 80);
    };

    const probe = async () => {
      if (cancelled) return;
      setMpStatus((prev) => ({ ...prev, status: prev.status === 'idle' ? 'checking' : prev.status }));
      // Stage 1: Fabrick → our server is, by definition, reachable.
      animateTo(25);
      try {
        const res = await fetch('/api/payments/mp-status', { cache: 'no-store' });
        if (cancelled) return;
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Omit<MpStatusInfo, 'checkedAt'> & { mode?: MpMode };
        if (cancelled) return;
        setMpStatus({ ...data, mode: data.mode ?? 'unknown', checkedAt: Date.now() });

        if (data.status === 'ok') {
          animateTo(100);
        } else if (data.reachable) {
          // We touched MP but the token is invalid → MP node is up but the
          // bank handshake will not complete. Show MP-green, bank-red.
          animateTo(60);
        } else if (data.status === 'unconfigured') {
          // Don't pretend MP is reachable when keys aren't configured.
          animateTo(15);
        } else {
          animateTo(20);
        }
      } catch (err) {
        if (cancelled) return;
        setMpStatus({
          status: 'unreachable',
          publicKey: '',
          hasAccessToken: false,
          reachable: false,
          latencyMs: null,
          message:
            err instanceof Error
              ? `No se pudo consultar la pasarela: ${err.message}`
              : 'No se pudo consultar la pasarela.',
          checkedAt: Date.now(),
          mode: 'unknown',
        });
        animateTo(15);
      }
    };

    setSecureConnectionProgress(0);
    void probe();
    pollTimer = setInterval(() => void probe(), 8000);

    return () => {
      cancelled = true;
      if (pollTimer) clearInterval(pollTimer);
      stopProgress();
    };
  }, [step]);

  const formatCLP = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  // ── Card input helpers ───────────────────────────────────────────────────
  const rawCardDigits = cardNumber.replace(/\s+/g, '');
  const detectBrand = (num: string): 'visa' | 'mastercard' | 'amex' | 'diners' | 'unknown' => {
    if (/^4/.test(num)) return 'visa';
    if (/^(5[1-5]|2[2-7])/.test(num)) return 'mastercard';
    if (/^3[47]/.test(num)) return 'amex';
    if (/^3(0[0-5]|[689])/.test(num)) return 'diners';
    return 'unknown';
  };
  const cardBrand = detectBrand(rawCardDigits);
  const maskCardNumber = (digits: string) => {
    const groups = cardBrand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
    const padded = digits.padEnd(groups.reduce((a, b) => a + b, 0), '•');
    let idx = 0;
    return groups
      .map((len) => {
        const slice = padded.slice(idx, idx + len);
        idx += len;
        return slice;
      })
      .join(' ');
  };
  const formatCardInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, cardBrand === 'amex' ? 15 : 16);
    const groups = cardBrand === 'amex' ? [4, 6, 5] : [4, 4, 4, 4];
    const parts: string[] = [];
    let idx = 0;
    for (const len of groups) {
      if (idx >= digits.length) break;
      parts.push(digits.slice(idx, idx + len));
      idx += len;
    }
    return parts.join(' ');
  };
  const formatExpiryInput = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length < 3) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };
  // Luhn checksum — used to validate "unknown" brand card numbers.
  const luhnValid = (digits: string) => {
    if (!/^\d+$/.test(digits)) return false;
    let sum = 0;
    let alt = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let n = Number(digits[i]);
      if (alt) {
        n *= 2;
        if (n > 9) n -= 9;
      }
      sum += n;
      alt = !alt;
    }
    return sum % 10 === 0;
  };
  const isCardNumberValid =
    (cardBrand === 'amex' && rawCardDigits.length === 15 && luhnValid(rawCardDigits)) ||
    (cardBrand !== 'amex' && cardBrand !== 'unknown' && rawCardDigits.length === 16 && luhnValid(rawCardDigits)) ||
    (cardBrand === 'unknown' && rawCardDigits.length >= 13 && rawCardDigits.length <= 19 && luhnValid(rawCardDigits));
  const isExpiryValid = /^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExpiry);
  const isCvcValid = cardBrand === 'amex' ? /^\d{4}$/.test(cardCVC) : /^\d{3}$/.test(cardCVC);
  const isHolderValid = cardName.trim().length >= 3;

  // ── RUT helpers (Chilean cardholder identification) ─────────────────────
  // We accept input in any of the common forms (`12345678-9`, `12.345.678-9`
  // or just digits + DV) and normalise to the canonical `12345678-9` shape
  // that Mercado Pago expects in `identificationNumber`.
  const normaliseRut = (value: string) => {
    const cleaned = value.replace(/[^\dkK]/g, '').toUpperCase().slice(0, 9);
    if (cleaned.length <= 1) return cleaned;
    return `${cleaned.slice(0, -1)}-${cleaned.slice(-1)}`;
  };
  const formatRutInput = normaliseRut;
  const computeRutDV = (body: string) => {
    let sum = 0;
    let mul = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * mul;
      mul = mul === 7 ? 2 : mul + 1;
    }
    const rest = 11 - (sum % 11);
    if (rest === 11) return '0';
    if (rest === 10) return 'K';
    return String(rest);
  };
  const isRutValid = (() => {
    const cleaned = cardRut.replace(/[^\dkK]/g, '').toUpperCase();
    if (cleaned.length < 7 || cleaned.length > 9) return false;
    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1);
    if (!/^\d+$/.test(body)) return false;
    return computeRutDV(body) === dv;
  })();

  const handleConfirmInvestment = async () => {
    if (isProcessing) return;

    setCheckoutError('');
    setPaymentOutcome('idle');
    setPaymentRejectionMessage('');

    if (!shippingName || !shippingEmail || !shippingAddress || !shippingRegion) {
      setCheckoutError('Completa los datos de despacho y contacto antes de confirmar.');
      return;
    }

    if (!cardNumber || !cardName || !cardExpiry || !cardCVC) {
      setCheckoutError('Completa todos los datos de la tarjeta.');
      return;
    }

    // Prefer the live-resolved public key from /api/payments/mp-status — that
    // way MP works whether the user named their env var `NEXT_PUBLIC_MP_PUBLIC_KEY`
    // (inlined into the JS bundle) or any of the server-side aliases (read at
    // request time, surfaced via the status endpoint). Fall back to the
    // build-time inlined value so we keep working even if the status endpoint
    // is briefly unreachable.
    const buildTimeMpKey = (process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || '').trim();
    const mpPublicKey = (mpStatus.publicKey || buildTimeMpKey).trim();
    if (!mpPublicKey || mpPublicKey === 'TEST-PUBLIC-KEY') {
      const reason =
        mpStatus.status === 'unconfigured'
          ? mpStatus.message ||
            'La pasarela de pago con tarjeta no está configurada. Por favor usa transferencia bancaria.'
          : mpStatus.status === 'invalid_token'
            ? 'El token de Mercado Pago configurado no es válido. Por favor usa transferencia bancaria mientras se actualiza.'
            : mpStatus.status === 'unreachable'
              ? 'No podemos contactar con Mercado Pago en este momento. Por favor reintenta en unos segundos o usa transferencia bancaria.'
              : 'La pasarela de pago con tarjeta no está configurada en este sitio. Por favor usa transferencia bancaria.';
      setCheckoutError(reason);
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);

    // --- MercadoPago tokenization ---
    let mpToken: string | null = null;
    // Resolved by `mp.getPaymentMethods({ bin })` below; if the SDK call
    // fails (e.g. unrecognised BIN), we fall back to the prefix heuristic.
    let detectedPaymentMethodId: string | null = null;
    try {
      // Load MercadoPago SDK if not already present
      await new Promise<void>((resolve, reject) => {
        const handleReady = () => {
          if (window.MercadoPago) {
            resolve();
          } else {
            reject(new Error('El SDK de MercadoPago no estuvo disponible después de cargar el script.'));
          }
        };
        const handleError = () => reject(new Error('No se pudo cargar el SDK de MercadoPago.'));

        if (window.MercadoPago) { resolve(); return; }

        const existing = document.getElementById('mp-sdk-script');
        if (existing instanceof HTMLScriptElement) {
          existing.addEventListener('load', handleReady, { once: true });
          existing.addEventListener('error', handleError, { once: true });
          return;
        }

        const script = document.createElement('script');
        script.id = 'mp-sdk-script';
        script.src = 'https://sdk.mercadopago.com/js/v2';
        script.addEventListener('load', handleReady, { once: true });
        script.addEventListener('error', handleError, { once: true });
        document.head.appendChild(script);
      });

      if (!window.MercadoPago) {
        throw new Error('El SDK de MercadoPago no está disponible.');
      }

      // Validate card expiry format (MM/AA or MM/AAAA)
      const expiryParts = cardExpiry.split('/');
      if (expiryParts.length !== 2 || !expiryParts[0] || !expiryParts[1]) {
        throw new Error('Formato de fecha de expiración inválido. Usa MM/AA.');
      }
      const expMonth = expiryParts[0].trim();
      const expYearRaw = expiryParts[1].trim();
      const expYear = expYearRaw.length === 2 ? `20${expYearRaw}` : expYearRaw;

      const mp = new window.MercadoPago(mpPublicKey);
      const rawCardNumber = cardNumber.replace(/\s/g, '');
      const normalisedRut = normaliseRut(cardRut);

      const tokenResult = await mp.createCardToken({
        cardNumber: rawCardNumber,
        cardholderName: cardName,
        cardExpirationMonth: expMonth,
        cardExpirationYear: expYear,
        securityCode: cardCVC,
        identificationType: 'RUT',
        identificationNumber: normalisedRut,
      });

      mpToken = tokenResult.id;

      // Resolve the REAL `payment_method_id` from the BIN (first 6 digits)
      // so debit cards (`debvisa`/`debmaster`), Diners, Magna, Maestro,
      // RedCompra, etc. are routed correctly. The previous prefix-based
      // heuristic forced everything into `visa`/`master`/`amex`, which is
      // why MP was rejecting many valid debit/credit cards.
      try {
        const bin = rawCardNumber.slice(0, 6);
        if (bin.length === 6) {
          const pmRes = await mp.getPaymentMethods({ bin });
          const first = pmRes?.results?.[0];
          if (first?.id) detectedPaymentMethodId = first.id;
        }
      } catch {
        /* fall back to prefix heuristic below */
      }
    } catch (tokenErr) {
      // Tokenization failure is the FIRST signal that the card data is bad —
      // surface it as a rejection so the user can retry. We never silently
      // proceed without a token: that's how fake "successes" used to happen.
      setIsProcessing(true);
      setIsSuccess(false);
      setPaymentOutcome('rejected');
      setPaymentRejectionMessage(
        tokenErr instanceof Error
          ? `No pudimos validar la tarjeta: ${tokenErr.message}. Revisa los datos e intenta nuevamente.`
          : 'No pudimos validar la tarjeta. Revisa los datos e intenta nuevamente.',
      );
      setProcessProgress(0);
      return;
    }
    // --- end tokenization ---

    const payload = {
      items: cartItems.map((i) => ({
        productoId: i.product.id,
        cantidad: i.quantity,
        precioUnitario: i.product.price * (1 - (i.product.discount_percentage || 0) / 100),
        nombre: i.product.name,
      })),
      region: shippingRegion,
      shippingAddress,
      shippingHouseNumber,
      cliente: {
        nombre: shippingName,
        email: shippingEmail,
        telefono: shippingPhone,
      },
    };

    let prog = 10;
    setProcessProgress(prog);

    try {
      const validateRes = await fetch('/api/orders/check/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const validateBody = await validateRes.json();
      if (!validateRes.ok || !validateBody?.valid) {
        const firstError = validateBody?.errors?.[0]?.message ?? 'Validación fallida del checkout.';
        throw new Error(firstError);
      }

      prog = 35;
      setProcessProgress(prog);

      const checkoutRes = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const checkoutBody = await checkoutRes.json();
      if (!checkoutRes.ok || !checkoutBody?.data?.id) {
        throw new Error(checkoutBody?.error ?? 'No se pudo crear la orden.');
      }

      const createdOrderId = checkoutBody.data.id as string;
      setOrderId(createdOrderId);

      prog = 70;
      setProcessProgress(prog);

      // --- MercadoPago charge: this is the AUTHORITATIVE step ---------------
      const rawNum = cardNumber.replace(/\s/g, '');
      // Prefer the `payment_method_id` Mercado Pago itself returned for the
      // BIN; only fall back to a coarse prefix heuristic if MP couldn't
      // classify the card. This is what unblocks debit cards, Diners,
      // Maestro, RedCompra and any other brand the merchant has enabled.
      const fallbackMethod = rawNum.startsWith('4')
        ? 'visa'
        : /^5[1-5]/.test(rawNum)
          ? 'master'
          : /^3[47]/.test(rawNum)
            ? 'amex'
            : /^3(0[0-5]|[689])/.test(rawNum)
              ? 'diners'
              : 'visa';
      const paymentMethodId = detectedPaymentMethodId || fallbackMethod;

      const mpRes = await fetch('/api/payments/mercadopago', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: mpToken,
          amount: cartTotal,
          description: cartItems.length === 1
            ? product.name
            : `Pedido Fabrick (${cartItemCount} productos)`,
          email: shippingEmail,
          installments: 1,
          payment_method_id: paymentMethodId,
          externalReference: createdOrderId,
        }),
      });

      const mpBody = await mpRes.json().catch(() => ({} as Record<string, unknown>));
      const mpStatus = (mpBody as { status?: string })?.status;
      const mpMessage =
        (mpBody as { message?: string })?.message ??
        (mpBody as { error?: string })?.error ??
        '';
      const respPaymentId = (mpBody as { paymentId?: string | number | null })?.paymentId;
      if (respPaymentId != null && respPaymentId !== '') {
        setMpPaymentId(String(respPaymentId));
      }

      prog = 100;
      setProcessProgress(prog);

      if (mpRes.ok && mpStatus === 'approved') {
        setTimeout(() => setIsSuccess(true), 600);
        return;
      }

      if (mpRes.status === 202 || mpStatus === 'pending' || mpStatus === 'in_process' || mpStatus === 'authorized') {
        setIsSuccess(false);
        setPaymentOutcome('pending');
        setPaymentRejectionMessage(
          mpMessage || checkoutCms.successMessages.pending,
        );
        return;
      }

      // Anything else → real rejection.
      setIsSuccess(false);
      setPaymentOutcome('rejected');
      setPaymentRejectionMessage(
        mpMessage || checkoutCms.successMessages.rejected,
      );
      return;
      // --- end MP charge ---------------------------------------------------
    } catch (e) {
      setIsSuccess(false);
      setPaymentOutcome('rejected');
      setPaymentRejectionMessage(
        e instanceof Error ? e.message : 'Error procesando checkout.',
      );
      setProcessProgress(0);
      return;
    }
  };

  // ── Mercado Pago Checkout Pro fallback ───────────────────────────────────
  // Creates the order via /api/checkout (which already creates an MP
  // preference server-side) and redirects the buyer to MP's hosted
  // checkout. Hosted Checkout Pro accepts EVERY card brand and payment
  // method enabled in the merchant's MP account (Visa & Visa Débito,
  // Mastercard & Mastercard Débito, Amex, Diners, Magna, Maestro,
  // RedCompra, Webpay, transferencia, etc.) — guaranteed escape hatch when
  // the inline form rejects a specific card.
  const handlePayWithCheckoutPro = async () => {
    if (hostedRedirecting) return;
    setCheckoutError('');

    if (!shippingName || !shippingEmail || !shippingAddress || !shippingRegion) {
      setCheckoutError('Completa los datos de despacho y contacto antes de continuar.');
      return;
    }

    setHostedRedirecting(true);

    const payload = {
      items: cartItems.map((i) => ({
        productoId: i.product.id,
        cantidad: i.quantity,
        precioUnitario: i.product.price * (1 - (i.product.discount_percentage || 0) / 100),
        nombre: i.product.name,
      })),
      region: shippingRegion,
      shippingAddress,
      shippingHouseNumber,
      cliente: {
        nombre: shippingName,
        email: shippingEmail,
        telefono: shippingPhone,
      },
    };

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({} as Record<string, unknown>));
      const checkoutUrl = (body as { payment?: { checkoutUrl?: string } })?.payment?.checkoutUrl;
      if (!res.ok || !checkoutUrl) {
        const message =
          (body as { error?: string })?.error ||
          'No se pudo iniciar el pago en Mercado Pago. Intenta nuevamente o usa transferencia bancaria.';
        throw new Error(message);
      }
      // Redirect to MP's hosted checkout. The user can pay with ANY card or
      // method MP supports there, then is sent back to /checkout?payment_status=...
      window.location.assign(checkoutUrl);
    } catch (e) {
      setHostedRedirecting(false);
      setCheckoutError(
        e instanceof Error ? e.message : 'No se pudo iniciar el pago en Mercado Pago.',
      );
    }
  };

  // ── Bank Transfer: create order then show bank details ───────────────────
  const handleTransferOrder = async () => {
    if (transferOrderCreating || transferOrderReady) return;
    setCheckoutError('');

    if (!shippingName || !shippingEmail || !shippingAddress || !shippingRegion) {
      setCheckoutError('Completa los datos de despacho antes de generar la orden.');
      return;
    }

    setTransferOrderCreating(true);

    const payload = {
      items: cartItems.map((i) => ({
        productoId: i.product.id,
        cantidad: i.quantity,
        precioUnitario: i.product.price * (1 - (i.product.discount_percentage || 0) / 100),
        nombre: i.product.name,
      })),
      region: shippingRegion,
      shippingAddress,
      shippingHouseNumber,
      cliente: {
        nombre: shippingName,
        email: shippingEmail,
        telefono: shippingPhone,
      },
      paymentMethod: 'transfer',
    };

    try {
      // Create order via /api/checkout/transfer
      const res = await fetch('/api/checkout/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok || !body?.data?.id) {
        throw new Error(body?.error ?? 'No se pudo crear la orden de transferencia.');
      }
      setTransferOrderId(body.data.id as string);
      setTransferOrderTotal(body.data.resumen?.total ?? cartTotal);
      setTransferOrderStatus('pendiente_transferencia');
      setTransferOrderReady(true);
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Error creando la orden.');
    } finally {
      setTransferOrderCreating(false);
    }
  };

  // ── Poll transfer order status every 10s ─────────────────────────────────
  useEffect(() => {
    if (!transferOrderReady || !transferOrderId) return;
    let active = true;

    const poll = async () => {
      try {
        const { insforge } = await import('@/lib/insforge');
        const { data } = await insforge.database
          .from('orders')
          .select('status')
          .eq('id', transferOrderId)
          .single();
        const status = (data as { status?: string } | null)?.status;
        if (active && typeof status === 'string') {
          setTransferOrderStatus(status);
        }
      } catch { /* silent */ }
    };

    void poll();
    const interval = setInterval(() => void poll(), 10_000);
    return () => { active = false; clearInterval(interval); };
  }, [transferOrderReady, transferOrderId]);

  return (
    <div className="bg-black text-white min-h-screen font-sans selection:bg-yellow-400 selection:text-black overflow-x-hidden pb-20">
      
      {/* ESTILOS NECESARIOS */}
      <style>
        {`
          @keyframes run-light {
            0% { stroke-dashoffset: 125; }
            100% { stroke-dashoffset: -25; }
          }
          .perspective-1000 { perspective: 1000px; }
          .transform-style-3d { transform-style: preserve-3d; }
          .backface-hidden { backface-visibility: hidden; }
          .rotate-y-180 { transform: rotateY(180deg); }
          
          .bg-tunnel-flow {
            background-image: repeating-linear-gradient(
              -45deg,
              rgba(16, 185, 129, 1),
              rgba(16, 185, 129, 1) 15px,
              rgba(5, 150, 105, 1) 15px,
              rgba(5, 150, 105, 1) 30px
            );
            background-size: 42px 42px;
            animation: flow-stripes 1s linear infinite;
          }
          @keyframes flow-stripes {
            100% { background-position: 42px 0; }
          }

          @keyframes explode-premium {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            50% { opacity: 0.9; }
            100% { transform: translate(var(--tx), calc(var(--ty) + 60px)) scale(0); opacity: 0; }
          }
          
          @keyframes pulse-ring {
            0% { transform: scale(0.9); opacity: 1; }
            100% { transform: scale(1.5); opacity: 0; }
          }

          @keyframes bb-bar {
            from { opacity: 0.2; transform: scaleY(0.6); }
            to { opacity: 1; transform: scaleY(1); }
          }
          @keyframes bb-progress {
            from { background-position: 0 0; }
            to { background-position: 16px 0; }
          }

          @keyframes orbit-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          @keyframes twinkle {
            0%, 100% { opacity: 0.15; transform: scale(0.8); }
            50% { opacity: 0.9; transform: scale(1.2); }
          }
          @keyframes rocket-MP {
            0%   { transform: translate(-50%, -50%) translate(0px, 0px) scale(0.6); opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(1.1); opacity: 0; }
          }
          @keyframes rocket-SSL {
            0%   { transform: translate(-50%, -50%) translate(0px, 0px) scale(0.6); opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(1.1); opacity: 0; }
          }
          @keyframes rocket-Bank {
            0%   { transform: translate(-50%, -50%) translate(0px, 0px) scale(0.6); opacity: 0; }
            15%  { opacity: 1; }
            85%  { opacity: 1; }
            100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(1.1); opacity: 0; }
          }

          /* 3D card preview */
          @keyframes card-shine {
            0% { transform: translateX(-120%) skewX(-20deg); }
            100% { transform: translateX(220%) skewX(-20deg); }
          }
        `}
      </style>

      {/* OVERLAY DE PROCESAMIENTO / ÉXITO / RECHAZO / PENDIENTE */}
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500 overflow-y-auto">
          
          {paymentOutcome === 'rejected' ? (
            /* ── REJECTION PANEL ───────────────────────────────────────── */
            <div className="w-full max-w-md flex flex-col items-center text-center animate-fade-up py-8">
              <div className="relative mb-8 mt-4">
                <div className="absolute inset-0 rounded-full border border-red-500/40 animate-[pulse-ring_2s_cubic-bezier(0.2,0,0.2,1)_infinite]" />
                <div className="w-16 h-16 bg-red-500/10 border border-red-500/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(239,68,68,0.25)]">
                  <svg viewBox="0 0 24 24" className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </div>
              </div>

              <span className="text-red-400 font-bold tracking-[0.5em] text-[9px] uppercase">Pago Rechazado</span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none mt-3 mb-4">
                Tarjeta <span className="text-red-400">no aprobada</span>
              </h2>

              <p className="text-zinc-300 text-sm leading-relaxed max-w-sm mx-auto mb-2 px-2">
                {paymentRejectionMessage || 'Mercado Pago no aprobó el pago. No se realizó ningún cobro a tu tarjeta.'}
              </p>
              {orderId && (
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6">
                  Orden: <span className="text-zinc-300 font-mono">{orderId}</span> · sin cobro
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 w-full mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setIsProcessing(false);
                    setPaymentOutcome('idle');
                    setPaymentRejectionMessage('');
                    setProcessProgress(0);
                    setMpSubStep(1);
                    setCardNumber('');
                    setCardCVC('');
                    setStep(3);
                  }}
                  className="flex-1 py-4 bg-yellow-400 text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-full hover:bg-white transition-all shadow-[0_10px_30px_rgba(250,204,21,0.25)]"
                >
                  Intentar otra tarjeta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsProcessing(false);
                    setPaymentOutcome('idle');
                    setPaymentRejectionMessage('');
                    setProcessProgress(0);
                    setPaymentMethod('transfer');
                    setTransferOrderReady(false);
                    setTransferOrderId('');
                    setStep(3);
                  }}
                  className="flex-1 py-4 border border-white/20 rounded-full text-white font-bold uppercase text-[10px] tracking-[0.3em] hover:border-yellow-400 hover:text-yellow-400 transition-colors"
                >
                  Pagar por transferencia
                </button>
              </div>
            </div>
          ) : paymentOutcome === 'pending' ? (
            /* ── PENDING PANEL ─────────────────────────────────────────── */
            <div className="w-full max-w-md flex flex-col items-center text-center animate-fade-up py-8">
              <div className="relative mb-8 mt-4">
                <div className="absolute inset-0 rounded-full border border-yellow-400/40 animate-[pulse-ring_2s_cubic-bezier(0.2,0,0.2,1)_infinite]" />
                <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.25)]">
                  <RefreshCw className="w-7 h-7 text-yellow-400" strokeWidth={2.2} />
                </div>
              </div>

              <span className="text-yellow-400 font-bold tracking-[0.5em] text-[9px] uppercase">Pago en revisión</span>
              <h2 className="text-3xl sm:text-4xl font-black uppercase tracking-tighter leading-none mt-3 mb-4">
                Pago <span className="text-yellow-400">pendiente</span>
              </h2>

              <p className="text-zinc-300 text-sm leading-relaxed max-w-sm mx-auto mb-2 px-2">
                {paymentRejectionMessage || checkoutCms.successMessages.pending}
              </p>
              {orderId && (
                <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500 mb-6">
                  Orden: <span className="text-zinc-300 font-mono">{orderId}</span>
                </p>
              )}

              <button
                type="button"
                onClick={() => window.location.assign('/')}
                className="mt-4 px-10 py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-full hover:bg-yellow-400 transition-all"
              >
                Volver al inicio
              </button>

              {mpPaymentId && (
                <a
                  href={`https://www.mercadopago.cl/activities/?searchQuery=${encodeURIComponent(mpPaymentId)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-400/20"
                >
                  Ver estado / cancelar en Mercado Pago ↗
                </a>
              )}
            </div>
          ) : !isSuccess ? (
            <div className="w-full max-w-md flex flex-col items-center text-center animate-fade-up">
               {/* Orbital / planet visualization */}
               <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] mb-10">
                 {/* Outer orbit */}
                 <div className="absolute inset-0 rounded-full border border-yellow-400/10" />
                 <div className="absolute inset-6 rounded-full border border-yellow-400/5" />
                 <div className="absolute inset-12 rounded-full border border-yellow-400/20 animate-[orbit-spin_14s_linear_infinite]" />

                 {/* Stars background */}
                 <div className="absolute inset-0 overflow-hidden rounded-full">
                   {STAR_FIELD.map((s, i) => (
                     <span
                       key={i}
                       className="absolute rounded-full bg-white/60"
                       style={{
                         top: `${s.top}%`,
                         left: `${s.left}%`,
                         width: `${s.size}px`,
                         height: `${s.size}px`,
                         animation: `twinkle 2.4s ease-in-out ${s.delay}s infinite`,
                       }}
                     />
                   ))}
                 </div>

                 {/* Central planet (Fabrick hub) */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[radial-gradient(circle_at_30%_30%,#facc15,#a16207_60%,#1f1200)] shadow-[0_0_40px_rgba(250,204,21,0.45)] flex items-center justify-center">
                   <div className="absolute inset-0 rounded-full border border-yellow-400/40 animate-[pulse-ring_2.5s_ease-out_infinite]" />
                   <span className="text-[9px] font-black uppercase tracking-[0.2em] text-black/80">Fabrick</span>
                 </div>

                 {/* Satellite nodes (destinations) */}
                 {[
                   { label: 'MP', angle: 0, color: '#38bdf8' },
                   { label: 'SSL', angle: 120, color: '#a78bfa' },
                   { label: 'Bank', angle: 240, color: '#34d399' },
                 ].map((n) => {
                   const rad = (n.angle * Math.PI) / 180;
                   const r = 130; // distance from center in px (inside 280/340)
                   const x = Math.cos(rad) * r;
                   const y = Math.sin(rad) * r;
                   return (
                     <div key={n.label}>
                       {/* Connection line */}
                       <svg
                         className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-visible"
                         width="2"
                         height="2"
                         aria-hidden
                       >
                         <line
                           x1={0}
                           y1={0}
                           x2={x}
                           y2={y}
                           stroke={n.color}
                           strokeWidth="1"
                           strokeDasharray="3 4"
                           opacity="0.45"
                         />
                       </svg>
                       {/* Rocket/data pulse travelling outwards */}
                       <span
                         className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full"
                         style={{
                           backgroundColor: n.color,
                           boxShadow: `0 0 10px ${n.color}`,
                           animation: `rocket-${n.label} 2.2s cubic-bezier(0.4,0,0.2,1) ${(n.angle / 360) * 1.2}s infinite`,
                           '--tx': `${x}px`,
                           '--ty': `${y}px`,
                         } as React.CSSProperties}
                       />
                       {/* Planet node */}
                       <div
                         className="absolute top-1/2 left-1/2 w-10 h-10 -ml-5 -mt-5 rounded-full flex items-center justify-center text-[8px] font-black uppercase tracking-widest text-white/90 border"
                         style={{
                           transform: `translate(${x}px, ${y}px)`,
                           backgroundColor: `${n.color}22`,
                           borderColor: `${n.color}66`,
                           boxShadow: `0 0 18px ${n.color}55`,
                         }}
                       >
                         {n.label}
                       </div>
                     </div>
                   );
                 })}
               </div>

               <div className="w-full space-y-4">
                 <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Asegurando Inversión</h2>

                 <div className="w-full h-[2px] bg-zinc-900 rounded-full overflow-hidden relative">
                   <div
                     className="absolute top-0 left-0 h-full bg-yellow-400 shadow-[0_0_10px_#FACC15] transition-all duration-[300ms] ease-out"
                     style={{ width: `${processProgress}%` }}
                   />
                 </div>

                 <p className="text-zinc-400 text-[10px] font-mono uppercase tracking-[0.25em]">
                   {processProgress < 30 && 'Validando orden en Fabrick…'}
                   {processProgress >= 30 && processProgress < 60 && 'Conectando con Mercado Pago…'}
                   {processProgress >= 60 && processProgress < 90 && 'Estableciendo túnel SSL…'}
                   {processProgress >= 90 && 'Verificando con red bancaria…'}
                 </p>
                 <p className="text-zinc-600 text-[9px] font-mono tracking-[0.35em]">
                   {processProgress}%
                 </p>
               </div>
            </div>
          ) : (
            <div className="w-full max-w-lg flex flex-col items-center text-center animate-in zoom-in-95 duration-1000 relative">
               <PremiumFireworks />
               
               <div className="relative mb-8 mt-4 z-10">
                 <div className="absolute inset-0 rounded-full border border-yellow-400 animate-[pulse-ring_2s_cubic-bezier(0.2,0,0.2,1)_infinite]" />
                 <div className="w-16 h-16 bg-yellow-400/10 border border-yellow-400/50 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(250,204,21,0.2)] backdrop-blur-md">
                   <Check className="w-8 h-8 text-yellow-400" strokeWidth={2} />
                 </div>
               </div>

               <div className="space-y-4 relative z-10">
                 <span className="text-emerald-400 font-bold tracking-[0.6em] text-[9px] uppercase drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">Transacción Verificada</span>
                 <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tighter leading-none">
                   Proyecto <br/><span className="text-yellow-400">Confirmado</span>
                 </h2>
                 {orderId && (
                   <p className="text-xs uppercase tracking-[0.35em] text-yellow-400/80">Orden: {orderId}</p>
                 )}
                   <p className="text-zinc-300 text-sm font-light pt-4 max-w-md mx-auto leading-relaxed">
                     Mercado Pago confirmó tu transacción y Fabrick ya recibió la orden. Nuestro equipo de ingeniería continuará el proceso y te contactará a la brevedad.
                   </p>
               </div>

               <div className="mt-12 bg-gradient-to-b from-zinc-900 to-black border border-white/10 rounded-[2rem] p-8 w-full relative z-10 shadow-2xl backdrop-blur-xl">
                 <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[1px] bg-gradient-to-r from-transparent via-yellow-400/60 to-transparent" />
                 
                 <div className="flex justify-between items-center mb-6 pb-6 border-b border-white/5">
                   <div className="text-left">
                     <div className="text-[8px] uppercase tracking-widest text-zinc-500 mb-2">Código de Expediente</div>
                       <div className="font-mono text-sm md:text-base text-white tracking-widest">{orderId ? `#${orderId}` : 'Pendiente de asignación'}</div>
                   </div>
                   <div className="text-right">
                     <div className="text-[8px] uppercase tracking-widest text-zinc-500 mb-2">Inversión Total</div>
                     <div className="font-black text-lg md:text-xl text-yellow-400">{formatCLP(cartTotal)}</div>
                   </div>
                 </div>
                 
                 <div className="text-center">
                   <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Recibirás la confirmación del pago en Mercado Pago y en tu correo electrónico.</p>
                 </div>
               </div>

               <button onClick={() => window.location.reload()} className="mt-10 px-12 py-5 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-full hover:bg-yellow-400 transition-all transform hover:scale-105 relative z-10 shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                 Volver al Inicio
               </button>

               {mpPaymentId && (
                 <a
                   href={`https://www.mercadopago.cl/activities/?searchQuery=${encodeURIComponent(mpPaymentId)}`}
                   target="_blank"
                   rel="noopener noreferrer"
                   className="mt-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-400/20 relative z-10"
                 >
                   Ver / cancelar en Mercado Pago ↗
                 </a>
               )}
            </div>
          )}
        </div>
      )}

      {/* NAVBAR MINIMALISTA */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-yellow-400">Soluciones Fabrick</span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-emerald-500" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-widest hidden sm:block">Pago seguro</span>
          </div>
          <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-yellow-400 transition-colors group">
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Volver
          </button>
        </div>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      {/*
        Layout responsivo del checkout:
        - Steps 1 y 2 (Verificación + Despacho): grid de 12 columnas con resumen
          sticky a la izquierda (col-span-5) y el formulario a la derecha (col-span-7).
        - Step 3 (Pago): se renderiza como una página independiente en una sola
          columna centrada (max-w-3xl, sin grid). El resumen no se monta para
          que cada paso se sienta como su propia "app" y el formulario ocupe
          todo el ancho disponible — desde pantallas muy estrechas hasta
          desktop — sin espacios muertos a los lados ni la tarjeta pegada
          a la derecha.
      */}
      <div
        className={`pt-28 sm:pt-32 px-4 sm:px-6 md:px-12 mx-auto ${
          step === 3
            ? 'max-w-3xl flex flex-col gap-8'
            : 'max-w-7xl grid lg:grid-cols-12 gap-8 sm:gap-12 lg:gap-20'
        }`}
      >
        
        {/* COLUMNA IZQUIERDA: RESUMEN DEL PRODUCTO (sólo en steps 1 y 2) */}
        {step !== 3 && (
        <div
          className="lg:col-span-5 animate-fade-up relative"
        >
          <div className="sticky top-32 space-y-8">
            
            <div className="bg-zinc-950 p-5 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-400/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-yellow-400/20 transition-all duration-700" />
              
              <div className="product-float relative z-10 mb-8">
                {cartItems.length > 1 ? (
                  /* Multi-item: stack thumbnails */
                  <div className="grid grid-cols-2 gap-3">
                    {cartItems.slice(0, 4).map((item) => (
                      <div key={item.product.id} className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-zinc-900">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white/20 text-xs font-bold">
                            {item.product.name[0]}
                          </div>
                        )}
                        {item.quantity > 1 && (
                          <span className="absolute bottom-1 right-1 bg-yellow-400 text-black text-[9px] font-black rounded-full px-1.5 py-0.5">
                            ×{item.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                    {cartItems.length > 4 && (
                      <div className="relative aspect-square rounded-2xl overflow-hidden border border-white/10 bg-zinc-900 flex items-center justify-center">
                        <span className="text-white/40 text-sm font-bold">+{cartItems.length - 4}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Single item: full-width hero image */
                  <div className="w-full h-64 rounded-[2rem] overflow-hidden border border-white/10 relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                    <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                    <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-full border border-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                      <Fingerprint className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 relative z-10">
                <span className="text-yellow-400 font-bold tracking-[0.4em] text-[9px] uppercase bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">
                  {cartItems.length > 1 ? `${cartItemCount} productos` : product.category}
                </span>
                {cartItems.length > 1 ? (
                  <div className="space-y-2 max-h-40 overflow-y-auto scrollbar-hide">
                    {cartItems.map((item) => (
                      <div key={item.product.id} className="flex justify-between items-center text-sm">
                        <span className="text-white/70 truncate max-w-[60%]">
                          {item.product.name}
                          {item.quantity > 1 && <span className="text-white/40 ml-1">×{item.quantity}</span>}
                        </span>
                        <span className="font-mono text-zinc-300 text-xs shrink-0">
                          {formatCLP(item.product.price * (1 - (item.product.discount_percentage || 0) / 100) * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mt-2">{product.name}</h2>
                )}
                
                <div className="py-4 space-y-3 border-b border-white/5">
                  <div className="flex items-center gap-3 text-zinc-400 text-xs font-light">
                    <Fingerprint size={14} className="text-yellow-400" /> Sensor Biométrico 3D (0.3s)
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-xs font-light">
                    <Wrench size={14} className="text-yellow-400" /> Aleación de Titanio Antivandalismo
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-xs font-light">
                    <Wifi size={14} className="text-yellow-400" /> Conexión WiFi & App Fabrick
                  </div>
                  <div className="flex items-center gap-3 text-zinc-400 text-xs font-light">
                    <Battery size={14} className="text-yellow-400" /> Batería Extendida de 12 Meses
                  </div>
                </div>
                
                <div className="pt-2 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Subtotal</span>
                    <span className="font-mono text-zinc-300">{formatCLP(cartTotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Logística Fabrick</span>
                    <span className="font-mono text-yellow-400">Bonificada</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/5">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Total Inversión</span>
                    <span className="font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">{formatCLP(cartTotal)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
        )}

        {/* COLUMNA DERECHA: FLUJO DE COMPRA */}
        <div
          className={`animate-fade-up ${
            step === 3 ? 'w-full' : 'lg:col-span-7'
          }`}
        >
          
          {/* Barra de Progreso Superior */}
          <div className="flex items-center justify-between mb-8 sm:mb-12 relative px-2 sm:px-0">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-[2px] bg-zinc-900 rounded-full -z-10" />
            
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${step >= 1 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-zinc-900 text-zinc-600'}`}>
                {step > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
              </div>
              <span className={`text-[9px] uppercase tracking-widest font-bold ${step >= 1 ? 'text-yellow-400' : 'text-zinc-600'}`}>Verificación</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${step >= 2 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-zinc-900 text-zinc-600'}`}>
                {step > 2 ? <CheckCircle2 className="w-5 h-5" /> : '2'}
              </div>
              <span className={`text-[9px] uppercase tracking-widest font-bold ${step >= 2 ? 'text-yellow-400' : 'text-zinc-600'}`}>Despacho</span>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xs transition-all duration-500 ${step === 3 ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.4)]' : 'bg-zinc-900 text-zinc-600'}`}>
                3
              </div>
              <span className={`text-[9px] uppercase tracking-widest font-bold ${step === 3 ? 'text-yellow-400' : 'text-zinc-600'}`}>Pago Seguro</span>
            </div>
          </div>

          <div ref={stepContentRef} className="bg-zinc-950 p-5 sm:p-8 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-white/5 shadow-2xl">
            
            {step === 1 && (
              <div className="space-y-8">
                <div>
                  <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Revisión de <span className="text-yellow-400">Orden</span></h3>
                  <p className="text-zinc-400 text-sm font-light leading-relaxed">Verifique los detalles del producto de grado arquitectónico seleccionado antes de coordinar la logística de entrega.</p>
                </div>
                <div className="bg-black rounded-3xl p-6 border border-white/5 flex gap-6 items-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-900 flex items-center justify-center border border-white/10">
                    <ShieldCheck className="w-8 h-8 text-yellow-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-white">Cobertura Fabrick Activada</h4>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-widest mt-1">Este producto incluye seguro de traslado e instalación opcional.</p>
                  </div>
                </div>
                <div className="pt-6">
                  <button onClick={() => changeStep(2)} className="w-full py-6 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.3em] rounded-full hover:bg-white transition-all transform active:scale-95 flex justify-center items-center gap-3 shadow-[0_15px_40px_rgba(250,204,21,0.2)]">
                    Continuar al Despacho <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-8">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-3xl font-black uppercase tracking-tighter mb-2">Coordenadas de <span className="text-yellow-400">Entrega</span></h3>
                    <p className="text-zinc-400 text-sm font-light leading-relaxed">Ingrese la ubicación exacta para nuestra flota logística directa.</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-400/10 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>

                <div className="bg-black/50 border border-white/10 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.25em] text-zinc-300 font-bold">Conexión satelital libre</p>
                    <p className="text-xs text-zinc-500 mt-1">Usamos GPS del dispositivo + OpenStreetMap para sugerir dirección.</p>
                  </div>
                  <button
                    type="button"
                    onClick={requestSatelliteAutofill}
                    disabled={locationLoading}
                    className="px-5 py-3 rounded-full border border-yellow-400/40 text-yellow-400 text-[10px] font-bold uppercase tracking-widest hover:bg-yellow-400/10 disabled:opacity-50"
                  >
                    {locationLoading ? 'Detectando...' : 'Autorrelleno satelital'}
                  </button>
                </div>
                {locationError && <p className="text-xs text-red-400">{locationError}</p>}

                {locationLoading && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center gap-2 text-[10px] text-yellow-400 uppercase tracking-widest font-black">
                      <div className="flex gap-0.5 items-end">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 bg-yellow-400 rounded-full"
                            style={{
                              height: `${8 + (i % 4) * 4}px`,
                              animation: `bb-bar 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
                              opacity: 0.3 + (i % 4) * 0.2,
                            }}
                          />
                        ))}
                      </div>
                      <span>Localizando...</span>
                    </div>
                    <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{
                        width: '100%',
                        background: 'repeating-linear-gradient(90deg, #facc15 0%, #facc15 80%, transparent 80%, transparent 100%)',
                        backgroundSize: '16px 100%',
                        animation: 'bb-progress 0.3s linear infinite',
                      }} />
                    </div>
                    <p className="text-[9px] text-zinc-500">Obteniendo datos de ubicación desde satélite...</p>
                  </div>
                )}

                {locationSuggestion && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-yellow-400/10 border border-yellow-400/30 rounded-2xl px-5 py-4 text-sm">
                    <span className="flex-1 text-zinc-200 text-xs leading-relaxed">
                      📍 <span className="font-bold text-yellow-400">Detectamos:</span> {locationSuggestion.address}. ¿Usar esta dirección?
                    </span>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        type="button"
                        className="px-4 py-2 bg-yellow-400 text-black text-[10px] font-black uppercase tracking-widest rounded-full hover:bg-white transition-colors"
                        onClick={() => {
                          if (locationSuggestion.address) setShippingAddress(locationSuggestion.address);
                          if (locationSuggestion.region) setShippingRegion(locationSuggestion.region);
                          setLocationSuggestion(null);
                        }}
                      >
                        Aceptar
                      </button>
                      <button
                        type="button"
                        className="px-4 py-2 border border-white/20 text-zinc-400 text-[10px] font-bold uppercase tracking-widest rounded-full hover:border-white/40 transition-colors"
                        onClick={() => setLocationSuggestion(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <input type="text" value={shippingName} onChange={(e) => setShippingName(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Nombre Contacto" />
                    <input type="email" value={shippingEmail} onChange={(e) => setShippingEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Email Contacto" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <input type="tel" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Teléfono Móvil" />
                    <div className="hidden md:block" />
                  </div>
                  <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Calle / Dirección (ej: Av. Apoquindo 4700)" />
                  <div className="grid md:grid-cols-2 gap-6">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={shippingHouseNumber}
                      onChange={(e) => setShippingHouseNumber(e.target.value)}
                      className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors"
                      placeholder="Número de casa / depto (ej: 123, Dpto 402)"
                    />
                    <input type="text" value={shippingRegion} onChange={(e) => setShippingRegion(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Región / Estado" />
                  </div>
                  {checkoutError && <p className="text-xs text-red-400">{checkoutError}</p>}
                  <div className="pt-8 flex gap-4">
                    <button onClick={() => changeStep(1)} type="button" className="px-8 py-5 border border-white/20 rounded-full bg-black text-white font-bold text-xs uppercase hover:border-yellow-400 transition-colors">Volver</button>
                    <button onClick={() => changeStep(3)} type="button" className="flex-1 py-5 bg-yellow-400 text-black font-black uppercase text-xs rounded-full shadow-[0_15px_40px_rgba(250,204,21,0.2)] hover:bg-white transition-colors">Continuar al Pago</button>
                  </div>
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-fade-up">
                
                {/* SECURE CONNECTION — Fabrick ↔ Mercado Pago ↔ Banco
                    Driven by /api/payments/mp-status: every node colour and
                    the line-fill levels reflect the most recent live probe of
                    api.mercadopago.com, not a fake clock. */}
                {(() => {
                  const mpReachable = mpStatus.reachable;
                  const mpOk = mpStatus.status === 'ok';
                  const mpFailed =
                    mpStatus.status === 'unreachable' ||
                    mpStatus.status === 'unconfigured' ||
                    mpStatus.status === 'invalid_token';
                  const fabrickActive = secureConnectionProgress > 5;
                  const mpActive = mpReachable;
                  const bankActive = mpOk;
                  const headerColour = mpOk
                    ? 'text-emerald-400 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]'
                    : mpFailed
                      ? 'text-red-400 animate-pulse'
                      : 'text-yellow-400 animate-pulse';
                  const headerLabel = mpOk
                    ? `✓ Conexión activa con Mercado Pago${mpStatus.latencyMs != null ? ` · ${mpStatus.latencyMs} ms` : ''}`
                    : mpStatus.status === 'invalid_token'
                      ? '⚠ Token de Mercado Pago inválido — revisa la configuración'
                      : mpStatus.status === 'unreachable'
                        ? '⚠ Mercado Pago no responde — reintentando…'
                        : mpStatus.status === 'unconfigured'
                          ? '⚠ Pasarela no configurada — paga por transferencia'
                          : `Conectando con la red bancaria · ${secureConnectionProgress}%`;
                  // Live colours for the line-fills.
                  const line1Colour = mpFailed && !mpReachable ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.7)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';
                  const line2Colour = mpOk ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]' : mpFailed ? 'bg-red-500/60' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.7)]';
                  return (
                    <div
                      className="bg-black/60 border border-white/5 rounded-[2rem] p-5 relative overflow-hidden"
                      role="status"
                      aria-live="polite"
                      aria-label={mpStatus.message || 'Estado de la pasarela de pago'}
                    >
                      <div
                        className={`absolute top-0 left-0 w-full h-full transition-colors duration-500 ${mpOk ? 'bg-emerald-500/[0.04]' : mpFailed ? 'bg-red-500/[0.05]' : 'bg-emerald-500/[0.04]'}`}
                      />

                      {/* Three nodes with connection lines */}
                      <div className="relative z-10 grid grid-cols-[auto_1fr_auto_1fr_auto] items-center gap-2">
                        {/* Fabrick node — always green once the probe started */}
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors duration-300 ${fabrickActive ? 'border-yellow-400/60 bg-yellow-400/10 shadow-[0_0_12px_rgba(250,204,21,0.35)]' : 'border-white/10 bg-white/5'}`}>
                            <ShieldCheck className={`w-4 h-4 ${fabrickActive ? 'text-yellow-400' : 'text-zinc-500'}`} />
                          </div>
                          <span className="text-[8px] uppercase tracking-widest font-bold text-yellow-400">Fabrick</span>
                        </div>

                        {/* Line 1: Fabrick → MP */}
                        <div className="relative h-[2px] bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full transition-all duration-[150ms] ease-out ${line1Colour}`}
                            style={{ width: `${Math.min(100, (secureConnectionProgress / 50) * 100)}%` }}
                          />
                          {!mpFailed && secureConnectionProgress > 5 && secureConnectionProgress < 100 && (
                            <span
                              className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-emerald-400"
                              style={{
                                boxShadow: '0 0 10px #34d399',
                                animation: 'bb-progress 1.2s linear infinite',
                                left: '0%',
                                transform: 'translate(0, -50%)',
                                backgroundImage: 'none',
                              }}
                            />
                          )}
                        </div>

                        {/* MP node — green when reachable, red when probe failed */}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors duration-300 ${
                              mpActive
                                ? 'border-[#009EE3]/60 bg-[#009EE3]/10 shadow-[0_0_12px_rgba(0,158,227,0.35)]'
                                : mpFailed
                                  ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse'
                                  : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <svg viewBox="0 0 32 32" className="w-4 h-4" aria-hidden>
                              <circle cx="16" cy="16" r="13" fill={mpActive ? '#009EE3' : mpFailed ? '#ef4444' : 'rgba(255,255,255,0.1)'} />
                              <path d="M10 17 Q14 13 16 15 T22 17" stroke="#FFE600" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                            </svg>
                          </div>
                          <span
                            className={`text-[8px] uppercase tracking-widest font-bold ${
                              mpActive ? 'text-[#38bdf8]' : mpFailed ? 'text-red-400' : 'text-zinc-500'
                            }`}
                          >
                            Mercado Pago
                          </span>
                        </div>

                        {/* Line 2: MP → Banco */}
                        <div className="relative h-[2px] bg-zinc-900 rounded-full overflow-hidden">
                          <div
                            className={`absolute top-0 left-0 h-full transition-all duration-[150ms] ease-out ${line2Colour}`}
                            style={{ width: `${Math.max(0, ((secureConnectionProgress - 50) / 50) * 100)}%` }}
                          />
                        </div>

                        {/* Bank node — green only when MP token is fully validated */}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`w-9 h-9 rounded-full flex items-center justify-center border transition-colors duration-300 ${
                              bankActive
                                ? 'border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
                                : mpStatus.status === 'invalid_token'
                                  ? 'border-red-500/60 bg-red-500/10 shadow-[0_0_12px_rgba(239,68,68,0.35)] animate-pulse'
                                  : 'border-white/10 bg-white/5'
                            }`}
                          >
                            <Building2 className={`w-4 h-4 ${bankActive ? 'text-emerald-400' : mpStatus.status === 'invalid_token' ? 'text-red-400' : 'text-zinc-500'}`} />
                          </div>
                          <span className={`text-[8px] uppercase tracking-widest font-bold ${bankActive ? 'text-emerald-400' : mpStatus.status === 'invalid_token' ? 'text-red-400' : 'text-zinc-500'}`}>Banco</span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-center gap-2 relative z-10">
                        <Lock className={`w-3 h-3 ${mpOk ? 'text-emerald-400' : mpFailed ? 'text-red-400' : 'text-yellow-400'}`} />
                        <span className={`text-[9px] font-mono tracking-[0.2em] uppercase transition-colors duration-300 ${headerColour}`}>
                          {headerLabel}
                        </span>
                        {mpStatus.mode === 'sandbox' && (
                          <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-amber-300 ring-1 ring-amber-400/50">
                            Demo
                          </span>
                        )}
                      </div>

                      {mpFailed && mpStatus.message && (
                        <p className="mt-2 text-[10px] text-red-300/80 text-center relative z-10 px-4 leading-relaxed">
                          {mpStatus.message}
                        </p>
                      )}
                    </div>
                  );
                })()}

                <div>
                  <span className="text-yellow-400 font-bold tracking-[0.4em] text-[9px] uppercase">Paso Final</span>
                  <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2 mt-1">
                    Método de <span className="text-yellow-400">Pago</span>
                  </h3>
                  <p className="text-zinc-400 text-sm">Elige cómo deseas completar tu compra.</p>
                </div>

                {checkoutCms.warrantyPolicies?.length > 0 && (
                  <div className="grid sm:grid-cols-3 gap-3" data-cms="checkout-warranties">
                    {checkoutCms.warrantyPolicies.map((policy, i) => (
                      <div
                        key={`${policy.title}-${i}`}
                        className="rounded-2xl border border-yellow-400/15 bg-yellow-400/[0.04] p-4"
                      >
                        <p className="text-[9px] uppercase tracking-[0.3em] text-yellow-400 font-bold mb-1">
                          {policy.title}
                        </p>
                        <p className="text-zinc-300 text-xs leading-relaxed">{policy.body}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* PAYMENT METHOD SELECTOR */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('mercadopago')}
                    className={`rounded-2xl border p-5 text-left transition-all ${paymentMethod === 'mercadopago' ? 'border-yellow-400/50 bg-yellow-400/8' : 'border-white/8 bg-black/30 hover:border-white/15'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === 'mercadopago' ? 'bg-yellow-400/20' : 'bg-white/5'}`}>
                        <CreditCard className={`w-4 h-4 ${paymentMethod === 'mercadopago' ? 'text-yellow-400' : 'text-zinc-400'}`} />
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-auto ${paymentMethod === 'mercadopago' ? 'border-yellow-400 bg-yellow-400' : 'border-zinc-600'}`}>
                        {paymentMethod === 'mercadopago' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${paymentMethod === 'mercadopago' ? 'text-yellow-400' : 'text-white'}`}>Mercado Pago</p>
                    <p className="text-zinc-500 text-[10px] mt-1">Tarjeta, débito, transferencia. Flujo seguro externo.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setPaymentMethod('transfer'); setTransferOrderReady(false); setTransferOrderId(''); }}
                    className={`rounded-2xl border p-5 text-left transition-all ${paymentMethod === 'transfer' ? 'border-yellow-400/50 bg-yellow-400/8' : 'border-white/8 bg-black/30 hover:border-white/15'}`}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${paymentMethod === 'transfer' ? 'bg-yellow-400/20' : 'bg-white/5'}`}>
                        <Building2 className={`w-4 h-4 ${paymentMethod === 'transfer' ? 'text-yellow-400' : 'text-zinc-400'}`} />
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ml-auto ${paymentMethod === 'transfer' ? 'border-yellow-400 bg-yellow-400' : 'border-zinc-600'}`}>
                        {paymentMethod === 'transfer' && <div className="w-1.5 h-1.5 rounded-full bg-black" />}
                      </div>
                    </div>
                    <p className={`font-bold text-sm ${paymentMethod === 'transfer' ? 'text-yellow-400' : 'text-white'}`}>Transferencia Bancaria</p>
                    <p className="text-zinc-500 text-[10px] mt-1">Deposita directamente en nuestra cuenta. Sin comisiones.</p>
                  </button>
                </div>

                {/* MERCADO PAGO PANEL — Inline paginated card form + 3D flip preview */}
                {paymentMethod === 'mercadopago' && (
                  <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-[1.75rem] sm:rounded-[2rem] p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
                    {/* Header with MP logo */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {/* Mercado Pago logo (inline SVG) */}
                        <div className="flex items-center gap-2 rounded-xl bg-[#009EE3] px-3 py-2 shadow-[0_4px_14px_rgba(0,158,227,0.35)]">
                          <svg viewBox="0 0 48 32" className="h-5 w-auto" aria-label="Mercado Pago">
                            <ellipse cx="24" cy="16" rx="22" ry="11" fill="#FFF" />
                            <ellipse cx="24" cy="16" rx="15" ry="7" fill="#FFE600" />
                            <path
                              d="M14 16 Q20 11 24 14 T34 16"
                              stroke="#009EE3"
                              strokeWidth="1.8"
                              fill="none"
                              strokeLinecap="round"
                            />
                            <circle cx="24" cy="16" r="1.8" fill="#009EE3" />
                          </svg>
                          <span className="text-[10px] font-black uppercase tracking-widest text-white">Mercado Pago</span>
                        </div>
                        <div>
                          <p className="text-[9px] uppercase tracking-[0.35em] text-yellow-400 font-bold">Pago seguro</p>
                          <h4 className="text-base md:text-lg font-black uppercase tracking-tighter">Datos de tu tarjeta</h4>
                        </div>
                      </div>
                      <div className="hidden sm:flex w-10 h-10 rounded-full border border-yellow-400/30 bg-yellow-400/10 items-center justify-center flex-shrink-0">
                        <Lock className="w-4 h-4 text-yellow-400" />
                      </div>
                    </div>

                    {/* 3D flip card preview */}
                    <div className="flex justify-center" style={{ perspective: '1000px' }}>
                      <div
                        className="relative w-full max-w-[360px] transition-transform duration-700"
                        style={{
                          aspectRatio: '1.586 / 1',
                          transformStyle: 'preserve-3d',
                          transform: cardFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                        }}
                      >
                        {/* FRONT */}
                        <div
                          className="absolute inset-0 rounded-2xl border border-yellow-400/20"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            background: 'linear-gradient(135deg, #1e1e2e 0%, #12122a 45%, #0a0a18 100%)',
                            boxShadow: '0 0 0 1px rgba(250,204,21,0.12), 0 24px 64px rgba(0,0,0,0.85)',
                          }}
                        >
                          <div className="absolute inset-0 opacity-40 mix-blend-overlay"
                            style={{ backgroundImage: 'radial-gradient(circle at 20% 10%, rgba(250,204,21,0.35), transparent 60%)' }} />
                          <div className="absolute top-0 left-[-30%] w-1/3 h-full bg-white/10 pointer-events-none"
                            style={{ animation: 'card-shine 4s ease-in-out infinite' }} />
                          <div className="relative p-5 h-full flex flex-col justify-between">
                            <div className="flex items-start justify-between">
                              <div className="flex flex-col">
                                <span className="text-[9px] uppercase tracking-[0.3em] text-white/50">Soluciones Fabrick</span>
                                <span className="text-[8px] text-white/30 font-mono mt-1">via Mercado Pago</span>
                              </div>
                              {/* Brand logo */}
                              <div className="h-7 flex items-center">
                                {cardBrand === 'visa' && (
                                  <span className="text-white font-black italic text-xl tracking-tight drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]">VISA</span>
                                )}
                                {cardBrand === 'mastercard' && (
                                  <div className="relative w-10 h-7">
                                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#EB001B]" />
                                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#F79E1B] mix-blend-screen" />
                                  </div>
                                )}
                                {cardBrand === 'amex' && (
                                  <span className="bg-[#2E77BB] px-1.5 py-0.5 text-[10px] font-black italic text-white rounded-sm">AMEX</span>
                                )}
                                {cardBrand === 'diners' && (
                                  <span className="text-white text-[10px] font-black italic">DINERS</span>
                                )}
                                {cardBrand === 'unknown' && (
                                  <CreditCard className="w-6 h-6 text-white/40" />
                                )}
                              </div>
                            </div>

                            {/* Chip */}
                            <div className="w-11 h-8 rounded-md bg-[linear-gradient(135deg,#d4af37,#8b6914)] border border-yellow-200/30 shadow-inner" />

                            {/* Number */}
                            <div className="font-mono text-white text-lg sm:text-xl tracking-[0.18em] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                              {maskCardNumber(rawCardDigits)}
                            </div>

                            {/* Holder + expiry */}
                            <div className="flex items-end justify-between gap-4">
                              <div className="min-w-0">
                                <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Titular</p>
                                <p className="text-white text-[11px] font-semibold uppercase tracking-wider truncate">
                                  {cardName || 'NOMBRE APELLIDO'}
                                </p>
                              </div>
                              <div className="flex-shrink-0 text-right">
                                <p className="text-[8px] uppercase tracking-widest text-white/40 mb-1">Vence</p>
                                <p className="text-white text-[11px] font-mono">{cardExpiry || 'MM/AA'}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* BACK */}
                        <div
                          className="absolute inset-0 rounded-2xl border border-yellow-400/10"
                          style={{
                            backfaceVisibility: 'hidden',
                            WebkitBackfaceVisibility: 'hidden',
                            transform: 'rotateY(180deg)',
                            background: 'linear-gradient(135deg, #1e1e2e 0%, #12122a 45%, #0a0a18 100%)',
                            boxShadow: '0 0 0 1px rgba(250,204,21,0.08), 0 24px 64px rgba(0,0,0,0.85)',
                          }}
                        >
                          <div className="mt-5 h-9 w-full bg-black/70" />
                          <div className="px-5 mt-5">
                            <div className="h-8 rounded bg-white/10 border border-white/10 flex items-center justify-end pr-3">
                              <span className="text-white font-mono tracking-widest">{cardCVC || '•••'}</span>
                            </div>
                            <p className="mt-2 text-[9px] uppercase tracking-widest text-white/40 text-right">CVC / CVV</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Amount summary */}
                    <div className="flex items-center justify-between rounded-2xl border border-yellow-400/15 bg-yellow-400/5 px-5 py-4">
                      <span className="text-zinc-400 text-sm uppercase tracking-widest">Total a pagar</span>
                      <span className="text-yellow-400 font-black text-xl">{formatCLP(cartTotal)}</span>
                    </div>

                    {/* Sub-step indicator */}
                    <div className="flex items-center justify-center gap-2">
                      {[1, 2, 3].map((s) => (
                        <div
                          key={s}
                          className={`h-1 rounded-full transition-all ${
                            mpSubStep === s
                              ? 'w-8 bg-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                              : mpSubStep > s
                              ? 'w-4 bg-yellow-400/60'
                              : 'w-4 bg-white/10'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Paginated form — horizontal sweep between sub-steps */}
                    <div className="overflow-hidden -mx-1">
                      <div
                        className="flex transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                        style={{ transform: `translateX(-${(mpSubStep - 1) * 100}%)` }}
                      >
                        <div
                          className={`w-full flex-shrink-0 px-1 ${mpSubStep === 1 ? '' : 'pointer-events-none'}`}
                          aria-hidden={mpSubStep !== 1}
                        >
                          <div className="space-y-4">
                            <label className="block">
                              <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Número de tarjeta</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                autoComplete="cc-number"
                                aria-label="Número de tarjeta"
                                value={cardNumber}
                                onFocus={() => setCardFlipped(false)}
                                onChange={(e) => setCardNumber(formatCardInput(e.target.value))}
                                placeholder="1234 5678 9012 3456"
                                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-mono tracking-widest focus:border-yellow-400 focus:outline-none transition-colors"
                              />
                              <span className="block text-[9px] text-zinc-500 mt-2 uppercase tracking-widest">
                                {cardBrand !== 'unknown' ? `Detectado: ${cardBrand}` : 'Aceptamos cualquier tarjeta de crédito o débito (Visa, Mastercard, Amex, Diners, Maestro…)'}
                              </span>
                            </label>
                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                disabled={!isCardNumberValid}
                                onClick={() => setMpSubStep(2)}
                                className="flex-1 py-4 bg-yellow-400 text-black font-black uppercase text-[11px] tracking-[0.25em] rounded-full hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Continuar
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-full flex-shrink-0 px-1 ${mpSubStep === 2 ? '' : 'pointer-events-none'}`}
                          aria-hidden={mpSubStep !== 2}
                        >
                          <div className="space-y-4">
                            <label className="block">
                              <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Titular (como aparece en la tarjeta)</span>
                              <input
                                type="text"
                                autoComplete="cc-name"
                                aria-label="Titular de la tarjeta"
                                value={cardName}
                                onFocus={() => setCardFlipped(false)}
                                onChange={(e) => setCardName(e.target.value.toUpperCase())}
                                placeholder="NOMBRE APELLIDO"
                                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white uppercase tracking-wider focus:border-yellow-400 focus:outline-none transition-colors"
                              />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                              <label className="block">
                                <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">Vence (MM/AA)</span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="cc-exp"
                                  aria-label="Fecha de expiración"
                                  value={cardExpiry}
                                  onFocus={() => setCardFlipped(false)}
                                  onChange={(e) => setCardExpiry(formatExpiryInput(e.target.value))}
                                  placeholder="MM/AA"
                                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:border-yellow-400 focus:outline-none transition-colors"
                                />
                              </label>
                              <label className="block">
                                <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                                  {cardBrand === 'amex' ? 'CID (4 dígitos)' : 'CVC (3 dígitos)'}
                                </span>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="cc-csc"
                                  aria-label={cardBrand === 'amex' ? 'Código de seguridad CID' : 'Código de seguridad CVC'}
                                  value={cardCVC}
                                  onFocus={() => setCardFlipped(true)}
                                  onBlur={() => setCardFlipped(false)}
                                  onChange={(e) =>
                                    setCardCVC(e.target.value.replace(/\D/g, '').slice(0, cardBrand === 'amex' ? 4 : 3))
                                  }
                                  placeholder={cardBrand === 'amex' ? '••••' : '•••'}
                                  className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-mono focus:border-yellow-400 focus:outline-none transition-colors"
                                />
                              </label>
                            </div>
                            <label className="block">
                              <span className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
                                RUT del titular
                              </span>
                              <input
                                type="text"
                                inputMode="text"
                                autoComplete="off"
                                aria-label="RUT del titular de la tarjeta"
                                value={cardRut}
                                onChange={(e) => setCardRut(formatRutInput(e.target.value))}
                                placeholder="12345678-9"
                                className="w-full bg-black border border-white/10 rounded-2xl px-5 py-4 text-sm text-white font-mono tracking-wider focus:border-yellow-400 focus:outline-none transition-colors"
                              />
                              <span className="block text-[9px] text-zinc-500 mt-2 uppercase tracking-widest">
                                {cardRut && !isRutValid
                                  ? 'RUT inválido — revisa el dígito verificador'
                                  : 'Requerido por Mercado Pago para validar la tarjeta'}
                              </span>
                            </label>
                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setMpSubStep(1)}
                                className="px-6 py-4 border border-white/15 rounded-full text-white text-[11px] font-bold uppercase tracking-widest hover:border-yellow-400 transition-colors"
                              >
                                <ArrowLeft className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                disabled={!isHolderValid || !isExpiryValid || !isCvcValid || !isRutValid}
                                onClick={() => { setCardFlipped(false); setMpSubStep(3); }}
                                className="flex-1 py-4 bg-yellow-400 text-black font-black uppercase text-[11px] tracking-[0.25em] rounded-full hover:bg-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Revisar y pagar
                              </button>
                            </div>
                          </div>
                        </div>

                        <div
                          className={`w-full flex-shrink-0 px-1 ${mpSubStep === 3 ? '' : 'pointer-events-none'}`}
                          aria-hidden={mpSubStep !== 3}
                        >
                          <div className="space-y-4">
                            <div className="grid sm:grid-cols-2 gap-3 text-xs">
                              <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Proveedor</div>
                                <div className="text-white font-bold">Mercado Pago</div>
                              </div>
                              <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-4">
                                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Monto total</div>
                                <div className="text-yellow-400 font-bold text-base">{formatCLP(cartTotal)}</div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Tarjeta</div>
                                <div className="text-white font-mono text-[13px]">
                                  •••• {rawCardDigits.slice(-4) || '••••'}
                                </div>
                              </div>
                              <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                                <div className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Titular</div>
                                <div className="text-white text-[11px] uppercase truncate">{cardName || '—'}</div>
                              </div>
                            </div>
                            <p className="text-[10px] text-zinc-500 leading-relaxed flex items-start gap-2">
                              <Lock className="w-3 h-3 mt-0.5 flex-shrink-0 text-yellow-400" />
                              Tus datos se envían cifrados directamente a Mercado Pago. Fabrick no almacena el número de tu tarjeta.
                            </p>
                            <div className="flex gap-3 pt-2">
                              <button
                                type="button"
                                onClick={() => setMpSubStep(2)}
                                className="px-6 py-4 border border-white/15 rounded-full text-white text-[11px] font-bold uppercase tracking-widest hover:border-yellow-400 transition-colors"
                              >
                                <ArrowLeft className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* MERCADO PAGO CHECKOUT PRO — universal fallback that
                    accepts every brand & method MP supports (credit + debit
                    Visa/Mastercard, Amex, Diners, Magna, Maestro, RedCompra,
                    Webpay, transferencia…). Redirects to MP's hosted page,
                    then comes back to /checkout?payment_status=… */}
                {paymentMethod === 'mercadopago' && (
                  <div className="rounded-[1.75rem] sm:rounded-[2rem] border border-yellow-400/15 bg-yellow-400/[0.04] p-5 sm:p-6 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-yellow-400/15 flex items-center justify-center flex-shrink-0">
                        <ExternalLink className="w-4 h-4 text-yellow-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] uppercase tracking-[0.35em] text-yellow-400 font-bold">
                          ¿Tu tarjeta no fue aceptada?
                        </p>
                        <h4 className="text-sm sm:text-base font-black uppercase tracking-tight mt-1">
                          Paga directo en Mercado Pago
                        </h4>
                        <p className="text-zinc-400 text-[11px] mt-1 leading-relaxed">
                          Acepta cualquier tarjeta de crédito o débito (Visa, Mastercard, Amex,
                          Diners, Maestro, RedCompra), Webpay y transferencia. Te redirigimos a
                          la página segura de Mercado Pago.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handlePayWithCheckoutPro()}
                      disabled={hostedRedirecting}
                      className="w-full py-4 rounded-full border border-yellow-400/40 text-yellow-300 font-bold text-[11px] uppercase tracking-[0.25em] hover:bg-yellow-400/10 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hostedRedirecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" /> Redirigiendo…
                        </>
                      ) : (
                        <>
                          <ExternalLink className="w-4 h-4" /> Pagar en Mercado Pago — todas las tarjetas
                        </>
                      )}
                    </button>
                  </div>
                )}
                {paymentMethod === 'transfer' && (
                  <div className="space-y-5">
                    {!transferOrderReady ? (
                      <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-[2rem] p-8 space-y-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center">
                            <Building2 className="w-5 h-5 text-yellow-400" />
                          </div>
                          <div>
                            <p className="text-[9px] uppercase tracking-[0.35em] text-yellow-400 font-bold">Transferencia Bancaria</p>
                            <h4 className="text-xl font-black uppercase tracking-tighter">Datos de Pago Directo</h4>
                          </div>
                        </div>
                        <p className="text-sm text-zinc-300 leading-relaxed">
                          Genera tu orden para obtener el número de referencia y los datos bancarios. La orden queda registrada en nuestro sistema en tiempo real.
                        </p>
                        <div className="rounded-2xl border border-white/8 bg-black/40 p-5 space-y-3">
                          <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-4">Vista previa de datos bancarios</p>
                          {[
                            { label: 'Banco', value: BANK_INFO.bank },
                            { label: 'Titular', value: BANK_INFO.holder },
                            { label: 'Tipo de Cuenta', value: BANK_INFO.type },
                            { label: 'Monto', value: formatCLP(transferOrderTotal || cartTotal) },
                          ].map((row) => (
                            <div key={row.label} className="flex justify-between text-sm">
                              <span className="text-zinc-500">{row.label}</span>
                              <span className={row.label === 'Monto' ? 'text-yellow-400 font-bold' : 'text-white font-medium'}>{row.value}</span>
                            </div>
                          ))}
                        </div>
                        {checkoutError && <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-xl">{checkoutError}</p>}
                      </div>
                    ) : (
                      /* TRANSFER ORDER READY */
                      <div className="space-y-5">
                        <div className={`rounded-2xl border p-4 flex items-center gap-3 ${
                          ['confirmado','en_preparacion','enviado','entregado'].includes(transferOrderStatus)
                            ? 'border-emerald-500/30 bg-emerald-500/8'
                            : 'border-yellow-400/20 bg-yellow-400/5'
                        }`}>
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 animate-pulse ${['confirmado','entregado'].includes(transferOrderStatus) ? 'bg-emerald-400' : 'bg-yellow-400'}`} />
                          <div className="flex-1">
                            <p className="text-white text-sm font-semibold">
                              {['pendiente_transferencia','pendiente'].includes(transferOrderStatus)
                                ? '⏳ En espera de tu transferencia'
                                : transferOrderStatus === 'confirmado' ? '✓ Pago confirmado'
                                : `Estado: ${transferOrderStatus}`}
                            </p>
                            <p className="text-zinc-500 text-[10px]">Actualizando en tiempo real · Orden #{transferOrderId}</p>
                          </div>
                          {transferOrderStatus === 'confirmado' && <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />}
                        </div>

                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="rounded-2xl border border-white/10 bg-black/50 p-5">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">N° de Orden (Referencia)</p>
                            <p className="text-white font-mono font-bold text-sm break-all">{transferOrderId}</p>
                          </div>
                          <div className="rounded-2xl border border-yellow-400/15 bg-yellow-400/5 p-5">
                            <p className="text-[9px] uppercase tracking-widest text-zinc-500 mb-2">Monto a Transferir</p>
                            <p className="text-yellow-400 font-black text-xl">{formatCLP(transferOrderTotal || cartTotal)}</p>
                          </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/8 bg-black/40 p-6 space-y-4">
                          <div className="flex items-center gap-2 mb-5">
                            <Building2 className="w-4 h-4 text-yellow-400" />
                            <p className="text-[9px] uppercase tracking-[0.35em] text-yellow-400/80 font-bold">Datos Bancarios para Transferencia</p>
                          </div>
                          <CopyField label="Banco" value={BANK_INFO.bank} />
                          <CopyField label="Titular / Empresa" value={BANK_INFO.holder} />
                          <CopyField label="RUT Empresa" value={BANK_INFO.rut} />
                          <CopyField label="Tipo de Cuenta" value={BANK_INFO.type} />
                          <CopyField label="N° de Cuenta" value={BANK_INFO.number} />
                          <CopyField label="Email para Comprobante" value={BANK_INFO.email} />
                          <CopyField label="Monto exacto" value={formatCLP(transferOrderTotal || cartTotal)} />
                          <CopyField label="Referencia / Glosa" value={transferOrderId} />
                        </div>

                        <div className="rounded-2xl border border-blue-500/20 bg-blue-500/8 p-4">
                          <p className="text-blue-300 text-xs leading-relaxed">
                            <strong>Instrucciones:</strong> Transfiere el monto exacto. En <em>comentario o glosa</em> incluye el <strong>N° de Orden</strong>. Envía el comprobante a <strong>{BANK_INFO.email}</strong>. Tu pedido será confirmado en máximo 24 horas hábiles.
                          </p>
                        </div>

                        <a
                          href={`mailto:${BANK_INFO.email}?subject=Comprobante%20${transferOrderId}&body=Adjunto%20comprobante%20de%20transferencia%20para%20la%20orden%20${transferOrderId}.`}
                          className="flex items-center justify-center gap-2 w-full py-4 rounded-full border border-yellow-400/25 text-yellow-400 font-bold text-[10px] uppercase tracking-widest hover:bg-yellow-400/10 transition-all"
                        >
                          <ExternalLink size={13} /> Enviar Comprobante por Email
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div className="pt-6 flex gap-4">
                  <button onClick={() => changeStep(2)} type="button" className="px-6 py-5 border border-white/20 rounded-full bg-black hover:border-yellow-400 transition-colors text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  {paymentMethod === 'mercadopago' && (
                    <button
                      disabled={hostedRedirecting || isProcessing}
                      onClick={() => void handlePayWithCheckoutPro()}
                      type="button"
                      className="flex-1 py-5 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.3em] rounded-full hover:bg-white transition-all flex justify-center items-center gap-3 shadow-[0_15px_40px_rgba(250,204,21,0.3)] disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {hostedRedirecting
                        ? <><RefreshCw className="w-4 h-4 animate-spin" /> Redirigiendo…</>
                        : <><Lock className="w-4 h-4" /> Pagar {formatCLP(cartTotal)}</>
                      }
                    </button>
                  )}
                  {paymentMethod === 'transfer' && !transferOrderReady && (
                    <button disabled={transferOrderCreating} onClick={() => void handleTransferOrder()} type="button" className="flex-1 py-5 bg-yellow-400 text-black font-black uppercase text-xs tracking-[0.3em] rounded-full hover:bg-white transition-all flex justify-center items-center gap-3 disabled:opacity-60">
                      {transferOrderCreating ? <><RefreshCw className="w-4 h-4 animate-spin" /> Procesando...</> : <><Building2 className="w-4 h-4" /> Generar Orden de Transferencia</>}
                    </button>
                  )}
                </div>
                {checkoutError && paymentMethod === 'mercadopago' && <p className="text-xs text-red-400 pt-2">{checkoutError}</p>}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutApp;
