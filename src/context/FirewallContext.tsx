import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthContext';

interface FirewallContextType {
  clientIp: string;
  isIpBlocked: () => Promise<{ blocked: boolean; reason?: string; expiresAt?: string }>;
  checkAndIncrementRateLimit: (action: 'login' | 'signup' | 'forgot-password') => Promise<{ allowed: boolean; errorMsg?: string; attemptsRemaining: number }>;
  logAuditEvent: (action: string, email?: string, userId?: string | null) => Promise<void>;
  sanitizeInput: (text: string) => string;
  validatePayload: (data: Record<string, string>, action: 'login' | 'signup' | 'forgot-password') => { valid: boolean; errorMsg?: string };
  blockClientIp: (reason: string, durationMinutes: number) => Promise<void>;
}

const FirewallContext = createContext<FirewallContextType | undefined>(undefined);

export const FirewallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clientIp, setClientIp] = useState<string>('127.0.0.1');

  // Fetch client IP on mount
  useEffect(() => {
    async function fetchIp() {
      try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        if (data.ip) {
          setIpWithMask(data.ip);
        }
      } catch (err) {
        // Fallback to a random but stable session IP if fetch fails
        const cachedIp = sessionStorage.getItem('taskflow_simulated_ip');
        if (cachedIp) {
          setClientIp(cachedIp);
        } else {
          const randomOctet = Math.floor(Math.random() * 254) + 1;
          const simulatedIp = `192.168.1.${randomOctet}`;
          sessionStorage.setItem('taskflow_simulated_ip', simulatedIp);
          setClientIp(simulatedIp);
        }
      }
    }
    
    // Mask / validate IP format helper
    function setIpWithMask(ip: string) {
      const sanitized = ip.replace(/[^0-9a-fA-F.:]/g, '');
      setClientIp(sanitized || '127.0.0.1');
    }

    fetchIp();
  }, []);

  // 1. Check if IP is Blocked
  const isIpBlocked = async (): Promise<{ blocked: boolean; reason?: string; expiresAt?: string }> => {
    try {
      const { data, error } = await supabase
        .from('firewall_blocked_ips')
        .select('*')
        .eq('ip_address', clientIp)
        .maybeSingle();

      if (error || !data) {
        return { blocked: false };
      }

      const expiresAt = new Date(data.expires_at);
      const now = new Date();

      if (expiresAt < now) {
        // Cooldown expired, automatically unblock/delete
        await supabase
          .from('firewall_blocked_ips')
          .delete()
          .eq('ip_address', clientIp);
        
        // Log unblock
        await logAuditEvent('Auto Unblocked IP', undefined, null);
        return { blocked: false };
      }

      return {
        blocked: true,
        reason: data.reason || 'Suspicious activity detected',
        expiresAt: expiresAt.toISOString()
      };
    } catch (err) {
      console.error('Error checking IP block status:', err);
      return { blocked: false };
    }
  };

  // 2. Block Client IP
  const blockClientIp = async (reason: string, durationMinutes: number) => {
    try {
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);
      
      // Check if already in blocked table
      const { data: existing } = await supabase
        .from('firewall_blocked_ips')
        .select('*')
        .eq('ip_address', clientIp)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('firewall_blocked_ips')
          .update({
            reason,
            expires_at: expiresAt.toISOString(),
            attempts_count: existing.attempts_count + 1,
            blocked_at: new Date().toISOString()
          })
          .eq('ip_address', clientIp);
      } else {
        await supabase
          .from('firewall_blocked_ips')
          .insert({
            ip_address: clientIp,
            reason,
            expires_at: expiresAt.toISOString(),
            attempts_count: 1
          });
      }

      await logAuditEvent('Blocked Request', `Blocked IP: ${clientIp}`, null);
    } catch (err) {
      console.error('Failed to block client IP:', err);
    }
  };

  // 3. Rate Limiting Logic
  const checkAndIncrementRateLimit = async (
    action: 'login' | 'signup' | 'forgot-password'
  ): Promise<{ allowed: boolean; errorMsg?: string; attemptsRemaining: number }> => {
    // Check global IP block first
    const blockCheck = await isIpBlocked();
    if (blockCheck.blocked) {
      const remainingTime = Math.ceil((new Date(blockCheck.expiresAt!).getTime() - Date.now()) / (60 * 1000));
      return {
        allowed: false,
        attemptsRemaining: 0,
        errorMsg: `Your IP is temporarily blocked due to: ${blockCheck.reason}. Retry in ${remainingTime} minute(s).`
      };
    }

    // Rate Limit definitions:
    // login: max 5 attempts per 15 minutes
    // signup: max 5 attempts per 1 hour
    // forgot-password: max 3 requests per 1 hour
    const LIMITS = {
      'login': { max: 5, windowMs: 15 * 60 * 1000, blockMinutes: 15, label: 'Login' },
      'signup': { max: 5, windowMs: 60 * 60 * 1000, blockMinutes: 60, label: 'Signup' },
      'forgot-password': { max: 3, windowMs: 60 * 60 * 1000, blockMinutes: 60, label: 'Password Reset' }
    };

    const config = LIMITS[action];

    try {
      const { data: rateData, error } = await supabase
        .from('firewall_rate_limits')
        .select('*')
        .eq('ip_address', clientIp)
        .eq('action', action)
        .maybeSingle();

      const now = new Date();

      if (!rateData) {
        // First attempt for this IP + action
        const { error: insertError } = await supabase
          .from('firewall_rate_limits')
          .insert({
            ip_address: clientIp,
            action,
            attempt_count: 1,
            last_attempt_at: now.toISOString()
          });

        if (insertError && insertError.code === '23505') {
            // 23505 is unique violation code in Postgres. Meaning someone just inserted it concurrently.
            // Let's just pretend we incremented it, or it will be handled on next request.
            console.warn('Concurrent rate limit insert handled.');
        }

        return { allowed: true, attemptsRemaining: config.max - 1 };
      }

      const lastAttempt = new Date(rateData.last_attempt_at);
      const isWithinWindow = now.getTime() - lastAttempt.getTime() < config.windowMs;

      if (isWithinWindow) {
        const newCount = rateData.attempt_count + 1;

        if (newCount > config.max) {
          // Block IP
          await blockClientIp(
            `Excessive failed ${config.label} attempts (Rate limit exceeded)`,
            config.blockMinutes
          );
          
          return {
            allowed: false,
            attemptsRemaining: 0,
            errorMsg: `Rate limit exceeded. Too many attempts for ${config.label}. Your IP is blocked for ${config.blockMinutes} minutes.`
          };
        }

        // Increment attempt
        await supabase
          .from('firewall_rate_limits')
          .update({
            attempt_count: newCount,
            last_attempt_at: now.toISOString()
          })
          .eq('id', rateData.id);

        return { allowed: true, attemptsRemaining: config.max - newCount };
      } else {
        // Outside window, reset attempt count to 1
        await supabase
          .from('firewall_rate_limits')
          .update({
            attempt_count: 1,
            last_attempt_at: now.toISOString()
          })
          .eq('id', rateData.id);

        return { allowed: true, attemptsRemaining: config.max - 1 };
      }
    } catch (err) {
      console.error('Rate limit engine error:', err);
      // Fallback: fail open rather than locking out users if DB is temporarily failing
      return { allowed: true, attemptsRemaining: 1 };
    }
  };

  // 4. Log Audit Event
  const logAuditEvent = async (action: string, email?: string, userId: string | null = null) => {
    try {
      await supabase
        .from('audit_logs')
        .insert({
          user_id: userId,
          email: email || null,
          action,
          ip_address: clientIp,
          user_agent: navigator.userAgent
        });
    } catch (err) {
      console.error('Failed to log audit event:', err);
    }
  };

  // 5. Input Sanitizer (XSS Prevention)
  const sanitizeInput = (text: string): string => {
    if (!text) return '';
    return text
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '')
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

  // 6. Request Payload Validation Firewall
  const validatePayload = (
    data: Record<string, string>,
    action: 'login' | 'signup' | 'forgot-password'
  ): { valid: boolean; errorMsg?: string } => {
    // Check for spam submissions (empty fields or payload size limits)
    const payloadKeys = Object.keys(data);
    if (payloadKeys.length === 0) {
      return { valid: false, errorMsg: 'Empty payloads are blocked by Firewall.' };
    }

    // Check for abnormally large values (DoS mitigation)
    for (const key of payloadKeys) {
      if (data[key] && data[key].length > 1000) {
        return { valid: false, errorMsg: `Field '${key}' exceeds max length of 1000 characters.` };
      }
    }

    // Email validation
    if (data.email !== undefined) {
      const email = data.email.trim();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!email || !emailRegex.test(email)) {
        return { valid: false, errorMsg: 'Invalid email address format.' };
      }
    }

    // Password validation (Signup only)
    if (action === 'signup' && data.password !== undefined) {
      const password = data.password;
      if (!password || password.length < 8) {
        return { valid: false, errorMsg: 'Password must be at least 8 characters long.' };
      }
      
      // Basic complexity (needs at least one letter and one number)
      const hasLetter = /[a-zA-Z]/.test(password);
      const hasNumber = /[0-9]/.test(password);
      if (!hasLetter || !hasNumber) {
        return { valid: false, errorMsg: 'Password must contain at least one letter and one number.' };
      }
    }

    // Full name validation
    if (action === 'signup' && data.fullName !== undefined) {
      const name = data.fullName.trim();
      if (!name || name.length < 2) {
        return { valid: false, errorMsg: 'Full Name must be at least 2 characters.' };
      }
    }

    return { valid: true };
  };

  return (
    <FirewallContext.Provider
      value={{
        clientIp,
        isIpBlocked,
        checkAndIncrementRateLimit,
        logAuditEvent,
        sanitizeInput,
        validatePayload,
        blockClientIp
      }}
    >
      {children}
    </FirewallContext.Provider>
  );
};

export const useFirewall = () => {
  const context = useContext(FirewallContext);
  if (context === undefined) {
    throw new Error('useFirewall must be used within a FirewallProvider');
  }
  return context;
};
