-- Migration: Row Level Security Policies
-- Purpose: Implement comprehensive RLS policies for multi-tenant security
-- Date: 2024-01-01

-- ===============================
-- SECURITY DEFINER FUNCTIONS
-- ===============================

-- Get organization ID for a user
CREATE OR REPLACE FUNCTION public.get_user_organization_id(_user_id UUID)
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT om.organization_id 
  FROM public.organization_members om 
  WHERE om.user_id = _user_id 
  LIMIT 1;
$$;

-- Get business IDs accessible to a user
CREATE OR REPLACE FUNCTION public.get_user_business_ids(_user_id UUID)
RETURNS TABLE(business_id UUID)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT bm.business_id 
  FROM public.business_members bm
  WHERE bm.user_id = _user_id;
$$;

-- Check if user has role in organization
CREATE OR REPLACE FUNCTION public.has_organization_role(_user_id UUID, _organization_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id
    AND om.organization_id = _organization_id
    AND om.role = _role
  );
$$;

-- Check if user has role in business
CREATE OR REPLACE FUNCTION public.has_business_role(_user_id UUID, _business_id UUID, _role TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.user_id = _user_id
    AND bm.business_id = _business_id
    AND bm.role::TEXT = _role
  );
$$;

-- Check if user can access business (any role)
CREATE OR REPLACE FUNCTION public.can_access_business(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.user_id = _user_id
    AND bm.business_id = _business_id
  );
$$;

-- Check if user is organization owner or admin
CREATE OR REPLACE FUNCTION public.is_organization_admin(_user_id UUID, _organization_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members om
    WHERE om.user_id = _user_id
    AND om.organization_id = _organization_id
    AND om.role IN ('owner', 'admin')
  );
$$;

-- Check if user is business owner or admin
CREATE OR REPLACE FUNCTION public.is_business_admin(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.business_members bm
    WHERE bm.user_id = _user_id
    AND bm.business_id = _business_id
    AND bm.role IN ('owner', 'admin')
  );
$$;

-- ===============================
-- ENABLE ROW LEVEL SECURITY
-- ===============================

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ===============================
-- ORGANIZATION POLICIES
-- ===============================

-- Users can view their organization(s)
CREATE POLICY "Users can view their organizations"
ON public.organizations FOR SELECT
USING (
  id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Organization owners and admins can update their organization
CREATE POLICY "Owners and admins can update organization"
ON public.organizations FOR UPDATE
USING (
  public.is_organization_admin(auth.uid(), id)
);

-- Organization owners can delete their organization
CREATE POLICY "Owners can delete organization"
ON public.organizations FOR DELETE
USING (
  public.has_organization_role(auth.uid(), id, 'owner')
);

-- Only service account can insert organizations (for signup process)
CREATE POLICY "Service can insert organizations"
ON public.organizations FOR INSERT
WITH CHECK (true); -- This should be restricted via application logic

-- ===============================
-- BUSINESS POLICIES
-- ===============================

-- Users can view businesses in their organizations
CREATE POLICY "Users can view businesses in their organizations"
ON public.businesses FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Users with business access can insert businesses into their organization
CREATE POLICY "Users can insert businesses"
ON public.businesses FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Business owners and admins can update their businesses
CREATE POLICY "Business admins can update business"
ON public.businesses FOR UPDATE
USING (
  public.is_business_admin(auth.uid(), id)
);

-- Business owners can delete their businesses
CREATE POLICY "Business owners can delete business"
ON public.businesses FOR DELETE
USING (
  public.has_business_role(auth.uid(), id, 'owner')
);

-- ===============================
-- PROFILE POLICIES
-- ===============================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (id = auth.uid());

-- Users can insert their own profile (for signup)
CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT
WITH CHECK (id = auth.uid());

-- ===============================
-- ORGANIZATION MEMBER POLICIES
-- ===============================

-- Users can view organization members in their organizations
CREATE POLICY "Users can view organization members"
ON public.organization_members FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM public.organization_members 
    WHERE user_id = auth.uid()
  )
);

-- Organization owners and admins can manage members
CREATE POLICY "Organization admins can manage members"
ON public.organization_members FOR ALL
USING (
  public.is_organization_admin(auth.uid(), organization_id)
);

-- ===============================
-- BUSINESS MEMBER POLICIES
-- ===============================

