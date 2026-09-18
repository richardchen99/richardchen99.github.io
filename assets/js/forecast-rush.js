(function () {
  "use strict";

  var root = document.querySelector("[data-forecast-rush]");
  if (!root) return;

  var INITIAL_CAPITAL = 1000000;
  var TOTAL_ROUNDS = 12;
  var MIN_STAKE = 10000;
  var PRICE_POINTS = 22;
  var SENSITIVITY = 1;
  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  var randomState = 1;
  var chartTooltipPinned = false;

  var regimes = {
    bull: { drift: 0.0035, volatility: 0.012 },
    bear: { drift: -0.0032, volatility: 0.015 },
    range: { drift: 0, volatility: 0.008 }
  };

  var assets = [
    {
      name: "NOVA Dynamics",
      symbol: "NVD",
      sector: "AI Infrastructure",
      basePrice: 128,
      volatility: 1.14,
      drift: 0.0007,
      liquidity: "Deep",
      spread: 0.00035,
      story:
        "一份关键算力订单在盘前流出，但公司尚未确认，买方资金已经开始抢跑"
    },
    {
      name: "Meridian Cloud",
      symbol: "MCL",
      sector: "Enterprise Software",
      basePrice: 86,
      volatility: 0.92,
      drift: 0.0004,
      liquidity: "Deep",
      spread: 0.0003,
      story:
        "两家机构同时调整订阅增速预期，盘前订单正在重新评估它的长期估值"
    },
    {
      name: "Helix Biotech",
      symbol: "HLX",
      sector: "Biotechnology",
      basePrice: 54,
      volatility: 1.42,
      drift: 0.0002,
      liquidity: "Moderate",
      spread: 0.00075,
      story:
        "临床节点消息提前进入交易群，期权市场先于现货出现异动，消息真伪仍待验证"
    },
    {
      name: "Atlas Energy",
      symbol: "ATE",
      sector: "Clean Energy",
      basePrice: 72,
      volatility: 1.08,
      drift: -0.0001,
      liquidity: "Moderate",
      spread: 0.00055,
      story:
        "隔夜能源政策传闻改变了板块预期，多空资金正在开盘前快速换手"
    },
    {
      name: "Lumina Mobility",
      symbol: "LMB",
      sector: "Electric Mobility",
      basePrice: 113,
      volatility: 1.28,
      drift: 0.0003,
      liquidity: "Active",
      spread: 0.0005,
      story:
        "最新交付数据与供应链消息相互冲突，市场对下一季指引产生明显分歧"
    }
  ];

  var storyProfiles = [
    {
      firm: "ASTER CAPITAL",
      desk: "EVENT DESK",
      role: "Event-Driven Trader",
      roleZh: "事件驱动交易员",
      title: "The opening bell is yours.",
      mandate: "Separate signal from noise",
      mandateZh: "从噪声中识别有效定价"
    },
    {
      firm: "NORTHSTAR PARTNERS",
      desk: "TACTICAL BOOK",
      role: "Tactical Portfolio Manager",
      roleZh: "战术组合经理",
      title: "One session. One mandate.",
      mandate: "Preserve capital, capture edge",
      mandateZh: "守住本金并捕捉定价偏差"
    },
    {
      firm: "MERIDIAN HOUSE",
      desk: "RISK OFFICE",
      role: "Risk Desk Lead",
      roleZh: "风险交易主管",
      title: "The committee is watching.",
      mandate: "Control drawdown under pressure",
      mandateZh: "在压力行情中控制回撤"
    }
  ];

  var newsPool = [
    {
      tone: 1,
      title: "Product demand estimate revised higher.",
      impact: 0.018
    },
    {
      tone: 1,
      title: "Institutional flow turns supportive.",
      impact: 0.012
    },
    {
      tone: 1,
      title: "New contract expands the revenue outlook.",
      impact: 0.024
    },
    {
      tone: -1,
      title: "Margin pressure appears in channel checks.",
      impact: -0.017
    },
    {
      tone: -1,
      title: "Regulatory uncertainty weighs on sentiment.",
      impact: -0.023
    },
    {
      tone: -1,
      title: "Large holders reduce near-term exposure.",
      impact: -0.014
    },
    {
      tone: 0,
      title: "Analyst opinions remain divided.",
      impact: 0
    },
    {
      tone: 0,
      title: "Volume contracts ahead of the next catalyst.",
      impact: 0
    },
    {
      tone: 1,
      title: "Sector ETF inflows improve the liquidity backdrop.",
      impact: 0.011
    },
    {
      tone: -1,
      title: "Options skew signals rising demand for protection.",
      impact: -0.012
    },
    {
      tone: 0,
      title: "Macro data shifts rate expectations, direction unclear.",
      impact: 0
    }
  ];

  var state = {};

  var elements = {
    sessionCode: root.querySelector("[data-session-code]"),
    storyTime: root.querySelector("[data-story-time]"),
    storyDesk: root.querySelector("[data-story-desk]"),
    storyTitle: root.querySelector("[data-story-title]"),
    storyCopy: root.querySelector("[data-story-copy]"),
    storyRole: root.querySelector("[data-story-role]"),
    storyMandate: root.querySelector("[data-story-mandate]"),
    storyStatus: root.querySelector("[data-story-status]"),
    assetName: root.querySelector("[data-asset-name]"),
    assetSymbol: root.querySelector("[data-asset-symbol]"),
    assetSector: root.querySelector("[data-asset-sector]"),
    marketClock: root.querySelector("[data-market-clock]"),
    marketPhase: root.querySelector("[data-market-phase]"),
    tapeItems: Array.prototype.slice.call(
      root.querySelectorAll("[data-tape-item]")
    ),
    roundCurrent: root.querySelector("[data-round-current]"),
    roundTotal: root.querySelector("[data-round-total]"),
    portfolioValue: root.querySelector("[data-portfolio-value]"),
    totalPnl: root.querySelector("[data-total-pnl]"),
    winRate: root.querySelector("[data-win-rate]"),
    bestRun: root.querySelector("[data-best-run]"),
    marketPrice: root.querySelector("[data-market-price]"),
    marketChange: root.querySelector("[data-market-change]"),
    marketChangeWrap: root.querySelector(".forecast-market__change"),
    chart: root.querySelector(".forecast-chart"),
    chartLine: root.querySelector("[data-chart-line]"),
    chartCandles: root.querySelector("[data-chart-candles]"),
    chartVolume: root.querySelector("[data-chart-volume]"),
    chartCursor: root.querySelector("[data-chart-cursor]"),
    chartEvents: root.querySelector("[data-chart-events]"),
    chartCrosshair: root.querySelector("[data-chart-crosshair]"),
    chartHitboxes: root.querySelector("[data-chart-hitboxes]"),
    chartTooltip: root.querySelector("[data-chart-tooltip]"),
    chartTooltipTime: root.querySelector("[data-chart-tooltip-time]"),
    chartTooltipChange: root.querySelector("[data-chart-tooltip-change]"),
    chartTooltipOpen: root.querySelector("[data-chart-tooltip-open]"),
    chartTooltipHigh: root.querySelector("[data-chart-tooltip-high]"),
    chartTooltipLow: root.querySelector("[data-chart-tooltip-low]"),
    chartTooltipClose: root.querySelector("[data-chart-tooltip-close]"),
    chartTooltipVolume: root.querySelector("[data-chart-tooltip-volume]"),
    momentum: root.querySelector("[data-signal-momentum]"),
    momentumMeter: root.querySelector("[data-signal-momentum-meter]"),
    volatility: root.querySelector("[data-signal-volatility]"),
    volatilityMeter: root.querySelector("[data-signal-volatility-meter]"),
    news: root.querySelector("[data-signal-news]"),
    reliability: root.querySelector("[data-signal-reliability]"),
    tradeState: root.querySelector("[data-trade-state]"),
    riskLabel: root.querySelector("[data-risk-label]"),
    directionButtons: Array.prototype.slice.call(
      root.querySelectorAll("[data-direction]")
    ),
    stakeInput: root.querySelector("[data-stake-input]"),
    stakeOutput: root.querySelector("[data-stake-output]"),
    stakeMaxLabel: root.querySelector("[data-stake-max-label]"),
    presetButtons: Array.prototype.slice.call(
      root.querySelectorAll("[data-stake-preset]")
    ),
    potentialSwing: root.querySelector("[data-potential-swing]"),
    exposureMeter: root.querySelector("[data-exposure-meter]"),
    exposureCopy: root.querySelector("[data-exposure-copy]"),
    placeTrade: root.querySelector("[data-place-trade]"),
    observe: root.querySelector("[data-observe]"),
    cashOut: root.querySelector("[data-cash-out]"),
    feedbackKicker: root.querySelector("[data-feedback-kicker]"),
    feedbackTitle: root.querySelector("[data-feedback-title]"),
    feedbackCopy: root.querySelector("[data-feedback-copy]"),
    ledgerRows: root.querySelector("[data-ledger-rows]"),
    ledgerEmpty: root.querySelector("[data-ledger-empty]"),
    resultPanel: root.querySelector("[data-result-panel]"),
    resultKicker: root.querySelector("[data-result-kicker]"),
    resultTitle: root.querySelector("[data-result-title]"),
    resultValue: root.querySelector("[data-result-value]"),
    resultReturn: root.querySelector("[data-result-return]"),
    resultCopy: root.querySelector("[data-result-copy]"),
    resultPnl: root.querySelector("[data-result-pnl]"),
    resultWinRate: root.querySelector("[data-result-win-rate]"),
    resultDrawdown: root.querySelector("[data-result-drawdown]"),
    resultStyle: root.querySelector("[data-result-style]"),
    newSession: root.querySelector("[data-new-session]")
  };

  function reseedRandom() {
    if (window.crypto && window.crypto.getRandomValues) {
      var seed = new Uint32Array(1);
      window.crypto.getRandomValues(seed);
      randomState = seed[0] || 1;
      return;
    }
    randomState = (Date.now() ^ Math.floor(Math.random() * 4294967295)) >>> 0;
  }

  function randomUnit() {
    randomState += 0x6D2B79F5;
    var value = randomState;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  function randomBetween(min, max) {
    return min + randomUnit() * (max - min);
  }

  function randomNormal() {
    var u = Math.max(randomUnit(), 0.0001);
    var v = Math.max(randomUnit(), 0.0001);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatMoney(value, signed) {
    var rounded = Math.round(Math.abs(value));
    var prefix = value < 0 ? "-¥" : signed && value > 0 ? "+¥" : "¥";
    return prefix + rounded.toLocaleString("en-US");
  }

  function formatPrice(value) {
    return "¥" + value.toFixed(2);
  }

  function formatPercent(value, signed) {
    var prefix = signed && value > 0 ? "+" : "";
    return prefix + value.toFixed(2) + "%";
  }

  function formatVolume(value) {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(value >= 10000000 ? 1 : 2) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(value >= 100000 ? 0 : 1) + "K";
    }
    return String(value);
  }

  function formatCandleTime(index, count) {
    var latestMinutes = 570 + (state.round - 1) * 15;
    var totalMinutes = latestMinutes - (count - 1 - index) * 15;
    var normalized = ((totalMinutes % 1440) + 1440) % 1440;
    var hours = Math.floor(normalized / 60);
    var minutes = normalized % 60;
    var session = totalMinutes < 570 ? "PRE-MARKET" : "MARKET";
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0") +
      " · " +
      session
    );
  }

  function getStoredBest() {
    try {
      return Number(window.localStorage.getItem("forecastRushBest") || 0);
    } catch (error) {
      return 0;
    }
  }

  function storeResult(roi) {
    try {
      var best = Math.max(getStoredBest(), roi);
      window.localStorage.setItem("forecastRushBest", String(best));
      var plays = Number(
        window.localStorage.getItem("forecastRushPlays") || 0
      );
      window.localStorage.setItem("forecastRushPlays", String(plays + 1));
    } catch (error) {
      // The game remains fully playable when local storage is unavailable.
    }
  }

  function createCandle(open, marketReturn, volatility, volumeBase) {
    var close = Math.max(8, open * (1 + marketReturn));
    var wickRange =
      open * Math.max(0.003, volatility * randomBetween(0.34, 0.82));
    var high = Math.max(open, close) + wickRange * randomBetween(0.25, 0.9);
    var low = Math.max(
      1,
      Math.min(open, close) - wickRange * randomBetween(0.25, 0.9)
    );
    var volume =
      volumeBase *
      (0.72 + Math.abs(marketReturn) * 18 + randomBetween(0, 0.58));
    return {
      open: open,
      high: high,
      low: low,
      close: close,
      volume: Math.round(volume)
    };
  }

  function seedMarket(asset) {
    var start = asset.basePrice * randomBetween(0.9, 1.1);
    var history = [start];
    var candles = [];
    var drift = randomBetween(-0.0018, 0.0022) + asset.drift;
    var volumeBase = randomBetween(760000, 2400000);

    for (var index = 0; index < 14; index += 1) {
      var open = history[history.length - 1];
      var move =
        drift +
        randomNormal() *
          0.0065 *
          asset.volatility *
          (0.78 + index / 45);
      var candle = createCandle(
        open,
        clamp(move, -0.036, 0.036),
        0.009 * asset.volatility,
        volumeBase
      );
      candles.push(candle);
      history.push(candle.close);
    }

    return {
      history: history,
      candles: candles,
      volumeBase: volumeBase
    };
  }

  function createTape(asset) {
    var marketMove = randomBetween(-1.35, 1.35);
    var sectorMove = marketMove * 0.48 + randomBetween(-1.5, 1.5);
    var ratesMove = randomBetween(-6, 6);
    var sentiment = Math.round(clamp(52 + marketMove * 12 + randomBetween(-9, 9), 18, 86));

    return [
      {
        key: "market",
        label: "GLOBAL 100",
        numeric: marketMove,
        value: formatPercent(marketMove, true),
        detail: marketMove >= 0 ? "Risk bid" : "Risk offered",
        tone: marketMove >= 0 ? "positive" : "negative"
      },
      {
        key: "sector",
        label: asset.sector,
        numeric: sectorMove,
        value: formatPercent(sectorMove, true),
        detail: asset.liquidity + " liquidity",
        tone: sectorMove >= 0 ? "positive" : "negative"
      },
      {
        key: "rates",
        label: "10Y YIELD",
        numeric: ratesMove,
        value: (ratesMove >= 0 ? "+" : "") + ratesMove.toFixed(1) + " bp",
        detail: ratesMove >= 0 ? "Rates higher" : "Rates lower",
        tone: ratesMove <= 0 ? "positive" : "negative"
      },
      {
        key: "sentiment",
        label: "RISK SENTIMENT",
        numeric: sentiment,
        value: sentiment + "/100",
        detail: sentiment >= 62 ? "Constructive" : sentiment <= 40 ? "Defensive" : "Balanced",
        tone: sentiment >= 55 ? "positive" : sentiment <= 40 ? "negative" : "neutral"
      }
    ];
  }

  function createStory(asset, tape) {
    var profile =
      storyProfiles[Math.floor(randomUnit() * storyProfiles.length)];
    var briefMinutes = Math.floor(randomBetween(527, 554));
    var marketMove = tape[0].numeric;
    var marketContext =
      marketMove > 0.45
        ? "全球风险偏好正在升温"
        : marketMove < -0.45
          ? "全球资金正转向防御"
          : "大盘方向仍在拉锯";

    return {
      time:
        String(Math.floor(briefMinutes / 60)).padStart(2, "0") +
        ":" +
        String(briefMinutes % 60).padStart(2, "0") +
        " · PRIORITY",
      desk: profile.firm + " / " + profile.desk,
      title: profile.title,
      role: profile.role,
      mandate: profile.mandate,
      copy:
        "你是 " +
        profile.firm
          .toLowerCase()
          .replace(/\b\w/g, function (letter) {
            return letter.toUpperCase();
          }) +
        " 的" +
        profile.roleZh +
        "。开盘前，投委会将 ¥1,000,000 战术资金交给你。" +
        asset.story +
        "；" +
        marketContext +
        "。你只有 12 次决策，在收盘前完成「" +
        profile.mandateZh +
        "」并决定何时收手。"
    };
  }

  function createInitialState() {
    var asset = assets[Math.floor(randomUnit() * assets.length)];
    var seeded = seedMarket(asset);
    var tape = createTape(asset);
    var initialRegime = ["bull", "bear", "range"][
      Math.floor(randomUnit() * 3)
    ];
    return {
      sessionCode:
        "FR-" +
        (randomState >>> 0).toString(36).toUpperCase().slice(-4).padStart(4, "0"),
      asset: asset,
      tape: tape,
      story: createStory(asset, tape),
      round: 1,
      balance: INITIAL_CAPITAL,
      peakBalance: INITIAL_CAPITAL,
      maxDrawdown: 0,
      direction: "long",
      stake: 100000,
      price: seeded.history[seeded.history.length - 1],
      previousPrice: seeded.history[seeded.history.length - 1],
      history: seeded.history,
      candles: seeded.candles,
      volumeBase: seeded.volumeBase,
      trades: [],
      chartEvents: [],
      wins: 0,
      losses: 0,
      observations: 0,
      regime: initialRegime,
      volatilityMultiplier: randomBetween(0.82, 1.18),
      fairValue:
        seeded.history[seeded.history.length - 1] *
        randomBetween(0.95, 1.05),
      signal: null,
      lastReturn: 0,
      locked: false,
      finished: false,
      finishReason: "",
      totalExposure: 0
    };
  }

  function maybeChangeRegime() {
    if (randomUnit() > 0.2) return;
    var transitions = {
      bull: ["bull", "range", "bear"],
      bear: ["bear", "range", "bull"],
      range: ["range", "bull", "bear"]
    };
    var weights = randomUnit();
    var options = transitions[state.regime];
    state.regime = weights < 0.48
      ? options[0]
      : weights < 0.82
        ? options[1]
        : options[2];
  }

  function recentMomentum() {
    var history = state.history;
    var start = history[Math.max(0, history.length - 4)];
    return (history[history.length - 1] - start) / start;
  }

  function prepareSignal() {
    maybeChangeRegime();
    var regime = regimes[state.regime];
    var momentum = recentMomentum();

    state.volatilityMultiplier = clamp(
      state.volatilityMultiplier * 0.72 +
        randomBetween(0.72, 1.48) * 0.28,
      0.62,
      1.72
    );

    var hasNews = randomUnit() < 0.58;
    var sourceNews = hasNews
      ? newsPool[Math.floor(randomUnit() * newsPool.length)]
      : {
          tone: 0,
          title: "Order flow is quiet; price action leads.",
          impact: 0
        };
    var news = {
      tone: sourceNews.tone,
      title: sourceNews.title.replace("Sector", state.asset.sector),
      impact: sourceNews.impact
    };
    var reliability = Math.round(randomBetween(54, 88));
    var noise = randomNormal() * 0.007;
    var projected =
      regime.drift +
      state.asset.drift +
      momentum * 0.28 +
      news.impact * (reliability / 100) +
      noise;

    state.signal = {
      news: news,
      reliability: reliability,
      projected: projected,
      momentum: momentum,
      volatility:
        regime.volatility *
        state.volatilityMultiplier *
        state.asset.volatility
    };
  }

  function calculateNextMove() {
    var regime = regimes[state.regime];
    var momentum = recentMomentum();
    var meanReversion =
      ((state.fairValue - state.price) / state.price) * 0.12;
    var eventImpact =
      state.signal.news.impact *
      (0.55 + state.signal.reliability / 200) *
      randomBetween(0.72, 1.2);
    var volatility =
      regime.volatility *
      state.volatilityMultiplier *
      state.asset.volatility;
    var shock = randomNormal() * volatility;

    if (randomUnit() < 0.055) {
      shock +=
        (randomUnit() < 0.5 ? -1 : 1) *
        randomBetween(0.025, 0.055);
    }

    var marketReturn =
      regime.drift +
      state.asset.drift +
      momentum * 0.2 +
      meanReversion +
      eventImpact +
      shock;

    state.fairValue *= 1 + regime.drift * 0.55 + randomNormal() * 0.004;
    return clamp(marketReturn, -0.085, 0.085);
  }

  function getMomentumView() {
    var projected = state.signal.projected;
    if (projected > 0.018) return { label: "Strong Up", value: 88 };
    if (projected > 0.006) return { label: "Positive", value: 68 };
    if (projected < -0.018) return { label: "Strong Down", value: 15 };
    if (projected < -0.006) return { label: "Negative", value: 34 };
    return { label: "Neutral", value: 50 };
  }

  function getVolatilityView() {
    var volatility = state.signal.volatility;
    if (volatility > 0.027) return { label: "Extreme", value: 92 };
    if (volatility > 0.019) return { label: "Elevated", value: 73 };
    if (volatility < 0.011) return { label: "Quiet", value: 30 };
    return { label: "Normal", value: 52 };
  }

  function getRiskProfile() {
    var ratio = state.balance > 0 ? state.stake / state.balance : 0;
    if (ratio >= 0.75) return { label: "Maximum risk", className: "high" };
    if (ratio >= 0.45) return { label: "Aggressive", className: "high" };
    if (ratio >= 0.2) return { label: "Active risk", className: "medium" };
    return { label: "Balanced risk", className: "low" };
  }

  function setFeedback(kicker, title, copy, tone) {
    elements.feedbackKicker.textContent = kicker;
    elements.feedbackTitle.textContent = title;
    elements.feedbackCopy.textContent = copy;
    var feedback = elements.feedbackTitle.closest(".forecast-feedback");
    feedback.setAttribute("data-tone", tone || "neutral");
  }

  function getMarketClock() {
    var totalMinutes = 570 + (state.round - 1) * 15;
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    return (
      String(hours).padStart(2, "0") +
      ":" +
      String(minutes).padStart(2, "0")
    );
  }

  function getMarketPhase() {
    if (state.round <= 3) return "OPENING";
    if (state.round <= 8) return "MIDDAY";
    return "CLOSING";
  }

  function renderMarketContext() {
    elements.sessionCode.textContent = "SESSION " + state.sessionCode;
    elements.assetName.textContent = state.asset.name;
    elements.assetSymbol.textContent = state.asset.symbol;
    elements.assetSector.textContent = state.asset.sector;
    elements.marketClock.textContent = getMarketClock();
    elements.marketPhase.textContent = getMarketPhase();

    elements.tapeItems.forEach(function (item) {
      var key = item.getAttribute("data-tape-item");
      var data = state.tape.filter(function (entry) {
        return entry.key === key;
      })[0];
      if (!data) return;
      item.querySelector("span").textContent = data.label;
      item.querySelector("strong").textContent = data.value;
      item.querySelector("small").textContent = data.detail;
      item.setAttribute("data-value", data.tone);
    });
  }

  function renderStory() {
    elements.storyTime.textContent = state.story.time;
    elements.storyDesk.textContent = state.story.desk;
    elements.storyTitle.textContent = state.story.title;
    elements.storyCopy.textContent = state.story.copy;
    elements.storyRole.textContent = state.story.role;
    elements.storyMandate.textContent = state.story.mandate;
    elements.storyStatus.textContent = state.finished
      ? "Mandate closed"
      : getMarketPhase() +
        " · " +
        Math.max(0, TOTAL_ROUNDS - state.round + 1) +
        " decisions left";
  }

  function updateMarketTape(marketReturn) {
    var market = state.tape[0];
    var sector = state.tape[1];
    var sentiment = state.tape[3];

    market.numeric = clamp(
      market.numeric * 0.74 + marketReturn * 18 + randomBetween(-0.18, 0.18),
      -3.8,
      3.8
    );
    sector.numeric = clamp(
      sector.numeric * 0.62 + marketReturn * 31 + randomBetween(-0.24, 0.24),
      -5.5,
      5.5
    );
    sentiment.numeric = Math.round(
      clamp(
        sentiment.numeric * 0.78 +
          52 * 0.22 +
          marketReturn * 180 +
          randomBetween(-2, 2),
        12,
        92
      )
    );

    market.value = formatPercent(market.numeric, true);
    market.detail = market.numeric >= 0 ? "Risk bid" : "Risk offered";
    market.tone = market.numeric >= 0 ? "positive" : "negative";
    sector.value = formatPercent(sector.numeric, true);
    sector.detail = state.asset.liquidity + " liquidity";
    sector.tone = sector.numeric >= 0 ? "positive" : "negative";
    sentiment.value = sentiment.numeric + "/100";
    sentiment.detail =
      sentiment.numeric >= 62
        ? "Constructive"
        : sentiment.numeric <= 40
          ? "Defensive"
          : "Balanced";
    sentiment.tone =
      sentiment.numeric >= 55
        ? "positive"
        : sentiment.numeric <= 40
          ? "negative"
          : "neutral";
  }

  function renderChart() {
    hideChartTooltip(true);
    var candles = state.candles.slice(-PRICE_POINTS);
    var width = 800;
    var padding = 24;
    var priceBottom = 238;
    var volumeTop = 258;
    var volumeBottom = 302;
    var lows = candles.map(function (candle) { return candle.low; });
    var highs = candles.map(function (candle) { return candle.high; });
    var min = Math.min.apply(null, lows);
    var max = Math.max.apply(null, highs);
    var span = Math.max(max - min, max * 0.035);
    min -= span * 0.18;
    max += span * 0.18;
    var step = (width - padding * 2) / Math.max(candles.length, 1);
    var candleWidth = clamp(step * 0.46, 7, 18);
    var maxVolume = Math.max.apply(
      null,
      candles.map(function (candle) { return candle.volume; })
    );

    function priceY(value) {
      return (
        padding +
        ((max - value) / (max - min)) * (priceBottom - padding)
      );
    }

    function candleX(index) {
      return padding + step * index + step / 2;
    }

    elements.chartCandles.innerHTML = candles
      .map(function (candle, index) {
        var x = candleX(index);
        var openY = priceY(candle.open);
        var closeY = priceY(candle.close);
        var highY = priceY(candle.high);
        var lowY = priceY(candle.low);
        var bodyY = Math.min(openY, closeY);
        var bodyHeight = Math.max(2, Math.abs(closeY - openY));
        var tone = candle.close >= candle.open ? "up" : "down";
        return (
          '<g class="forecast-candle forecast-candle--' +
          tone +
          '" data-candle-render-index="' +
          index +
          '">' +
          '<line x1="' +
          x.toFixed(1) +
          '" y1="' +
          highY.toFixed(1) +
          '" x2="' +
          x.toFixed(1) +
          '" y2="' +
          lowY.toFixed(1) +
          '"></line>' +
          '<rect x="' +
          (x - candleWidth / 2).toFixed(1) +
          '" y="' +
          bodyY.toFixed(1) +
          '" width="' +
          candleWidth.toFixed(1) +
          '" height="' +
          bodyHeight.toFixed(1) +
          '"></rect>' +
          "</g>"
        );
      })
      .join("");

    elements.chartVolume.innerHTML = candles
      .map(function (candle, index) {
        var barHeight =
          (candle.volume / Math.max(maxVolume, 1)) *
          (volumeBottom - volumeTop);
        var tone = candle.close >= candle.open ? "up" : "down";
        return (
          '<rect class="forecast-volume forecast-volume--' +
          tone +
          '" x="' +
          (candleX(index) - candleWidth / 2).toFixed(1) +
          '" y="' +
          (volumeBottom - barHeight).toFixed(1) +
          '" width="' +
          candleWidth.toFixed(1) +
          '" height="' +
          barHeight.toFixed(1) +
          '"></rect>'
        );
      })
      .join("");

    var movingAverage = candles.map(function (candle, index) {
      var start = Math.max(0, index - 4);
      var prior = candles.slice(start, index);
      var average =
        (prior.reduce(function (sum, item) {
          return sum + item.close;
        }, 0) + candle.close) / (prior.length + 1);
      return {
        x: candleX(index),
        y: priceY(average)
      };
    });
    var line = movingAverage
      .map(function (point, index) {
        return (
          (index ? "L" : "M") +
          point.x.toFixed(1) +
          " " +
          point.y.toFixed(1)
        );
      })
      .join(" ");
    var lastCandle = candles[candles.length - 1];
    var lastX = candleX(candles.length - 1);
    var lastY = priceY(lastCandle.close);

    elements.chartLine.setAttribute("d", line);
    elements.chartCursor.setAttribute("cx", lastX.toFixed(1));
    elements.chartCursor.setAttribute("cy", lastY.toFixed(1));

    var candleStart = state.candles.length - candles.length;
    elements.chartEvents.innerHTML = state.chartEvents
      .filter(function (event) {
        return event.index >= candleStart;
      })
      .map(function (event) {
        var relativeIndex = clamp(
          event.index - candleStart,
          0,
          candles.length - 1
        );
        var point = candles[relativeIndex];
        var color = event.pnl >= 0 ? "#70d8c7" : "#e88768";
        return (
          '<circle class="forecast-chart__event" cx="' +
          candleX(relativeIndex).toFixed(1) +
          '" cy="' +
          priceY(point.close).toFixed(1) +
          '" r="4" fill="' +
          color +
          '"></circle>'
        );
      })
      .join("");

    var xPositions = [];
    var hitboxes = [];
    for (var hitIndex = 0; hitIndex < candles.length; hitIndex += 1) {
      xPositions.push(candleX(hitIndex));
      hitboxes.push(
        '<rect data-candle-index="' +
          hitIndex +
          '" x="' +
          (candleX(hitIndex) - step / 2).toFixed(1) +
          '" y="0" width="' +
          step.toFixed(1) +
          '" height="302"></rect>'
      );
    }

    state.chartView = {
      candles: candles,
      xPositions: xPositions
    };
    elements.chartHitboxes.innerHTML = hitboxes.join("");
  }

  function hideChartTooltip(force) {
    if (chartTooltipPinned && !force) return;
    chartTooltipPinned = false;
    elements.chartTooltip.hidden = true;
    elements.chartCrosshair.setAttribute("hidden", "");
    elements.chart.classList.remove("is-inspecting");
    Array.prototype.forEach.call(
      elements.chartCandles.querySelectorAll(".is-active"),
      function (candle) {
        candle.classList.remove("is-active");
      }
    );
  }

  function showChartTooltip(index, event) {
    var chartView = state.chartView;
    if (!chartView || !chartView.candles[index]) return;

    if (event.type === "pointerdown" && event.pointerType !== "mouse") {
      chartTooltipPinned = true;
    }

    var candle = chartView.candles[index];
    var change = ((candle.close - candle.open) / candle.open) * 100;
    var tone = change > 0 ? "positive" : change < 0 ? "negative" : "flat";
    var chartRect = elements.chart.getBoundingClientRect();
    var localX = event.clientX - chartRect.left;
    var localY = event.clientY - chartRect.top;

    elements.chartTooltipTime.textContent = formatCandleTime(
      index,
      chartView.candles.length
    );
    elements.chartTooltipChange.textContent = formatPercent(change, true);
    elements.chartTooltipChange.setAttribute("data-value", tone);
    elements.chartTooltipOpen.textContent = formatPrice(candle.open);
    elements.chartTooltipHigh.textContent = formatPrice(candle.high);
    elements.chartTooltipLow.textContent = formatPrice(candle.low);
    elements.chartTooltipClose.textContent = formatPrice(candle.close);
    elements.chartTooltipVolume.textContent = formatVolume(candle.volume);

    elements.chartCrosshair.setAttribute(
      "x1",
      chartView.xPositions[index].toFixed(1)
    );
    elements.chartCrosshair.setAttribute(
      "x2",
      chartView.xPositions[index].toFixed(1)
    );
    elements.chartCrosshair.removeAttribute("hidden");

    elements.chart.classList.add("is-inspecting");
    Array.prototype.forEach.call(
      elements.chartCandles.querySelectorAll("[data-candle-render-index]"),
      function (renderedCandle) {
        renderedCandle.classList.toggle(
          "is-active",
          Number(
            renderedCandle.getAttribute("data-candle-render-index")
          ) === index
        );
      }
    );

    elements.chartTooltip.hidden = false;
    var tooltipWidth = elements.chartTooltip.offsetWidth;
    var tooltipHeight = elements.chartTooltip.offsetHeight;
    var left = localX + 14;

    if (left + tooltipWidth > chartRect.width - 8) {
      left = localX - tooltipWidth - 14;
    }

    elements.chartTooltip.style.left =
      clamp(left, 8, chartRect.width - tooltipWidth - 8) + "px";
    elements.chartTooltip.style.top =
      clamp(
        localY - tooltipHeight / 2,
        8,
        chartRect.height - tooltipHeight - 32
      ) + "px";
  }

  function renderStake() {
    var maxStake = Math.max(
      MIN_STAKE,
      Math.floor(state.balance / MIN_STAKE) * MIN_STAKE
    );
    state.stake = clamp(state.stake, MIN_STAKE, maxStake);
    elements.stakeInput.max = String(maxStake);
    elements.stakeInput.value = String(state.stake);
    elements.stakeOutput.textContent = formatMoney(state.stake);
    elements.stakeMaxLabel.textContent =
      maxStake >= 1000000
        ? "¥" + (maxStake / 1000000).toFixed(maxStake % 1000000 ? 1 : 0) + "M"
        : "¥" + Math.round(maxStake / 1000) + "K";

    var exposureRatio = state.balance
      ? clamp(state.stake / state.balance, 0, 1)
      : 1;
    var estimatedSwing =
      state.stake *
      Math.max(0.012, state.signal.volatility * 1.65) *
      SENSITIVITY;
    var risk = getRiskProfile();

    elements.potentialSwing.textContent =
      "± " + formatMoney(estimatedSwing);
    elements.exposureMeter.style.width =
      Math.round(exposureRatio * 100) + "%";
    elements.exposureCopy.textContent =
      Math.round(exposureRatio * 100) + "% capital at risk";
    elements.riskLabel.textContent = risk.label;
    elements.riskLabel.setAttribute("data-risk", risk.className);
  }

  function renderSignals() {
    var momentum = getMomentumView();
    var volatility = getVolatilityView();
    elements.momentum.textContent = momentum.label;
    elements.momentumMeter.style.width = momentum.value + "%";
    elements.volatility.textContent = volatility.label;
    elements.volatilityMeter.style.width = volatility.value + "%";
    elements.news.textContent = state.signal.news.title;
    elements.reliability.textContent =
      "Signal confidence " + state.signal.reliability + "%";

    root
      .querySelector('[data-signal-card="momentum"]')
      .setAttribute(
        "data-signal-tone",
        state.signal.projected > 0.006
          ? "positive"
          : state.signal.projected < -0.006
            ? "negative"
            : "neutral"
      );
  }

  function renderLedger() {
    elements.ledgerEmpty.hidden = state.trades.length > 0;
    elements.ledgerRows.innerHTML = state.trades
      .slice()
      .reverse()
      .slice(0, 5)
      .map(function (trade) {
        var resultClass =
          trade.type === "observe"
            ? "neutral"
            : trade.pnl >= 0
              ? "positive"
              : "negative";
        var directionLabel =
          trade.type === "observe"
            ? "Observed"
            : trade.direction === "long"
              ? "Long"
              : "Short";
        return (
          '<div class="forecast-ledger__row" data-result="' +
          resultClass +
          '">' +
          "<span>R" +
          trade.round +
          "</span>" +
          "<strong>" +
          directionLabel +
          "</strong>" +
          "<small>" +
          formatPercent(trade.marketReturn * 100, true) +
          "</small>" +
          "<b>" +
          (trade.type === "observe"
            ? "No position"
            : formatMoney(trade.pnl, true)) +
          "</b>" +
          "</div>"
        );
      })
      .join("");
  }

  function render() {
    var pnl = state.balance - INITIAL_CAPITAL;
    var completedTrades = state.wins + state.losses;
    var winRate = completedTrades
      ? Math.round((state.wins / completedTrades) * 100) + "%"
      : "--";
    var best = getStoredBest();

    elements.roundCurrent.textContent = String(
      Math.min(state.round, TOTAL_ROUNDS)
    );
    elements.roundTotal.textContent = String(TOTAL_ROUNDS);
    elements.portfolioValue.textContent = formatMoney(state.balance);
    elements.totalPnl.textContent = formatMoney(pnl, true);
    elements.totalPnl.setAttribute(
      "data-value",
      pnl > 0 ? "positive" : pnl < 0 ? "negative" : "flat"
    );
    elements.winRate.textContent = winRate;
    elements.bestRun.textContent = best
      ? formatPercent(best, true)
      : "--";
    elements.marketPrice.textContent = formatPrice(state.price);
    elements.marketChange.textContent = formatPercent(
      state.lastReturn * 100,
      true
    );
    elements.marketChangeWrap.setAttribute(
      "data-market-change-state",
      state.lastReturn > 0
        ? "positive"
        : state.lastReturn < 0
          ? "negative"
          : "flat"
    );
    elements.tradeState.textContent = state.finished
      ? "Closed"
      : state.locked
        ? "Pricing..."
        : "Ready";

    elements.directionButtons.forEach(function (button) {
      var active =
        button.getAttribute("data-direction") === state.direction;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    renderStory();
    renderMarketContext();
    renderChart();
    renderSignals();
    renderStake();
    renderLedger();
  }

  function setControlsDisabled(disabled) {
    elements.directionButtons
      .concat(elements.presetButtons)
      .concat([
        elements.stakeInput,
        elements.placeTrade,
        elements.observe,
        elements.cashOut
      ])
      .forEach(function (control) {
        control.disabled = disabled;
      });
  }

  function animateMarket() {
    var chart = root.querySelector(".forecast-chart");
    chart.classList.remove("is-updating");
    void chart.offsetWidth;
    chart.classList.add("is-updating");
    window.setTimeout(function () {
      chart.classList.remove("is-updating");
    }, reduceMotion ? 10 : 520);
  }

  function settleRound(type) {
    if (state.locked || state.finished) return;
    state.locked = true;
    setControlsDisabled(true);
    elements.tradeState.textContent = "Pricing...";
    setFeedback(
      "MARKET MOVING",
      type === "observe" ? "Watching the next candle." : "Position is live.",
      "价格正在吸收趋势、波动与事件冲击。",
      "neutral"
    );

    var round = state.round;
    var direction = state.direction;
    var stake = state.stake;
    var marketReturn = calculateNextMove();
    var oldPrice = state.price;
    var nextCandle = createCandle(
      oldPrice,
      marketReturn,
      state.signal.volatility,
      state.volumeBase
    );
    state.previousPrice = oldPrice;
    state.price = nextCandle.close;
    state.lastReturn = marketReturn;
    state.history.push(state.price);
    state.candles.push(nextCandle);
    updateMarketTape(marketReturn);

    var pnl = 0;
    if (type === "trade") {
      var directionalReturn =
        marketReturn * (direction === "long" ? 1 : -1);
      var slippage =
        state.asset.spread +
        state.signal.volatility * randomBetween(0.014, 0.032);
      var fee = stake * (0.00025 + slippage);
      pnl = clamp(
        stake * directionalReturn * SENSITIVITY - fee,
        -stake * 0.55,
        stake * 0.55
      );
      state.balance = Math.max(0, state.balance + pnl);
      state.totalExposure += stake;
      if (pnl > 0) state.wins += 1;
      else state.losses += 1;
      state.chartEvents.push({
        index: state.candles.length - 1,
        pnl: pnl
      });
    } else {
      state.observations += 1;
    }

    state.peakBalance = Math.max(state.peakBalance, state.balance);
    var drawdown = state.peakBalance
      ? (state.peakBalance - state.balance) / state.peakBalance
      : 0;
    state.maxDrawdown = Math.max(state.maxDrawdown, drawdown);
    state.trades.push({
      round: round,
      type: type,
      direction: direction,
      stake: type === "trade" ? stake : 0,
      marketReturn: marketReturn,
      cost: type === "trade" ? fee : 0,
      pnl: pnl
    });

    window.setTimeout(function () {
      animateMarket();
      if (type === "observe") {
        setFeedback(
          "POSITION SKIPPED",
          marketReturn >= 0 ? "Price moved higher." : "Price moved lower.",
          "等待也是一种决策。你保留了资金，也获得了新的价格信息。",
          "neutral"
        );
      } else if (pnl >= 0) {
        setFeedback(
          "FORECAST LANDED",
          formatMoney(pnl, true) + " captured.",
          stake / Math.max(state.balance, 1) > 0.5
            ? "方向正确，但仓位偏重。收益与回撤始终来自同一处。"
            : "方向与仓位形成了有效配合，继续观察信号是否延续。",
          "positive"
        );
      } else {
        setFeedback(
          "MARKET DISAGREED",
          formatMoney(pnl, true) + " on this move.",
          Math.abs(pnl) > state.balance * 0.12
            ? "这次回撤较深。降低单次暴露，能为下一次判断保留空间。"
            : "一次误判不会结束策略，重要的是控制损失并重新读取信号。",
          "negative"
        );
      }

      state.round += 1;
      state.locked = false;

      if (state.round > TOTAL_ROUNDS) {
        finishSession("rounds");
        return;
      }
      if (state.balance < MIN_STAKE) {
        finishSession("capital");
        return;
      }

      prepareSignal();
      state.stake = clamp(
        state.stake,
        MIN_STAKE,
        Math.floor(state.balance / MIN_STAKE) * MIN_STAKE
      );
      setControlsDisabled(false);
      render();
    }, reduceMotion ? 20 : 620);
  }

  function getResultNarrative(roi, winRate) {
    if (roi >= 18) {
      return {
        kicker: "EXCEPTIONAL RUN",
        title: "You read the market with conviction.",
        copy:
          "趋势判断与仓位控制共同创造了高质量收益。真正难得的不是一次押中，而是在波动中持续保留决策纪律。"
      };
    }
    if (roi >= 0 && winRate >= 70) {
      return {
        kicker: "PRECISE READ",
        title: "Consistency carried the session.",
        copy:
          "你的方向判断保持了很高命中率，也没有让单次波动主导结果。继续把这种稳定性放在收益速度之前。"
      };
    }
    if (roi >= 6) {
      return {
        kicker: "STRONG FINISH",
        title: "Signal and discipline aligned.",
        copy:
          "你把有限信号转化成了正收益，并避开了最危险的过度暴露。保持这种节奏，稳定通常比激进更有力量。"
      };
    }
    if (roi >= 0) {
      return {
        kicker: "CAPITAL PROTECTED",
        title: "You stayed composed.",
        copy:
          "在不确定行情中守住本金本身就是结果。下一局可以寻找更明确的趋势，同时继续让仓位服务于判断。"
      };
    }
    if (roi >= -12) {
      return {
        kicker: "CONTROLLED DRAWDOWN",
        title: "The strategy is still in the game.",
        copy:
          "短期亏损没有破坏整体资金结构。复盘错误信号、缩小高波动时的仓位，下一次会更接近有效判断。"
      };
    }
    return {
      kicker: "RESET WITH CLARITY",
      title: "Risk moved faster than conviction.",
      copy:
        "这局最有价值的信息来自回撤。减少单次重仓、允许自己观察一轮，你会拥有更多修正判断的机会。"
    };
  }

  function getRiskStyle() {
    var trades = state.wins + state.losses;
    if (!trades) return "Observer";
    var averageExposure = state.totalExposure / trades / INITIAL_CAPITAL;
    if (averageExposure >= 0.65) return "High Conviction";
    if (averageExposure >= 0.32) return "Active";
    if (state.observations >= 4) return "Patient";
    return "Balanced";
  }

  function finishSession(reason) {
    if (state.finished) return;
    state.finished = true;
    state.finishReason = reason;
    state.locked = false;
    setControlsDisabled(true);

    var pnl = state.balance - INITIAL_CAPITAL;
    var roi = (pnl / INITIAL_CAPITAL) * 100;
    var completedTrades = state.wins + state.losses;
    var winRate = completedTrades
      ? Math.round((state.wins / completedTrades) * 100)
      : 0;
    var narrative = getResultNarrative(roi, winRate);

    storeResult(roi);
    elements.resultKicker.textContent = narrative.kicker;
    elements.resultTitle.textContent = narrative.title;
    elements.resultValue.textContent = formatMoney(state.balance);
    elements.resultReturn.textContent =
      formatPercent(roi, true) + " return";
    elements.resultReturn.setAttribute(
      "data-value",
      roi > 0 ? "positive" : roi < 0 ? "negative" : "flat"
    );
    elements.resultCopy.textContent = narrative.copy;
    elements.resultPnl.textContent = formatMoney(pnl, true);
    elements.resultPnl.setAttribute(
      "data-value",
      pnl > 0 ? "positive" : pnl < 0 ? "negative" : "flat"
    );
    elements.resultWinRate.textContent = completedTrades
      ? winRate + "%"
      : "--";
    elements.resultDrawdown.textContent = formatPercent(
      state.maxDrawdown * 100,
      false
    );
    elements.resultStyle.textContent = getRiskStyle();
    elements.resultPanel.hidden = false;
    elements.resultPanel.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center"
    });
    render();
  }

  function startSession() {
    reseedRandom();
    state = createInitialState();
    prepareSignal();
    elements.resultPanel.hidden = true;
    setControlsDisabled(false);
    setFeedback(
      "MARKET OPEN",
      "Choose your exposure.",
      "信号并不完美，仓位也是判断的一部分。",
      "neutral"
    );
    render();
  }

  function handleChartPointer(event) {
    var target = event.target.closest
      ? event.target.closest("[data-candle-index]")
      : null;
    if (!target || !elements.chartHitboxes.contains(target)) return;
    showChartTooltip(
      Number(target.getAttribute("data-candle-index")),
      event
    );
  }

  elements.chartHitboxes.addEventListener(
    "pointermove",
    handleChartPointer
  );
  elements.chartHitboxes.addEventListener(
    "pointerdown",
    handleChartPointer
  );
  elements.chart.addEventListener("pointerleave", function () {
    hideChartTooltip(false);
  });
  document.addEventListener("pointerdown", function (event) {
    if (!elements.chart.contains(event.target)) {
      hideChartTooltip(true);
    }
  });
  window.addEventListener("resize", function () {
    hideChartTooltip(true);
  });

  elements.directionButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (state.locked || state.finished) return;
      state.direction = button.getAttribute("data-direction");
      render();
    });
  });

  elements.stakeInput.addEventListener("input", function () {
    state.stake = Number(elements.stakeInput.value);
    renderStake();
  });

  elements.presetButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      if (state.locked || state.finished) return;
      var ratio = Number(button.getAttribute("data-stake-preset"));
      state.stake = Math.max(
        MIN_STAKE,
        Math.floor((state.balance * ratio) / MIN_STAKE) * MIN_STAKE
      );
      renderStake();
    });
  });

  elements.placeTrade.addEventListener("click", function () {
    settleRound("trade");
  });

  elements.observe.addEventListener("click", function () {
    settleRound("observe");
  });

  elements.cashOut.addEventListener("click", function () {
    finishSession("cashout");
  });

  elements.newSession.addEventListener("click", function () {
    startSession();
    root.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start"
    });
  });

  startSession();
})();
