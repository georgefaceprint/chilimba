# Technical Product Requirements & Blueprint Document

This document serves as the single source of truth for the Chilimba Marketplace platform. It defines the core product value propositions, database architectures, user interaction patterns, and pending developer backlogs for sales reps, product trainers, and engineering teams.

---

## 1. Executive Summary & Value Props (Sales Target)

Chilimba is a mobile-first social shopping and collective saving platform tailored for emerging markets. Sourcing wholesale goods from regional hubs (such as Tanzania and South Africa) and distributing them to consumers in Zambia presents significant challenges: high individual shipping costs, a lack of trust in digital checkouts, and low access to formal banking.

Chilimba solves these issues by turning group trust and social communication into purchasing power:

*   **Rotating Savings Circles (Chilimbas):** Capitalizes on traditional peer-to-peer rotating savings networks. Users form trust groups to aggregate capital, allowing them to purchase high-value products in turn without relying on credit.
*   **Co-Buying & Shared Logistics:** By grouping items in a single cart, members split international freight and local transit rates. The platform automatically aggregates quantities to unlock wholesale pricing tiers, saving up to 20% on product costs.
*   **Frictionless WhatsApp Virality:** Group links share instantly via WhatsApp. Invites are deep-linked, allowing guests to preview group carts anonymously before signing up. This drives rapid, low-friction viral loops.
*   **Trust-Based Hybrid Payments:** To support local payment preferences, the checkout system handles automated mobile money STK prompts (via Lenco), personal app wallets, and manual offline P2P mobile money transfers directly to the Group Admin.

---

## 2. Functional Feature Map (Developer Target)

The codebase consists of an Express API backend, Firestore collections for active application state, legacy PostgreSQL tables for transaction records, and a mobile-optimized web frontend.

### A. Core Modules
*   ** WooCommerce Sourcing Scraper:** Reads and parses active listings from the EpicToto Store (Tanzania), decodes title strings, extracts age metadata, converts TZS prices to ZMW using base exchange rates, applies agent margins and forex markups, and seeds the product collection.
*   **Role-Based Access Control (RBAC):** Restricts route access based on verified profiles: CUSTOMER, AGENT, RUNNER, DEPOT_MANAGER, and SUPER_ADMIN.
*   **Wholesale Pricing Engine:** Evaluates product quantity thresholds (1+, 3+, 6+ units) in active carts and applies discounts of 10% and 20% dynamically.
*   **Logistics Tracking System:** Updates transit status using QR-code scanning, checking off legs from sourcing hubs to local depots, and generating secure pickup OTPs.
*   **Group Chat & Voice Message Stream:** Enables group members to discuss purchases. Encodes voice messages to base64 audio data URLs and streams them with a 60-second limit and live visual recording timers.

### B. Database Schema & Collections
The application operates on a hybrid storage architecture:

#### Firestore Collections (Active Application State)
*   **users:** Stores profiles, names, avatar images, roles, default dispatch depots, and prepaid wallet balances.
*   **products:** Catalog listings detailing category, sub-category, origin city/country, weight in kilograms, base prices in ZMW/TZS, trust ratings, and quantity discount tiers.
*   **groups:** Tracks active co-buying circle metadata, admins, secure invite codes, member limits, and order states (Editing, Waiting for Contributions, Order Placed).
*   **user_groups:** Maps users to groups with designated roles (Admin or Member) and timestamps.
*   **group_contributions:** Split ledger records tracking individual goods totals, shared shipping shares, payment methods (Wallet, Lenco MoMo, Offline), reference IDs, and states (Pending, Submitted, Paid).
*   **group_messages:** Chat logs containing text strings, Base64 voice data strings, sender names, and timestamp metadata.
*   **logistics_tracking:** Tracking statuses, locations, scanner information, and depot pickup verification codes.

#### PostgreSQL Relational Tables (Legacy Audit Log)
*   **Users:** ID, unique phone number, email, display name, default depot, and creation timestamps.
*   **Groups:** Target ZMW savings amounts, payment frequencies, active round indexes, and formation statuses.
*   **Group_Members:** Membership identifiers linking users to rotation indexes and payout flags.
*   **Products:** Supplier, origin, base pricing, weight, and image array fields.
*   **Orders:** References user purchases, group associations, total ZMW paid, and purchase types.
*   **Logistics_Tracking:** Step-by-step statuses matching transit routes, depot town designations, and secure pickup OTP codes.
*   **Lenco_Transactions:** Gateway payment tracking logs matching internal references, amounts, states, and phone numbers.

