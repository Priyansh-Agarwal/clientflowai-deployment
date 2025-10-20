-- Migration: Views, Sample Data, and API Endpoints
-- Purpose: Create useful views, indexes, and populate sample data
-- Date: 2024-01-01

-- ===============================
-- USEFUL VIEWS FOR API ENDPOINTS
-- ===============================

-- Customer summary view with aggregated data
CREATE OR REPLACE VIEW public.customer_summary AS
SELECT 
  c.id,
  c.business_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone,
  c.status,
  c.created_at,
  c.last_interaction_at,
  c.total_spent,
  c.lifetime_value,
  COUNT(DISTINCT calls.id) as total_calls,
  COUNT(DISTINCT conversations.id) as total_conversations,
  COUNT(DISTINCT appointments.id) as total_appointments,
  COUNT(DISTINCT reviews.id) as total_reviews,
  AVG(reviews.rating)::DECIMAL(3,2) as avg_rating,
  MAX(appointments.scheduled_at) as last_appointment
FROM public.customers c
LEFT JOIN public.calls ON calls.customer_id = c.id
LEFT JOIN public.conversations ON conversations.customer_id = c.id
LEFT JOIN public.appointments ON appointments.customer_id = c.id
LEFT JOIN public.reviews ON reviews.customer_id = c.id
GROUP BY c.id, c.business_id, c.first_name, c.last_name, c.email, c.phone, c.status, c.created_at, c.last_interaction_at, c.total_spent, c.lifetime_value;

  -- Add sample appointment reviews
  INSERT INTO public.reviews (
    business_id,
    appointment_id,
    customer_name,
    customer_email,
    customer_phone,
    rating,
    title,
    comment,
    platform,
    is_verified,
    created_at
  )
  SELECT 
    appointments.business_id,
    appointments.id,
    appointments.customer_name,
    appointments.customer_email,
    appointments.customer_phone,
    CASE RANDOM()
      WHEN 0 THEN 4
      WHEN 1 THEN 3
      WHEN 2 THEN 5
      ELSE 4
    END,
    CASE RANDOM()
      WHEN 0 THEN 'Great Service'
      WHEN 1 THEN 'Professional'
      WHEN 2 THEN 'Excellent'
      ELSE 'Good Experience'
    END,
    CASE RANDOM()
      WHEN 0 THEN 'Very satisfied with the service provided.'
      WHEN 1 THEN 'Professional staff and timely service.'
      WHEN 2 THEN 'Excellent quality and customer care!'
      ELSE 'Good experience overall.'
    END,
    'internal',
    CASE WHEN RANDOM() > 0.5 THEN true ELSE false END,
    appointments.created_at + interval '1 hour'
  FROM public.appointments
  WHERE appointments.status = 'completed'
  AND appointments.created_at > now() - interval '7 days'
  AND RANDOM() < 0.3; -- Only 30% of completed appointments have reviews

  -- Sample daily metrics
  PERFORM public.generate_daily_metrics_for_period(
    business_id_val,
    CURRENT_DATE - interval '30 days',
    CURRENT_DATE
  );

END;
$$;

-- Trigger to populate sample data for new businesses
DROP TRIGGER IF EXISTS populate_sample_data_trigger ON public.businesses;
CREATE TRIGGER populate_sample_data_trigger
  AFTER INSERT ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.populate_sample_data();

-- ===============================
-- GRANT PERMISSIONS
-- ===============================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- ===============================
-- COMMENTS FOR DOCUMENTATION
-- ===============================

-- Add comments to tables for documentation
COMMENT ON TABLE public.organizations IS 'Top-level multi-tenant entities';
COMMENT ON TABLE public.businesses IS 'Sub-tenants within organizations, representing individual business units';
COMMENT ON TABLE public.customers IS 'Customer CRM records linked to businesses';
COMMENT ON TABLE public.calls IS 'Call logs and recordings';
COMMENT ON TABLE public.conversations IS 'Multi-channel conversation threads';
COMMENT ON TABLE public.conversation_messages IS 'Individual messages within conversations';
COMMENT ON TABLE public.appointments IS 'Scheduled appointments and bookings';
COMMENT ON TABLE public.reviews IS 'Customer reviews and ratings';
COMMENT ON TABLE public.services IS 'Service/product catalog';
COMMENT ON TABLE public.daily_metrics IS 'Aggregated daily performance metrics';
COMMENT ON TABLE public.ai_scripts IS 'AI automation scripts and configurations';
COMMENT ON TABLE public.notifications IS 'User and system notifications';
COMMENT ON TABLE public.audit_logs IS 'System audit trail for compliance';

-- Add comments to views
COMMENT ON VIEW public.customer_summary IS 'Aggregated customer data with interaction history';
COMMENT ON VIEW public.business_dashboard_data IS 'Key metrics and summaries for dashboard display';
COMMENT ON VIEW public.conversation_threads IS 'Conversation threads with recent activity';
COMMENT ON VIEW public.performance_metrics IS 'Business performance metrics with calculations';

COMMIT;
