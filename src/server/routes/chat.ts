import { Hono } from 'hono';
import { query } from '../lib/db';
import { requireAuth } from '../middleware/auth';

const chat = new Hono();
chat.use('*', requireAuth);

const GEO_ENABLED = process.env.GEO_ENABLED === 'true';

// Geo is disabled by default. The deterministic /insight endpoint
// still works regardless - it surfaces useful observations from user data
// without any AI model needed.

chat.get('/status', (c) => {
  return c.json({ enabled: GEO_ENABLED });
});

chat.post('/message', (c) => {
  return c.json({
    error: 'Geo chat is disabled. The app works fully without it. To enable, see the README.',
  }, 503);
});

// Deterministic insight - pure math, no AI required
chat.get('/insight', async (c) => {
  try {
    const userId = c.get('userId') as string;
    const debts = await query<{ name: string; balance: number; apr: number; min_payment: number }>(
      'SELECT name, balance, apr, min_payment FROM debts WHERE user_id = ? ORDER BY apr DESC', [userId]
    );

    if (debts.length === 0) {
      return c.json({ insight: "You're debt-free in this app. Time to set the next goal — savings or investing?" });
    }

    const highestApr = debts[0];
    const totalDebt = debts.reduce((s, d) => s + Number(d.balance), 0);
    const aprNum = Number(highestApr.apr);
    const balNum = Number(highestApr.balance);

    let insight = '';
    if (aprNum >= 20) {
      insight = `Heads up: your "${highestApr.name}" carries a ${aprNum.toFixed(2)}% APR on a $${balNum.toFixed(0)} balance. That's costing you roughly $${(balNum * aprNum / 100 / 12).toFixed(0)}/month in interest alone. Avalanche strategy will save you the most here.`;
    } else if (debts.length >= 3) {
      insight = `You have ${debts.length} active debts totaling $${totalDebt.toFixed(0)}. The Snowball method could give you a quick first win — your smallest balance is "${debts[debts.length - 1].name}".`;
    } else {
      insight = `Total outstanding debt: $${totalDebt.toFixed(0)} across ${debts.length} account${debts.length !== 1 ? 's' : ''}.`;
    }
    return c.json({ insight });
  } catch (err) {
    console.error('[chat/insight]', err);
    return c.json({ insight: null });
  }
});

export default chat;