### C. Express API Endpoint Catalog
*   **Authentication:** callbacks for Google OAuth, WhatsApp OTP creation and verification, session validation, KYC submission, and session terminations.
*   **Catalog Sourcing:** list catalog products, and supplier/agent product listing uploads.
*   **Logistics:** scan QR codes to update locations and dispatch hubs, and customer order tracking lookups.
*   **Chilimba Groups:** check name availability, group registration, invite code associations, active group listings, and pre-auth invite previews.
*   **Wallet Management:** wallet balance lookups, and agent-mediated top-ups.
*   **Cart Operations:** add products, fetch group cart details (calculating wholesale discounts), and order checkouts.
*   **Split Payments Ledger:** lock carts, calculate contributions, submit split payment status, and verify admin receipts.
*   **Group Messaging:** chat history retrievals, and text/audio message submissions.

---

## 3. User Workflows & Screen Maps (Trainer Target)

This map tracks how users navigate screens and how data flows through front-end views:

### A. The Onboarding & Guest Workflow
*   **Step 1: Invite Click:** A member shares a group link via WhatsApp. An unauthenticated guest clicks the link and lands on the anonymous group preview screen (join.html). The browser queries the public-info API, rendering the group name, member counts, and active items without requiring sign-in.
*   **Step 2: Sign-Up redirection:** The guest clicks "Join Group to Save". The page stores the group invite code in localStorage and redirects the guest to the signup screen (signup.html).
*   **Step 3: Registration & Automatic Join:** The guest registers via Google OAuth or WhatsApp OTP verification. The signup page detects the pending invite code, adds the user as a member, and routes them directly to the active group cart.

### B. The Co-Buying Cart & Locking Workflow
*   **Step 1: Sourcing & Cart Addition:** Users browse products, view price tiers and progress meters, and add items to their group cart. The shared cart aggregates items by product ID.
*   **Step 2: Pricing Adjustments:** As total group quantities rise, unit prices drop, displaying green badges and savings estimates next to products in the cart.
*   **Step 3: Admin Cart Lock:** Once members finish shopping, the Group Admin clicks "Lock Cart & Request Split Payments". The backend locks the cart, splits shipping costs equally among members, generates contribution ledger entries, and notifies the group.

### C. The Contribution & Checkout Workflow
*   **Step 1: Split board board review:** Members open the group cart to view the Split Contributions board. The UI lists all members and their share amounts (Individual Goods + Split Logistics).
*   **Step 2: Payment options selection:** Members choose a payment option:
    *   *App Wallet:* Deducts directly from their balance.
    *   *Lenco MoMo:* Prompts an STK push on their phone.
    *   *Offline Transfer:* Displays the Admin's phone number. Members transfer the funds directly, enter the receipt code, and submit.
*   **Step 3: Admin verification & checkout:** The Admin reviews submitted receipt references against their phone's incoming messages and clicks "Record Offline Payment" or "Approve Receipt". Once all members are paid, the system automatically marks the order as Placed, clears the cart, and redirects users to their dashboards.

### D. Logistics Delivery & Depot Pickup Workflow
*   **Step 1: Sourcing & Border clearance:** Sourced items undergo QR scans at origin centers and border posts, updating customer tracking timelines in real-time.
*   **Step 2: Depot arrival:** When the container reaches the local hub depot (e.g. Kasumbalesa), the depot manager scans it. The system generates a secure pickup OTP and broadcasts it to the customer.
*   **Step 3: Collection:** The customer presents the OTP at the depot. The manager enters it on their scanner screen, confirming release and closing the order.

---

## 4. The Final 10% (Development Backlog)

These items represent stubs, discrepancies, and tooling gaps that developers must complete to move the project to production:

*   **Database Synchronization Gap:** The active routes in server.js use Firestore for groups, carts, scan logs, messages, and contributions. However, the legacy files (such as payments.js, whatsapp.js) and the database schema (db/schema.sql) reference PostgreSQL. Developers must consolidate these to ensure a single, consistent datastore (rebuilding payments and alerts on Firestore, or writing a sync worker).
*   **Failing Test Suite (`scripts/integration-test.js`):** This script is hardcoded to test PostgreSQL routes (like PUT /tracking/dispatch, border, depot-arrival, and release) which do not exist in the active Express server. Running it results in 404 gateway failures. Developers must refactor the test suite to target the active Firestore-based QR scan API (`POST /api/v1/tracking/scan`).
*   **Missing Package Scripts:** The package.json lacks test configurations or testing runners. Devs should integrate Jest or Mocha to automate integration test runs during deployment pipelines.
*   **Supplier & Runner Portal UI Stubs:** The views supplier-portal.html and runner-portal.html contain hardcoded tables and lack dynamic fetching logic. They must be linked to the scan and tracking endpoints.
