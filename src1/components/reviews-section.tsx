'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Star,
  MessageSquare,
  ArrowLeft,
  Loader2,
  User,
  ChevronDown,
  PenLine,
  ThumbsUp,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface ReviewData {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
}

interface ReviewSummary {
  averageRating: number;
  totalReviews: number;
  ratingCounts: Record<string, number>;
}

// Star rating component (interactive)
function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hovered, setHovered] = useState(0);

  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-5 w-5',
    lg: 'h-7 w-7',
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readonly && setHovered(star)}
          onMouseLeave={() => !readonly && setHovered(0)}
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer'}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hovered || value)
                ? 'fill-amber-400 text-amber-400'
                : 'fill-transparent text-stone-600'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
}

// Rating breakdown bar
function RatingBar({ stars, count, total }: { stars: number; count: number; total: number }) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-amber-200/50 w-6 text-right">{stars}</span>
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <div className="flex-1 h-2 bg-stone-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-amber-400 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-amber-200/40 w-8 text-right">{count}</span>
    </div>
  );
}

export function ReviewsSection() {
  const { selectedProductId, user, setView } = useStore();
  const queryClient = useQueryClient();

  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewTitle, setReviewTitle] = useState('');
  const [reviewComment, setReviewComment] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Fetch product info
  const { data: productData } = useQuery({
    queryKey: ['review-product', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedProductId,
  });

  // Fetch reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['reviews', selectedProductId],
    queryFn: async () => {
      if (!selectedProductId) return null;
      const res = await fetch(`/api/reviews?productId=${selectedProductId}`);
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    enabled: !!selectedProductId,
  });

  // Create review mutation
  const reviewMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          rating: reviewRating,
          title: reviewTitle,
          comment: reviewComment,
          userId: user?.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit review');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', selectedProductId] });
      setReviewDialogOpen(false);
      setReviewRating(0);
      setReviewTitle('');
      setReviewComment('');
    },
  });

  const handleSubmitReview = useCallback(() => {
    if (reviewRating === 0 || !user?.id) return;
    reviewMutation.mutate();
  }, [reviewRating, user?.id, reviewMutation]);

  const reviews: ReviewData[] = reviewsData?.reviews || [];
  const summary: ReviewSummary = reviewsData?.summary || {
    averageRating: 0,
    totalReviews: 0,
    ratingCounts: { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 },
  };

  const displayedReviews = showAll ? reviews : reviews.slice(0, 5);

  if (!selectedProductId) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Star className="h-12 w-12 text-amber-200/20 mb-4" />
        <p className="text-amber-200/40">No product selected</p>
        <Button
          onClick={() => setView('home')}
          className="mt-4 bg-amber-600 text-stone-950 hover:bg-amber-500"
        >
          Browse Products
        </Button>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-8">
      <Button
        variant="ghost"
        onClick={() => setView('product')}
        className="mb-6 text-amber-200/60 hover:bg-amber-900/20 hover:text-amber-400"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Product
      </Button>

      <div className="max-w-3xl mx-auto">
        {/* Product name */}
        {productData && (
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-amber-100">Reviews for {productData.name}</h2>
          </div>
        )}

        {/* Rating Summary */}
        <Card className="border-amber-900/20 bg-stone-900/60 mb-8">
          <CardContent className="p-6">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Left: Average rating */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-5xl font-bold text-amber-400 mb-2">
                  {summary.averageRating.toFixed(1)}
                </div>
                <StarRating value={Math.round(summary.averageRating)} readonly size="lg" />
                <p className="mt-2 text-sm text-amber-200/40">
                  Based on {summary.totalReviews} review{summary.totalReviews !== 1 ? 's' : ''}
                </p>

                {/* Write Review Button */}
                <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      className="mt-4 bg-amber-600 text-stone-950 hover:bg-amber-500"
                      onClick={() => {
                        if (!user) {
                          useStore.getState().setShowAuthDialog(true);
                          return;
                        }
                      }}
                    >
                      <PenLine className="mr-2 h-4 w-4" />
                      Write a Review
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-stone-950 border-amber-900/30">
                    <DialogHeader>
                      <DialogTitle className="text-amber-100">Write a Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div>
                        <Label className="text-amber-200/60">Your Rating</Label>
                        <div className="mt-2">
                          <StarRating
                            value={reviewRating}
                            onChange={setReviewRating}
                            size="lg"
                          />
                        </div>
                        {reviewRating === 0 && reviewMutation.isError && (
                          <p className="text-xs text-red-400 mt-1">Please select a rating</p>
                        )}
                      </div>
                      <div>
                        <Label className="text-amber-200/60">Review Title</Label>
                        <Input
                          value={reviewTitle}
                          onChange={(e) => setReviewTitle(e.target.value)}
                          placeholder="Summarize your experience"
                          className="mt-1.5 border-amber-900/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-200/20"
                        />
                      </div>
                      <div>
                        <Label className="text-amber-200/60">Your Review</Label>
                        <Textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          placeholder="Share your experience with this product..."
                          className="mt-1.5 border-amber-900/40 bg-stone-900/60 text-amber-50 placeholder:text-amber-200/20 min-h-[120px]"
                        />
                      </div>
                      {reviewMutation.error && (
                        <p className="text-sm text-red-400">{reviewMutation.error.message}</p>
                      )}
                      <Button
                        onClick={handleSubmitReview}
                        disabled={reviewRating === 0 || reviewMutation.isPending}
                        className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500"
                      >
                        {reviewMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting...
                          </>
                        ) : (
                          <>
                            <ThumbsUp className="mr-2 h-4 w-4" />
                            Submit Review
                          </>
                        )}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Right: Rating breakdown */}
              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((stars) => (
                  <RatingBar
                    key={stars}
                    stars={stars}
                    count={summary.ratingCounts[String(stars)] || 0}
                    total={summary.totalReviews}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reviews List */}
        {reviewsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 text-amber-400 animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-12">
            <MessageSquare className="h-12 w-12 text-amber-200/20 mx-auto mb-4" />
            <p className="text-amber-200/40 text-lg">No reviews yet</p>
            <p className="text-amber-200/30 text-sm mt-1">Be the first to review this product</p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {displayedReviews.map((review, index) => (
                <motion.div
                  key={review.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-amber-900/20 bg-stone-900/60">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
                            {review.user.avatar ? (
                              <img
                                src={review.user.avatar}
                                alt={review.user.name}
                                className="h-full w-full rounded-full object-cover"
                              />
                            ) : (
                              <User className="h-4 w-4 text-amber-400" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-amber-100">
                              {review.user.name}
                            </p>
                            <p className="text-xs text-amber-200/30">
                              {new Date(review.createdAt).toLocaleDateString('en-IN', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                        </div>
                        <StarRating value={review.rating} readonly size="sm" />
                      </div>

                      {review.title && (
                        <p className="mt-3 text-sm font-semibold text-amber-100">
                          {review.title}
                        </p>
                      )}

                      {review.comment && (
                        <p className="mt-1 text-sm text-amber-200/60 leading-relaxed">
                          {review.comment}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>

            {reviews.length > 5 && !showAll && (
              <Button
                variant="ghost"
                onClick={() => setShowAll(true)}
                className="w-full text-amber-300 hover:bg-amber-900/20 hover:text-amber-200"
              >
                Show All {reviews.length} Reviews
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
