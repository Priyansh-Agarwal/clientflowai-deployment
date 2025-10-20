-- Migration: User Management and Automation Functions
-- Purpose: Create functions for user management, data triggers, and business automation
-- Date: 2024-01-01

-- ===============================
-- USER MANAGEMENT FUNCTIONS
-- ===============================

-- Create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name,
    email_verified
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Log the user creation
  INSERT INTO public.audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    new_values,
    metadata
  )
  VALUES (
    NULL, -- Will be set when user joins an organization
    NEW.id,
    'user_created',
    'profiles',
    NEW.id,
    json_build_object(
      'email', NEW.email,
      'created_at', NEW.created_at
    ),
    json_build_object(
      'auth_provider', NEW.app_metadata->>'provider',
      'signup_method', 'auth_signup'
    )
  );

  RETURN NEW;
END;
$$;

-- Trigger for new user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update login timestamp
CREATE OR REPLACE FUNCTION public.update_login_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.profiles 
  SET last_login_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

-- ===============================
-- ORGANIZATION MANAGEMENT FUNCTIONS
-- ===============================

-- Create default business when organization is created
CREATE OR REPLACE FUNCTION public.handle_new_organization()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create default business for new organization
  INSERT INTO public.businesses (
    organization_id,
    name,
    slug,
    description
  )
  VALUES (
    NEW.id,
    NEW.name || ' Main Business',
    'main',
    'Default business for ' || NEW.name
  );

  RETURN NEW;
END;
$$;

-- Trigger for new organization
DROP TRIGGER IF EXISTS on_organization_created ON public.organizations;
CREATE TRIGGER on_organization_created
  AFTER INSERT ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization();

