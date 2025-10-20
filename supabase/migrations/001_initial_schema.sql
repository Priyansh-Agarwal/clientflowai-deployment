-- Migration: Initial Multi-Tenant Schema Setup
-- Purpose: Create core multi-tenant tables with enhanced security and features
-- Date: 2024-01-01

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types/enums
CREATE TYPE public.app_role AS ENUM ('owner', 'admin', 'staff', 'viewer');
CREATE TYPE public.plan_type AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE public.billing_cycle AS ENUM ('monthly', 'yearly');
CREATE TYPE public.call_outcome AS ENUM ('booked', 'no_answer', 'follow_up', 'not_interested', 'wrong_number', 'busy', 'voicemail');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'confirmed', 'completed', 'cancelled', 'no_show', 'rescheduled');
CREATE TYPE public.conversation_channel AS ENUM ('sms', 'email', 'whatsapp', 'voice', 'web_chat');
CREATE TYPE public.conversation_status AS ENUM ('active', 'closed', 'archived');
CREATE TYPE public.notification_type AS ENUM ('call_booking', 'appointment_reminder', 'review_request', 'payment_due', 'system_alert');

-- ===============================
-- CORE TENANT MANAGEMENT TABLES
-- ===============================

-- Organizations (Multi-tenant root)
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- URL-friendly identifier
  domain TEXT, -- Custom domain support
  logo_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  plan_type plan_type DEFAULT 'free',
  billing_cycle billing_cycle DEFAULT 'monthly',
  subscription_status TEXT DEFAULT 'active', -- active, suspended, cancelled
  trial_ends_at TIMESTAMPTZ,
  subscription_ends_at TIMESTAMPTZ,
  max_users INTEGER DEFAULT 5,
  max_conversations INTEGER DEFAULT 100,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT org_name_length CHECK (length(name) >= 2 AND length(name) <= 100),
  CONSTRAINT org_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$'),
  CONSTRAINT org_max_users_check CHECK (max_users > 0)
);

-- Businesses (Sub-tenants within organizations)
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  industry TEXT,
  phone_number TEXT,
  email TEXT,
  website TEXT,
  address JSONB, -- Store structured address data
  business_hours JSONB DEFAULT '{"monday": "9:00-17:00", "tuesday": "9:00-17:00", "wednesday": "9:00-17:00", "thursday": "9:00-17:00", "friday": "9:00-17:00"}'::jsonb,
  timezone TEXT DEFAULT 'UTC',
  currency TEXT DEFAULT 'USD',
  calendar_id TEXT, -- External calendar integration
  review_link TEXT,
  social_links JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}', -- Business-specific settings
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  UNIQUE(organization_id, slug),
  CONSTRAINT business_name_length CHECK (length(name) >= 2 AND length(name) <= 100),
  CONSTRAINT business_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9\-]*[a-z0-9]$')
);

-- User profiles (Linked to auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  phone_number TEXT,
  title TEXT,
  bio TEXT,
  preferences JSONB DEFAULT '{}',
  last_login_at TIMESTAMPTZ,
  email_verified BOOLEAN DEFAULT false,
  phone_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Constraints
  CONSTRAINT profile_name_length CHECK (length(full_name) >= 1 AND length(full_name) <= 100)
);

-- Organization membership and roles
CREATE TABLE public.organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- owner, admin, member
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(organization_id, user_id),
  CONSTRAINT valid_role CHECK (role IN ('owner', 'admin', 'member'))
);

-- Business-specific user roles and permissions
CREATE TABLE public.business_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  permissions JSONB DEFAULT '{}',
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, user_id)
);

-- ===============================
-- BUSINESS OPERATIONS TABLES
-- ===============================

-- Customers (CRM records)
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  external_id TEXT, -- External CRM system ID
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  phone_formatted TEXT, -- Standardized format
  address JSONB,
  date_of_birth DATE,
  gender TEXT,
  preferences JSONB DEFAULT '{}',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  lead_source TEXT,
  status TEXT DEFAULT 'active', -- active, inactive, blocked
  last_interaction_at TIMESTAMPTZ,
  total_spent DECIMAL(10,2) DEFAULT 0,
  lifetime_value DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- Indexes and constraints
  UNIQUE(business_id, phone),
  UNIQUE(business_id, email) WHERE email IS NOT NULL,
  CONSTRAINT customer_name_length CHECK (length(first_name) >= 1 AND length(last_name) >= 1)
);

-- Services/Products catalog
CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  duration INTEGER NOT NULL DEFAULT 60, -- in minutes
  price DECIMAL(10,2),
  currency TEXT DEFAULT 'USD',
  tax_rate DECIMAL(5,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  requires_booking BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT positive_duration CHECK (duration > 0),
  CONSTRAINT positive_price CHECK (price >= 0)
);

