'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { api } from '../lib/api';
import { useCart } from './layout';
import type { ShopProduct } from '../lib/types';

/* ─── Dismissible Bitwave banner ─────────────────────────────────── */
function BitwaveBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const dismissed = localStorage.getItem('bw_store_ad_dismissed');
      if (!dismissed) setVisible(true);
    } catch { setVisible(true); }
  }, []);

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem('bw_store_ad_dismissed', '1'); } catch {}
  };

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-[#09090b] via-[#0f0d00] to-[#09090b] p-6 mb-6">
      {/* Background glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-orange-500/3 to-transparent pointer-events-none" />
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

      <button
        onClick={dismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/5 transition-colors"
        aria-label="Dismiss"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-5">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/25">
          <svg className="w-6 h-6 text-[#09090b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Bitwave ISP Billing</span>
            <span className="text-[10px] bg-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-medium">Trusted by 200+ ISPs</span>
          </div>
          <p className="text-white font-semibold text-sm sm:text-base">
            You have the equipment. Now automate everything that comes after.
          </p>
          <p className="text-white/50 text-xs mt-1 leading-relaxed">
            Bitwave connects to your MikroTik routers and handles PPPoE, hotspot billing, M-Pesa payments, and auto-disconnect — without you lifting a finger.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Link href="/landing" onClick={dismiss} className="flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] text-xs font-bold px-4 py-2.5 rounded-xl hover:shadow-lg hover:shadow-amber-500/30 transition-all whitespace-nowrap">
            See How It Works
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Inline grid ad (appears after item 8) ──────────────────────── */
function BitwaveGridAd() {
  return (
    <Link
      href="/landing"
      className="col-span-2 sm:col-span-3 lg:col-span-4 group block relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-[#09090b] via-[#0f0d01] to-[#09090b] p-6 hover:border-amber-500/40 transition-all"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-amber-500/8 via-transparent to-transparent pointer-events-none" />
      <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />

      <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-amber-500/25">
            <svg className="w-5 h-5 text-[#09090b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" /></svg>
          </div>
          <div>
            <p className="text-white text-sm font-bold">Powering the ISP behind the equipment</p>
            <p className="text-white/40 text-xs mt-0.5">Bitwave automates billing, payments & router management for ISPs across Kenya</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold group-hover:gap-3 transition-all whitespace-nowrap">
          Join 200+ ISPs on Bitwave
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        </div>
      </div>
    </Link>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  Routers: '🔌',
  Cables: '🔗',
  Antennas: '📡',
  Switches: '🖧',
  Accessories: '🔧',
  'Power Supplies': '⚡',
};

function ProductCard({ product }: { product: ShopProduct }) {
  const { addItem, items } = useCart();
  const cartItem = items.find(i => i.product.id === product.id);
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= 5;
  const isOutOfStock = product.stock_quantity === 0;
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;

  return (
    <Link href={`/store/products/${product.id}`} className="card group flex flex-col overflow-hidden hover:border-amber-500/30 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-amber-500/5">
      {/* Product image */}
      <div className="relative bg-background-secondary aspect-square flex items-center justify-center overflow-hidden">
        {product.image_url && !imgError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-foreground-muted/40">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
            </svg>
            <span className="text-xs">{product.category}</span>
          </div>
        )}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <span className="text-xs font-semibold text-foreground-muted border border-border rounded-full px-3 py-1">Out of Stock</span>
          </div>
        )}
        {discount > 0 && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-bold bg-emerald-500 text-white rounded-full px-2 py-0.5">
              -{discount}%
            </span>
          </div>
        )}
        {isLowStock && !isOutOfStock && !discount && (
          <div className="absolute top-2 right-2">
            <span className="text-[10px] font-semibold bg-amber-500/90 text-[#09090b] rounded-full px-2 py-0.5">
              Only {product.stock_quantity} left
            </span>
          </div>
        )}
        {product.tags?.includes('bestseller') && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold bg-amber-500/90 text-[#09090b] rounded-full px-2 py-0.5">
              🏆 Best Seller
            </span>
          </div>
        )}
        {product.category && !product.tags?.includes('bestseller') && (
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-medium bg-background/90 backdrop-blur-sm text-foreground-muted border border-border rounded-full px-2 py-0.5">
              {CATEGORY_ICONS[product.category] || '📦'} {product.category}
            </span>
          </div>
        )}
        {/* Quick-view overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg py-1.5 text-center text-xs font-medium text-foreground">
            View Details →
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        <div className="flex-1">
          {product.brand && <p className="text-[10px] text-foreground-muted uppercase tracking-wide font-medium">{product.brand}</p>}
          <h3 className="font-semibold text-sm leading-snug text-foreground group-hover:text-accent-primary transition-colors line-clamp-2 mt-0.5">
            {product.name}
          </h3>
          {product.rating !== undefined && (
            <div className="flex items-center gap-1 mt-1">
              {[1,2,3,4,5].map(i => (
                <svg key={i} className={`w-3 h-3 ${i <= Math.round(product.rating!) ? 'text-amber-400' : 'text-background-tertiary'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-[10px] text-foreground-muted ml-0.5">{product.rating?.toFixed(1)}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-base font-bold gradient-text">
              KES {product.price.toLocaleString()}
            </span>
            {product.original_price && (
              <span className="text-xs text-foreground-muted line-through ml-1.5">
                KES {product.original_price.toLocaleString()}
              </span>
            )}
          </div>
          {cartItem && (
            <span className="text-xs text-accent-primary font-medium bg-accent-primary/10 px-2 py-0.5 rounded-full">
              {cartItem.quantity} in cart
            </span>
          )}
        </div>

        <button
          onClick={handleAdd}
          disabled={isOutOfStock}
          className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
            isOutOfStock
              ? 'bg-background-tertiary text-foreground-muted cursor-not-allowed'
              : added
              ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] hover:shadow-md hover:shadow-amber-500/25 hover:-translate-y-0.5 active:translate-y-0'
          }`}
        >
          {isOutOfStock ? 'Out of Stock' : added ? '✓ Added to Cart' : 'Add to Cart'}
        </button>
      </div>
    </Link>
  );
}

function CartDrawer({ onClose }: { onClose: () => void }) {
  const { items, removeItem, updateQty, total, count } = useCart();

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="w-full max-w-sm bg-background border-l border-border flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="font-semibold">
            Cart <span className="text-foreground-muted text-sm font-normal">({count} items)</span>
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-background-tertiary transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-foreground-muted">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              <p className="text-sm">Your cart is empty</p>
            </div>
          ) : (
            items.map(item => (
              <div key={item.product.id} className="card p-3 flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-background-secondary flex items-center justify-center flex-shrink-0 text-foreground-muted/30">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.product.name}</p>
                  <p className="text-xs text-foreground-muted mt-0.5">KES {item.product.price.toLocaleString()} each</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors text-sm">−</button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="w-6 h-6 rounded border border-border flex items-center justify-center text-foreground-muted hover:text-foreground hover:border-foreground-muted transition-colors text-sm">+</button>
                    <button onClick={() => removeItem(item.product.id)} className="ml-auto text-foreground-muted hover:text-danger transition-colors">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold">KES {(item.product.price * item.quantity).toLocaleString()}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Total</span>
              <span className="text-xl font-bold gradient-text">KES {total.toLocaleString()}</span>
            </div>
            <Link
              href="/store/checkout"
              onClick={onClose}
              className="block w-full text-center bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] font-semibold py-3 rounded-xl hover:shadow-lg hover:shadow-amber-500/25 transition-all"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StorePageInner() {
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(searchParams.get('cat'));
  const [cartOpen, setCartOpen] = useState(false);
  const { count } = useCart();

  useEffect(() => {
    api.getShopPublicProducts().then(p => {
      setProducts(p);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]));
    return cats.sort();
  }, [products]);

  const filtered = useMemo(() => {
    return products.filter(p => {
      const matchesSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesCat = !activeCategory || p.category === activeCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, search, activeCategory]);

  return (
    <>
      {cartOpen && <CartDrawer onClose={() => setCartOpen(false)} />}

      {/* Hero banner */}
      <section className="bg-gradient-to-br from-background via-background to-amber-500/5 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 mb-4">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-xs text-amber-500 font-medium">Official Equipment Store</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                Network Equipment &<br />
                <span className="gradient-text">ISP Accessories</span>
              </h1>
              <p className="mt-3 text-foreground-muted max-w-lg text-sm sm:text-base">
                Quality routers, cables, antennas, and accessories — sourced and tested for ISP deployments. Pay via M-Pesa, get delivered.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/store/track" className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl text-sm font-medium hover:border-foreground-muted transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                Track Order
              </Link>
              <button
                onClick={() => setCartOpen(true)}
                className="relative flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-amber-500/25 transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                Cart {count > 0 && <span className="bg-[#09090b]/20 rounded-full px-1.5 text-xs">{count}</span>}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filters + grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Search + filter bar */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background-secondary text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveCategory(null)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                !activeCategory
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] shadow-md'
                  : 'border border-border text-foreground-muted hover:text-foreground hover:border-foreground-muted'
              }`}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(activeCategory === cat ? null : cat)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeCategory === cat
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] shadow-md'
                    : 'border border-border text-foreground-muted hover:text-foreground hover:border-foreground-muted'
                }`}
              >
                {CATEGORY_ICONS[cat] || '📦'} {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Bitwave banner (dismissible) */}
        <BitwaveBanner />

        {/* Results count */}
        <p className="text-xs text-foreground-muted mb-4">
          {loading ? 'Loading products...' : `${filtered.length} product${filtered.length !== 1 ? 's' : ''}${activeCategory ? ` in ${activeCategory}` : ''}`}
        </p>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="aspect-square bg-background-tertiary rounded-t-xl" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-background-tertiary rounded w-3/4" />
                  <div className="h-3 bg-background-tertiary rounded w-1/2" />
                  <div className="h-8 bg-background-tertiary rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-foreground-muted">
            <svg className="w-14 h-14 mx-auto mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <p className="font-medium text-foreground">No products found</p>
            <p className="text-sm mt-1">Try a different search or category</p>
            <button onClick={() => { setSearch(''); setActiveCategory(null); }} className="mt-4 text-sm text-accent-primary hover:underline">Clear filters</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((p, i) => (
              <>
                <ProductCard key={p.id} product={p} />
                {i === 7 && <BitwaveGridAd key="grid-ad" />}
              </>
            ))}
          </div>
        )}

        {/* View cart sticky bar when cart has items */}
        {count > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => setCartOpen(true)}
              className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] px-6 py-3.5 rounded-2xl font-semibold shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all hover:-translate-y-0.5 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
              View Cart ({count} {count === 1 ? 'item' : 'items'})
              <span className="bg-[#09090b]/20 rounded-full px-2 py-0.5 text-sm">→</span>
            </button>
          </div>
        )}
      </section>

      {/* Trust signals */}
      <section className="border-t border-border bg-background-secondary/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: '🔒', title: 'Secure Payments', desc: 'M-Pesa STK Push' },
            { icon: '🚚', title: 'Fast Delivery', desc: 'Nairobi & countrywide' },
            { icon: '✅', title: 'Genuine Products', desc: 'ISP-grade equipment' },
            { icon: '📞', title: 'Expert Support', desc: '+254 795 635 364' },
          ].map((s, i) => (
            <div key={i} className="flex flex-col items-center gap-2">
              <span className="text-2xl">{s.icon}</span>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-xs text-foreground-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

export default function StorePage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-foreground-muted text-sm">Loading store...</div>}>
      <StorePageInner />
    </Suspense>
  );
}