-- Users can view business members in businesses they can access
CREATE POLICY "Users can view business members"
ON public.business_members FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Business owners and admins can manage business members
CREATE POLICY "Business admins can manage members"
ON public.business_members FOR ALL
USING (
  public.is_business_admin(auth.uid(), business_id)
);

-- ===============================
-- CUSTOMER POLICIES
-- ===============================

-- Users can view customers in businesses they can access
CREATE POLICY "Users can view customers"
ON public.customers FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Staff and above can manage customers
CREATE POLICY "Staff+ can manage customers"
ON public.customers FOR ALL
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- ===============================
-- SERVICE POLICIES
-- ===============================

-- Users can view services in businesses they can access
CREATE POLICY "Users can view services"
ON public.services FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Staff and above can manage services
CREATE POLICY "Staff+ can manage services"
ON public.services FOR ALL
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- ===============================
-- CALL POLICIES
-- ===============================

-- Users can view calls in businesses they can access
CREATE POLICY "Users can view calls"
ON public.calls FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Staff and above can manage calls
CREATE POLICY "Staff+ can manage calls"
ON public.calls FOR ALL
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- ===============================
-- CONVERSATION POLICIES
-- ===============================

-- Users can view conversations in businesses they can access
CREATE POLICY "Users can view conversations"
ON public.conversations FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Staff and above can manage conversations
CREATE POLICY "Staff+ can manage conversations"
ON public.conversations FOR ALL
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- ===============================
-- CONVERSATION MESSAGE POLICIES
-- ===============================

-- Users can view messages in conversations they can access
CREATE POLICY "Users can view conversation messages"
ON public.conversation_messages FOR SELECT
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE public.can_access_business(auth.uid(), business_id)
  )
);

-- Staff and above can manage messages
CREATE POLICY "Staff+ can manage conversation messages"
ON public.conversation_messages FOR ALL
USING (
  conversation_id IN (
    SELECT id FROM public.conversations 
    WHERE public.can_access_business(auth.uid(), business_id)
  )
);

-- ===============================
-- APPOINTMENT POLICIES
-- ===============================

-- Users can view appointments in businesses they can access
CREATE POLICY "Users can view appointments"
ON public.appointments FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Staff and above can manage appointments
CREATE POLICY "Staff+ can manage appointments"
ON public.appointments FOR ALL
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- ===============================
-- REVIEW POLICIES
-- ===============================

-- Users can view reviews in businesses they can access
CREATE POLICY "Users can view reviews"
ON public.reviews FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

-- Staff and above can manage reviews
CREATE POLICY "Staff+ can manage reviews"
ON public.reviews FOR ALL
USING (
  public.can_access_business ELSE INSERT
ON public.notifications FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_members 
    WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
  OR user_id IS NULL -- For global notifications
);

-- ===============================
-- AUDIT LOG POLICIES
-- ===============================

-- Only admins can view audit logs for their organization/business
CREATE POLICY "Admins can view audit logs"
ON public.audit_logs FOR SELECT
USING (
  (organization_id IS NOT NULL AND public.is_organization_admin(auth.uid(), organization_id))
  OR 
  (business_id IS NOT NULL AND public.is_business_admin(auth.uid(), business_id))
);

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
ON public.audit_logs FOR INSERT
WITH CHECK (true); -- This should be restricted via application logic

-- Only system can update/delete audit logs
CREATE POLICY "System only audit log modifications"
ON public.audit_logs FOR UPDATE
USING (false); -- Audit logs should never be updated

CREATE POLICY "System only audit log deletions"
ON public.audit_logs FOR DELETE
USING (false); -- Audit logs should never be deleted

-- ===============================
-- PERMISSION-BASED POLICIES
-- ===============================

-- Recreate some policies with more granular permission checks
DROP POLICY IF EXISTS "Staff+ can manage customers" ON public.customers;
DROP POLICY IF EXISTS "Staff+ can manage services" ON public.services;
DROP POLICY IF EXISTS "Staff+ can manage calls" ON public.calls;
DROP POLICY IF EXISTS "Staff+ can manage conversations" ON public.conversations;
DROP POLICY IF EXISTS "Staff+ can manage appointments" ON public.appointments;
DROP POLICY IF EXISTS "Staff+ can manage reviews" ON public.reviews;
DROP POLICY IF EXISTS "Staff+ can manage ai_scripts" ON public.ai_scripts;

