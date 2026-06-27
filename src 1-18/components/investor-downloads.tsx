'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { useStore } from '@/lib/store';
import {
  FileText,
  Presentation,
  Download,
  ArrowLeft,
  Building2,
  Sparkles,
  BookOpen,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  Clock,
  Users,
  TrendingUp,
} from 'lucide-react';

interface DownloadFile {
  id: string;
  title: string;
  description: string;
  filename: string;
  url: string;
  size: string;
  icon: React.ReactNode;
  color: string;
  gradient: string;
  tags: string[];
  pages?: string;
}

const DOWNLOAD_FILES: DownloadFile[] = [
  {
    id: 'brochure',
    title: 'Investor Brochure',
    description:
      'Comprehensive 6-page investor brochure covering market opportunity, our AI-powered solution, product categories, business model, and growth roadmap for 3 Boxes Luxury.',
    filename: '3boxes-luxury-investor-brochure.pdf',
    url: '/downloads/3boxes-luxury-investor-brochure.pdf',
    size: '1.7 MB',
    icon: <FileText className="h-8 w-8" />,
    color: 'text-amber-400',
    gradient: 'from-amber-900/40 to-amber-700/20',
    tags: ['PDF', '6 Pages', 'Print-Ready'],
    pages: '6 pages',
  },
  {
    id: 'pitch-deck',
    title: 'Investor Pitch Deck',
    description:
      'Professional 12-slide pitch deck with dark luxury aesthetic, featuring market analysis, competitive landscape, product demo, business model, and investment ask for 3 Boxes Luxury.',
    filename: '3boxes-luxury-pitch-deck.pptx',
    url: '/downloads/3boxes-luxury-pitch-deck.pptx',
    size: '572 KB',
    icon: <Presentation className="h-8 w-8" />,
    color: 'text-rose-400',
    gradient: 'from-rose-900/40 to-rose-700/20',
    tags: ['PPTX', '12 Slides', 'Editable'],
    pages: '12 slides',
  },
  {
    id: 'tech-doc',
    title: 'Technical Documentation',
    description:
      'Complete technical documentation covering system architecture, API endpoints, database schema, deployment topology, and AI pipeline details for the 3 Boxes Luxury platform.',
    filename: '3_Boxes_Luxury_Technical_Document.pdf',
    url: '/downloads/3_Boxes_Luxury_Technical_Document.pdf',
    size: '43 KB',
    icon: <BookOpen className="h-8 w-8" />,
    color: 'text-emerald-400',
    gradient: 'from-emerald-900/40 to-emerald-700/20',
    tags: ['PDF', 'Technical', 'Architecture'],
  },
];

const STATS = [
  { icon: <TrendingUp className="h-5 w-5" />, label: 'Market Size', value: '$40B+' },
  { icon: <Users className="h-5 w-5" />, label: 'Target Audience', value: '500M+' },
  { icon: <Sparkles className="h-5 w-5" />, label: 'AI Features', value: '6 Core' },
  { icon: <Clock className="h-5 w-5" />, label: 'Growth CAGR', value: '25%' },
];

export function InvestorDownloads() {
  const setView = useStore((s) => s.setView);

  const handleDownload = (file: DownloadFile) => {
    const link = document.createElement('a');
    link.href = file.url;
    link.download = file.filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-[80vh] py-8 px-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-10"
      >
        <button
          onClick={() => setView('home')}
          className="inline-flex items-center gap-2 text-amber-200/60 hover:text-amber-300 transition-colors mb-6 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Store
        </button>
        <div className="flex items-center justify-center gap-3 mb-4">
          <Building2 className="h-8 w-8 text-amber-400" />
          <h1 className="text-3xl md:text-4xl font-bold text-amber-50">
            Investor Resources
          </h1>
        </div>
        <p className="text-amber-200/60 max-w-2xl mx-auto text-lg">
          Download professional marketing materials, pitch decks, and technical
          documentation to evaluate the 3 Boxes Luxury investment opportunity.
        </p>
      </motion.div>

      {/* Stats Bar */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10 max-w-3xl mx-auto"
      >
        {STATS.map((stat, i) => (
          <div
            key={i}
            className="bg-stone-900/80 border border-amber-900/20 rounded-xl p-4 text-center"
          >
            <div className="flex items-center justify-center gap-2 text-amber-400 mb-1">
              {stat.icon}
            </div>
            <div className="text-xl font-bold text-amber-100">{stat.value}</div>
            <div className="text-xs text-amber-200/50">{stat.label}</div>
          </div>
        ))}
      </motion.div>

      {/* Download Cards */}
      <div className="max-w-4xl mx-auto space-y-6">
        {DOWNLOAD_FILES.map((file, index) => (
          <motion.div
            key={file.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.15 * (index + 1) }}
          >
            <div className="group relative bg-stone-900/60 border border-amber-900/20 rounded-2xl overflow-hidden hover:border-amber-700/40 transition-all duration-300">
              {/* Gradient accent bar */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${file.gradient.replace('from-', 'from-').replace('to-', 'to-')}`} 
                style={{ background: file.id === 'brochure' 
                  ? 'linear-gradient(to right, #78350f, #b45309)' 
                  : file.id === 'pitch-deck' 
                  ? 'linear-gradient(to right, #881337, #e11d48)' 
                  : 'linear-gradient(to right, #064e3b, #10b981)' 
                }}
              />

              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6">
                {/* Icon & Info */}
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div
                      className={`shrink-0 p-3 rounded-xl bg-gradient-to-br ${file.gradient} border border-amber-900/30`}
                    >
                      <div className={file.color}>{file.icon}</div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-amber-50 mb-1">
                        {file.title}
                      </h3>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {file.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-900/20 text-amber-300/80 border border-amber-900/20"
                          >
                            {tag === 'Print-Ready' && <CheckCircle2 className="h-3 w-3" />}
                            {tag === 'Editable' && <ExternalLink className="h-3 w-3" />}
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-amber-200/50 text-sm leading-relaxed mb-4">
                    {file.description}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-amber-200/40">
                    <span>Filename: {file.filename}</span>
                    <span>Size: {file.size}</span>
                    {file.pages && <span>{file.pages}</span>}
                  </div>
                </div>

                {/* Download Button */}
                <div className="shrink-0 flex items-center">
                  <button
                    onClick={() => handleDownload(file)}
                    className="group/btn inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-500 text-stone-950 font-semibold rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-amber-600/20 active:scale-95"
                  >
                    <Download className="h-5 w-5 group-hover/btn:animate-bounce" />
                    Download
                    <ChevronRight className="h-4 w-4 opacity-0 -ml-2 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all duration-200" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="max-w-4xl mx-auto mt-12"
      >
        <div className="bg-gradient-to-br from-amber-900/20 to-stone-900/40 border border-amber-900/30 rounded-2xl p-6 md:p-8 text-center">
          <Sparkles className="h-6 w-6 text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-amber-100 mb-2">
            Need Additional Information?
          </h3>
          <p className="text-amber-200/50 text-sm max-w-lg mx-auto mb-4">
            For detailed financial projections, partnership inquiries, or to schedule
            a demo with the founding team, please reach out to us directly.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-amber-300/70">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/20 rounded-lg border border-amber-900/20">
              <ExternalLink className="h-3.5 w-3.5" />
              Live Demo: 3boxes-luxury-v12.vercel.app
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-900/20 rounded-lg border border-amber-900/20">
              <Building2 className="h-3.5 w-3.5" />
              GitHub: github.com/pmkshar/3-boxes-luxury
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