-- Calls log
CREATE TABLE public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  external_call_id TEXT UNIQUE, -- Twilio/etc call SID
  caller_name TEXT,
  caller_phone TEXT NOT NULL,
  caller_phone_formatted TEXT,
  duration INTEGER, -- in seconds
  outcome call_outcome,
  transcript TEXT,
  transcript_summary TEXT,
  sentiment_score DECIMAL(3,2), -- -1.0 to 1.0
  keywords TEXT[],
  objection_notes TEXT,
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  converted BOOLEAN DEFAULT false,
  conversion_value DECIMAL(10,2),
  recording_url TEXT,
  recording_duration INTEGER,
  cost DECIMAL(10,4), -- Cost for this call
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT sentiment_bounds CHECK (sentiment_score >= -1.0 AND sentiment_score <= 1.0),
  CONSTRAINT positive_duration CHECK (duration >= 0),
  CONSTRAINT positive_cost CHECK (cost >= 0)
);

-- Conversations (Multi-channel)
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  conversation_id TEXT UNIQUE, -- External system conversation ID
  customer_name TEXT,
  customer_contact TEXT NOT NULL,
  channel conversation_channel NOT NULL,
  status conversation_status DEFAULT 'active',
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  tags TEXT[] DEFAULT '{}',
  subject TEXT,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  last_agent_response_at TIMESTAMPTZ,
  response_time INTEGER, -- in seconds
  satisfaction_score INTEGER, -- 1-5 rating
  escalated BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT satisfaction_bounds CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5)
);

-- Conversation messages
CREATE TABLE public.conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  message_id TEXT UNIQUE, -- External message ID
  sender_type TEXT NOT NULL, -- customer, agent, system, ai
  sender_id UUID REFERENCES public.profiles(id),
  content TEXT NOT NULL,
  content_type TEXT DEFAULT 'text', -- text, image, file, template
  direction TEXT NOT NULL, -- inbound, outbound
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT valid_sender_type CHECK (sender_type IN ('customer', 'agent', 'system', 'ai')),
  CONSTRAINT valid_direction CHECK (direction IN ('inbound', 'outbound'))
);

-- Appointments
CREATE TABLE public.appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id),
  service_id UUID REFERENCES public.services(id),
  external_appointment_id TEXT, -- External calendar system ID
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_notes TEXT,
  service_name TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  duration INTEGER NOT NULL DEFAULT 60, -- in minutes
  status appointment_status DEFAULT 'pending',
  cancellation_reason TEXT,
  cancellation_fee DECIMAL(10,2) DEFAULT 0,
  total_price DECIMAL(10,2),
  payment_status TEXT DEFAULT 'pending', -- pending, paid, refunded
  payment_method TEXT,
  reminder_sent BOOLEAN DEFAULT false,
  confirmation_sent BOOLEAN DEFAULT false,
  notes TEXT,
  internal_notes TEXT, -- Staff-only notes
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT end_after_start CHECK (end_time > scheduled_at),
  CONSTRAINT positive_duration CHECK (duration > 0),
  CONSTRAINT cancellation_fee_positive CHECK (cancellation_fee >= 0)
);

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id),
  customer_id UUID REFERENCES public.customers(id),
  customer_name TEXT NOT NULL,
  customer_email TEXT,
  customer_phone TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  comment TEXT,
  response TEXT, -- Business response to review
  responded_at TIMESTAMPTZ,
  external_review_id TEXT,
  platform TEXT, -- google, facebook, yelp, internal
  is_verified BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  moderated_at TIMESTAMPTZ,
  moderation_notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================
-- ANALYTICS & REPORTING TABLES
-- ===============================

-- Daily metrics aggregation
CREATE TABLE public.daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_calls INTEGER DEFAULT 0,
  answered_calls INTEGER DEFAULT 0,
  missed_calls INTEGER DEFAULT 0,
  avg_call_duration INTEGER DEFAULT 0, -- in seconds
  total_conversations INTEGER DEFAULT 0,
  active_conversations INTEGER DEFAULT 0,
  closed_conversations INTEGER DEFAULT 0,
  avg_response_time INTEGER DEFAULT 0, -- in seconds
  appointments_booked INTEGER DEFAULT 0,
  appointments_completed INTEGER DEFAULT 0,
  appointments_cancelled INTEGER DEFAULT 0,
  appointments_no_show INTEGER DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  total_revenue DECIMAL(10,2) DEFAULT 0,
  conversion_rate DECIMAL(5,2) DEFAULT 0, -- percentage
  customer_satisfaction DECIMAL(3,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(business_id, date)
);

