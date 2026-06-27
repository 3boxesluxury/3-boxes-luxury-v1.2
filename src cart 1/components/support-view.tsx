'use client';

import { useStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Headphones, Send, MessageSquare, ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from '@/hooks/useTranslation';

interface Ticket {
  id: string
  subject: string
  category: string
  status: string
  priority: string
  createdAt: string
  message: string
  replies: { id: string; message: string; isAdmin: boolean; createdAt: string }[]
}

export function SupportView() {
  const { user, setView } = useStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [category, setCategory] = useState('');
  const [orderId, setOrderId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showForm, setShowForm] = useState(true);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject || !message) {
      setError(t('support.subjectAndMessageRequired'));
      return;
    }
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || '',
          name: user?.name || '',
          subject,
          message,
          category: category || 'other',
          orderId: orderId || undefined,
          userId: user?.id || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || t('support.failedToSubmit'));
        return;
      }

      setSuccess(true);
      setSubject('');
      setMessage('');
      setCategory('');
      setOrderId('');
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError(t('support.networkError'));
    } finally {
      setLoading(false);
    }
  };

  const loadTickets = async () => {
    if (!user) return;
    setLoadingTickets(true);
    try {
      const res = await fetch(`/api/support?userId=${user.id}`);
      const data = await res.json();
      setTickets(data.tickets || []);
    } catch {
      // Ignore
    } finally {
      setLoadingTickets(false);
    }
  };

  return (
    <div className="py-8 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setView('home')}
          className="text-amber-200/70 hover:bg-amber-900/20 hover:text-amber-400"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-amber-100 flex items-center gap-2">
            <Headphones className="h-6 w-6 text-amber-400" />
            {t('support.title')}
          </h1>
          <p className="text-sm text-amber-200/50">{t('support.subtitle')}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <Button
          variant={showForm ? 'default' : 'outline'}
          onClick={() => setShowForm(true)}
          className={showForm ? 'bg-amber-600 text-stone-950' : 'border-amber-900/30 text-amber-200/70 hover:bg-amber-900/20'}
        >
          <MessageSquare className="h-4 w-4 mr-2" />
          {t('support.newTicket')}
        </Button>
        {user && (
          <Button
            variant={!showForm ? 'default' : 'outline'}
            onClick={() => { setShowForm(false); loadTickets(); }}
            className={!showForm ? 'bg-amber-600 text-stone-950' : 'border-amber-900/30 text-amber-200/70 hover:bg-amber-900/20'}
          >
            {t('support.myTickets')}
          </Button>
        )}
      </div>

      {showForm ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-900/30 bg-stone-900/50">
            <CardHeader>
              <CardTitle className="text-amber-100">{t('support.submitTicketTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 rounded-md bg-red-900/20 px-3 py-2 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-md bg-emerald-900/20 px-3 py-2 text-sm text-emerald-300">
                    {t('support.ticketSubmitted')}
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-amber-200/70">{t('support.category')}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="border-amber-900/40 bg-stone-900/50 text-amber-50">
                      <SelectValue placeholder={t('support.selectCategory')} />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-950 border-amber-900/30">
                      <SelectItem value="order">{t('support.orderIssue')}</SelectItem>
                      <SelectItem value="product">{t('support.productQuestion')}</SelectItem>
                      <SelectItem value="payment">{t('support.paymentIssue')}</SelectItem>
                      <SelectItem value="delivery">{t('support.deliveryIssue')}</SelectItem>
                      <SelectItem value="other">{t('support.other')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-200/70">{t('support.orderIdOptional')}</Label>
                  <Input
                    value={orderId}
                    onChange={(e) => setOrderId(e.target.value)}
                    placeholder="ORD-XXXXX"
                    className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-200/70">{t('support.subjectRequired')}</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder={t('support.briefDescription')}
                    className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-amber-200/70">{t('support.messageRequired')}</Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder={t('support.describeIssue')}
                    rows={5}
                    className="border-amber-900/40 bg-stone-900/50 text-amber-50 placeholder:text-amber-200/30 resize-none"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-600 text-stone-950 hover:bg-amber-500 font-medium"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  {t('support.submitTicket')}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {loadingTickets ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
            </div>
          ) : tickets.length === 0 ? (
            <Card className="border-amber-900/30 bg-stone-900/50">
              <CardContent className="py-12 text-center">
                <MessageSquare className="h-12 w-12 text-amber-200/20 mx-auto mb-3" />
                <p className="text-amber-200/50">{t('support.noTicketsYet')}</p>
              </CardContent>
            </Card>
          ) : (
            tickets.map((ticket) => (
              <Card key={ticket.id} className="border-amber-900/30 bg-stone-900/50">
                <CardContent className="py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-medium text-amber-100">{ticket.subject}</h3>
                      <p className="text-xs text-amber-200/40 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        ticket.status === 'open' ? 'border-amber-500/50 text-amber-400' :
                        ticket.status === 'resolved' ? 'border-emerald-500/50 text-emerald-400' :
                        'border-stone-500/50 text-stone-400'
                      }
                    >
                      {ticket.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </motion.div>
      )}
    </div>
  );
}
