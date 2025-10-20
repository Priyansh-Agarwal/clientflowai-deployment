import axios from 'axios';

(async () => {
  const base = process.env.API_BASE_URL || 'http://localhost:4000/api';
  const h = await axios.get(base + '/health'); console.log(h.data);
  const m = await axios.post(base + '/messages/outbound?orgId=00000000-0000-0000-0000-000000000000', {
    orgId: '00000000-0000-0000-0000-000000000000', channel: 'sms', to_addr: '+15555550123', body: 'Smoke test'
  }); console.log(m.data);
})();
