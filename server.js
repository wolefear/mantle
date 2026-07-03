const express = require("express");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const MANTLE = 5000;
// any valid address works for quotes (no signing, quote-only)
const QUOTE_ADDR = "0x0000000000000000000000000000000000000001";

app.post("/api/route", async (req, res) => {
  try {
    const { fromToken, toToken, amount } = req.body;
    const r = await fetch("https://li.quest/v1/advanced/routes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromChainId: MANTLE, toChainId: MANTLE,
        fromTokenAddress: fromToken, toTokenAddress: toToken,
        fromAmount: amount, fromAddress: QUOTE_ADDR,
        options: { order: "RECOMMENDED", slippage: 0.005 }
      })
    });
    const data = await r.json();
    const routes = data.routes || [];
    if (!routes.length) return res.json({ error: "No routes found", raw: data });

    const net = (x) => Number(x.toAmountUSD) - Number(x.gasCostUSD || 0);
    const sorted = [...routes].sort((a, b) => net(b) - net(a));
    const best = sorted[0], worst = sorted[sorted.length - 1];

    const feeUSD = (rt) => (rt.steps || [])
      .flatMap(s => s.estimate?.feeCosts || [])
      .reduce((sum, f) => sum + Number(f.amountUSD || 0), 0);

    const shape = (rt) => ({
      venues: (rt.steps || []).map(s => s.toolDetails?.name || s.tool),
      fromUSD: Number(rt.fromAmountUSD),
      netOut: net(rt),
      gas: Number(rt.gasCostUSD || 0),
      fees: feeUSD(rt),
      priceImpact: Number(rt.fromAmountUSD) - Number(rt.toAmountUSD)
    });

    const optimized = shape(best), naive = shape(worst);
    const frictionSavedPct =
      ((optimized.netOut - naive.netOut) / optimized.fromUSD) * 100;

    res.json({
      optimized, naive,
      frictionSavedPct: Number(frictionSavedPct.toFixed(3)),
      routesConsidered: routes.length
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("http://localhost:" + PORT));