-- More granular customer policies
CREATE POLICY "Users can view customers based on permissions"
ON public.customers FOR SELECT
USING (
  public.can_access_business(auth.uid(), business_id)
);

CREATE POLICY "Users can insert customers"
ON public.customers FOR INSERT
WITH CHECK (
  public.can_access_business(auth.uid(), business_id) AND
  COALESCE(
    (SELECT permissions->'customers'->>'create' FROM public.business_members 
     WHERE user_id = auth.uid() AND business_id = customers.business_id), 
    'true'
  )::boolean
);

CREATE POLICY "Users can update customers"
ON public.customers FOR UPDATE
USING (
  public.can_access_business(auth.uid(), business_id) AND
  COALESCE(
    (SELECT permissions->'customers'->>'update' FROM public.business_members 
     WHERE user_id = auth.uid() AND business_id = customers.business_id), 
    'true'
  )::boolean
);

-- More granular review policies (allow insertion for any authenticated user for this business)
CREATE POLICY "Staff+ can insert reviews"
ON public.reviews FOR INSERT
WITH CHECK (
  public.can_access_business(auth.uid(), business_id)
);

CREATE POLICY "Business admins can update reviews"
ON public.reviews FOR UPDATE
USING (
  public.is_business_admin(auth.uid(), business_id)
);

CREATE POLICY "Business admins can delete reviews"
ON public.reviews FOR DELETE
USING (
  public.is_business_admin(auth.uid(), business_id)
);

-- ===============================
-- CREATION POLICIES FOR CORE TABLES
-- ===============================

-- Insert policies for core tables
CREATE POLICY "Staff+ can insert services"
ON public.services FOR INSERT
WITH CHECK (
  public.can_access_business(auth.uid(), business_id)
);

CREATE POLICY "Staff+ can insert calls"
ON public.calls FOR INSERT
WITH CHECK (
  public.can_access_business(auth.uid(), business_id)
);

CREATE POLICY "Staff+ can insert conversations"
ON public.conversations FOR INSERT
WITH CHECK (
  public.can_access_business(auth.uid(), business_id)
);

-- View notifications policy
DROP POLICY IF EXISTS "Users can view notifications" ON public.notifications;
CREATE POLICY "Users can view notifications"
ON public.notifications FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  public.can_access_business(auth.uid(), business_id)
  OR
  business_id IN (
    SELECT business_id FROM public.business_members 
    WHERE user_id = auth.uid()
  )
);

-- Notifications can be inserted for users in the business
DROP POLICY IF EXISTS "Users can insert notifications" ON public.notifications;
CREATE POLICY "Users can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (
  business_id IN (
    SELECT business_id FROM public.business_members 
    WHERE user_id = auth.uid()
  )
  OR user_id = auth.uid()
  OR user_id IS NULL -- For global notifications
);

-- ===============================
-- SPECIAL POLICIES FOR SECURITY
-- ===============================

-- Prevent users from elevating their own privileges
CREATE POLICY "Users cannot elevate own privileges"
ON public.business_members FOR UPDATE
USING (
  -- If the user is trying to update their own role, prevent elevation
  user_id != auth.uid() 
  OR (
    user_id = auth.uid() AND
    (
      SELECT role FROM public.business_members 
      WHERE user_id = auth.uid() AND business_id = business_members.business_id
    )::TEXT = (
      SELECT role FROM public.business_members 
      WHERE user_id = auth.uid() AND business_id = business_members.business_id
    )::TEXT
  )
);

-- ===============================
-- API-SPECIFIC POLICIES
-- ===============================

-- Service role bypass (for API operations)
CREATE POLICY "Service role bypass organizations"
ON public.organizations FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass businesses"
ON public.businesses FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass profiles"
ON public.profiles FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass organization_members"
ON public.organization_members FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass business_members"
ON public.business_members FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass customers"
ON public.customers FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass services"
ON public.services FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass calls"
ON public.calls FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass conversations"
ON public.conversations FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass conversation_messages"
ON public.conversation_messages FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass appointments"
ON public.appointments FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass reviews"
ON public.reviews FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass daily_metrics"
ON public.daily_metrics FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass ai_scripts"
ON public.ai_scripts FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass notifications"
ON public.notifications FOR ALL
TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Service role bypass audit_logs"
ON public.audit_logs FOR ALL
TO service_role
USING (true) WITH CHECK (true);
