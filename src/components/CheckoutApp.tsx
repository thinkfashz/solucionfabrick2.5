'use client';

/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  ArrowLeft, ShieldCheck, Lock, Truck, 
  CheckCircle2, ChevronRight, Fingerprint,
  Wifi, Battery, Wrench, Check
} from 'lucide-react';
import FabrickLogo from './FabrickLogo';

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

const CheckoutApp = () => {
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1); 
  const [gsapLoaded, setGsapLoaded] = useState(false);
  const stepContentRef = useRef<HTMLDivElement>(null);
  
  // Estado de Seguridad
  const [secureConnectionProgress, setSecureConnectionProgress] = useState(0);

  // Estados del Procesamiento Final de Compra
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [isSuccess, setIsSuccess] = useState(false);

  const [shippingName, setShippingName] = useState('');
  const [shippingEmail, setShippingEmail] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingRegion, setShippingRegion] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [orderId, setOrderId] = useState('');

  const product = {
    id: searchParams.get('productId') || 'FBK-01',
    name: searchParams.get('name') || 'Cerradura Biométrica Titanio V2',
    category: searchParams.get('category') || 'Seguridad Smart Home',
    price: Number(searchParams.get('price') || 189900),
    shipping: 0,
    image: searchParams.get('img') || 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=2070&auto=format&fit=crop',
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
          const suggestedAddress = [
            [d.road, d.houseNumber].filter(Boolean).join(' ').trim(),
            d.city,
            d.postcode,
            d.country,
          ]
            .filter(Boolean)
            .join(', ');

          const confirmFill = window.confirm(
            `Detectamos esta ubicación: ${d.displayName || suggestedAddress}. ¿Quieres autocompletar los datos de despacho?`,
          );

          if (confirmFill) {
            if (suggestedAddress) setShippingAddress(suggestedAddress);
            if (d.region) setShippingRegion(d.region);
          }
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
    setIsProcessing(false);

    if (['success', 'approved'].includes(normalized)) {
      setCheckoutError('');
      setProcessProgress(100);
      setIsSuccess(true);
      return;
    }

    setIsSuccess(false);
    setProcessProgress(0);
    setStep(3);

    if (['pending', 'in_process', 'in_mediation'].includes(normalized)) {
      setCheckoutError('Mercado Pago indicó que el pago quedó pendiente. Te avisaremos cuando sea confirmado.');
      return;
    }

    setCheckoutError('Mercado Pago no aprobó el pago. Puedes intentarlo nuevamente.');
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

  useEffect(() => {
    if (step === 3) {
      setSecureConnectionProgress(0);
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.floor(Math.random() * 15) + 5;
        if (progress >= 100) {
          setSecureConnectionProgress(100);
          clearInterval(interval);
        } else {
          setSecureConnectionProgress(progress);
        }
      }, 120); 
      return () => clearInterval(interval);
    }
  }, [step]);

  const formatCLP = (value: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(value);
  };

  const handleConfirmInvestment = async () => {
    if (isProcessing) return;

    setCheckoutError('');

    if (!shippingName || !shippingEmail || !shippingAddress || !shippingRegion) {
      setCheckoutError('Completa los datos de despacho y contacto antes de confirmar.');
      return;
    }

    setIsProcessing(true);
    setProcessProgress(0);

    const payload = {
      items: [
        {
          productoId: product.id,
          cantidad: 1,
          precioUnitario: product.price,
          nombre: product.name,
        },
      ],
      region: shippingRegion,
      shippingAddress,
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

      prog = 45;
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
      const checkoutUrl = checkoutBody?.payment?.checkoutUrl as string | null;
      setOrderId(createdOrderId);

      if (!checkoutUrl) {
        throw new Error('No se pudo iniciar Mercado Pago para esta orden.');
      }

      prog = 100;
      setProcessProgress(prog);
      window.location.href = checkoutUrl;
      return;
    } catch (e) {
      setCheckoutError(e instanceof Error ? e.message : 'Error procesando checkout.');
      setIsProcessing(false);
      setProcessProgress(0);
      return;
    }

    let cleanupProg = 100;
    const interval = setInterval(() => {
      cleanupProg += 0;
      if (cleanupProg >= 100) {
        setProcessProgress(100);
        clearInterval(interval);
      }
    }, 300);
  };

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
        `}
      </style>

      {/* OVERLAY DE PROCESAMIENTO / ÉXITO */}
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          
          {!isSuccess ? (
            <div className="w-full max-w-xs flex flex-col items-center text-center animate-fade-up">
               <div className="mb-10 animate-pulse">
                 <FabrickLogo />
               </div>
               
               <div className="w-full space-y-4">
                 <h2 className="text-[10px] font-bold uppercase tracking-[0.4em] text-white">Asegurando Inversión</h2>
                 
                 <div className="w-full h-[2px] bg-zinc-900 rounded-full overflow-hidden relative">
                   <div 
                     className="absolute top-0 left-0 h-full bg-yellow-400 shadow-[0_0_10px_#FACC15] transition-all duration-[300ms] ease-out"
                     style={{ width: `${processProgress}%` }}
                   />
                 </div>
                 
                 <p className="text-zinc-500 text-[8px] font-mono uppercase tracking-[0.3em]">
                    Estableciendo túnel de cifrado • {processProgress}%
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
                     <div className="font-black text-lg md:text-xl text-yellow-400">{formatCLP(product.price)}</div>
                   </div>
                 </div>
                 
                 <div className="text-center">
                   <p className="text-[8px] text-zinc-600 uppercase tracking-widest">Recibirás la confirmación del pago en Mercado Pago y en tu correo electrónico.</p>
                 </div>
               </div>

               <button onClick={() => window.location.reload()} className="mt-10 px-12 py-5 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-full hover:bg-yellow-400 transition-all transform hover:scale-105 relative z-10 shadow-[0_10px_30px_rgba(255,255,255,0.1)]">
                 Volver al Inicio
               </button>
            </div>
          )}
        </div>
      )}

      {/* NAVBAR MINIMALISTA */}
      <nav className="fixed top-0 left-0 w-full z-50 bg-black/90 backdrop-blur-xl border-b border-white/5 py-4 px-6 md:px-12 flex justify-between items-center">
        <FabrickLogo />
        <button className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-yellow-400 transition-colors group">
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          Volver
        </button>
      </nav>

      {/* CONTENEDOR PRINCIPAL */}
      <div className="pt-32 px-6 md:px-12 max-w-7xl mx-auto grid lg:grid-cols-12 gap-12 lg:gap-20">
        
        {/* COLUMNA IZQUIERDA: RESUMEN DEL PRODUCTO */}
        <div className="lg:col-span-5 animate-fade-up relative">
          <div className="sticky top-32 space-y-8">
            
            <div className="bg-zinc-950 p-8 rounded-[3rem] border border-white/5 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-400/10 blur-[60px] rounded-full pointer-events-none group-hover:bg-yellow-400/20 transition-all duration-700" />
              
              <div className="product-float relative z-10 mb-8">
                <div className="w-full h-64 rounded-[2rem] overflow-hidden border border-white/10 relative shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                  <img src={product.image} alt={product.name} className="w-full h-full object-cover grayscale-[0.1] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" />
                  <div className="absolute top-4 right-4 bg-black/80 backdrop-blur-md p-3 rounded-full border border-yellow-400/30 shadow-[0_0_15px_rgba(250,204,21,0.2)]">
                    <Fingerprint className="w-5 h-5 text-yellow-400" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <span className="text-yellow-400 font-bold tracking-[0.4em] text-[9px] uppercase bg-yellow-400/10 px-3 py-1 rounded-full border border-yellow-400/20">{product.category}</span>
                <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tighter leading-none mt-2">{product.name}</h2>
                
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
                    <span className="font-mono text-zinc-300">{formatCLP(product.price)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 uppercase tracking-widest text-[10px] font-bold">Logística Fabrick</span>
                    <span className="font-mono text-yellow-400">Bonificada</span>
                  </div>
                  <div className="flex justify-between items-center pt-4 mt-2 border-t border-white/5">
                    <span className="text-white font-black uppercase tracking-widest text-xs">Total Inversión</span>
                    <span className="font-black text-3xl text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-500">{formatCLP(product.price)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* COLUMNA DERECHA: FLUJO DE COMPRA */}
        <div className="lg:col-span-7 animate-fade-up">
          
          {/* Barra de Progreso Superior */}
          <div className="flex items-center justify-between mb-12 relative">
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

          <div ref={stepContentRef} className="bg-zinc-950 p-8 md:p-12 rounded-[3rem] border border-white/5 shadow-2xl">
            
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

                <form className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <input type="text" value={shippingName} onChange={(e) => setShippingName(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Nombre Contacto" />
                    <input type="email" value={shippingEmail} onChange={(e) => setShippingEmail(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Email Contacto" />
                  </div>
                  <div className="grid md:grid-cols-2 gap-6">
                    <input type="tel" value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Teléfono Móvil" />
                    <div className="hidden md:block" />
                  </div>
                  <input type="text" value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Dirección Completa" />
                  <input type="text" value={shippingRegion} onChange={(e) => setShippingRegion(e.target.value)} className="w-full bg-black border border-white/10 rounded-full px-6 py-4 text-sm text-white focus:border-yellow-400 focus:outline-none transition-colors" placeholder="Región / Estado" />
                  {checkoutError && <p className="text-xs text-red-400">{checkoutError}</p>}
                  <div className="pt-8 flex gap-4">
                    <button onClick={() => changeStep(1)} type="button" className="px-8 py-5 border border-white/20 rounded-full bg-black text-white font-bold text-xs uppercase hover:border-yellow-400 transition-colors">Volver</button>
                    <button onClick={() => changeStep(3)} type="button" className="flex-1 py-5 bg-yellow-400 text-black font-black uppercase text-xs rounded-full shadow-[0_15px_40px_rgba(250,204,21,0.2)] hover:bg-white transition-colors">Continuar a Mercado Pago</button>
                  </div>
                </form>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-8 animate-fade-up">
                
                {/* ANIMACIÓN DE CONEXIÓN SEGURA */}
                <div className="bg-black/50 border border-white/5 rounded-[2rem] p-5 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-full bg-emerald-500/5 opacity-50" />
                  
                  <div className="flex justify-between items-center mb-3 relative z-10 px-2">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className={`w-4 h-4 transition-colors duration-300 ${secureConnectionProgress === 100 ? 'text-emerald-500' : 'text-zinc-600'}`} />
                      <span className="text-[9px] uppercase tracking-widest font-bold">
                         <span className="text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.8)]">Fabrick</span> <span className="text-zinc-400">Secure</span>
                      </span>
                    </div>
                    
                    <div className="flex-1 flex justify-center px-4">
                       <Lock className={`w-3 h-3 ${secureConnectionProgress === 100 ? 'text-emerald-500' : 'text-zinc-700'} transition-colors`} />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[9px] uppercase tracking-widest text-zinc-400 font-bold">Red Bancaria</span>
                      <ShieldCheck className={`w-4 h-4 transition-colors duration-300 ${secureConnectionProgress === 100 ? 'text-emerald-500' : 'text-zinc-600'}`} />
                    </div>
                  </div>

                  <div className="w-full h-2 bg-zinc-900 rounded-full overflow-hidden relative z-10 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]">
                    <div
                      className={`absolute top-0 left-0 h-full transition-all duration-[150ms] ease-out shadow-[0_0_15px_rgba(16,185,129,0.8)] ${secureConnectionProgress === 100 ? 'bg-tunnel-flow w-full' : 'bg-emerald-500'}`}
                      style={secureConnectionProgress < 100 ? { width: `${secureConnectionProgress}%` } : {}}
                    />
                  </div>

                  <div className="mt-3 text-center relative z-10">
                    <span className={`text-[8px] md:text-[9px] font-mono tracking-[0.2em] uppercase transition-colors duration-300 ${secureConnectionProgress === 100 ? 'text-emerald-500 drop-shadow-[0_0_5px_rgba(16,185,129,0.5)]' : 'text-yellow-400 animate-pulse'}`}>
                      {secureConnectionProgress === 100
                        ? '✓ Flujo cifrado de extremo a extremo activo'
                        : 'Estableciendo conexión bancaria encriptada...'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-yellow-400 font-bold tracking-[0.4em] text-[9px] uppercase">Paso Final</span>
                    <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter mb-2 mt-1">Pago <span className="text-yellow-400">Protegido</span></h3>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-zinc-900 to-black border border-white/10 rounded-[2rem] p-8 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-[9px] uppercase tracking-[0.35em] text-yellow-400 font-bold">Mercado Pago</p>
                      <h4 className="text-2xl font-black uppercase tracking-tighter mt-2">Finalización externa segura</h4>
                    </div>
                    <div className="w-12 h-12 rounded-full border border-yellow-400/30 bg-yellow-400/10 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-yellow-400" />
                    </div>
                  </div>

                  <p className="text-sm text-zinc-300 leading-relaxed">
                    Para proteger tus datos, Fabrick ya no captura los datos de la tarjeta dentro del sitio. Al continuar, serás redirigido a Mercado Pago para completar el pago real con su flujo oficial.
                  </p>

                  <div className="grid sm:grid-cols-2 gap-4 text-xs uppercase tracking-widest">
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                      <div className="text-zinc-500 mb-2">Proveedor</div>
                      <div className="text-white font-bold">Mercado Pago</div>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                      <div className="text-zinc-500 mb-2">Monto referencial</div>
                      <div className="text-white font-bold">{formatCLP(product.price)}</div>
                    </div>
                  </div>
                </div>

                <div className="pt-8 flex gap-4">
                  <button onClick={() => changeStep(2)} type="button" className="px-6 py-5 border border-white/20 rounded-full bg-black hover:border-yellow-400 transition-colors text-white">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <button disabled={isProcessing} onClick={handleConfirmInvestment} type="button" className="flex-1 py-5 bg-yellow-400 text-black font-black uppercase text-[11px] md:text-xs tracking-[0.3em] rounded-full hover:bg-white transition-all transform active:scale-95 flex justify-center items-center gap-3 shadow-[0_15px_40px_rgba(250,204,21,0.3)] disabled:opacity-50 disabled:cursor-not-allowed">
                    <Lock className="w-4 h-4" /> Pagar en Mercado Pago
                  </button>
                </div>
                {checkoutError && <p className="text-xs text-red-400 pt-2">{checkoutError}</p>}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutApp;