-- AI Scripts and automation
CREATE TABLE public.ai_scripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  script_type TEXT NOT NULL DEFAULT 'conversation', -- conversation, phone_call, email
  content TEXT NOT NULL,
  personality TEXT,
  voice_settings JSONB DEFAULT '{}',
  objection_handling JSONB DEFAULT '{}',
  trigger_conditions JSONB DEFAULT '{}',
  variables JSONB DEFAULT '{}', -- Available template variables
  is_active BOOLEAN DEFAULT false,
  version INTEGER DEFAULT 1,
  last_tested_at TIMESTAMPTZ,
  performance_metrics JSONB DEFAULT '{}',
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  CONSTRAINT script_name_length CHECK (length(name) >= 1 AND length(name) <= 100)
);

-- Notifications
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Audit log for compliance and debugging
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL, -- table name
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===============================
-- INDEXES FOR PERFORMANCE
-- ===============================

-- Organizations indexes
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_organizations_domain ON public.organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_subscription_status ON public.organizations(subscription_status);

-- Businesses indexes
CREATE INDEX idx_businesses_org_id ON public.businesses(organization_id);
CREATE INDEX idx_businesses_slug ON public.businesses(slug);
CREATE INDEX idx_businesses_active ON public.businesses(is_active);

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_last_login ON public.profiles(last_login_at);

-- Organization members indexes
CREATE INDEX idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX idx_org_members_org_id ON public.organization_members(organization_id);

-- Business members indexes
CREATE INDEX idx_business_members_business_id ON public.business_members(business_id);
CREATE INDEX idx_business_members_user_id ON public.business_members(user_id);

-- Customers indexes
CREATE INDEX idx_customers_business_id ON public.customers(business_id);
CREATE INDEX idx_customers_email ON public.customers(email) WHERE email IS NOT NULL;
CREATE INDEX idx_customers_phone ON public.customers(phone);
CREATE INDEX idx_customers_status ON public.customers(status);
CREATE INDEX idx_customers_last_interaction ON public.customers(last_interaction_at);

-- Services indexes
CREATE INDEX idx_services_business_id ON public.services(business_id);
CREATE INDEX idx_services_active ON public.services(is_active);

-- Calls indexes
CREATE INDEX idx_calls_business_id ON public.calls(business_id);
CREATE INDEX idx_calls_customer_id ON public.calls(customer_id);
CREATE INDEX idx_calls_created_at ON public.calls(created_at DESC);
CREATE INDEX idx_calls_outcome ON public.calls(outcome);
CREATE INDEX idx_calls_converted ON public.calls(converted);

-- Conversations indexes
CREATE INDEX idx_conversations_business_id ON public.conversations(business_id);
CREATE INDEX idx_conversations_customer_id ON public.conversations(customer_id);
CREATE INDEX idx_conversations_status ON public.conversations(status);
CREATE INDEX idx_conversations_channel ON public.conversations(channel);
CREATE INDEX idx_conversations_last_message ON public.conversations(last_message_at DESC);

-- Conversation messages indexes
CREATE INDEX idx_conversation_messages_conversation_id ON public.conversation_messages(conversation_id);
CREATE INDEX idx_conversation_messages_created_at ON public.conversation_messages(created_at DESC);

-- Appointments indexes
CREATE INDEX idx_appointments_business_id ON public.appointments(business_id);
CREATE INDEX idx_appointments_customer_id ON public.appointments(customer_id);
CREATE INDEX idx_appointments_scheduled_at ON public.appointments(scheduled_at);
CREATE INDEX idx_appointments_status ON public.appointments(status);
CREATE INDEX idx_appointments_service_id ON public.appointments(service_id);

-- Reviews indexes
CREATE INDEX idx_reviews_business_id ON public.reviews(business_id);
CREATE INDEX idx_reviews_appointment_id ON public.reviews(appointment_id);
CREATE INDEX idx_reviews_customer_id ON public.reviews(customer_id);
CREATE INDEX idx_reviews_rating ON public.reviews(rating);
CREATE INDEX idx_reviews_platform ON public.reviews(platform);
CREATE INDEX idx_reviews_created_at ON public.reviews(created_at DESC);

-- Daily metrics indexes
CREATE INDEX idx_daily_metrics_business_date ON public.daily_metrics(business_id, date DESC);

-- AI scripts indexes
CREATE INDEX idx_ai_scripts_business_id ON public.ai_scripts(business_id);
CREATE INDEX idx_ai_scripts_active ON public.ai_scripts(is_active);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX idx_notifications_business_id ON public.notifications(business_id);
CREATE INDEX idx_notifications_read ON public.notifications(read) WHERE read = false;
CREATE INDEX idx_notifications_created_at ON public.notifications(created_at DESC);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_business_id ON public.audit_logs(business_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ===============================
-- TRIGGERS FOR AUTOMATIC UPDATES
-- ===============================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply automatic timestamp updates
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  
CREATE TRIGGER update_ai_scripts_updated_at BEFORE UPDATE ON public.ai_scripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
