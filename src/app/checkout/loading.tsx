import FabrickLoadingScreen from '@/components/FabrickLoadingScreen';

export default function CheckoutLoading() {
  return (
    <FabrickLoadingScreen
      eyebrow="Checkout seguro"
      title="Preparando tu compra"
      description="Verificando carrito, disponibilidad y conexión de pago antes de continuar."
    />
  );
}
