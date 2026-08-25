'use client';

export default function ProductsAdminWorkspace({ children }: { children: React.ReactNode }) {
  return (
    <div className="products-admin-workspace -mx-3 min-h-screen bg-[linear-gradient(180deg,#FFF9EE_0%,#F2DFBB_48%,#FFF9EE_100%)] px-3 pb-24 sm:-mx-5 sm:px-5 lg:-mx-8 lg:px-8">
      <div className="mx-auto max-w-[1680px] pt-5">
        {children}
      </div>

      <style jsx global>{`
        .products-admin-workspace [data-product-form] {
          margin: 0 !important;
          max-width: none !important;
          min-height: auto !important;
          padding-bottom: 7rem !important;
        }
        .products-admin-workspace [data-product-form] > div:first-child {
          border-radius: 1.75rem !important;
          box-shadow: 0 18px 55px rgba(23,24,32,.08) !important;
        }
        .products-admin-workspace [data-product-form] form > section,
        .products-admin-workspace [data-product-form] aside > div,
        .products-admin-workspace article,
        .products-admin-workspace table,
        .products-admin-workspace [class*="rounded-[2.2rem]"] {
          border-color: rgba(23,24,32,.06) !important;
        }
        .products-admin-workspace input,
        .products-admin-workspace textarea,
        .products-admin-workspace select {
          min-height: 48px;
          font-size: 14px;
        }
        .products-admin-workspace textarea { min-height: 128px; }
        .products-admin-workspace button,
        .products-admin-workspace a { -webkit-tap-highlight-color: transparent; }
        .products-admin-workspace .products-grid,
        .products-admin-workspace [data-products-grid] {
          grid-template-columns: repeat(auto-fit,minmax(260px,1fr)) !important;
        }
        @media (max-width: 640px) {
          .products-admin-workspace [data-product-form] > div:nth-child(2) {
            padding-left: 0 !important;
            padding-right: 0 !important;
            gap: 1rem !important;
          }
          .products-admin-workspace [data-product-form] form > section {
            border-radius: 1.35rem !important;
            padding: 1rem !important;
          }
          .products-admin-workspace article { border-radius: 1.35rem !important; }
        }
      `}</style>
    </div>
  );
}
