import { useEffect, useState, useRef, useCallback } from 'react';
import supabase from '../../services/supabase';

const VISITOR_ID_KEY = 'tabibi_visitor_id';

const getVisitorId = () => {
  let id = localStorage.getItem(VISITOR_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, id);
  }
  return id;
};

export const useBookingAnalytics = (clinicId) => {
  const [visitorId] = useState(getVisitorId);
  const [geoData, setGeoData] = useState(null);
  const sessionIdRef = useRef(crypto.randomUUID());
  const hasLoggedViewRef = useRef(false);
  const draftIdRef = useRef(null);
  const isConvertedRef = useRef(false);

  // Fetch Geo Data
  useEffect(() => {
    const fetchGeo = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        if (res.ok) {
          const data = await res.json();
          setGeoData(data);
        }
      } catch (e) {
        console.error('Failed to fetch geo data', e);
      }
    };
    fetchGeo();
  }, []);

  // Log View
  useEffect(() => {
    if (!clinicId || hasLoggedViewRef.current) return;

    const logView = async () => {
        try {
            await supabase.from('booking_analytics').insert({
                clinic_id: clinicId,
                visitor_id: visitorId,
                event_type: 'view',
                device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
                browser: navigator.userAgent,
                // We'll try to update with geo data later if needed, but this ensures immediate logging
            });
            hasLoggedViewRef.current = true;
        } catch (err) {
            console.error('Analytics error:', err);
        }
    };
    logView();
  }, [clinicId, visitorId]);

  // Save Draft
  const saveDraft = useCallback(async (step, data) => {
      if (!clinicId || isConvertedRef.current) return;
      
      const payload = {
            clinic_id: clinicId,
            visitor_id: visitorId,
            session_id: sessionIdRef.current,
            current_step: step,
            form_data: data,
            ip_address: geoData?.ip,
            updated_at: new Date().toISOString(),
            status: 'in_progress',
            // Extract common fields for easier querying
            patient_name: data?.name || data?.patientName,
            patient_phone: data?.phone || data?.patientPhone,
            selected_date: data?.date || data?.selectedDate,
            selected_time: data?.time || data?.selectedTime
      };
      
      if (draftIdRef.current) {
          payload.id = draftIdRef.current;
      }
      
      try {
          const { data: saved, error } = await supabase
            .from('booking_drafts')
            .upsert(payload)
            .select()
            .single();
            
          if (saved) {
              draftIdRef.current = saved.id;
          }
      } catch (err) {
          console.error('Error saving draft:', err);
      }
  }, [clinicId, visitorId, geoData]);

  // Check Blocked
  const checkBlocked = useCallback(async (phone) => {
      if (!clinicId || !phone) return false;
      
      try {
          const { data, error } = await supabase.rpc('check_is_blocked', {
              check_phone: phone,
              check_clinic_id: clinicId
          });
          
          if (error) {
              console.error('RPC Error:', error);
              return false;
          }
          return data;
      } catch (err) {
          console.error('Block check error:', err);
          return false; 
      }
  }, [clinicId]);

  // Log Conversion
  const logConversion = useCallback(async () => {
      if (!clinicId) return;
      
      isConvertedRef.current = true;

      try {
          // Log conversion event
          await supabase.from('booking_analytics').insert({
              clinic_id: clinicId,
              visitor_id: visitorId,
              event_type: 'conversion',
              ip_address: geoData?.ip,
              country: geoData?.country_name,
              city: geoData?.city,
              device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
          });
          
          // Mark draft as completed
          if (draftIdRef.current) {
              await supabase
                .from('booking_drafts')
                .update({ status: 'completed' })
                .eq('id', draftIdRef.current);
          }
      } catch (err) {
          console.error('Conversion log error:', err);
      }
  }, [clinicId, visitorId, geoData]);

  // Log Blocked Attempt
  const logBlockedAttempt = useCallback(async (phone) => {
    if (!clinicId) return;
    try {
        await supabase.from('booking_analytics').insert({
            clinic_id: clinicId,
            visitor_id: visitorId,
            event_type: 'blocked_attempt',
            ip_address: geoData?.ip,
            country: geoData?.country_name,
            city: geoData?.city,
            device_type: /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop'
        });
        
        // Also mark draft as abandoned/blocked
        if (draftIdRef.current) {
            await supabase
              .from('booking_drafts')
              .update({ status: 'abandoned', form_data: { ...draftIdRef.current?.form_data, blocked: true } })
              .eq('id', draftIdRef.current);
        }
    } catch (err) {
        console.error('Blocked log error:', err);
    }
  }, [clinicId, visitorId, geoData]);

  return { saveDraft, checkBlocked, logConversion, logBlockedAttempt, visitorId, geoData };
};
