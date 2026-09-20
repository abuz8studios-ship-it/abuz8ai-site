(function () {
  function go(btn) {
    if (!btn || btn.dataset.busy) return;
    btn.dataset.busy = "1";
    var old = btn.textContent;
    btn.textContent = "Opening Stripe…";
    fetch("/api/stripe-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ tool: "pm-rescue" }),
    })
      .then(function (r) {
        return r.json().then(function (j) {
          return { ok: r.ok, j: j };
        });
      })
      .then(function (x) {
        if (x.j && x.j.url && /^https:\/\/checkout\.stripe\.com\//.test(x.j.url)) {
          location.href = x.j.url;
          return;
        }
        btn.dataset.busy = "";
        btn.textContent = old;
        var msg =
          (x.j && (x.j.message || x.j.error)) ||
          "Checkout is not live yet. Email support@abuz8ai.com.";
        if (window.confirm(msg + "\n\nOpen email intake instead?")) {
          location.href = "/contact?product=pm-rescue&price=1500";
        }
      })
      .catch(function () {
        btn.dataset.busy = "";
        btn.textContent = old;
        location.href = "/contact?product=pm-rescue&price=1500";
      });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-pay-rescue]");
    if (!a) return;
    e.preventDefault();
    go(a);
  });
})();
