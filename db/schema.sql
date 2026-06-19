-- Enable UUID extension for robust distributed keys
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Users Table
CREATE TABLE Users (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    avatar_url TEXT,
    default_depot VARCHAR(30) CHECK (default_depot IN ('CHILILABOMBWE', 'KASUMBALESA', 'CHINGOLA')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Groups Table
CREATE TABLE Groups (
    group_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_code VARCHAR(10) UNIQUE NOT NULL,
    group_name VARCHAR(150) NOT NULL,
    target_amount_zmw DECIMAL(12, 2) NOT NULL,
    contribution_frequency VARCHAR(20) CHECK (contribution_frequency IN ('WEEKLY', 'MONTHLY')),
    current_round INT DEFAULT 1,
    status VARCHAR(20) CHECK (status IN ('FORMING', 'ACTIVE', 'COMPLETED')) DEFAULT 'FORMING'
);

-- 3. Create Group Members Join Table
CREATE TABLE Group_Members (
    membership_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES Groups(group_id) ON DELETE CASCADE,
    user_id UUID REFERENCES Users(user_id) ON DELETE CASCADE,
    rotation_number INT NOT NULL,
    has_received_payout BOOLEAN DEFAULT FALSE,
    UNIQUE(group_id, user_id),
    UNIQUE(group_id, rotation_number)
);

-- 4. Create Products Catalog Table
CREATE TABLE Products (
    product_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    supplier_name VARCHAR(150) NOT NULL,
    origin_country VARCHAR(20) CHECK (origin_country IN ('SOUTH_AFRICA', 'TANZANIA')),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    price_zmw DECIMAL(12, 2) NOT NULL,
    weight_kg DECIMAL(8, 2) NOT NULL,
    image_urls TEXT[] NOT NULL
);

-- 5. Create Core Orders Table
CREATE TABLE Orders (
    order_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES Users(user_id) NOT NULL,
    product_id UUID REFERENCES Products(product_id) NOT NULL,
    group_id UUID REFERENCES Groups(group_id) ON DELETE SET NULL,
    total_paid_zmw DECIMAL(12, 2) NOT NULL,
    purchase_type VARCHAR(30) CHECK (purchase_type IN ('CHILIMBA_ROTATION', 'DIRECT_BUY')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create Granular Logistics Tracking Table
CREATE TABLE Logistics_Tracking (
    tracking_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES Orders(order_id) ON DELETE CASCADE,
    current_status VARCHAR(30) CHECK (current_status IN ('PAYMENT_RECEIVED', 'READY_FOR_DISPATCH', 'COLLECTED_BY_RUNNER', 'LOADED_FOR_TRANSIT', 'ARRIVED_AT_DEPOT', 'CLOSED')) DEFAULT 'PAYMENT_RECEIVED',
    current_location VARCHAR(255) NOT NULL,
    depot_town VARCHAR(30) CHECK (depot_town IN ('CHILILABOMBWE', 'KASUMBALESA', 'CHINGOLA')),
    depot_pickup_otp VARCHAR(255) NOT NULL,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Create Financial Lenco Audit Log Table
CREATE TABLE Lenco_Transactions (
    transaction_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES Orders(order_id) ON DELETE SET NULL,
    group_id UUID REFERENCES Groups(group_id) ON DELETE SET NULL,
    lenco_reference VARCHAR(100) UNIQUE NOT NULL,
    amount_zmw DECIMAL(12, 2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('PENDING', 'SUCCESSFUL', 'FAILED')) DEFAULT 'PENDING',
    phone_used VARCHAR(20) NOT NULL
);

-- Performance Optimization Indexes for Depot Management Queries
CREATE INDEX idx_tracking_depot ON Logistics_Tracking(depot_town);
CREATE INDEX idx_tracking_status ON Logistics_Tracking(current_status);
CREATE INDEX idx_orders_user ON Orders(user_id);
