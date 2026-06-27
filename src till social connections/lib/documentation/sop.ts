import { DocumentationDoc } from './types';

const sopDoc: DocumentationDoc = {
  id: 'sop-documentation',
  title: '3BOXES Standard Operating Procedures',
  description: 'Detailed Standard Operating Procedures (SOPs) for every user role on the 3BOXES platform: Admin, User, Agent, Team Member, Corporate User, and Guest. Each SOP provides step-by-step instructions for all available actions.',
  category: 'sop',
  isConfidential: false,
  version: '1.0.0',
  lastUpdated: '2025-03-04',
  sections: [
    // ─── ADMIN SOP ───────────────────────────────────────────────────
    {
      id: 'admin-sop',
      title: 'Admin Standard Operating Procedures',
      content: `<h2>Admin SOP</h2>
<p>Administrators have full platform access with the ability to manage products, orders, users, corporate accounts, campaigns, coupons, reports, audit logs, SMTP settings, permissions, and Shopify synchronization. The admin dashboard is accessed by users with <code>role: 'admin'</code> and provides tabbed navigation for all management functions.</p>

<h3>Accessing the Admin Dashboard</h3>
<ol>
<li>Log in with an admin account (email + password + 2FA if enabled)</li>
<li>The system verifies <code>user.role === 'admin'</code> and <code>user.approvalStatus === 'approved'</code></li>
<li>Navigate to the Admin Dashboard view from the header navigation or directly via <code>setView('admin-dashboard')</code></li>
<li>The Admin Dashboard component renders tabbed sections: Overview, Products, Orders, Users, Corporate, Campaigns, Coupons, Categories, Audit Logs, Permissions, Shopify, Partners, Training, SMTP, API Logs</li>
</ol>`,
      subsections: [
        {
          id: 'admin-products-management',
          title: 'Managing Products',
          content: `<h3>Product Management SOP</h3>

<h4>Adding a New Product</h4>
<ol>
<li>Navigate to Admin Dashboard → Products tab</li>
<li>Click "Add Product" button to open the product creation form</li>
<li>Fill in required fields:
  <ul>
    <li><strong>Name</strong>: Product display name (e.g., "Diamond Temple Necklace")</li>
    <li><strong>Description</strong>: Full product description with features and details</li>
    <li><strong>Price</strong>: Selling price in INR (base currency)</li>
    <li><strong>Compare At Price</strong>: Original price for discount display (optional)</li>
    <li><strong>Cost Price</strong>: Cost for margin calculation (optional)</li>
    <li><strong>Category</strong>: Select from existing categories or create new</li>
    <li><strong>SKU</strong>: Stock keeping unit identifier</li>
    <li><strong>Stock</strong>: Initial inventory quantity</li>
    <li><strong>Images</strong>: Upload product images (primary image first)</li>
  </ul>
</li>
<li>Set optional fields:
  <ul>
    <li><strong>Tags</strong>: Comma-separated tags for search and filtering</li>
    <li><strong>Occasions</strong>: Select applicable occasions (birthday, anniversary, wedding, diwali, christmas, etc.)</li>
    <li><strong>Recipient Types</strong>: him, her, couple, kids, parents, friend, colleague</li>
    <li><strong>Relationships</strong>: spouse, parent, sibling, friend, colleague, boss</li>
    <li><strong>Delivery Estimate</strong>: e.g., "3-5 business days"</li>
    <li><strong>Featured</strong>: Check to show in featured section</li>
  </ul>
</li>
<li>Add product variants (if applicable):
  <ul>
    <li>Click "Add Variant" for each size/color/material option</li>
    <li>Set variant name, price override, stock, and attributes (JSON)</li>
    <li>Upload variant-specific image if different from main product</li>
  </ul>
</li>
<li>Click "Create Product" — the system:
  <ul>
    <li>Generates a unique <code>productNumber</code> and URL slug</li>
    <li>Stores images as JSON array in the <code>images</code> field</li>
    <li>Creates <code>ProductImage</code> records with sort order</li>
    <li>Creates <code>ProductVariant</code> records</li>
    <li>Creates an <code>InventoryLog</code> entry (type: "in")</li>
    <li>Creates an <code>AuditLog</code> entry</li>
  </ul>
</li>
</ol>

<h4>Editing a Product</h4>
<ol>
<li>Find the product in the Products table (search, filter by category)</li>
<li>Click the edit (pencil) icon to open the edit form</li>
<li>Modify any fields and click "Save Changes"</li>
<li>The system updates the product record and creates an AuditLog entry</li>
</ol>

<h4>Deleting a Product</h4>
<ol>
<li>Find the product and click the delete (trash) icon</li>
<li>Confirm deletion in the AlertDialog</li>
<li>The system soft-deletes by setting <code>syncStatus: 'removed'</code> and removes from search results</li>
<li>Related CartItems and WishlistItems are also cleaned up</li>
</ol>

<h4>Managing Stock</h4>
<ol>
<li>View current stock levels in the Products table (stock column with color-coded status)</li>
<li>Click the stock number to manually adjust inventory</li>
<li>Choose adjustment type: "in" (add stock), "out" (remove stock), "adjustment" (correction), "return" (customer return)</li>
<li>Enter quantity and optional note</li>
<li>The system creates an InventoryLog entry and updates the Product stock count</li>
<li>Stock status auto-updates: in_stock (>reorderLevel), low_stock (≤reorderLevel), out_of_stock (0)</li>
</ol>`
        },
        {
          id: 'admin-orders-management',
          title: 'Managing Orders',
          content: `<h3>Order Management SOP</h3>

<h4>Viewing Orders</h4>
<ol>
<li>Navigate to Admin Dashboard → Orders tab</li>
<li>View orders in a sortable, filterable table with columns: Order #, Customer, Date, Total, Status, Payment Status</li>
<li>Filter by status: pending, processing, shipped, delivered, cancelled</li>
<li>Filter by payment status: pending, paid, failed, refunded</li>
<li>Search by order number or customer name</li>
<li>Click on an order row to view full details</li>
</ol>

<h4>Processing an Order</h4>
<ol>
<li>Open the order detail view</li>
<li>Review order items, shipping address, and payment status</li>
<li>Update order status through the workflow:
  <ul>
    <li><strong>pending → processing</strong>: Verify payment, begin fulfillment</li>
    <li><strong>processing → shipped</strong>: Add tracking number and URL, set estimated delivery</li>
    <li><strong>shipped → delivered</strong>: Confirm delivery (auto via tracking or manual)</li>
  </ul>
</li>
<li>For each status change, the system:
  <ul>
    <li>Creates an OrderTrackingEvent record</li>
    <li>Creates an AuditLog entry</li>
    <li>Sends notification email to customer (if SMTP configured)</li>
  </ul>
</li>
</ol>

<h4>Processing a Refund</h4>
<ol>
<li>Open the order detail view</li>
<li>Click "Issue Refund" button</li>
<li>Select items to refund and enter refund amount</li>
<li>Choose refund reason</li>
<li>The system:
  <ul>
    <li>Initiates refund via payment provider (Razorpay/Stripe)</li>
    <li>Updates order <code>refundStatus</code> to "pending"</li>
    <li>Updates order status to "cancelled" if full refund</li>
    <li>Creates an InventoryLog entry (type: "return") for restocked items</li>
    <li>Creates an AuditLog entry</li>
  </ul>
</li>
</ol>

<h4>Generating Invoices</h4>
<ol>
<li>Open the order detail view</li>
<li>Click "Generate Invoice" button</li>
<li>The system creates an OrderInvoice record with:
  <ul>
    <li>Unique invoice number</li>
    <li>Order amounts (subtotal, tax, total)</li>
    <li>PDF generated via <code>src/lib/pdf-utils.ts</code></li>
  </ul>
</li>
<li>Download or send the invoice to the customer</li>
</ol>`
        },
        {
          id: 'admin-users-corporate',
          title: 'Managing Users & Corporate Accounts',
          content: `<h3>User Management SOP</h3>

<h4>Viewing Users</h4>
<ol>
<li>Navigate to Admin Dashboard → Users tab</li>
<li>View all users with columns: Name, Email, Role, Approval Status, 2FA, Last Login</li>
<li>Filter by role: admin, user, agent, team, corporate</li>
<li>Filter by approval status: pending, approved, rejected, suspended</li>
<li>Search by name or email</li>
</ol>

<h4>Approving User Registrations</h4>
<ol>
<li>Find users with <code>approvalStatus: 'pending'</code></li>
<li>Review user details (name, email, role requested)</li>
<li>Click "Approve" to activate the account, or "Reject" to deny</li>
<li>The system:
  <ul>
    <li>Updates <code>approvalStatus</code> to "approved" or "rejected"</li>
    <li>Sends notification email to the user</li>
    <li>Creates an AuditLog entry</li>
  </ul>
</li>
</ol>

<h4>Managing User Permissions</h4>
<ol>
<li>Navigate to Admin Dashboard → Permissions tab</li>
<li>View the role-permission matrix</li>
<li>For individual users, click "Manage Permissions"</li>
<li>Toggle specific permissions on/off</li>
<li>The system creates/destroys UserPermission records and logs the change</li>
</ol>

<h4>Suspending a User</h4>
<ol>
<li>Find the user in the Users table</li>
<li>Click "Suspend" — this sets <code>isActive: false</code> and <code>approvalStatus: 'suspended'</code></li>
<li>The user's sessions are invalidated immediately</li>
<li>Audit log entry is created</li>
</ol>

<h3>Corporate Account Management SOP</h3>

<h4>Approving Corporate Registrations</h4>
<ol>
<li>Navigate to Admin Dashboard → Corporate tab</li>
<li>Find corporate accounts with <code>approvalStatus: 'pending'</code></li>
<li>Review company details: name, industry, GST number, contact info</li>
<li>Click "Approve" to activate the corporate account</li>
<li>Set initial credit limit and discount percentage</li>
<li>The corporate user can now access the Corporate Dashboard</li>
</ol>

<h4>Managing Corporate Campaigns</h4>
<ol>
<li>View campaigns from the Corporate tab or Campaigns sub-tab</li>
<li>Review campaign details: occasion, budget, recipients, selected product</li>
<li>Approve or reject campaigns submitted by corporate users</li>
<li>Monitor campaign progress: ordered count, shipped count, delivered count</li>
<li>Process bulk orders for approved campaigns</li>
</ol>`
        },
        {
          id: 'admin-campaigns-coupons',
          title: 'Managing Campaigns & Coupons',
          content: `<h3>Campaign Management SOP</h3>

<h4>Reviewing Campaign Submissions</h4>
<ol>
<li>Navigate to Admin Dashboard → Campaigns tab</li>
<li>Filter by status: draft, pending_approval, approved, in_progress, completed</li>
<li>For each campaign in "pending_approval" status:
  <ul>
    <li>Review campaign name, occasion, and budget</li>
    <li>Verify recipient list (names, emails, delivery addresses)</li>
    <li>Check selected product availability and stock</li>
    <li>Approve or reject with comments</li>
  </ul>
</li>
</ol>

<h4>Processing Corporate Campaign Orders</h4>
<ol>
<li>For approved campaigns, click "Process Orders"</li>
<li>The system creates individual orders for each recipient</li>
<li>Review and confirm each order</li>
<li>Update tracking information as orders ship</li>
<li>Monitor delivery status and confirm completion</li>
</ol>

<h3>Coupon Management SOP</h3>

<h4>Creating a Coupon</h4>
<ol>
<li>Navigate to Admin Dashboard → Coupons tab</li>
<li>Click "Create Coupon"</li>
<li>Fill in coupon details:
  <ul>
    <li><strong>Code</strong>: Unique coupon code (e.g., "DIWALI2024")</li>
    <li><strong>Title</strong>: Display title (e.g., "Diwali Special 20% Off")</li>
    <li><strong>Type</strong>: percentage, fixed, or free_shipping</li>
    <li><strong>Value</strong>: Discount value (percentage number or fixed amount)</li>
    <li><strong>Min Order</strong>: Minimum order amount for coupon to apply</li>
    <li><strong>Max Discount</strong>: Maximum discount cap (for percentage coupons)</li>
    <li><strong>Valid From / Valid To</strong>: Coupon validity period</li>
    <li><strong>Usage Limit</strong>: Maximum number of uses (null = unlimited)</li>
  </ul>
</li>
<li>Click "Create Coupon"</li>
</ol>

<h4>Monitoring Coupon Usage</h4>
<ol>
<li>View coupon list with columns: Code, Type, Value, Used Count, Status, Valid Until</li>
<li>Check usage count against usage limit</li>
<li>Deactivate coupons by setting <code>isActive: false</code></li>
</ol>`
        },
        {
          id: 'admin-reports-audit',
          title: 'Reports, Audit Logs & SMTP',
          content: `<h3>Reports SOP</h3>

<h4>Generating Reports</h4>
<ol>
<li>Navigate to Admin Dashboard → Reports tab</li>
<li>Select report type:
  <ul>
    <li><strong>Sales Report</strong>: Revenue by period, product, category</li>
    <li><strong>Order Report</strong>: Order counts, average order value, status distribution</li>
    <li><strong>Product Report</strong>: Best sellers, low stock, category performance</li>
    <li><strong>User Report</strong>: Registration trends, active users, role distribution</li>
    <li><strong>Corporate Report</strong>: Campaign performance, corporate spending</li>
  </ul>
</li>
<li>Select date range and filters</li>
<li>Click "Generate Report" to view data in charts and tables</li>
<li>Export report data as CSV or PDF</li>
</ol>

<h3>Audit Log Review SOP</h3>

<h4>Reviewing Audit Logs</h4>
<ol>
<li>Navigate to Admin Dashboard → Audit Logs tab</li>
<li>View log entries sorted by most recent first</li>
<li>Filter by:
  <ul>
    <li><strong>Action type</strong>: login, logout, password_change, role_change, etc.</li>
    <li><strong>User</strong>: Filter by specific user</li>
    <li><strong>Entity</strong>: user, order, product, corporate, campaign</li>
    <li><strong>Date range</strong>: Filter by time period</li>
  </ul>
</li>
<li>Each log entry shows: timestamp, user, action, entity, IP address, details</li>
<li>Click on an entry to view full JSON details</li>
</ol>

<h3>SMTP Configuration SOP</h3>

<h4>Setting Up Email</h4>
<ol>
<li>Navigate to Admin Dashboard → SMTP tab</li>
<li>Enter SMTP configuration:
  <ul>
    <li><strong>Host</strong>: SMTP server hostname (e.g., smtp.gmail.com)</li>
    <li><strong>Port</strong>: SMTP port (587 for TLS, 465 for SSL)</li>
    <li><strong>Username</strong>: SMTP authentication email</li>
    <li><strong>Password</strong>: SMTP authentication password (encrypted)</li>
    <li><strong>From Email</strong>: Sender email address</li>
    <li><strong>From Name</strong>: Sender display name (e.g., "3BOXES Luxury")</li>
  </ul>
</li>
<li>Click "Test Connection" to verify settings</li>
<li>Click "Save Configuration" to store settings</li>
</ol>`
        },
        {
          id: 'admin-shopify-sync-training',
          title: 'Shopify Sync & Training Docs',
          content: `<h3>Shopify Synchronization SOP</h3>

<h4>Initial Shopify Setup</h4>
<ol>
<li>Navigate to Admin Dashboard → Shopify tab</li>
<li>Enter Shopify Admin API token via <code>/api/shopify/admin-token</code></li>
<li>Configure Shopify store domain</li>
<li>Register webhooks by clicking "Register Webhooks"</li>
<li>Verify connection by checking status</li>
</ol>

<h4>Running Product Sync</h4>
<ol>
<li>Click "Sync Products" button in the Shopify tab</li>
<li>The system fetches products from Shopify Storefront API</li>
<li>For each Shopify product:
  <ul>
    <li>Check if product exists locally (by handle or externalId)</li>
    <li>Update existing: sync price, stock, images</li>
    <li>Create new: import with all details, create ProductImage records</li>
  </ul>
</li>
<li>Review sync results: products added, updated, errors</li>
<li>Check sync logs for any failures</li>
</ol>

<h4>Monitoring Shopify Integration</h4>
<ol>
<li>Check integration status in the Shopify tab</li>
<li>View last sync timestamp and result</li>
<li>Review webhook delivery logs</li>
<li>Resolve sync errors by re-syncing specific products</li>
</ol>

<h3>Training Document Management SOP</h3>

<h4>Creating Training Documents</h4>
<ol>
<li>Navigate to Admin Dashboard → Training tab</li>
<li>Click "Create Document"</li>
<li>Enter title, content (Markdown supported), and category</li>
<li>Click "Save" to create the WikiDocument</li>
</ol>

<h4>Sharing Documents with Agents</h4>
<ol>
<li>Find the document in the Training tab</li>
<li>Click "Share with Agent"</li>
<li>Select the agent from the user list</li>
<li>Set permissions: can download, can share further</li>
<li>Add an optional message</li>
<li>The system creates an AgentDocShare record and notifies the agent</li>
</ol>

<h4>Managing Training Videos</h4>
<ol>
<li>Click "Add Video Link"</li>
<li>Enter video title and URL (YouTube, Vimeo, etc.)</li>
<li>Assign to category and target audience</li>
<li>Save — the video link appears in the agent's training section</li>
</ol>`
        }
      ]
    },

    // ─── USER SOP ────────────────────────────────────────────────────
    {
      id: 'user-sop',
      title: 'User Standard Operating Procedures',
      content: `<h2>User SOP</h2>
<p>Regular users (role: 'user') can browse products, use AI try-on, manage their cart and checkout, maintain a wishlist, track orders, write reviews, and customize their profile settings including language and currency preferences.</p>`,
      subsections: [
        {
          id: 'user-browsing-searching',
          title: 'Browsing & Searching Products',
          content: `<h3>Product Browsing SOP</h3>

<h4>Browsing by Category</h4>
<ol>
<li>On the home page, view the Category Grid showing all available categories with images</li>
<li>Click on a category card to filter products by that category</li>
<li>The Product Grid updates to show only products in the selected category</li>
<li>Use breadcrumbs or the "All Categories" button to navigate back</li>
</ol>

<h4>Using Gift Filters</h4>
<ol>
<li>On the home page, use the Gift Filter Bar to find gifts by:
  <ul>
    <li><strong>Occasion</strong>: Birthday, Anniversary, Wedding, Diwali, Christmas, etc.</li>
    <li><strong>Recipient</strong>: Him, Her, Couple, Kids, Parents, Friend, Colleague</li>
    <li><strong>Relationship</strong>: Spouse, Parent, Sibling, Friend, Colleague, Boss</li>
    <li><strong>Price Range</strong>: Budget-friendly to Premium</li>
  </ul>
</li>
<li>Multiple filters can be combined for precise results</li>
<li>Clear filters with the "Clear All" button</li>
</ol>

<h4>Searching Products</h4>
<ol>
<li>Use the search bar in the header</li>
<li>Type a search query (product name, category, tag)</li>
<li>The Product Grid shows matching results in real-time</li>
<li>Search covers product name, description, and tags</li>
</ol>

<h4>Sorting & Pagination</h4>
<ol>
<li>Use the sort dropdown to order results: Price (Low-High), Price (High-Low), Rating, Newest, Most Popular</li>
<li>Navigate pages using the pagination component at the bottom</li>
</ol>`
        },
        {
          id: 'user-ai-tryon',
          title: 'Using AI Virtual Try-On',
          content: `<h3>AI Try-On SOP</h3>

<h4>Starting a Try-On Session</h4>
<ol>
<li>Open a product detail page for any product that supports try-on</li>
<li>Click the "AI Style Preview" button (or camera icon)</li>
<li>The Try-On Dialog opens with instructions</li>
<li>Upload a selfie photo:
  <ul>
    <li>Click "Upload Photo" or drag and drop an image</li>
    <li>Use the camera button to take a photo directly (mobile)</li>
    <li>The system validates the image: must contain a face, appropriate content</li>
  </ul>
</li>
<li>Click "Generate Preview" to start the AI try-on</li>
</ol>

<h4>During Generation</h4>
<ol>
<li>A progress indicator shows the current pipeline phase:
  <ul>
    <li>"Preparing your style preview..."</li>
    <li>"Trying AI virtual try-on..." (HuggingFace IDM-VTON)</li>
    <li>"AI is generating your style preview..." (ZAI generation)</li>
    <li>"Verifying quality..." (VLM verification)</li>
    <li>"Refining for better color accuracy..." (refinement passes)</li>
  </ul>
</li>
<li>Typical generation time: 15-60 seconds depending on service load</li>
</ol>

<h4>Viewing Results</h4>
<ol>
<li>The generated image appears in the dialog</li>
<li>Quality scores are displayed: color accuracy, face accuracy</li>
<li>View product suggestions that pair well with the current item</li>
<li>Save the result to your portfolio (with consent for public display)</li>
<li>Share the result on social media</li>
<li>Try another product or upload a different selfie</li>
</ol>`
        },
        {
          id: 'user-cart-checkout',
          title: 'Cart & Checkout',
          content: `<h3>Shopping Cart SOP</h3>

<h4>Adding Items to Cart</h4>
<ol>
<li>From the Product Grid or Product Detail page, click "Add to Cart"</li>
<li>If the product has variants, select the desired variant first (size, color, material)</li>
<li>Optionally enable:
  <ul>
    <li><strong>Gift Wrapping</strong>: Wraps the item in premium gift wrap</li>
    <li><strong>Greeting Message</strong>: Add a custom message to the gift</li>
    <li><strong>Hide Price</strong>: Removes price from the gift receipt</li>
  </ul>
</li>
<li>The cart count in the header updates immediately</li>
</ol>

<h4>Managing Cart Items</h4>
<ol>
<li>Open the cart view by clicking the cart icon in the header</li>
<li>Adjust quantities using +/- buttons or typing a number</li>
<li>Remove items by clicking the trash icon</li>
<li>Apply a coupon code in the "Have a coupon?" section</li>
<li>View the order summary: subtotal, discount, estimated shipping</li>
</ol>

<h3>Checkout SOP</h3>

<h4>Completing a Purchase</h4>
<ol>
<li>From the cart, click "Proceed to Checkout"</li>
<li>Step 1 — Shipping Information:
  <ul>
    <li>Enter or confirm: First Name, Last Name, Email, Phone</li>
    <li>Enter shipping address: Street, City, State, ZIP Code, Country</li>
    <li>Country auto-detected from geo-information</li>
  </ul>
</li>
<li>Step 2 — Delivery Options:
  <ul>
    <li>Standard Delivery (3-5 business days) — Free over ₹999</li>
    <li>Express Delivery (1-2 business days) — Additional fee</li>
    <li>Same Day Delivery (select cities) — Premium fee</li>
    <li>Scheduled Delivery — Choose a specific date</li>
  </ul>
</li>
<li>Step 3 — Gift Options:
  <ul>
    <li>Select occasion (birthday, anniversary, etc.)</li>
    <li>Choose gift wrap style: classic, premium, luxury</li>
    <li>Add greeting message</li>
  </ul>
</li>
<li>Step 4 — Payment:
  <ul>
    <li>Razorpay (India): Cards, UPI, Net Banking, Wallets</li>
    <li>Stripe (International): Cards, Apple Pay, Google Pay</li>
    <li>Complete payment in the provider's secure modal</li>
  </ul>
</li>
<li>After successful payment, the Order Confirmation page shows:
  <ul>
    <li>Order number and details</li>
    <li>Estimated delivery date</li>
    <li>Tracking information (when available)</li>
  </ul>
</li>
</ol>`
        },
        {
          id: 'user-wishlist-orders-reviews',
          title: 'Wishlist, Order Tracking & Reviews',
          content: `<h3>Wishlist SOP</h3>

<h4>Managing Wishlist</h4>
<ol>
<li>Add items to wishlist from Product Cards or Product Detail by clicking the heart icon</li>
<li>View wishlist from the User Dashboard or header navigation</li>
<li>Move items from wishlist to cart using the "Add to Cart" button</li>
<li>Remove items from wishlist with the trash icon</li>
<li>Wishlist items are stored in the WishlistItem model and persist across sessions</li>
</ol>

<h3>Order Tracking SOP</h3>

<h4>Tracking an Order</h4>
<ol>
<li>Navigate to User Dashboard → Orders section or use "Track Order" in the header</li>
<li>Enter order number or select from order history</li>
<li>View the order tracking timeline with events:
  <ul>
    <li><strong>Order Placed</strong> — Timestamp and confirmation</li>
    <li><strong>Confirmed</strong> — Order verified and payment confirmed</li>
    <li><strong>Processing</strong> — Order being prepared for shipment</li>
    <li><strong>Shipped</strong> — Tracking number and carrier information</li>
    <li><strong>Out for Delivery</strong> — Package with local delivery agent</li>
    <li><strong>Delivered</strong> — Delivery confirmed with timestamp</li>
  </ul>
</li>
<li>Click the tracking URL to view on the carrier's website</li>
</ol>

<h4>Requesting a Refund</h4>
<ol>
<li>Open the order detail from order history</li>
<li>Click "Request Refund"</li>
<li>Select reason and provide details</li>
<li>The admin reviews and processes the refund</li>
<li>Refund status is tracked in the order: pending → processed/denied</li>
</ol>

<h3>Reviews SOP</h3>

<h4>Writing a Review</h4>
<ol>
<li>Open a product you have purchased</li>
<li>Scroll to the Reviews section</li>
<li>Click "Write a Review"</li>
<li>Rate the product (1-5 stars)</li>
<li>Enter a review title and comment</li>
<li>Submit — the review is linked to your order (verified purchase badge)</li>
</ol>

<h4>Using AI Style Previews in Reviews</h4>
<ol>
<li>If you have an AI-generated style preview for this product</li>
<li>You can attach it to your review</li>
<li>Give consent for public display in the Customer Portfolio</li>
<li>Admin reviews and approves the portfolio entry for public display</li>
</ol>`
        },
        {
          id: 'user-profile-settings',
          title: 'Profile & Settings',
          content: `<h3>Profile Settings SOP</h3>

<h4>Updating Profile</h4>
<ol>
<li>Navigate to User Dashboard → Profile section</li>
<li>Update display name, email, phone number</li>
<li>Upload or change avatar image</li>
<li>Changes are saved via <code>PUT /api/auth/me</code></li>
</ol>

<h4>Enabling Two-Factor Authentication</h4>
<ol>
<li>Navigate to User Dashboard → Security section</li>
<li>Click "Enable 2FA"</li>
<li>The system generates a TOTP secret and QR code</li>
<li>Scan the QR code with your authenticator app (Google Authenticator, Authy)</li>
<li>Enter the 6-digit code to verify setup</li>
<li>2FA is now required for all future logins</li>
</ol>

<h4>Changing Password</h4>
<ol>
<li>Navigate to User Dashboard → Security section</li>
<li>Enter current password</li>
<li>Enter new password (must meet strength requirements)</li>
<li>Confirm new password</li>
<li>The system hashes the new password and creates an AuditLog entry</li>
</ol>

<h4>Switching Language</h4>
<ol>
<li>Click the language selector in the header</li>
<li>Choose from 10 supported languages</li>
<li>The UI immediately updates to the selected language</li>
<li>Language preference is saved in localStorage and database</li>
</ol>

<h4>Switching Currency</h4>
<ol>
<li>Click the currency selector in the header</li>
<li>Choose from supported currencies (INR, USD, EUR, GBP, etc.)</li>
<li>All prices update with the current exchange rate</li>
<li>Currency preference is saved in localStorage and database</li>
</ol>`
        }
      ]
    },

    // ─── AGENT SOP ───────────────────────────────────────────────────
    {
      id: 'agent-sop',
      title: 'Agent Standard Operating Procedures',
      content: `<h2>Agent SOP</h2>
<p>Support agents (role: 'agent') manage customer support tickets, look up customer information, share training documents, and assist customers with their inquiries. The Agent Dashboard is a dedicated interface for support operations.</p>`,
      subsections: [
        {
          id: 'agent-ticket-management',
          title: 'Support Ticket Management',
          content: `<h3>Ticket Management SOP</h3>

<h4>Viewing Tickets</h4>
<ol>
<li>Log in with an agent account</li>
<li>Navigate to the Agent Dashboard</li>
<li>View all support tickets in a sortable table</li>
<li>Filter by status: open, in_progress, resolved, closed</li>
<li>Filter by priority: low, medium, high, urgent</li>
<li>Sort by date, priority, or status</li>
</ol>

<h4>Responding to a Ticket</h4>
<ol>
<li>Click on a ticket to open the detail view</li>
<li>Review the ticket subject, description, and message history</li>
<li>Click "Change Status" → "In Progress" to claim the ticket</li>
<li>Type your response in the message input</li>
<li>Click "Send" — the message is saved to SupportTicketMessage and the customer is notified</li>
<li>After resolving the issue, change status to "Resolved"</li>
<li>If the customer confirms resolution, the ticket can be "Closed"</li>
</ol>

<h4>Escalating a Ticket</h4>
<ol>
<li>Change the ticket priority to "high" or "urgent"</li>
<li>Add a note explaining the escalation reason</li>
<li>Tag an admin or senior agent in the message</li>
</ol>`
        },
        {
          id: 'agent-customer-lookup-docs',
          title: 'Customer Lookup & Document Sharing',
          content: `<h3>Customer Lookup SOP</h3>

<h4>Looking Up a Customer</h4>
<ol>
<li>In the Agent Dashboard, use the "Customer Lookup" search bar</li>
<li>Search by name, email, or phone number</li>
<li>View customer details:
  <ul>
    <li>Account information (name, email, role, approval status)</li>
    <li>Recent orders with status</li>
    <li>Open support tickets</li>
    <li>Wishlist items</li>
  </ul>
</li>
<li>Use this information to provide better support</li>
</ol>

<h3>Document Sharing SOP</h3>

<h4>Sharing Documents with Customers</h4>
<ol>
<li>Admin shares documents with agents via the Training tab</li>
<li>Agents can view shared documents in their dashboard</li>
<li>Documents include: product guides, shipping policies, FAQ answers, training materials</li>
<li>If <code>canDownload</code> permission is set, agents can download the document</li>
<li>If <code>canShare</code> permission is set, agents can share with customers</li>
</ol>

<h4>Using AI Assistant for Support</h4>
<ol>
<li>Use the built-in AI assistant to help draft responses</li>
<li>Ask the AI about product details, shipping policies, or order status</li>
<li>The AI assistant uses the same backend as the customer-facing chatbot</li>
<li>Always verify AI-generated information before sending to customers</li>
</ol>`
        }
      ]
    },

    // ─── TEAM MEMBER SOP ─────────────────────────────────────────────
    {
      id: 'team-member-sop',
      title: 'Team Member Standard Operating Procedures',
      content: `<h2>Team Member SOP</h2>
<p>Team members (role: 'team') are responsible for inventory management, order processing, and stock monitoring. They have access to the Team Dashboard with dedicated tools for these tasks.</p>`,
      subsections: [
        {
          id: 'team-inventory-management',
          title: 'Inventory Management',
          content: `<h3>Inventory Management SOP</h3>

<h4>Monitoring Stock Levels</h4>
<ol>
<li>Log in with a team account</li>
<li>Navigate to the Team Dashboard</li>
<li>View the inventory overview showing:
  <ul>
    <li>Total products and stock count</li>
    <li>Products below reorder level (highlighted in orange)</li>
    <li>Out-of-stock products (highlighted in red)</li>
    <li>Low-stock products (highlighted in yellow)</li>
  </ul>
</li>
<li>Sort by stock level to prioritize restocking needs</li>
</ol>

<h4>Adjusting Inventory</h4>
<ol>
<li>Find the product in the inventory list</li>
<li>Click the stock count to open the adjustment form</li>
<li>Select adjustment type:
  <ul>
    <li><strong>"in"</strong>: Add new stock (restocking)</li>
    <li><strong>"out"</strong>: Remove stock (damaged, expired)</li>
    <li><strong>"adjustment"</strong>: Correct count after audit</li>
    <li><strong>"return"</strong>: Customer return restocking</li>
  </ul>
</li>
<li>Enter the quantity and a note explaining the adjustment</li>
<li>The system:
  <ul>
    <li>Updates the Product stock count</li>
    <li>Recalculates stock status (in_stock, low_stock, out_of_stock)</li>
    <li>Creates an InventoryLog entry</li>
  </ul>
</li>
</ol>

<h4>Setting Reorder Levels</h4>
<ol>
<li>For each product, set a reorder level (minimum stock before alert)</li>
<li>Default is 5 units, adjust based on product demand</li>
<li>Products at or below the reorder level appear in the "Needs Restocking" list</li>
</ol>`
        },
        {
          id: 'team-order-processing',
          title: 'Order Processing & Stock Monitoring',
          content: `<h3>Order Processing SOP</h3>

<h4>Processing Pending Orders</h4>
<ol>
<li>View pending orders in the Team Dashboard</li>
<li>For each order:
  <ul>
    <li>Verify payment status is "paid"</li>
    <li>Check product availability (all items in stock)</li>
    <li>Pack the order with correct items and quantities</li>
    <li>Apply gift wrapping if requested</li>
    <li>Attach greeting message if provided</li>
  </ul>
</li>
<li>Update order status from "pending" to "processing"</li>
<li>After shipping, add tracking number and update status to "shipped"</li>
<li>The system creates OrderTrackingEvent entries for each status change</li>
</ol>

<h3>Stock Monitoring SOP</h3>

<h4>Daily Stock Review</h4>
<ol>
<li>At the start of each day, review the stock dashboard</li>
<li>Check for products that went below reorder level overnight</li>
<li>Create a restocking list for procurement</li>
<li>Update stock levels as new inventory arrives</li>
<li>Verify inventory accuracy with periodic counts</li>
</ol>

<h4>Handling Stock-Out Situations</h4>
<ol>
<li>When a product goes out of stock:
  <ul>
    <li>Set stock status to "out_of_stock"</li>
    <li>Products automatically become unavailable for purchase</li>
    <li>Notify admin for restocking priority</li>
  </ul>
</li>
<li>If a pending order contains an out-of-stock item:
  <ul>
    <li>Contact the customer about the delay</li>
    <li>Offer alternatives or partial shipment</li>
    <li>Update order with expected restock date</li>
  </ul>
</li>
</ol>`
        }
      ]
    },

    // ─── CORPORATE USER SOP ──────────────────────────────────────────
    {
      id: 'corporate-user-sop',
      title: 'Corporate User Standard Operating Procedures',
      content: `<h2>Corporate User SOP</h2>
<p>Corporate users (role: 'corporate') manage corporate gifting campaigns through the Corporate Dashboard. They can register their company, create campaigns, manage recipients, customize branding, place bulk orders, and import recipients via CSV.</p>`,
      subsections: [
        {
          id: 'corporate-registration-branding',
          title: 'Registration & Branding Customization',
          content: `<h3>Corporate Registration SOP</h3>

<h4>Registering a Corporate Account</h4>
<ol>
<li>Navigate to the registration page</li>
<li>Select "Corporate Account" registration type</li>
<li>Fill in company details:
  <ul>
    <li><strong>Company Name</strong>: Legal company name</li>
    <li><strong>Industry</strong>: Business sector</li>
    <li><strong>Website</strong>: Company website URL</li>
    <li><strong>GST Number</strong>: GST registration number (encrypted)</li>
    <li><strong>PAN Number</strong>: Company PAN</li>
  </ul>
</li>
<li>Fill in contact information:
  <ul>
    <li><strong>Contact Name</strong>: Primary contact person</li>
    <li><strong>Contact Email</strong>: Corporate email address</li>
    <li><strong>Contact Phone</strong>: Phone number</li>
  </ul>
</li>
<li>Fill in billing address</li>
<li>Create login credentials (email + password)</li>
<li>Submit registration — the account is created with <code>approvalStatus: 'pending'</code></li>
<li>Wait for admin approval before accessing the Corporate Dashboard</li>
</ol>

<h3>Branding Customization SOP</h3>

<h4>Setting Up Corporate Branding</h4>
<ol>
<li>Navigate to Corporate Dashboard → Branding section</li>
<li>Upload company logo (used on gift packaging)</li>
<li>Set brand colors:
  <ul>
    <li><strong>Primary Color</strong>: Main brand color (hex)</li>
    <li><strong>Secondary Color</strong>: Accent color (hex)</li>
  </ul>
</li>
<li>Set default greeting message for all campaigns</li>
<li>Choose packaging type: standard, premium, luxury</li>
<li>Configure gift wrap style (ribbon color, wrapping type)</li>
<li>Toggle "Include Corporate Branding" on/off</li>
<li>Toggle "Hide Price on Gifts" on/off</li>
<li>Upload custom card template (optional)</li>
<li>Save branding settings</li>
</ol>`
        },
        {
          id: 'corporate-campaigns-recipients',
          title: 'Campaign Creation & Recipient Management',
          content: `<h3>Campaign Creation SOP</h3>

<h4>Creating a New Campaign</h4>
<ol>
<li>Navigate to Corporate Dashboard → Campaigns section</li>
<li>Click "Create Campaign"</li>
<li>Fill in campaign details:
  <ul>
    <li><strong>Campaign Name</strong>: Descriptive name (e.g., "Diwali 2024 Employee Gifts")</li>
    <li><strong>Occasion</strong>: diwali, christmas, new_year, birthday, anniversary, onboarding</li>
    <li><strong>Description</strong>: Campaign notes and objectives</li>
    <li><strong>Budget Per Recipient</strong>: Maximum gift value per person</li>
    <li><strong>Total Budget</strong>: Overall campaign budget</li>
    <li><strong>Delivery Type</strong>: bulk (same product for all) or individual (different products)</li>
    <li><strong>Delivery Date</strong>: Target delivery date</li>
    <li><strong>Greeting Message</strong>: Custom message for this campaign</li>
  </ul>
</li>
<li>Select product(s):
  <ul>
    <li>For bulk delivery: Choose one product for all recipients</li>
    <li>For individual delivery: Allow per-recipient product selection</li>
  </ul>
</li>
<li>Click "Save as Draft" or "Submit for Approval"</li>
</ol>

<h3>Recipient Management SOP</h3>

<h4>Adding Recipients Manually</h4>
<ol>
<li>Open the campaign and navigate to Recipients section</li>
<li>Click "Add Recipient"</li>
<li>Enter recipient details:
  <ul>
    <li>Name, Email, Phone</li>
    <li>Designation, Department</li>
    <li>Delivery Address, City, State, ZIP Code</li>
    <li>Override product (for individual delivery type)</li>
    <li>Override budget (if different from campaign default)</li>
    <li>Custom message (override campaign message)</li>
  </ul>
</li>
<li>Save — the recipient appears in the campaign list</li>
</ol>

<h4>Importing Recipients from CSV</h4>
<ol>
<li>Click "Import CSV" in the Recipients section</li>
<li>Download the CSV template (or use your own with matching columns)</li>
<li>Required columns: name, email</li>
<li>Optional columns: phone, designation, department, address, city, state, zipCode, productId, budget, message</li>
<li>Upload the completed CSV file</li>
<li>The system:
  <ul>
    <li>Parses the CSV and validates each row</li>
    <li>Creates CampaignRecipient records</li>
    <li>Reports any validation errors</li>
    <li>Shows import summary (added, skipped, errors)</li>
  </ul>
</li>
</ol>

<h4>Managing Team Members</h4>
<ol>
<li>Navigate to Corporate Dashboard → Members section</li>
<li>Invite team members by email with a role:
  <ul>
    <li><strong>corporate_admin</strong>: Full access to all corporate features</li>
    <li><strong>finance_user</strong>: View budgets and financial reports</li>
    <li><strong>campaign_manager</strong>: Create and manage campaigns</li>
  </ul>
</li>
<li>Invited members receive an email invitation</li>
<li>Manage existing members: update roles, suspend access</li>
</ol>`
        },
        {
          id: 'corporate-bulk-ordering',
          title: 'Bulk Ordering & CSV Import',
          content: `<h3>Bulk Ordering SOP</h3>

<h4>Submitting a Campaign for Approval</h4>
<ol>
<li>Review all campaign details, recipients, and product selections</li>
<li>Click "Submit for Approval"</li>
<li>The campaign status changes to "pending_approval"</li>
<li>Admin reviews and approves or rejects the campaign</li>
<li>Once approved, the campaign status changes to "approved"</li>
</ol>

<h4>Processing Bulk Orders</h4>
<ol>
<li>After admin approval, click "Place Orders" to generate individual orders for each recipient</li>
<li>The system creates:
  <ul>
    <li>One Order per recipient with the selected product</li>
    <li>Corporate branding applied (logo, colors, gift wrap, greeting)</li>
    <li>Price hidden if configured in branding</li>
    <li>Corporate discount applied automatically</li>
  </ul>
</li>
<li>Orders are processed in batches to manage inventory</li>
<li>Track delivery status for each recipient in the campaign dashboard</li>
</ol>

<h4>Monitoring Campaign Progress</h4>
<ol>
<li>View the campaign dashboard showing:
  <ul>
    <li>Total recipients</li>
    <li>Gifts ordered / shipped / delivered</li>
    <li>Outstanding orders</li>
    <li>Budget utilized vs. total budget</li>
  </ul>
</li>
<li>Filter recipients by gift status</li>
<li>Download delivery reports</li>
<li>Communicate with the admin about any issues</li>
</ol>`
        }
      ]
    },

    // ─── GUEST SOP ───────────────────────────────────────────────────
    {
      id: 'guest-sop',
      title: 'Guest Standard Operating Procedures',
      content: `<h2>Guest SOP</h2>
<p>Guest users (not logged in) can browse products, search, view product details, use geo-detection for currency/language, and click affiliate links. They must register or log in to access cart, checkout, wishlist, AI try-on, and other features.</p>`,
      subsections: [
        {
          id: 'guest-browsing-geo',
          title: 'Browsing, Searching & Geo-Detection',
          content: `<h3>Guest Browsing SOP</h3>

<h4>Browsing as a Guest</h4>
<ol>
<li>Visit 3boxes.in — the home page loads with hero section, categories, and featured products</li>
<li>Browse categories by clicking category cards</li>
<li>View product details by clicking product cards</li>
<li>Use the search bar to find products</li>
<li>Apply gift filters (occasion, recipient, relationship)</li>
<li>Sort and paginate through product listings</li>
</ol>

<h4>Geo-Detection</h4>
<ol>
<li>On first visit, the system automatically detects the user's country from their IP address</li>
<li>The <code>/api/geo</code> endpoint returns: country code, country name, currency code, language code, flag emoji</li>
<li>Currency auto-switches to the detected country's currency (unless manually overridden)</li>
<li>Language defaults to English but the language switcher shows the detected country's language</li>
<li>Geo information is stored in the Zustand store (<code>geoInfo</code>, <code>geoDetected</code>)</li>
</ol>

<h4>Affiliate Links</h4>
<ol>
<li>Some products are external (marked with platform badge: Myntra, Nykaa, Amazon, etc.)</li>
<li>Clicking "Buy on [Platform]" redirects to the affiliate URL</li>
<li>The system tracks the click via <code>POST /api/affiliate/click</code> with product ID, platform, IP, and user agent</li>
<li>Affiliate clicks are recorded in the AffiliateClick model for commission tracking</li>
</ol>

<h4>Encouraged to Register</h4>
<p>When guests try to access features requiring authentication (cart, wishlist, try-on, checkout), the Auth Dialog appears prompting registration. Benefits communicated:</p>
<ul>
<li>AI Virtual Try-On for personalized style previews</li>
<li>Wishlist for saving favorite products</li>
<li>Order tracking and history</li>
<li>Personalized recommendations</li>
<li>Multi-currency and language preferences</li>
</ul>`
        }
      ]
    }
  ]
};

export default sopDoc;
