'use client';

import { useStore } from '@/lib/store';
import { useCurrency } from '@/lib/currency';
import { useTranslation } from '@/hooks/useTranslation';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Loader2,
  CreditCard,
  Lock,
  Truck,
  Gift,
  Tag,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';

interface CheckoutResponse {
  orderId: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
}

interface CouponResult {
  valid: boolean;
  discount?: number;
  error?: string;
  offer?: {
    id: string;
    title: string;
    code: string;
    type: string;
    value: number;
  };
}

export function CheckoutView() {
  const { cartItems, setView, setLastOrderId } = useStore();
  const { format } = useCurrency();
  const { t } = useTranslation();

  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  const [deliveryType, setDeliveryType] = useState('standard');
  const [giftWrapping, setGiftWrapping] = useState(false);
  const [giftWrapStyle, setGiftWrapStyle] = useState('classic');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [hidePrice, setHidePrice] = useState(false);
  const [giftOptionsOpen, setGiftOptionsOpen] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [discount, setDiscount] = useState(0);
  const [couponResult, setCouponResult] = useState<CouponResult | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const DELIVERY_OPTIONS = [
    {
      id: 'standard',
      label: t('checkout.standardDelivery'),
      description: t('checkout.freeOverAmount', { amount: format(500) }),
      price: 0,
      estimatedDays: t('checkout.businessDays', { days: '5-7' }),
    },
    {
      id: 'express',
      label: t('checkout.expressDelivery'),
      description: format(150),
      price: 150,
      estimatedDays: t('checkout.businessDays', { days: '2-3' }),
    },
    {
      id: 'same-day',
      label: t('checkout.sameDayDelivery'),
      description: format(250),
      price: 250,
      estimatedDays: t('checkout.businessDays', { days: '1' }),
    },
  ];

  const GIFT_WRAP_STYLES = [
    { value: 'classic', label: t('checkout.classic'), description: t('checkout.classicDesc') },
    { value: 'premium', label: t('checkout.premium'), description: t('checkout.premiumDesc') },
    { value: 'luxury', label: t('checkout.luxury'), description: t('checkout.luxuryDesc') },
  ];

  const selectedDelivery = DELIVERY_OPTIONS.find((d) => d.id === deliveryType) || DELIVERY_OPTIONS[0];
  const deliveryCost = selectedDelivery.price;

  const shipping = deliveryType === 'standard'
    ? (subtotal > 500 ? 0 : 50)
    : deliveryType === 'express' ? 150 : deliveryType === 'same-day' ? 250 : deliveryCost;
  const tax = subtotal * 0.08;
  const total = subtotal + shipping + tax - discount;

  const [form, setForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'IN',
    phone: '',
    cardNumber: '',
    cardExpiry: '',
    cardCvv: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    // Email validation
    if (!form.email) newErrors.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = 'Invalid email format (e.g. user@example.com)';
    // First Name validation — only alphabetic characters, spaces, and hyphens
    if (!form.firstName) newErrors.firstName = 'First name is required';
    else if (!/^[A-Za-z\s-]+$/.test(form.firstName)) newErrors.firstName = 'First name must contain only letters';
    // Last Name validation — only alphabetic characters, spaces, and hyphens
    if (!form.lastName) newErrors.lastName = 'Last name is required';
    else if (!/^[A-Za-z\s-]+$/.test(form.lastName)) newErrors.lastName = 'Last name must contain only letters';
    // Address validation — must have at least some alphabetic characters
    if (!form.address) newErrors.address = 'Address is required';
    else if (form.address.trim().length < 5) newErrors.address = 'Address is too short';
    else if (!/[A-Za-z]/.test(form.address)) newErrors.address = 'Address must contain valid text';
    // City validation — only alphabetic characters, spaces, and hyphens
    if (!form.city) newErrors.city = 'City is required';
    else if (!/^[A-Za-z\s-]+$/.test(form.city)) newErrors.city = 'City must contain only letters';
    // State validation — only alphabetic characters, spaces, and hyphens
    if (!form.state) newErrors.state = 'State is required';
    else if (!/^[A-Za-z\s-]+$/.test(form.state)) newErrors.state = 'State must contain only letters';
    // ZIP Code validation — alphanumeric with spaces/hyphens, 3-10 chars
    if (!form.zipCode) newErrors.zipCode = 'ZIP code is required';
    else if (!/^[A-Za-z0-9\s-]{3,10}$/.test(form.zipCode)) newErrors.zipCode = 'Invalid ZIP code format';
    // Country validation — only alphabetic characters and spaces
    if (!form.country) newErrors.country = 'Country is required';
    else if (!/^[A-Za-z\s]+$/.test(form.country)) newErrors.country = 'Country must contain only letters';
    // Phone validation — mandatory, numeric with optional +, spaces, hyphens, parentheses
    if (!form.phone) newErrors.phone = 'Phone number is required';
    else if (!/^[+]?[\d\s()-]{7,15}$/.test(form.phone)) newErrors.phone = 'Invalid phone number format';
    // Card validation
    if (!form.cardNumber) newErrors.cardNumber = 'Card number is required';
    else if (!/^\d{13,19}$/.test(form.cardNumber.replace(/\s/g, ''))) newErrors.cardNumber = 'Invalid card number';
    if (!form.cardExpiry) newErrors.cardExpiry = 'Expiry is required';
    else if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(form.cardExpiry)) newErrors.cardExpiry = 'Format: MM/YY';
    if (!form.cardCvv) newErrors.cardCvv = 'CVV is required';
    else if (!/^\d{3,4}$/.test(form.cardCvv)) newErrors.cardCvv = 'CVV must be 3-4 digits';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponResult(null);
    try {
      const res = await fetch('/api/offers/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode.trim(), subtotal }),
      });
      const data: CouponResult = await res.json();
      setCouponResult(data);
      if (data.valid && data.discount) {
        setDiscount(data.discount);
      } else {
        setDiscount(0);
      }
    } catch {
      setCouponResult({ valid: false, error: 'Failed to validate coupon' });
      setDiscount(0);
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setCouponCode('');
    setCouponResult(null);
    setDiscount(0);
  };

  const mutation = useMutation({
    mutationFn: async (): Promise<CheckoutResponse> => {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          items: cartItems.map((item) => ({
            productId: item.productId,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            image: item.image,
          })),
          subtotal: subtotal.toFixed(2),
          shipping: shipping.toFixed(2),
          tax: tax.toFixed(2),
          total: total.toFixed(2),
          deliveryType,
          giftWrapping,
          giftWrapStyle: giftWrapping ? giftWrapStyle : undefined,
          greetingMessage: greetingMessage || undefined,
          hidePrice,
          couponCode: couponResult?.valid ? couponCode : undefined,
          discount,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Checkout failed');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setLastOrderId(data.orderNumber);
      useStore.getState().clearCart();
      setView('order-confirmation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      mutation.mutate();
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <p className="text-amber-200/60">{t('cart.empty')}</p>
        <Button
          onClick={() => setView('home')}
          className="mt-4 bg-amber-600 text-stone-950 hover:bg-amber-500"
        >
          {t('cart.shopNow')}
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="py-8"
    >
      <Button
        variant="ghost"
        onClick={() => setView('cart')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('checkout.backToCart')}
      </Button>

      <h2 className="text-2xl font-bold text-amber-100">{t('checkout.title')}</h2>

      <form onSubmit={handleSubmit}>
        <div className="mt-6 grid gap-8 lg:grid-cols-3">
          {/* Form Fields */}
          <div className="lg:col-span-2 space-y-8">
            {/* Contact */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <h3 className="text-lg font-semibold text-amber-100">{t('checkout.contactInfo')}</h3>
              <div className="mt-4">
                <Label htmlFor="email" className="text-amber-200/60">{t('checkout.email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="your@email.com"
                  className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                />
                {errors.email && <p className="mt-1 text-xs text-red-400">{errors.email}</p>}
              </div>
            </div>

            {/* Shipping */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <h3 className="text-lg font-semibold text-amber-100">{t('checkout.shippingAddress')}</h3>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName" className="text-amber-200/60">{t('checkout.firstName')}</Label>
                  <Input
                    id="firstName"
                    value={form.firstName}
                    onChange={(e) => updateField('firstName', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-400">{errors.firstName}</p>}
                </div>
                <div>
                  <Label htmlFor="lastName" className="text-amber-200/60">{t('checkout.lastName')}</Label>
                  <Input
                    id="lastName"
                    value={form.lastName}
                    onChange={(e) => updateField('lastName', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-400">{errors.lastName}</p>}
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="address" className="text-amber-200/60">{t('checkout.address')}</Label>
                  <Input
                    id="address"
                    value={form.address}
                    onChange={(e) => updateField('address', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.address && <p className="mt-1 text-xs text-red-400">{errors.address}</p>}
                </div>
                <div>
                  <Label htmlFor="city" className="text-amber-200/60">{t('checkout.city')}</Label>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={(e) => updateField('city', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.city && <p className="mt-1 text-xs text-red-400">{errors.city}</p>}
                </div>
                <div>
                  <Label htmlFor="state" className="text-amber-200/60">{t('checkout.state')}</Label>
                  <Input
                    id="state"
                    value={form.state}
                    onChange={(e) => updateField('state', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.state && <p className="mt-1 text-xs text-red-400">{errors.state}</p>}
                </div>
                <div>
                  <Label htmlFor="zipCode" className="text-amber-200/60">{t('checkout.zipCode')}</Label>
                  <Input
                    id="zipCode"
                    value={form.zipCode}
                    onChange={(e) => updateField('zipCode', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.zipCode && <p className="mt-1 text-xs text-red-400">{errors.zipCode}</p>}
                </div>
                <div>
                  <Label htmlFor="country" className="text-amber-200/60">{t('checkout.country')}</Label>
                  <Input
                    id="country"
                    value={form.country}
                    onChange={(e) => updateField('country', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.country && <p className="mt-1 text-xs text-red-400">{errors.country}</p>}
                </div>
                <div>
                  <Label htmlFor="phone" className="text-amber-200/60">{t('checkout.phone')} <span className="text-red-400">*</span></Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField('phone', e.target.value)}
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50"
                  />
                  {errors.phone && <p className="mt-1 text-xs text-red-400">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Delivery Type */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-100">{t('checkout.deliveryType')}</h3>
              </div>
              <div className="mt-4 space-y-3">
                {DELIVERY_OPTIONS.map((option) => (
                  <label
                    key={option.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-all ${
                      deliveryType === option.id
                        ? 'border-amber-500/50 bg-amber-900/20'
                        : 'border-amber-900/20 bg-stone-800/30 hover:border-amber-900/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="deliveryType"
                        value={option.id}
                        checked={deliveryType === option.id}
                        onChange={() => setDeliveryType(option.id)}
                        className="h-4 w-4 accent-amber-600"
                      />
                      <div>
                        <p className="text-sm font-medium text-amber-100">{option.label}</p>
                        <p className="text-xs text-amber-200/40">{option.estimatedDays}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      option.id === 'standard' && subtotal > 500
                        ? 'text-emerald-400'
                        : 'text-amber-200/60'
                    }`}>
                      {option.id === 'standard'
                        ? (subtotal > 500 ? t('common.free') : format(50))
                        : format(option.price)
                      }
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Gift Options */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <button
                type="button"
                onClick={() => setGiftOptionsOpen(!giftOptionsOpen)}
                className="flex w-full items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-amber-400" />
                  <h3 className="text-lg font-semibold text-amber-100">{t('checkout.giftOptions')}</h3>
                </div>
                {giftOptionsOpen ? (
                  <ChevronUp className="h-5 w-5 text-amber-200/40" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-amber-200/40" />
                )}
              </button>

              <AnimatePresence>
                {giftOptionsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-4">
                      {/* Gift Wrapping Toggle */}
                      <div className="flex items-center gap-3">
                        <Checkbox
                          id="giftWrapping"
                          checked={giftWrapping}
                          onCheckedChange={(checked) => {
                            setGiftWrapping(checked as boolean);
                            if (!checked) setGiftWrapStyle('classic');
                          }}
                          className="border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <Label htmlFor="giftWrapping" className="text-sm text-amber-100">
                          {t('checkout.giftWrapping')}
                        </Label>
                      </div>

                      {/* Gift Wrap Style */}
                      {giftWrapping && (
                        <motion.div
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="pl-7"
                        >
                          <Label className="text-xs text-amber-200/50">{t('checkout.wrapStyle')}</Label>
                          <Select value={giftWrapStyle} onValueChange={setGiftWrapStyle}>
                            <SelectTrigger className="mt-1 w-full border-amber-900/40 bg-stone-800/50 text-amber-50">
                              <SelectValue placeholder="Select style" />
                            </SelectTrigger>
                            <SelectContent className="border-amber-900/30 bg-stone-900">
                              {GIFT_WRAP_STYLES.map((style) => (
                                <SelectItem key={style.value} value={style.value}>
                                  <div>
                                    <span className="text-amber-100">{style.label}</span>
                                    <span className="ml-2 text-xs text-amber-200/40">— {style.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </motion.div>
                      )}

                      {/* Greeting Message */}
                      <div className="pl-7">
                        <Label htmlFor="greetingMessage" className="text-xs text-amber-200/50">
                          {t('checkout.greetingMessage')}
                        </Label>
                        <Textarea
                          id="greetingMessage"
                          value={greetingMessage}
                          onChange={(e) => {
                            if (e.target.value.length <= 200) {
                              setGreetingMessage(e.target.value);
                            }
                          }}
                          placeholder={t('checkout.greetingPlaceholder')}
                          rows={3}
                          className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20 resize-none"
                        />
                        <p className="mt-1 text-xs text-amber-200/30">
                          {t('checkout.charactersCount', { count: String(greetingMessage.length) })}
                        </p>
                      </div>

                      {/* Hide Price Toggle */}
                      <div className="flex items-center gap-3 pl-7">
                        <Checkbox
                          id="hidePrice"
                          checked={hidePrice}
                          onCheckedChange={(checked) => setHidePrice(checked as boolean)}
                          className="border-amber-600 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                        />
                        <Label htmlFor="hidePrice" className="text-sm text-amber-100">
                          {t('checkout.hidePrice')}
                        </Label>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Coupon Code */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <div className="flex items-center gap-2">
                <Tag className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-100">{t('checkout.couponCode')}</h3>
              </div>
              <div className="mt-4">
                {couponResult?.valid ? (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-900/20 p-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-emerald-300">
                          {couponResult.offer?.title || couponCode}
                        </p>
                        <p className="text-xs text-emerald-400/60">
                          {t('checkout.discountLabel', { amount: format(discount) })}
                        </p>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveCoupon}
                      className="text-amber-200/40 hover:text-red-400"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={couponCode}
                      onChange={(e) => {
                        setCouponCode(e.target.value);
                        if (couponResult && !couponResult.valid) setCouponResult(null);
                      }}
                      placeholder={t('checkout.enterCode')}
                      className="flex-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponCode.trim()}
                      className="border-amber-900/40 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
                    >
                      {couponLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        t('checkout.apply')
                      )}
                    </Button>
                  </div>
                )}
                {couponResult && !couponResult.valid && (
                  <p className="mt-2 text-xs text-red-400">{couponResult.error}</p>
                )}
              </div>
            </div>

            {/* Payment */}
            <div className="rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-100">{t('checkout.payment')}</h3>
              </div>
              <p className="mt-1 text-xs text-amber-200/30">
                <Lock className="inline h-3 w-3 mr-1" />
                {t('checkout.paymentNote')}
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <Label htmlFor="cardNumber" className="text-amber-200/60">{t('checkout.cardNumber')}</Label>
                  <Input
                    id="cardNumber"
                    value={form.cardNumber}
                    onChange={(e) => updateField('cardNumber', e.target.value)}
                    placeholder="4242 4242 4242 4242"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                  {errors.cardNumber && <p className="mt-1 text-xs text-red-400">{errors.cardNumber}</p>}
                </div>
                <div>
                  <Label htmlFor="cardExpiry" className="text-amber-200/60">{t('checkout.expiry')}</Label>
                  <Input
                    id="cardExpiry"
                    value={form.cardExpiry}
                    onChange={(e) => updateField('cardExpiry', e.target.value)}
                    placeholder="MM/YY"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                  {errors.cardExpiry && <p className="mt-1 text-xs text-red-400">{errors.cardExpiry}</p>}
                </div>
                <div>
                  <Label htmlFor="cardCvv" className="text-amber-200/60">{t('checkout.cvv')}</Label>
                  <Input
                    id="cardCvv"
                    value={form.cardCvv}
                    onChange={(e) => updateField('cardCvv', e.target.value)}
                    placeholder="123"
                    className="mt-1 border-amber-900/40 bg-stone-800/50 text-amber-50 placeholder:text-amber-200/20"
                  />
                  {errors.cardCvv && <p className="mt-1 text-xs text-red-400">{errors.cardCvv}</p>}
                </div>
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="h-fit rounded-lg border border-amber-900/20 bg-stone-900/60 p-6">
            <h3 className="text-lg font-semibold text-amber-100">{t('checkout.orderSummary')}</h3>

            <div className="mt-4 space-y-3 max-h-64 overflow-y-auto">
              {cartItems.map((item) => (
                <div key={item.productId} className="flex justify-between text-sm">
                  <span className="text-amber-200/60 truncate mr-2">
                    {item.name} x{item.quantity}
                  </span>
                  <span className="text-amber-100 flex-shrink-0">
                    {format(item.price * item.quantity)}
                  </span>
                </div>
              ))}
            </div>

            <Separator className="my-4 bg-amber-900/30" />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">{t('cart.subtotal')}</span>
                <span className="text-amber-100">{format(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">{t('cart.shipping')} ({selectedDelivery.label})</span>
                <span className="text-amber-100">
                  {shipping === 0 ? (
                    <span className="text-emerald-400">{t('common.free')}</span>
                  ) : (
                    format(shipping)
                  )}
                </span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200/50">{t('cart.discount')}</span>
                  <span className="text-emerald-400">-{format(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-amber-200/50">{t('cart.tax')}</span>
                <span className="text-amber-100">{format(tax)}</span>
              </div>
              {giftWrapping && (
                <div className="flex justify-between text-sm">
                  <span className="text-amber-200/50">{t('checkout.giftWrappingLabel', { style: giftWrapStyle })}</span>
                  <span className="text-amber-400 text-xs">{t('checkout.included')}</span>
                </div>
              )}
              <Separator className="bg-amber-900/30" />
              <div className="flex justify-between">
                <span className="font-semibold text-amber-100">{t('cart.total')}</span>
                <span className="text-lg font-bold text-amber-400">
                  {format(total)}
                </span>
              </div>
            </div>

            <Button
              type="submit"
              disabled={mutation.isPending}
              className="mt-6 w-full bg-amber-600 text-stone-950 hover:bg-amber-500 hover:shadow-lg hover:shadow-amber-600/25"
              size="lg"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('checkout.processing')}
                </>
              ) : (
                `${t('checkout.placeOrder')} - ${format(total)}`
              )}
            </Button>

            {mutation.error && (
              <p className="mt-3 text-center text-sm text-red-400">
                {mutation.error.message}
              </p>
            )}
          </div>
        </div>
      </form>
    </motion.div>
  );
}
