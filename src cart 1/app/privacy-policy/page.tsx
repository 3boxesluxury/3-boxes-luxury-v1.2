import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy - 3 Boxes Luxury',
  description: 'Privacy Policy for 3 Boxes Luxury, including Facebook and Instagram data collection practices.',
};

export default function PrivacyPolicyPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.8', color: '#333' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#111' }}>Privacy Policy</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>Last updated: June 12, 2026</p>

      <p>
        3 Boxes Luxury (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and share your personal information when you use our website at https://3-boxes-luxury-v1-2.vercel.app (the &quot;Service&quot;), including when you connect your Facebook and Instagram accounts.
      </p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>1. Information We Collect</h2>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>1.1 Information You Provide Directly</h3>
      <p>We collect information you provide when you create an account, browse products, make purchases, or contact us, including:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Name, email address, and contact details</li>
        <li>Account credentials and preferences</li>
        <li>Purchase history and shopping preferences</li>
        <li>Messages or feedback you send to us</li>
      </ul>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>1.2 Information from Facebook</h3>
      <p>When you connect your Facebook account to our Service, we collect the following information through the Facebook Login and Facebook Graph API:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Profile Information:</strong> Your name, email address, profile picture, and birthday (if you grant permission)</li>
        <li><strong>Photos and Likes:</strong> Your photos and liked content (if you grant the relevant permissions)</li>
        <li><strong>Facebook Page Data:</strong> If you manage Facebook Pages, we may access basic page information</li>
      </ul>
      <p>
        We use this information to personalize your shopping experience and provide fashion recommendations. Facebook Login is optional — you can use our Service without connecting your Facebook account.
      </p>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>1.3 Information from Instagram</h3>
      <p>When you connect your Instagram account through Facebook (Instagram Business Account linked to your Facebook Page), we collect the following information through the Instagram Graph API:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Instagram Profile:</strong> Your Instagram username, bio, and profile picture</li>
        <li><strong>Instagram Posts:</strong> Your recent image posts, including photos, captions, and hashtags</li>
        <li><strong>Post Analysis:</strong> We use AI (computer vision) to analyze your Instagram photos to detect clothing styles, accessories, colors, fashion preferences, and product categories to provide personalized recommendations</li>
        <li><strong>Engagement Data:</strong> Basic engagement metrics on your posts (if you grant permission)</li>
      </ul>
      <p>
        Instagram connection is optional — you can use our Service without connecting your Instagram account. Your Instagram data is used solely to improve fashion recommendations and is never shared with third parties for advertising purposes.
      </p>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>1.4 Automatically Collected Information</h3>
      <p>When you use our Service, we automatically collect:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Device information (browser type, operating system)</li>
        <li>IP address and approximate location</li>
        <li>Pages viewed, time spent, and navigation patterns</li>
        <li>Cookies and similar tracking technologies</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>2. How We Use Your Information</h2>
      <p>We use the information we collect for the following purposes:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Personalized Fashion Recommendations:</strong> Analyzing your Facebook and Instagram data (photos, captions, hashtags, bio) using AI to suggest products that match your style preferences</li>
        <li><strong>Account Management:</strong> Creating and managing your account, authentication, and security</li>
        <li><strong>Service Improvement:</strong> Understanding how users interact with our Service to improve features and user experience</li>
        <li><strong>Communication:</strong> Sending order confirmations, updates, and customer support responses</li>
        <li><strong>Analytics:</strong> Aggregated, anonymized analysis to understand usage trends</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>3. How We Use Facebook and Instagram Data</h2>
      <p>Specifically, your Facebook and Instagram data is processed as follows:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Photo Analysis (Instagram):</strong> Up to 5 of your recent Instagram image posts are analyzed by our AI visual analysis system. This detects clothing items, accessories, colors, styles, and product categories. The analysis results are used to boost relevant product recommendations in our catalog.</li>
        <li><strong>Text Signal Extraction:</strong> Your Instagram captions, hashtags, and bio text are analyzed to identify fashion preferences, brand affinities, and style keywords.</li>
        <li><strong>Profile Matching:</strong> Your age range, gender signals (from profile and content), and location help filter and rank product recommendations.</li>
        <li><strong>No Automated Posting:</strong> We never post to your Facebook or Instagram account on your behalf.</li>
        <li><strong>No Ad Targeting:</strong> We do not use your social media data for advertising or share it with ad networks.</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>4. Data Sharing and Third Parties</h2>
      <p>We do not sell, trade, or rent your personal information to third parties. We may share your data only in the following circumstances:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Service Providers:</strong> We use third-party services (hosting, payment processing, AI analysis) that may access your data to perform tasks on our behalf. These providers are contractually obligated to protect your data.</li>
        <li><strong>Legal Requirements:</strong> We may disclose your information if required by law, regulation, or legal process.</li>
        <li><strong>Business Transfers:</strong> In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of that transaction.</li>
      </ul>
      <p><strong>We do not share your Facebook or Instagram data with any third party for their own marketing or advertising purposes.</strong></p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>5. Data Storage and Retention</h2>
      <p>Your data is stored on secure servers with appropriate technical and organizational measures. We retain your personal information for the following periods:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Account Data:</strong> Retained for the duration of your account and up to 30 days after deletion</li>
        <li><strong>Facebook/Instagram Data:</strong> Retained for the duration of your connected account. You can disconnect at any time, and we will delete the associated social media data within 30 days</li>
        <li><strong>AI Analysis Results:</strong> Product recommendation scores derived from social media analysis are deleted when you disconnect your account</li>
        <li><strong>Purchase Records:</strong> Retained as required by applicable tax and commercial laws</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>6. Your Rights and Data Deletion</h2>
      <p>You have the following rights regarding your personal data:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
        <li><strong>Correction:</strong> Request correction of inaccurate personal data</li>
        <li><strong>Deletion:</strong> Request deletion of your personal data</li>
        <li><strong>Disconnect Social Accounts:</strong> Disconnect your Facebook or Instagram account at any time from your account settings</li>
        <li><strong>Data Portability:</strong> Request your data in a structured, machine-readable format</li>
      </ul>
      <p>
        <strong>To request data deletion, visit our Data Deletion page:</strong><br />
        <a href="https://3-boxes-luxury-v1-2.vercel.app/data-deletion" style={{ color: '#8B5CF6' }}>https://3-boxes-luxury-v1-2.vercel.app/data-deletion</a>
      </p>
      <p>
        You may also submit data deletion requests through Facebook&apos;s platform settings. When we receive a data deletion request from Facebook, we will delete all associated data within 30 days and confirm deletion to Facebook.
      </p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>7. Cookies and Tracking</h2>
      <p>We use cookies and similar technologies to:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Maintain your login session</li>
        <li>Remember your preferences</li>
        <li>Analyze site traffic and usage patterns</li>
        <li>Improve our Service performance</li>
      </ul>
      <p>You can control cookie settings through your browser preferences. Disabling cookies may affect some features of the Service.</p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>8. Security</h2>
      <p>We implement industry-standard security measures to protect your personal information, including:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Encryption in transit (HTTPS/TLS)</li>
        <li>Secure authentication and authorization</li>
        <li>Access controls limiting data access to authorized personnel only</li>
        <li>Regular security assessments</li>
      </ul>
      <p>While we strive to protect your data, no method of electronic transmission or storage is 100% secure. We cannot guarantee absolute security.</p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>9. Children&apos;s Privacy</h2>
      <p>Our Service is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If we learn that we have collected data from a child under 13, we will delete it promptly.</p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>10. International Data Transfers</h2>
      <p>Your information may be transferred to and processed in countries other than your country of residence. We ensure appropriate safeguards are in place for such transfers in compliance with applicable data protection laws.</p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>11. Changes to This Privacy Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on our website with a revised &quot;Last updated&quot; date. Your continued use of the Service after changes constitutes acceptance of the updated policy.</p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>12. Contact Us</h2>
      <p>If you have any questions about this Privacy Policy or our data practices, please contact us:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px', listStyle: 'none' }}>
        <li><strong>Email:</strong> privacy@3boxesluxury.com</li>
        <li><strong>Website:</strong> https://3-boxes-luxury-v1-2.vercel.app</li>
        <li><strong>Data Deletion:</strong> https://3-boxes-luxury-v1-2.vercel.app/data-deletion</li>
      </ul>

      <div style={{ marginTop: '40px', padding: '20px', background: '#f5f3ff', borderRadius: '8px', borderLeft: '4px solid #8B5CF6' }}>
        <p style={{ margin: '0', fontSize: '14px', color: '#555' }}>
          <strong>Facebook and Instagram Data Notice:</strong> This app uses Facebook Login and the Instagram Graph API. We comply with Facebook&apos;s Platform Terms and Data Policy. We only collect social media data that you explicitly authorize. You can revoke access at any time through your Facebook or Instagram settings.
        </p>
      </div>
    </div>
  );
}
