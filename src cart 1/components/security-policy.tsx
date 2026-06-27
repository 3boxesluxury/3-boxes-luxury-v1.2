'use client';

import { PolicyPage, PolicySection, PolicyBullet, PolicyCallout } from '@/components/policy-page';
import {
  Shield,
  KeyRound,
  Camera,
  ScanFace,
  BrainCircuit,
  ImageIcon,
  LogIn,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Fingerprint,
  Eye,
  Server,
  Trash2,
  Mail,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

export function SecurityPolicy() {
  return (
    <PolicyPage
      title="Security Policy"
      subtitle="How we protect your account, data, and identity"
      icon={Shield}
      badge="Verified"
    >
      {/* Intro */}
      <PolicyCallout variant="info">
        <div className="flex items-start gap-2">
          <ShieldCheck className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
          <span>
            At <strong className="text-amber-300">3 Boxes Luxury</strong>, security is not an afterthought — it&apos;s
            built into every layer of our platform. This policy outlines the comprehensive measures we take
            to safeguard your identity, data, and transactions.
          </span>
        </div>
      </PolicyCallout>

      {/* 1. Two-Factor Authentication */}
      <PolicySection icon={KeyRound} title="Two-Factor Authentication (2FA)" badge="Optional" index={0}>
        <p className="text-amber-200/60">
          We provide optional two-factor authentication for all account types, adding an extra
          layer of security beyond your password.
        </p>
        <div className="rounded-lg bg-stone-800/50 border border-amber-900/15 p-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-400/70 mb-2">How It Works</p>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">1</div>
            <span className="text-amber-200/60">Log in with your email and password</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">2</div>
            <span className="text-amber-200/60">A 6-digit OTP is sent to your registered device</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-amber-600/15 text-amber-300 text-xs font-bold flex-shrink-0">3</div>
            <span className="text-amber-200/60">Enter the code to complete verification</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-7 w-7 rounded-full bg-emerald-600/15 text-emerald-300 text-xs font-bold flex-shrink-0">✓</div>
            <span className="text-emerald-200/70">Access granted — your account is secured</span>
          </div>
        </div>
        <p className="text-amber-200/50 text-xs">
          <strong className="text-amber-200/70">Supported for:</strong> Customer accounts, Corporate accounts, and Team/Agent accounts
        </p>
      </PolicySection>

      {/* 2. Selfie Upload Protection */}
      <PolicySection icon={Camera} title="Selfie Upload Protection" badge="Enforced" badgeColor="bg-emerald-600/15 text-emerald-300 border-emerald-600/25" index={1}>
        <p className="text-amber-200/60">
          We enforce a strict selfie policy to ensure identity verification is accurate and reliable.
        </p>
        <PolicyBullet icon={CheckCircle2}>
          <strong className="text-amber-200/80">Clean Selfie Only Policy:</strong> Only clean, clear, well-lit selfies are accepted for identity verification.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          No obscene or inappropriate images will be accepted — such uploads are automatically rejected.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          Unclear or heavily filtered photos will be rejected to ensure identity integrity.
        </PolicyBullet>
        <PolicyBullet icon={UserCheck}>
          Only the user&apos;s own selfie is accepted. Camera verification is available to confirm identity in real time.
        </PolicyBullet>
      </PolicySection>

      {/* 3. Camera Verification (Live Selfie) */}
      <PolicySection icon={ScanFace} title="Camera Verification (Live Selfie)" badge="Real-time" index={2}>
        <p className="text-amber-200/60">
          Our camera verification feature allows users to open their device camera directly to capture a live selfie,
          ensuring the highest level of identity assurance.
        </p>
        <PolicyBullet icon={Smartphone}>
          Users can open their device camera directly within the app to take a selfie in real time.
        </PolicyBullet>
        <PolicyBullet icon={Fingerprint}>
          This ensures the original person is uploading their own photo — not a stored or altered image.
        </PolicyBullet>
        <PolicyBullet icon={Shield}>
          Provides an additional layer of identity verification beyond static image uploads.
        </PolicyBullet>
        <PolicyCallout variant="success">
          <div className="flex items-start gap-2">
            <ScanFace className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
            <span>
              <strong className="text-emerald-300">Live verification</strong> significantly reduces the risk of identity fraud by confirming the user is physically present during the selfie capture.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 4. AI Image Content Moderation */}
      <PolicySection icon={BrainCircuit} title="AI Image Content Moderation" badge="Automated" badgeColor="bg-violet-600/15 text-violet-300 border-violet-600/25" index={3}>
        <p className="text-amber-200/60">
          All uploaded selfies are processed through our AI-powered content moderation system to ensure safety and compliance.
        </p>
        <PolicyBullet icon={Eye}>
          All uploaded selfies are cross-checked for appropriateness using advanced AI algorithms.
        </PolicyBullet>
        <PolicyBullet icon={AlertTriangle}>
          Obscene, explicit, or inappropriate content is automatically detected and rejected.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          Image quality checks ensure clarity, proper lighting, and proper framing.
        </PolicyBullet>
        <PolicyBullet icon={Trash2}>
          <strong className="text-amber-200/80">No storage of uploaded images</strong> — all images are processed securely and deleted immediately after moderation.
        </PolicyBullet>
        <PolicyCallout variant="info">
          <div className="flex items-start gap-2">
            <Lock className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
            <span>
              Your privacy is paramount. Selfies are processed in memory, never persisted to disk, and purged within seconds of analysis.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 5. AI Influencer Gallery */}
      <PolicySection icon={ImageIcon} title="AI Influencer Gallery — Registered Users Only" badge="Restricted" badgeColor="bg-rose-600/15 text-rose-300 border-rose-600/25" index={4}>
        <p className="text-amber-200/60">
          Our AI Influencer Gallery allows users to share AI-generated images, with strict controls to maintain a safe community.
        </p>
        <PolicyBullet icon={UserCheck}>
          Only registered and logged-in users can upload AI-generated images to the gallery.
        </PolicyBullet>
        <PolicyBullet icon={Lock}>
          Anonymous uploads are <strong className="text-amber-200/80">not permitted</strong> — every upload is tied to a verified account.
        </PolicyBullet>
        <PolicyBullet icon={CheckCircle2}>
          All uploads require user consent and explicit acknowledgment that the content is AI-generated.
        </PolicyBullet>
        <PolicyBullet icon={Trash2}>
          Users can request removal of their shared images at any time — no questions asked.
        </PolicyBullet>
      </PolicySection>

      {/* 6. Separate Login Flows */}
      <PolicySection icon={LogIn} title="Separate Login Flows" badge="Multi-tier" index={5}>
        <p className="text-amber-200/60">
          We maintain distinct login flows for different account types, each with security measures tailored to the access level required.
        </p>

        {/* Corporate */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Server className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">Corporate Login</span>
          </div>
          <PolicyBullet>
            Dedicated login for business accounts with company-specific fields and verification
          </PolicyBullet>
          <PolicyBullet>
            Enhanced security with company domain validation and admin approval workflows
          </PolicyBullet>
        </div>

        {/* Customer */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Smartphone className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">Customer / User Login</span>
          </div>
          <PolicyBullet>
            Personal shopping account with social login options (Google, Apple, etc.)
          </PolicyBullet>
          <PolicyBullet>
            Streamlined experience with optional 2FA for added security
          </PolicyBullet>
        </div>

        {/* Team/Agent */}
        <div className="rounded-lg border border-amber-900/15 bg-stone-800/30 p-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <Fingerprint className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-semibold text-amber-200/90">Team / Agent Login</span>
          </div>
          <PolicyBullet>
            Internal team portal with approval-based access control
          </PolicyBullet>
          <PolicyBullet>
            Role-based permissions and activity auditing for compliance
          </PolicyBullet>
        </div>
      </PolicySection>

      {/* 7. Data Protection */}
      <PolicySection icon={Lock} title="Data Protection" badge="Encrypted" badgeColor="bg-sky-600/15 text-sky-300 border-sky-600/25" index={6}>
        <p className="text-amber-200/60">
          We employ industry-leading practices to protect your personal and financial data at every stage.
        </p>
        <PolicyBullet icon={ShieldCheck}>
          <strong className="text-amber-200/80">All data is encrypted</strong> both in transit (TLS 1.3) and at rest (AES-256).
        </PolicyBullet>
        <PolicyBullet icon={Lock}>
          Payment information is processed through secure, <strong className="text-amber-200/80">PCI-compliant</strong> payment gateways — we never store raw card details.
        </PolicyBullet>
        <PolicyBullet icon={Eye}>
          Personal data is <strong className="text-amber-200/80">never shared</strong> with third parties without your explicit consent.
        </PolicyBullet>
        <PolicyBullet icon={Trash2}>
          Users can request <strong className="text-amber-200/80">complete data deletion</strong> at any time through their account settings or by contacting support.
        </PolicyBullet>
        <PolicyCallout variant="warning">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-orange-400" />
            <span>
              We will never ask for your password, full card number, or sensitive credentials via email or phone. 
              If you receive such a request, report it immediately.
            </span>
          </div>
        </PolicyCallout>
      </PolicySection>

      {/* 8. Session Security */}
      <PolicySection icon={Clock} title="Session Security" badge="Active" index={7}>
        <p className="text-amber-200/60">
          We implement robust session management to prevent unauthorized access, even if your device is left unattended.
        </p>
        <PolicyBullet icon={Clock}>
          <strong className="text-amber-200/80">Automatic session timeout</strong> after a period of inactivity — you&apos;ll be prompted to re-authenticate.
        </PolicyBullet>
        <PolicyBullet icon={KeyRound}>
          <strong className="text-amber-200/80">Secure token-based authentication</strong> with short-lived access tokens and secure refresh mechanisms.
        </PolicyBullet>
        <PolicyBullet icon={Eye}>
          <strong className="text-amber-200/80">Device and location tracking</strong> for suspicious activity — anomalies are flagged and verified.
        </PolicyBullet>
        <PolicyBullet icon={Mail}>
          <strong className="text-amber-200/80">Email notifications</strong> for new device logins, so you&apos;re always aware of account access.
        </PolicyBullet>
      </PolicySection>

      {/* Closing statement */}
      <PolicyCallout variant="success">
        <div className="flex items-start gap-2">
          <Shield className="h-4 w-4 mt-0.5 flex-shrink-0 text-emerald-400" />
          <span>
            <strong className="text-emerald-300">Our commitment:</strong> We continuously invest in security infrastructure and regularly audit our systems 
            to stay ahead of emerging threats. Your trust is the foundation of 3 Boxes Luxury, and we take that responsibility seriously.
          </span>
        </div>
      </PolicyCallout>
    </PolicyPage>
  );
}
