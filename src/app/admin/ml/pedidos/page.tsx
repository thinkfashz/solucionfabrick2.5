import NativeMarketplaceModule from '@/components/admin/NativeMarketplaceModule';

export const dynamic = 'force-dynamic';

export default function MarketplaceOrdersPage() {
  return <NativeMarketplaceModule initialView="orders" />;
}