-- Create business member when user joins organization
CREATE OR REPLACE FUNCTION public.handle_new_organization_member()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  default_business_id UUID;
BEGIN
  -- Find the default (main) business for this organization
  SELECT id INTO default_business_id
  FROM public.businesses
  WHERE organization_id = NEW.organization_id
  AND slug = 'main'
  LIMIT 1;

  -- Add user to default business with appropriate role
  IF default_business_id IS NOT NULL THEN
    INSERT INTO public.business_members (
      business_id,
      user_id,
      role,
      invited_by
    )
    VALUES (
      default_business_id,
      NEW.user_id,
      CASE 
        WHEN NEW.role = 'owner' THEN 'owner'::app_role
        WHEN NEW.role = 'admin' THEN 'admin'::app_role
        ELSE 'staff'::app_role
      END,
      NEW.invited_by
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new organization member
DROP TRIGGER IF EXISTS on_organization_member_created ON public.organization_members;
CREATE TRIGGER on_organization_member_created
  AFTER INSERT ON public.organization_members
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_organization_member();

-- ===============================
-- CONVERSATION MANAGEMENT AUTOMATION
-- ===============================

-- Auto-update conversation status to active when new message arrives
CREATE OR REPLACE FUNCTION public.handle_new_conversation_message()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update conversation last_message_at and status
  UPDATE public.conversations
  SET 
    last_message_at = NEW.created_at,
    last_agent_response_at = CASE 
      WHEN NEW.sender_type = 'agent' THEN NEW.created_at
      ELSE last_agent_response_at
    END,
    status = CASE 
      WHEN status = 'archived' THEN 'active'
      ELSE status
    END
  WHERE id = NEW.conversation_id;

  -- Calculate and update response time for outbound messages
  IF NEW.direction = 'outbound' AND NEW.sender_type = 'agent' THEN
    UPDATE public.conversations
    SET response_time = EXTRACT(EPOCH FROM (NEW.created_at - (
      SELECT MAX(created_at) 
      FROM public.conversation_messages 
      WHERE conversation_id = NEW.conversation_id 
      AND direction = 'inbound'
    )))
    WHERE id = NEW.conversation_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new conversation message
DROP TRIGGER IF EXISTS on_conversation_message_created ON public.conversation_messages;
CREATE TRIGGER on_conversation_message_created
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_conversation_message();

-- Auto-create customer record from conversation
CREATE OR REPLACE FUNCTION public.auto-create_customer_from_conversation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  customer_exists BOOLEAN;
  customer_id UUID;
BEGIN
  -- Check if customer already exists
  SELECT EXISTS(
    SELECT 1 FROM public.customers 
    WHERE business_id = NEW.business_id 
    AND customer_contact = NEW.customer_contact
  ) INTO customer_exists;

  -- Create customer if doesn't exist and we have enough info
  IF NOT customer_exists AND NEW.customer_name IS NOT NULL AND length(NEW.customer_name) > 0 THEN
    INSERT INTO public.customers 
    (
      business_id,
      first_name,
      last_name,
      email,
      phone,
      customer_name,
      lead_source,
      created_at
    )
    VALUES (
      NEW.business_id,
      split_part(NEW.customer_name, ' ', 1),
      CASE 
        WHEN position(' ' in NEW.customer_name) > 0 
        THEN split_part(NEW.customer_name, ' ', 2)
        ELSE ''
      END,
      CASE 
        WHEN NEW.customer_contact ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
        THEN NEW.customer_contact
        ELSE NULL
      END,
      CASE 
        WHEN NEW.customer_contact ~* '^\+?[1-9]\d{1,14}$'
        THEN NEW.customer_contact
        ELSE NULL
      END,
      NEW.customer_name,
      'conversation',
      'conversation'
    )
    RETURNING id INTO customer_id;

    -- Update conversation with customer_id
    UPDATE public.conversations
    SET customer_id = customer_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new conversation
DROP TRIGGER IF EXISTS on_conversation_created ON public.conversations;
CREATE TRIGGER on_conversation_created
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.auto-create_customer_from_conversation();

-- ===============================
-- CALL MANAGEMENT AUTOMATION
-- ===============================

-- Auto-link calls to existing customers
CREATE OR REPLACE FUNCTION public.auto-link_call_to_customer()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  linked_customer_id UUID;
BEGIN
  -- Try to find existing customer by phone
  SELECT id INTO linked_customer_id
  FROM public.customers
  WHERE business_id = NEW.business_id
  AND phone = NEW.caller_phone
  LIMIT 1;

  -- Update call with customer_id if found
  IF linked_customer_id IS NOT NULL THEN
    UPDATE public.calls
    SET customer_id = linked_customer_id
    WHERE id = NEW.id;

    -- Update customer's last interaction
    UPDATE public.customers
    SET last_interaction_at = NEW.created_at
    WHERE id = linked_customer_id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new call
DROP TRIGGER IF EXISTS on_call_created ON public.calls;
CREATE TRIGGER on_call_created
  AFTER INSERT ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.auto-link_call_to_customer();

-- ===============================
-- APPOINTMENT MANAGEMENT AUTOMATION
-- ===============================

-- Auto-create customer from appointment
CREATE OR REPLACE FUNCTION public.auto-create_customer_from_appointment()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  customer_exists BOOLEAN;
  customer_id UUID;
BEGIN
  -- Check if customer already exists
  SELECT EXISTS(
    SELECT 1 FROM public.customers 
    WHERE business_id = NEW.business_id 
    AND phone = NEW.customer_phone
  ) INTO customer_exists;

  -- Create customer if doesn't exist
  IF NOT customer_exists THEN
    INSERT INTO public.customers 
    (
      business_id,
      first_name,
      last_name,
      email,
      phone,
      phone_formatted,
      customer_name,
      lead_source,
      created_at
    )
    VALUES (
      NEW.business_id,
      split_part(NEW.customer_name, ' ', 1),
      CASE 
        WHEN position(' ' in NEW.customer_name) > 0 
        THEN split_part(NEW.customer_name, ' ', 2)
        ELSE ''
      END,
      NEW.customer_email,
      NEW.customer_phone,
      NULL, -- phone_formatted
      NEW.customer_name,
      'appointment',
      'appointment'
    )
    RETURNING id INTO customer_id;

    -- Update appointment with customer_id
    UPDATE public.appointments
    SET customer_id = customer_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new appointment
DROP TRIGGER IF EXISTS on_appointment_created ON public.appointments;
CREATE TRIGGER on_appointment_created
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.auto-create_customer_from_appointment();

-- ===============================
-- REVIEW MANAGEMENT AUTOMATION
-- ===============================

-- Auto-link reviews to customers and appointments
CREATE OR REPLACE FUNCTION public.auto-link_review()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  linked_customer_id UUID;
BEGIN
  -- Try to find customer by email or phone
  IF NEW.customer_email IS NOT NULL THEN
    SELECT id INTO linked_customer_id
    FROM public.customers
    WHERE business_id = NEW.business_id
    AND email = NEW.customer_email
    LIMIT 1;
  END IF;

  -- If not found by email, try phone
  IF linked_customer_id IS NULL AND NEW.customer_phone IS NOT NULL THEN
    SELECT id INTO linked_customer_id
    FROM public.customers
    WHERE business_id = NEW.business_id
    AND phone = NEW.customer_phone
    LIMIT 1;
  END IF;

  -- Update review with customer_id if found
  IF linked_customer_id IS NOT NULL THEN
    UPDATE public.reviews
    SET customer_id = linked_customer_id
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger for new review
DROP TRIGGER IF EXISTS on_review_created ON public.reviews;
CREATE TRIGGER on_review_created
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.auto-link_review();

-- ===============================
-- DAILY METRICS AUTOMATION
-- ===============================

-- Update daily metrics function
CREATE OR REPLACE FUNCTION public.update_daily_metrics(business_uuid UUID, target_date DATE)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  call_stats RECORD;
  conversation_stats RECORD;
  appointment_stats RECORD;
  review_stats RECORD;
BEGIN
  -- Get call statistics for the day
  SELECT 
    COUNT(*) as total_calls,
    COUNT(*) FILTER (WHERE outcome IS NOT NULL) as answered_calls,
    COUNT(*) FILTER (WHERE outcome = 'no_answer' OR outcome = 'busy') as missed_calls,
    AVG(duration) FILTER (WHERE duration IS NOT NULL) as avg_duration,
    COUNT(*) FILTER (WHERE converted = true) as conversions
  INTO call_stats
  FROM public.calls
  WHERE business_id = business_uuid
  AND DATE(created_at) = target_date;

  -- Get conversation statistics for the day
  SELECT 
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE status = 'active') as active_conversations,
    COUNT(*) FILTER (WHERE status = 'closed') as closed_conversations,
    AVG(response_time) FILTER (WHERE response_time IS NOT NULL) as avg_response_time
  INTO conversation_stats
  FROM public.conversations
  WHERE business_id = business_uuid
  AND DATE(created_at) = target_date;

  -- Get appointment statistics for the day
  SELECT 
    COUNT(*) FILTER (WHERE status IN ('pending', 'confirmed')) as appointments_booked,
    COUNT(*) FILTER (WHERE status = 'completed') as appointments_completed,
    COUNT(*) FILTER (WHERE status = 'cancelled') as appointments_cancelled,
    COUNT(*) FILTER (WHERE status = 'no_show') as appointments_no_show
  INTO appointment_stats
  FROM public.appointments
  WHERE business_id = business_uuid
  AND DATE(created_at) = target_date;

  -- Get revenue for the day
  SELECT COALESCE(SUM(total_price), 0) as total_revenue
  INTO appointment_stats.total_revenue
  FROM public.appointments
  WHERE business_id = business_uuid
  AND DATE(created_at) = target_date
  AND status = 'completed';

  -- Get new customers for the day
  SELECT COUNT(*) as new_customers
  INTO appointment_stats.new_customers
  FROM public.customers
  WHERE business_id = business_uuid
  AND DATE(created_at) = target_date;

  -- Get review statistics for the day
  SELECT 
    AVG(rating)::DECIMAL(3,2) as avg_satisfaction
  INTO review_stats
  FROM public.reviews
  WHERE business_id = business_uuid
  AND DATE(created_at) = target_date;

  -- Insert or update daily metrics
  INSERT INTO public.daily_metrics (
    business_id,
    date,
    total_calls,
    answered_calls,
    missed_calls,
    avg_call_duration,
    total_conversations,
    active_conversations,
    closed_conversations,
    avg_response_time,
    appointments_booked,
    appointments_completed,
    appointments_cancelled,
    appointments_no_show,
    new_customers,
    total_revenue,
    conversion_rate,
    customer_satisfaction
  )
  VALUES (
    business_uuid,
    target_date,
    COALESCE(call_stats.total_calls, 0),
    COALESCE(call_stats.answered_calls, 0),
    COALESCE(call_stats.missed_calls, 0),
    COALESCE(call_stats.avg_duration, 0),
    COALESCE(conversation_stats.total_conversations, 0),
    COALESCE(conversation_stats.active_conversations, 0),
    COALESCE(conversation_stats.closed_conversations, 0),
    COALESCE(conversation_stats.avg_response_time, 0),
    COALESCE(appointment_stats.appointments_booked, 0),
    COALESCE(appointment_stats.appointments_completed, 0),
    COALESCE(appointment_stats.appointments_cancelled, 0),
    COALESCE(appointment_stats.appointments_no_show, 0),
    COALESCE(appointment_stats.new_customers, 0),
    COALESCE(appointment_stats.total_revenue, 0),
    CASE 
      WHEN call_stats.total_calls > 0 
      THEN (call_stats.conversions::DECIMAL / call_stats.total_calls * 100)
      ELSE 0 
    END,
    COALESCE(review_stats.avg_satisfaction, 0)
  )
  ON CONFLICT (business_id, date)
  DO UPDATE SET
    total_calls = EXCLUDED.total_calls,
    answered_calls = EXCLUDED.answered_calls,
    missed_calls = EXCLUDED.missed_calls,
    avg_call_duration = EXCLUDED.avg_call_duration,
    total_conversations = EXCLUDED.total_conversations,
    active_conversations = EXCLUDED.active_conversations,
    closed_conversations = EXCLUDED.closed_conversations,
    avg_response_time = EXCLUDED.avg_response_time,
    appointments_booked = EXCLUDED.appointments_booked,
    appointments_completed = EXCLUDED.appointments_completed,
    appointments_cancelled = EXCLUDED.appointments_cancelled,
    appointments_no_show = EXCLUDED.appointments_no_show,
    new_customers = EXCLUDED.new_customers,
    total_revenue = EXCLUDED.total_revenue,
    conversion_rate = EXCLUDED.conversion_rate,
    customer_satisfaction = EXCLUDED.customer_satisfaction;
