/* Masáže Majka — staged Supabase adapter.
   Not loaded on the live page. Enable only after Gmail notifications and payments tests.
   The server, not the browser, validates availability and prices. */
(function () {
  'use strict';
  const BASE = 'https://zjwoqtyxsmafpfyobbgo.supabase.co/functions/v1';
  const API = {
    ready: false, // Keep false until the full booking flow is approved and tested.
    async request(path, options = {}) {
      const ctl = new AbortController();
      const timeout = setTimeout(() => ctl.abort(), 12000);
      try {
        const response = await fetch(BASE + path, {
          ...options,
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-store',
          signal: ctl.signal,
          headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
        });
        let data;
        try { data = await response.json(); } catch (_) { data = {}; }
        if (!response.ok) {
          const err = new Error(data.error || 'Rezervačná služba momentálne nie je dostupná.');
          err.httpStatus = response.status;
          throw err;
        }
        return data;
      } finally {
        clearTimeout(timeout);
      }
    },
    async services() {
      const result = await this.request('/majka-availability');
      return Array.isArray(result.services) ? result.services : [];
    },
    async availability(day, serviceId) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !Number.isInteger(Number(serviceId))) throw new Error('Neplatný dátum alebo služba');
      return this.request('/majka-availability?date=' + encodeURIComponent(day) + '&service_id=' + encodeURIComponent(serviceId));
    },
    async reserve(form) {
      if (!this.ready) throw new Error('Online rezervácie ešte nie sú aktivované. Pošlite e-mailovú žiadosť.');
      // The server only creates a pending booking; payment verification remains separate.
      const fields = ['name', 'email', 'phone', 'note', 'date', 'time', 'service_id'];
      const body = Object.fromEntries(fields.map(k => [k, form[k] || '']));
      body.website = ''; // honeypot; render a hidden real field in the future form.
      return this.request('/majka-create-booking', { method: 'POST', body: JSON.stringify(body) });
    },
  };
  Object.freeze(API);
  Object.defineProperty(window, 'MajkaBookingApi', { value: API, writable: false });
})();
