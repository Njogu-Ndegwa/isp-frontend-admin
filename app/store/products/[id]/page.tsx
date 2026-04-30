'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { api } from '../../../lib/api';
import { useCart } from '../../layout';
import type { ShopProduct } from '../../../lib/types';

/* ─── Star Rating ────────────────────────────────────────────────── */
function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map(i => (
          <svg
            key={i}
            className={`w-4 h-4 ${i <= Math.round(rating) ? 'text-amber-400' : 'text-background-tertiary'}`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
      <span className="text-sm font-semibold">{rating.toFixed(1)}</span>
      {count !== undefined && <span className="text-xs text-foreground-muted">({count} reviews)</span>}
    </div>
  );
}

/* ─── Image Gallery ──────────────────────────────────────────────── */
function ImageGallery({ images, name }: { images: string[]; name: string }) {
  const [active, setActive] = useState(0);
  const [imgError, setImgError] = useState<boolean[]>(new Array(images.length).fill(false));

  if (images.length === 0) {
    return (
      <div className="aspect-square rounded-2xl bg-background-secondary flex items-center justify-center">
        <svg className="w-20 h-20 text-foreground-muted/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Main image */}
      <div className="relative aspect-square rounded-2xl overflow-hidden bg-background-secondary border border-border">
        {imgError[active] ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-foreground-muted/30 gap-2">
            <svg className="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={images[active]}
            alt={`${name} - view ${active + 1}`}
            className="w-full h-full object-cover"
            onError={() => setImgError(prev => { const n = [...prev]; n[active] = true; return n; })}
          />
        )}
        {/* Zoom hint */}
        <div className="absolute bottom-3 right-3 bg-background/80 backdrop-blur-sm rounded-lg px-2.5 py-1 text-xs text-foreground-muted">
          {active + 1} / {images.length}
        </div>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all ${
                active === i ? 'border-amber-500 shadow-md shadow-amber-500/20' : 'border-border hover:border-foreground-muted'
              }`}
            >
              {imgError[i] ? (
                <div className="w-full h-full bg-background-secondary" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={src} alt="" className="w-full h-full object-cover" onError={() => setImgError(prev => { const n = [...prev]; n[i] = true; return n; })} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Spec Table ─────────────────────────────────────────────────── */
function SpecTable({ specs }: { specs: { label: string; value: string }[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <table className="w-full text-sm">
        <tbody>
          {specs.map((s, i) => (
            <tr key={i} className={`border-b border-border last:border-0 ${i % 2 === 0 ? 'bg-background' : 'bg-background-secondary/40'}`}>
              <td className="py-3 px-4 font-medium text-foreground-muted whitespace-nowrap w-2/5">{s.label}</td>
              <td className="py-3 px-4 text-foreground">{s.value}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Related Products ───────────────────────────────────────────── */
function RelatedCard({ product, onAdd }: { product: ShopProduct; onAdd: () => void }) {
  const imgRef = useState(false);
  return (
    <Link href={`/store/products/${product.id}`} className="card group hover:border-amber-500/30 transition-all hover:-translate-y-0.5 block overflow-hidden">
      <div className="aspect-square bg-background-secondary relative overflow-hidden">
        {product.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-foreground-muted/20">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" /></svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="text-xs text-foreground-muted">{product.brand || product.category}</p>
        <p className="text-sm font-semibold mt-0.5 group-hover:text-accent-primary transition-colors line-clamp-2">{product.name}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="font-bold gradient-text text-sm">KES {product.price.toLocaleString()}</span>
          <button
            onClick={e => { e.preventDefault(); onAdd(); }}
            className="text-xs px-2.5 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-lg font-medium hover:shadow-md hover:shadow-amber-500/20 transition-all"
          >
            + Cart
          </button>
        </div>
      </div>
    </Link>
  );
}

/* ─── Skeleton loader ────────────────────────────────────────────── */
function Skeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
      <div className="h-4 bg-background-tertiary rounded w-64 mb-6" />
      <div className="grid md:grid-cols-2 gap-10">
        <div className="aspect-square rounded-2xl bg-background-tertiary" />
        <div className="space-y-4">
          <div className="h-3 bg-background-tertiary rounded w-24" />
          <div className="h-8 bg-background-tertiary rounded w-3/4" />
          <div className="h-4 bg-background-tertiary rounded w-32" />
          <div className="h-10 bg-background-tertiary rounded w-40" />
          <div className="h-20 bg-background-tertiary rounded" />
          <div className="h-12 bg-background-tertiary rounded" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────────────── */
type ActiveTab = 'specs' | 'description' | 'shipping';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem, items } = useCart();
  const [product, setProduct] = useState<ShopProduct | null>(null);
  const [related, setRelated] = useState<ShopProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<ActiveTab>('specs');
  const [addedMsg, setAddedMsg] = useState('');

  const cartItem = product ? items.find(i => i.product.id === product.id) : undefined;

  useEffect(() => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) { router.replace('/store'); return; }

    Promise.all([
      api.getShopPublicProduct(numId),
      api.getShopPublicProducts(),
    ]).then(([prod, all]) => {
      setProduct(prod);
      setRelated(all.filter(p => p.id !== numId && p.category === prod.category).slice(0, 4));
      setLoading(false);
    }).catch(() => router.replace('/store'));
  }, [id, router]);

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, qty);
    setAddedMsg(`${qty} item${qty > 1 ? 's' : ''} added!`);
    setTimeout(() => setAddedMsg(''), 2000);
  };

  const handleBuyNow = () => {
    if (!product) return;
    addItem(product, qty);
    router.push('/store/checkout');
  };

  if (loading) return <Skeleton />;
  if (!product) return null;

  const isOutOfStock = product.stock_quantity === 0;
  const isLowStock = !isOutOfStock && product.stock_quantity <= 5;
  const discount = product.original_price
    ? Math.round((1 - product.price / product.original_price) * 100)
    : 0;
  const allImages = product.images?.length ? product.images : (product.image_url ? [product.image_url] : []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-foreground-muted mb-6 flex-wrap">
        <Link href="/store" className="hover:text-foreground transition-colors">Shop</Link>
        <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
        {product.category && (
          <>
            <Link href={`/store?cat=${encodeURIComponent(product.category)}`} className="hover:text-foreground transition-colors">{product.category}</Link>
            <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </>
        )}
        <span className="text-foreground truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main product layout */}
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">

        {/* LEFT — Image gallery */}
        <div>
          <ImageGallery images={allImages} name={product.name} />
        </div>

        {/* RIGHT — Product info */}
        <div className="flex flex-col gap-5">

          {/* Brand + tags */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.brand && (
              <span className="text-xs font-semibold uppercase tracking-wide text-foreground-muted border border-border rounded px-2 py-0.5">
                {product.brand}
              </span>
            )}
            {product.category && (
              <Link href={`/store?cat=${encodeURIComponent(product.category)}`} className="text-xs font-medium bg-amber-500/10 text-amber-500 rounded-full px-2.5 py-0.5 hover:bg-amber-500/20 transition-colors">
                {product.category}
              </Link>
            )}
            {product.tags?.includes('bestseller') && (
              <span className="text-xs font-semibold bg-emerald-500/10 text-emerald-500 rounded-full px-2.5 py-0.5">🏆 Best Seller</span>
            )}
            {product.tags?.includes('new') && (
              <span className="text-xs font-semibold bg-blue-500/10 text-blue-500 rounded-full px-2.5 py-0.5">✨ New</span>
            )}
          </div>

          {/* Name + SKU */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{product.name}</h1>
            {product.sku && (
              <p className="text-xs text-foreground-muted mt-1">SKU: <span className="font-mono">{product.sku}</span></p>
            )}
          </div>

          {/* Rating */}
          {product.rating !== undefined && (
            <Stars rating={product.rating} count={product.review_count} />
          )}

          {/* Price */}
          <div className="flex items-end gap-3">
            <span className="text-3xl font-bold gradient-text">KES {product.price.toLocaleString()}</span>
            {product.original_price && (
              <>
                <span className="text-lg text-foreground-muted line-through">KES {product.original_price.toLocaleString()}</span>
                <span className="text-sm font-bold text-emerald-500 bg-emerald-500/10 rounded px-2 py-0.5">−{discount}%</span>
              </>
            )}
          </div>

          {/* Stock status */}
          <div className={`inline-flex items-center gap-1.5 text-sm font-medium w-fit px-3 py-1.5 rounded-full border ${
            isOutOfStock
              ? 'border-red-500/20 bg-red-500/5 text-red-400'
              : isLowStock
              ? 'border-amber-500/20 bg-amber-500/5 text-amber-500'
              : 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOutOfStock ? 'bg-red-400' : isLowStock ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            {isOutOfStock ? 'Out of Stock' : isLowStock ? `Only ${product.stock_quantity} left in stock` : `In Stock (${product.stock_quantity} units)`}
          </div>

          {/* Highlights */}
          {product.highlights && product.highlights.length > 0 && (
            <div className="grid grid-cols-1 gap-2">
              {product.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2.5 text-sm">
                  <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  </svg>
                  <span className="text-foreground-muted">{h}</span>
                </div>
              ))}
            </div>
          )}

          {/* Quantity + CTA */}
          {!isOutOfStock && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium text-foreground-muted">Qty:</label>
                <div className="flex items-center gap-2 border border-border rounded-xl overflow-hidden">
                  <button
                    onClick={() => setQty(q => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-lg font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                  >−</button>
                  <span className="w-12 text-center font-semibold text-sm">{qty}</span>
                  <button
                    onClick={() => setQty(q => Math.min(product.stock_quantity, q + 1))}
                    className="w-10 h-10 flex items-center justify-center text-lg font-medium text-foreground-muted hover:text-foreground hover:bg-background-tertiary transition-colors"
                  >+</button>
                </div>
                {cartItem && (
                  <span className="text-xs text-accent-primary bg-accent-primary/10 rounded-full px-2.5 py-1">
                    {cartItem.quantity} already in cart
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                    addedMsg
                      ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                      : 'bg-background-secondary border border-border hover:border-foreground-muted'
                  }`}
                >
                  {addedMsg ? (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>{addedMsg}</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>Add to Cart</>
                  )}
                </button>
                <button
                  onClick={handleBuyNow}
                  className="flex-1 py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 text-[#09090b] rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-amber-500/30 hover:-translate-y-0.5 transition-all"
                >
                  Buy Now →
                </button>
              </div>
            </div>
          )}

          {isOutOfStock && (
            <div className="p-4 rounded-xl bg-background-secondary border border-border text-sm text-foreground-muted text-center">
              This item is currently out of stock. Contact us to be notified when it&apos;s back.
              <a href="tel:+254795635364" className="block mt-2 text-accent-primary font-medium hover:underline">+254 795 635 364</a>
            </div>
          )}

          {/* Delivery info */}
          <div className="grid grid-cols-3 gap-3 pt-1">
            {[
              { icon: '🚚', title: 'Nairobi', sub: '1–2 business days' },
              { icon: '📦', title: 'Countrywide', sub: '3–5 business days' },
              { icon: '↩', title: 'Returns', sub: '7-day policy' },
            ].map((d, i) => (
              <div key={i} className="card p-3 text-center">
                <div className="text-xl mb-1">{d.icon}</div>
                <p className="text-xs font-semibold">{d.title}</p>
                <p className="text-[10px] text-foreground-muted mt-0.5">{d.sub}</p>
              </div>
            ))}
          </div>

          {/* Warranty */}
          {product.warranty_months && (
            <div className="flex items-center gap-2 text-xs text-foreground-muted border border-border rounded-xl px-3 py-2">
              <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>
              {product.warranty_months >= 12
                ? `${product.warranty_months / 12}-year manufacturer warranty`
                : `${product.warranty_months}-month warranty`}
            </div>
          )}
        </div>
      </div>

      {/* ─── Tabs section ────────────────────────────────────────── */}
      <div className="mt-12">
        <div className="flex border-b border-border gap-1 overflow-x-auto">
          {([
            { key: 'specs', label: 'Specifications' },
            { key: 'description', label: 'Description' },
            { key: 'shipping', label: 'Shipping & Returns' },
          ] as { key: ActiveTab; label: string }[]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'border-amber-500 text-amber-500'
                  : 'border-transparent text-foreground-muted hover:text-foreground'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="mt-6">
          {tab === 'specs' && (
            product.specifications && product.specifications.length > 0 ? (
              <SpecTable specs={product.specifications} />
            ) : (
              <p className="text-sm text-foreground-muted py-8 text-center">No specifications available for this product.</p>
            )
          )}

          {tab === 'description' && (
            <div className="max-w-2xl">
              <p className="text-foreground-muted leading-relaxed">{product.description || 'No detailed description available.'}</p>
              {product.highlights && product.highlights.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold mb-3">Key Features</h3>
                  <ul className="space-y-2">
                    {product.highlights.map((h, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-foreground-muted">
                        <svg className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" /></svg>
                        {h}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {tab === 'shipping' && (
            <div className="max-w-2xl space-y-6 text-sm text-foreground-muted">
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>🚚</span> Delivery
                </h3>
                <ul className="space-y-2 ml-6">
                  <li><strong className="text-foreground">Nairobi CBD & surroundings:</strong> 1–2 business days via same-day courier or motorbike delivery</li>
                  <li><strong className="text-foreground">Countrywide (major towns):</strong> 2–4 business days via G4S or DHL</li>
                  <li><strong className="text-foreground">Remote areas:</strong> 4–7 business days — call us to confirm availability</li>
                  <li>Delivery fee calculated at checkout based on location and parcel weight</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>↩</span> Returns & Exchanges
                </h3>
                <ul className="space-y-2 ml-6">
                  <li>7-day return window from date of delivery</li>
                  <li>Item must be in original condition and packaging</li>
                  <li>Items damaged due to misuse are not eligible for return</li>
                  <li>Refunds processed via M-Pesa within 2 business days of receiving returned item</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2 flex items-center gap-2">
                  <span>📞</span> Questions?
                </h3>
                <p>Call or WhatsApp us: <a href="tel:+254795635364" className="text-accent-primary font-medium hover:underline">+254 795 635 364</a></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Related Products ─────────────────────────────────────── */}
      {related.length > 0 && (
        <div className="mt-14">
          <h2 className="text-xl font-bold mb-5">You might also like</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {related.map(p => (
              <RelatedCard
                key={p.id}
                product={p}
                onAdd={() => addItem(p)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── Trust bar ─────────────────────────────────────────────── */}
      <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-border pt-10">
        {[
          { icon: '🔒', title: 'Secure M-Pesa', desc: 'STK Push — no card details needed' },
          { icon: '✅', title: 'Genuine Products', desc: 'Sourced from authorised distributors' },
          { icon: '🛠', title: 'Tech Support', desc: 'Expert ISP setup guidance' },
          { icon: '⭐', title: '200+ ISPs', desc: 'Trust Bitwave for their equipment' },
        ].map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="text-2xl flex-shrink-0">{s.icon}</span>
            <div>
              <p className="text-sm font-semibold">{s.title}</p>
              <p className="text-xs text-foreground-muted mt-0.5">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