END;
$$;

-- Schedule daily metrics update for new data
CREATE OR REPLACE FUNCTION public.trigger_daily_metrics_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update metrics for the business on the date of this change
  PERFORM public.update_daily_metrics(NEW.business_id, CURRENT_DATE);
  
  -- Also update previous day if this is early morning data
  IF EXTRACT(HOUR FROM now()) < 2 THEN
    PERFORM public.update_daily_metrics(NEW.business_id, CURRENT_DATE - INTERVAL '1 day');
  END IF;

  RETURN NEW;
END;
$$;

-- Triggers for metrics updates
DROP TRIGGER IF EXISTS on_call_metrics_update ON public.calls;
CREATE TRIGGER on_call_metrics_update
  AFTER INSERT ON public.calls
  FOR EACH ROW EXECUTE FUNCTION public.trigger_daily_metrics_update();

DROP TRIGGER IF EXISTS on_conversation_metrics_update ON public.conversations;
CREATE TRIGGER on_conversation_metrics_update
  AFTER INSERT ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.trigger_daily_metrics_update();

DROP TRIGGER IF EXISTS on_appointment_metrics_update ON public.appointments;
CREATE TRIGGER on_appointment_metrics_update
  AFTER INSERT ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_daily_metrics_update();

DROP TRIGGER IF EXISTS on_review_metrics_update ON public.reviews;
CREATE TRIGGER on_review_metrics_update
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.trigger_daily_metrics_update();

-- ===============================
-- UTILITY FUNCTIONS
-- ===============================

-- Function to format phone numbers
CREATE OR REPLACE FUNCTION public.format_phone_number(phone TEXT)
RETURNS TEXT
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT regexp_replace(phone, '[^0-9]', '', 'g');
$$;

-- Function to validate phone numbers
CREATE OR REPLACE FUNCTION public.is_valid_phone_number(phone TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT phone ~* '^\+?[1-9]\d{1,14}$';
$$;

-- Function to validate email addresses
CREATE OR REPLACE FUNCTION public.is_valid_email(email TEXT)
RETURNS BOOLEAN
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
$$;

-- Function to generate daily metrics for a date range
CREATE OR REPLACE FUNCTION public.generate_daily_metrics_for_period(
  business_uuid UUID,
  start_date DATE,
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  current_date DATE := start_date;
BEGIN
  WHILE current_date <= end_date LOOP
    PERFORM public.update_daily_metrics(business_uuid, current_date);
    current_date := current_date + INTERVAL '1 day';
  END LOOP;
END;
$$;
