import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Data Deletion Instructions - 3 Boxes Luxury',
  description: 'Instructions for deleting your personal data from 3 Boxes Luxury, including Facebook and Instagram data.',
};

export default function DataDeletionPage() {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', fontFamily: 'Arial, sans-serif', lineHeight: '1.8', color: '#333' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '8px', color: '#111' }}>Data Deletion Instructions</h1>
      <p style={{ color: '#666', marginBottom: '32px' }}>3 Boxes Luxury — Data Deletion Policy</p>

      <p>
        At 3 Boxes Luxury, we respect your right to control your personal data. This page explains how you can request deletion of your data from our systems, including data collected through Facebook and Instagram.
      </p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>How to Request Data Deletion</h2>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>Option 1: Through Your Account</h3>
      <ol style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Log in to your 3 Boxes Luxury account</li>
        <li>Go to Account Settings</li>
        <li>Click &quot;Delete My Data&quot;</li>
        <li>Confirm the deletion request</li>
      </ol>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>Option 2: Through Facebook</h3>
      <ol style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Go to Facebook Settings &rarr; Apps and Websites</li>
        <li>Find &quot;3 Boxes Luxury API&quot; in the list</li>
        <li>Click &quot;Remove&quot; and select &quot;Delete all activity&quot;</li>
        <li>Facebook will send a data deletion request to us automatically</li>
      </ol>

      <h3 style={{ fontSize: '18px', marginTop: '24px', marginBottom: '8px', color: '#333' }}>Option 3: By Email</h3>
      <p>
        Send a data deletion request to: <strong>privacy@3boxesluxury.com</strong><br />
        Include your registered email address and/or Facebook ID so we can locate your data.
      </p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>What Data We Delete</h2>
      <p>When you request data deletion, we will remove the following from our systems:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Your account information (name, email, profile data)</li>
        <li>Facebook data (profile info, photos, likes retrieved through the API)</li>
        <li>Instagram data (username, bio, posts, photos, hashtags, captions)</li>
        <li>AI analysis results (style profiles, product recommendation scores)</li>
        <li>Shopping preferences and browsing history</li>
        <li>Any stored access tokens</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>Deletion Timeline</h2>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li><strong>Within 24 hours:</strong> Access tokens are revoked and API access is disabled</li>
        <li><strong>Within 7 days:</strong> Social media data (Facebook/Instagram) is deleted from our database</li>
        <li><strong>Within 30 days:</strong> All personal data is permanently deleted, including backups</li>
        <li><strong>After 30 days:</strong> No personal data remains in any of our systems</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>Data Retained</h2>
      <p>We may retain anonymized, aggregated data that cannot identify you personally, such as:</p>
      <ul style={{ marginLeft: '20px', marginBottom: '16px' }}>
        <li>Anonymized analytics data</li>
        <li>Transaction records required by law (without personal identifiers)</li>
      </ul>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>Confirmation</h2>
      <p>
        After your data is fully deleted, we will send a confirmation to Facebook (if the request came through Facebook) and/or to your registered email address. This confirmation serves as proof that your data has been removed from our systems.
      </p>

      <h2 style={{ fontSize: '22px', marginTop: '36px', marginBottom: '12px', color: '#111' }}>Contact Us</h2>
      <p>
        If you have questions about data deletion, contact us at: <strong>privacy@3boxesluxury.com</strong>
      </p>
    </div>
  );
}
