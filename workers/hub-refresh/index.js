export default {
  async scheduled(controller, env) {
    const r = await fetch("https://abuz8ai.com/api/refresh", {
      headers: { "X-Cron-Secret": env.CRON_SECRET || "" },
    });
    const text = await r.text();
    console.log("hub-refresh", r.status, text.slice(0, 300));
  },
};
