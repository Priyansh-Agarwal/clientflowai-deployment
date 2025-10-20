import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    nodeProfilingIntegration(),
  ],
  beforeSend(event, hint) {
    // Redact sensitive information
    if (event.exception) {
      event.exception.values?.forEach((exception) => {
        if (exception.stacktrace?.frames) {
          exception.stacktrace.frames.forEach((frame) => {
            if (frame.filename) {
              // Redact file paths that might contain sensitive info
              frame.filename = frame.filename.replace(/\/[^\/]*\/[^\/]*\/[^\/]*\//, '/***/');
            }
          });
        }
      });
    }

    // Redact request data
    if (event.request) {
      if (event.request.data) {
        event.request.data = '[REDACTED]';
      }
      if (event.request.query_string) {
        event.request.query_string = '[REDACTED]';
      }
    }

    // Redact user data
    if (event.user) {
      event.user.email = '[REDACTED]';
      event.user.username = '[REDACTED]';
    }

    // Redact extra data
    if (event.extra) {
      Object.keys(event.extra).forEach((key) => {
        if (typeof event.extra![key] === 'string') {
          const value = event.extra![key] as string;
          if (value.includes('@') || value.includes('+') || value.includes('token')) {
            event.extra![key] = '[REDACTED]';
          }
        }
      });
    }

    return event;
  },
  beforeBreadcrumb(breadcrumb) {
    // Redact sensitive breadcrumb data
    if (breadcrumb.data) {
      Object.keys(breadcrumb.data).forEach((key) => {
        const value = breadcrumb.data![key];
        if (typeof value === 'string') {
          if (value.includes('@') || value.includes('+') || value.includes('token')) {
            breadcrumb.data![key] = '[REDACTED]';
          }
        }
      });
    }
    return breadcrumb;
  },
});

export default Sentry;
