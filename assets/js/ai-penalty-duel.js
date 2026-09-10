(function () {
  "use strict";

  var root = document.querySelector("[data-ai-penalty-duel]");
  if (!root) return;

  var TOTAL_SHOTS = 5;
  var inferenceTimer = null;
  var inferenceTimeout = null;

  var aimMap = {
    "top-left": {
      label: "Top Left",
      short: "TL",
      x: 18,
      y: 17,
      side: "left",
      height: "high",
      miss: 0.11
    },
    "top-center": {
      label: "Top Center",
      short: "TC",
      x: 50,
      y: 15,
      side: "center",
      height: "high",
      miss: 0.08
    },
    "top-right": {
      label: "Top Right",
      short: "TR",
      x: 82,
      y: 17,
      side: "right",
      height: "high",
      miss: 0.11
    },
    "mid-left": {
      label: "Mid Left",
      short: "ML",
      x: 18,
      y: 48,
      side: "left",
      height: "mid",
      miss: 0.07
    },
    center: {
      label: "Center",
      short: "C",
      x: 50,
      y: 50,
      side: "center",
      height: "mid",
      miss: 0.03
    },
    "mid-right": {
      label: "Mid Right",
      short: "MR",
      x: 82,
      y: 48,
      side: "right",
      height: "mid",
      miss: 0.07
    },
    "low-left": {
      label: "Low Left",
      short: "LL",
      x: 20,
      y: 82,
      side: "left",
      height: "low",
      miss: 0.05
    },
    "low-center": {
      label: "Low Center",
      short: "LC",
      x: 50,
      y: 84,
      side: "center",
      height: "low",
      miss: 0.025
    },
    "low-right": {
      label: "Low Right",
      short: "LR",
      x: 80,
      y: 82,
      side: "right",
      height: "low",
      miss: 0.05
    }
  };

  var aimKeys = Object.keys(aimMap);

  var styleMap = {
    placement: {
      label: "Placement",
      accuracy: 0.12,
      save: 0.03,
      read: 0.08,
      deception: 0.04,
      risk: "Controlled"
    },
    power: {
      label: "Power",
      accuracy: -0.06,
      save: -0.1,
      read: 0.1,
      deception: 0.02,
      risk: "High velocity"
    },
    disguise: {
      label: "Disguise",
      accuracy: -0.025,
      save: -0.07,
      read: -0.16,
      deception: 0.24,
      risk: "Hard to read"
    }
  };

  var keeperProfiles = [
    {
      name: "Vega-7 Keeper Model",
      trait: "Pattern learner",
      form: "Balanced stance",
      bias: "center",
      reach: 0.19,
      courage: 0.08
    },
    {
      name: "Orion Reflex Net",
      trait: "Early dive",
      form: "Explosive first step",
      bias: "left",
      reach: 0.21,
      courage: 0.12
    },
    {
      name: "Mira Shot Reader",
      trait: "Body-angle scan",
      form: "Patient stance",
      bias: "right",
      reach: 0.17,
      courage: 0.06
    }
  ];

  var inferenceSteps = [
    {
      state: "THINKING",
      mode: "Body-angle scan",
      copy: "AI is reading your plant foot, target window and approach rhythm."
    },
    {
      state: "INFERENCE",
      mode: "Pattern recall",
      copy: "Recent shot memory is being weighted against the current power curve."
    },
    {
      state: "KEEPER LOCK",
      mode: "Dive selection",
      copy: "The keeper model is choosing a lane with incomplete information."
    }
  ];

  var elements = {
    score: root.querySelector("[data-penalty-score]"),
    round: root.querySelector("[data-penalty-round]"),
    model: root.querySelector("[data-penalty-model]"),
    keeperName: root.querySelector("[data-keeper-name]"),
    keeperTrait: root.querySelector("[data-keeper-trait]"),
    keeperForm: root.querySelector("[data-keeper-form]"),
    current: root.querySelector("[data-shot-current]"),
    total: root.querySelector("[data-shot-total]"),
    goals: root.querySelector("[data-player-goals]"),
    saves: root.querySelector("[data-keeper-saves]"),
    xg: root.querySelector("[data-shot-xg]"),
    pressure: root.querySelector("[data-pressure-label]"),
    target: root.querySelector("[data-target-label]"),
    aiRead: root.querySelector("[data-ai-read]"),
    aiState: root.querySelector("[data-ai-state]"),
    aiMode: root.querySelector("[data-ai-mode]"),
    aiConfidence: root.querySelector("[data-ai-confidence]"),
    aiMeter: root.querySelector("[data-ai-confidence-meter]"),
    aiCopy: root.querySelector("[data-ai-copy]"),
    aiPattern: root.querySelector("[data-ai-pattern]"),
    aiBias: root.querySelector("[data-ai-bias]"),
    aiRisk: root.querySelector("[data-ai-risk]"),
    powerInput: root.querySelector("[data-power-input]"),
    curlInput: root.querySelector("[data-curl-input]"),
    powerOutput: root.querySelector("[data-power-output]"),
    curlOutput: root.querySelector("[data-curl-output]"),
    shoot: root.querySelector("[data-shoot-button]"),
    reset: root.querySelector("[data-penalty-reset]"),
    newMatch: root.querySelector("[data-penalty-new-match]"),
    shotKicker: root.querySelector("[data-shot-kicker]"),
    shotTitle: root.querySelector("[data-shot-title]"),
    shotCopy: root.querySelector("[data-shot-copy]"),
    ledger: root.querySelector("[data-penalty-ledger]"),
    ledgerEmpty: root.querySelector("[data-penalty-ledger-empty]"),
    resultPanel: root.querySelector("[data-penalty-result-panel]"),
    resultKicker: root.querySelector("[data-penalty-result-kicker]"),
    resultTitle: root.querySelector("[data-penalty-result-title]"),
    resultScore: root.querySelector("[data-penalty-result-score]"),
    resultRate: root.querySelector("[data-penalty-result-rate]"),
    resultCopy: root.querySelector("[data-penalty-result-copy]"),
    resultGoals: root.querySelector("[data-result-goals]"),
    resultSaves: root.querySelector("[data-result-saves]"),
    resultXg: root.querySelector("[data-result-xg]"),
    resultStyle: root.querySelector("[data-result-style]")
  };

  var targetButtons = Array.prototype.slice.call(
    root.querySelectorAll("[data-aim]")
  );
  var styleButtons = Array.prototype.slice.call(
    root.querySelectorAll("[data-style]")
  );

  var state = {};

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function randomInt(min, max) {
    return Math.floor(randomBetween(min, max + 1));
  }

  function setText(element, value) {
    if (element) element.textContent = value;
  }

  function formatCurl(value) {
    var number = Number(value);
    if (number > 0) return "+" + number;
    return String(number);
  }

  function countBy(field) {
    var counts = {};
    state.history.forEach(function (shot) {
      var value = shot[field];
      counts[value] = (counts[value] || 0) + 1;
    });
    return counts;
  }

  function getDominant(counts, fallback) {
    var best = fallback;
    var bestCount = -1;
    Object.keys(counts).forEach(function (key) {
      if (counts[key] > bestCount) {
        best = key;
        bestCount = counts[key];
      }
    });
    return { value: best, count: Math.max(bestCount, 0) };
  }

  function getPressureLabel() {
    if (state.attempts <= 0) return "Opening";
    if (state.attempts < 3) return "Building";
    if (state.playerGoals >= 3) return "Closing";
    return "High";
  }

  function resetShotVisual() {
    root.classList.remove("is-thinking", "is-shot-resolved");
    root.removeAttribute("data-shot-outcome");
    root.style.setProperty("--keeper-x", "50%");
    root.style.setProperty("--keeper-y", "52%");
    root.style.setProperty("--keeper-rotate", "0deg");
    root.style.setProperty("--shot-x", aimMap[state.aim].x + "%");
    root.style.setProperty("--shot-y", aimMap[state.aim].y + "%");
  }

  function chooseProfile() {
    return keeperProfiles[randomInt(0, keeperProfiles.length - 1)];
  }

  function resetMatch() {
    clearTimers();
    state = {
      aim: "top-right",
      power: 72,
      curl: 8,
      style: "placement",
      attempts: 0,
      playerGoals: 0,
      keeperSaves: 0,
      history: [],
      pending: false,
      profile: chooseProfile()
    };
    if (elements.powerInput) elements.powerInput.value = state.power;
    if (elements.curlInput) elements.curlInput.value = state.curl;
    if (elements.resultPanel) elements.resultPanel.hidden = true;
    resetShotVisual();
    render();
  }

  function clearTimers() {
    if (inferenceTimer) {
      window.clearInterval(inferenceTimer);
      inferenceTimer = null;
    }
    if (inferenceTimeout) {
      window.clearTimeout(inferenceTimeout);
      inferenceTimeout = null;
    }
  }

  function scoreAimFromSignals(key, selectedAim, counts, sideCounts, heightCounts) {
    var aim = aimMap[key];
    var style = styleMap[state.style];
    var score = 1;
    var selected = aimMap[selectedAim];
    var dominantAim = getDominant(counts, selectedAim);
    var dominantSide = getDominant(sideCounts, selected.side);
    var dominantHeight = getDominant(heightCounts, selected.height);

    if (key === selectedAim) {
      score += 0.5 + style.read;
      if (state.power > 86) score += 0.14;
      if (Math.abs(state.curl) > 24) score += 0.08;
    }

    if (key === dominantAim.value) {
      score += dominantAim.count * 0.34;
    }

    if (aim.side === dominantSide.value && state.history.length > 1) {
      score += dominantSide.count * 0.16;
    }

    if (aim.height === dominantHeight.value && state.history.length > 1) {
      score += dominantHeight.count * 0.12;
    }

    if (aim.side === state.profile.bias) score += 0.18;
    if (state.curl > 18 && aim.side === "right") score += 0.12;
    if (state.curl < -18 && aim.side === "left") score += 0.12;
    if (state.power > 88 && aim.height === "high") score += 0.1;
    if (state.power < 58 && aim.height === "low") score += 0.1;

    return score + randomBetween(-0.14, 0.14);
  }

  function buildPrediction(forShot) {
    var counts = countBy("aim");
    var sideCounts = {};
    var heightCounts = {};
    var style = styleMap[state.style];
    var selectedAim = state.aim;
    var prediction = selectedAim;
    var bestScore = -Infinity;
    var scores = {};

    state.history.forEach(function (shot) {
      var aim = aimMap[shot.aim];
      sideCounts[aim.side] = (sideCounts[aim.side] || 0) + 1;
      heightCounts[aim.height] = (heightCounts[aim.height] || 0) + 1;
    });

    aimKeys.forEach(function (key) {
      var score = scoreAimFromSignals(key, selectedAim, counts, sideCounts, heightCounts);
      scores[key] = score;
      if (score > bestScore) {
        bestScore = score;
        prediction = key;
      }
    });

    if (forShot && Math.random() < style.deception) {
      prediction = chooseAlternative(prediction, selectedAim);
    }

    var repeatRate = state.history.length
      ? (counts[selectedAim] || 0) / state.history.length
      : 0;
    var confidence = clamp(
      43 +
        repeatRate * 24 +
        state.history.length * 3.5 +
        Math.abs(state.curl) * 0.18 +
        Math.max(0, state.power - 84) * 0.55 +
        style.read * 52 +
        state.profile.courage * 48 +
        randomBetween(-4, 5),
      34,
      92
    );

    if (state.style === "disguise") confidence = clamp(confidence - 10, 30, 86);

    return {
      aim: prediction,
      confidence: confidence,
      scores: scores,
      pattern: getPatternLabel(counts, selectedAim),
      bias: getBiasLabel(sideCounts, heightCounts),
      risk: style.risk
    };
  }

  function chooseAlternative(prediction, selectedAim) {
    var selected = aimMap[selectedAim];
    var alternatives = aimKeys.filter(function (key) {
      return key !== prediction && aimMap[key].side !== selected.side;
    });
    if (!alternatives.length) alternatives = aimKeys.filter(function (key) {
      return key !== prediction;
    });
    return alternatives[randomInt(0, alternatives.length - 1)];
  }

  function getPatternLabel(counts, selectedAim) {
    var dominant = getDominant(counts, selectedAim);
    if (!state.history.length) return "Fresh sample";
    if (dominant.count >= 3) return aimMap[dominant.value].short + " repeat";
    if ((counts[selectedAim] || 0) >= 2) return aimMap[selectedAim].short + " tendency";
    return "Mixed memory";
  }

  function getBiasLabel(sideCounts, heightCounts) {
    var side = getDominant(sideCounts, aimMap[state.aim].side).value;
    var height = getDominant(heightCounts, aimMap[state.aim].height).value;
    return side.charAt(0).toUpperCase() + side.slice(1) + " / " + height;
  }

  function estimateShot(prediction) {
    var aim = aimMap[state.aim];
    var predicted = aimMap[prediction.aim];
    var style = styleMap[state.style];
    var powerStress = Math.max(0, state.power - 84) * 0.012;
    var curlStress = Math.abs(state.curl) * 0.0018;
    var missChance = clamp(
      aim.miss + powerStress + curlStress - style.accuracy * 0.35,
      0.025,
      0.36
    );
    var distance = Math.sqrt(
      Math.pow(aim.x - predicted.x, 2) + Math.pow(aim.y - predicted.y, 2)
    );
    var readBonus = prediction.confidence * 0.0024;
    var laneBonus = prediction.aim === state.aim ? 0.22 : 0;
    var distanceFactor = clamp((44 - distance) * 0.008, -0.16, 0.28);
    var powerPenalty = Math.max(0, state.power - 72) * 0.0038;
    var curlPenalty = Math.abs(state.curl) * 0.0012;
    var saveChance = clamp(
      state.profile.reach +
        readBonus +
        laneBonus +
        distanceFactor +
        style.save -
        powerPenalty -
        curlPenalty,
      0.06,
      0.82
    );
    var xg = clamp(1 - missChance - saveChance * 0.62, 0.18, 0.91);

    return {
      missChance: missChance,
      saveChance: saveChance,
      xg: xg
    };
  }

  function resolveShot(prediction) {
    var aim = aimMap[state.aim];
    var predicted = aimMap[prediction.aim];
    var estimate = estimateShot(prediction);
    var outcome = "goal";
    var finalX = aim.x + randomBetween(-3.8, 3.8) + state.curl * 0.08;
    var finalY = aim.y + randomBetween(-3.2, 3.2) - Math.max(0, state.power - 80) * 0.05;
    var offTargetX = finalX;
    var offTargetY = finalY;

    if (Math.random() < estimate.missChance) {
      outcome = "miss";
      offTargetX = finalX + (aim.side === "left" ? -12 : aim.side === "right" ? 12 : randomBetween(-8, 8));
      offTargetY = aim.height === "high" ? finalY - randomBetween(8, 15) : finalY + randomBetween(7, 12);
    } else if (Math.random() < estimate.saveChance) {
      outcome = "save";
      finalX = (finalX + predicted.x) / 2;
      finalY = (finalY + predicted.y) / 2;
    }

    return {
      round: state.attempts + 1,
      aim: state.aim,
      aimLabel: aim.label,
      style: state.style,
      styleLabel: styleMap[state.style].label,
      power: state.power,
      curl: state.curl,
      prediction: prediction.aim,
      predictionLabel: predicted.label,
      confidence: Math.round(prediction.confidence),
      xg: estimate.xg,
      outcome: outcome,
      x: outcome === "miss" ? clamp(offTargetX, -8, 108) : clamp(finalX, 4, 96),
      y: outcome === "miss" ? clamp(offTargetY, -8, 108) : clamp(finalY, 4, 96),
      keeperX: predicted.x,
      keeperY: predicted.y,
      keeperRotate: predicted.x < 42 ? "-18deg" : predicted.x > 58 ? "18deg" : "0deg"
    };
  }

  function setControlsDisabled(disabled) {
    targetButtons.forEach(function (button) {
      button.disabled = disabled;
    });
    styleButtons.forEach(function (button) {
      button.disabled = disabled;
    });
    if (elements.powerInput) elements.powerInput.disabled = disabled;
    if (elements.curlInput) elements.curlInput.disabled = disabled;
    if (elements.shoot) elements.shoot.disabled = disabled || state.attempts >= TOTAL_SHOTS;
  }

  function beginInference() {
    if (state.pending || state.attempts >= TOTAL_SHOTS) return;

    var prediction = buildPrediction(true);
    var delay = randomInt(2000, 4000);
    var stepIndex = 0;

    state.pending = true;
    resetShotVisual();
    root.offsetHeight;
    root.classList.add("is-thinking");
    setControlsDisabled(true);
    applyInferenceStep(inferenceSteps[0], prediction);

    inferenceTimer = window.setInterval(function () {
      stepIndex = (stepIndex + 1) % inferenceSteps.length;
      applyInferenceStep(inferenceSteps[stepIndex], prediction);
    }, 720);

    inferenceTimeout = window.setTimeout(function () {
      var shot = resolveShot(prediction);
      clearTimers();
      applyShot(shot);
    }, delay);
  }

  function applyInferenceStep(step, prediction) {
    setText(elements.aiState, step.state);
    setText(elements.aiMode, step.mode);
    setText(elements.aiCopy, step.copy);
    setText(elements.aiRead, "Leaning " + aimMap[prediction.aim].short);
    setText(elements.aiConfidence, Math.round(prediction.confidence) + "%");
    if (elements.aiMeter) {
      elements.aiMeter.style.width = Math.round(prediction.confidence) + "%";
    }
  }

  function applyShot(shot) {
    state.pending = false;
    state.attempts += 1;
    if (shot.outcome === "goal") state.playerGoals += 1;
    if (shot.outcome === "save") state.keeperSaves += 1;
    state.history.push(shot);

    root.classList.remove("is-thinking");
    root.style.setProperty("--shot-x", shot.x + "%");
    root.style.setProperty("--shot-y", shot.y + "%");
    root.style.setProperty("--keeper-x", shot.keeperX + "%");
    root.style.setProperty("--keeper-y", shot.keeperY + "%");
    root.style.setProperty("--keeper-rotate", shot.keeperRotate);
    root.setAttribute("data-shot-outcome", shot.outcome);
    root.classList.add("is-shot-resolved");

    render(shot);
    renderLedger();
    setControlsDisabled(false);

    if (state.attempts >= TOTAL_SHOTS) {
      if (elements.shoot) elements.shoot.disabled = true;
      window.setTimeout(showResult, 980);
    }
  }

  function render(lastShot) {
    var preview = buildPrediction(false);
    var estimate = estimateShot(preview);
    var nextRound = Math.min(state.attempts + 1, TOTAL_SHOTS);

    setText(elements.score, state.playerGoals + " - " + state.keeperSaves);
    setText(elements.round, nextRound);
    setText(elements.model, state.profile.name.split(" ")[0].toUpperCase());
    setText(elements.keeperName, state.profile.name);
    setText(elements.keeperTrait, state.profile.trait);
    setText(elements.keeperForm, state.profile.form);
    setText(elements.current, nextRound);
    setText(elements.total, TOTAL_SHOTS);
    setText(elements.goals, state.playerGoals);
    setText(elements.saves, state.keeperSaves);
    setText(elements.xg, estimate.xg.toFixed(2));
    setText(elements.pressure, getPressureLabel());
    setText(elements.target, aimMap[state.aim].label);
    setText(elements.aiRead, "Leaning " + aimMap[preview.aim].short);
    setText(elements.aiState, state.pending ? "INFERENCE" : "LIVE INFERENCE");
    setText(elements.aiMode, state.pending ? "Calculating dive" : "Pre-shot model");
    setText(elements.aiConfidence, Math.round(preview.confidence) + "%");
    setText(elements.aiCopy, getPreviewCopy(preview));
    setText(elements.aiPattern, preview.pattern);
    setText(elements.aiBias, preview.bias);
    setText(elements.aiRisk, preview.risk);
    setText(elements.powerOutput, state.power + "%");
    setText(elements.curlOutput, formatCurl(state.curl));

    if (elements.aiMeter) {
      elements.aiMeter.style.width = Math.round(preview.confidence) + "%";
    }

    targetButtons.forEach(function (button) {
      var active = button.getAttribute("data-aim") === state.aim;
      button.classList.toggle("is-active", active);
    });

    styleButtons.forEach(function (button) {
      var active = button.getAttribute("data-style") === state.style;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", active ? "true" : "false");
    });

    if (!lastShot && !state.history.length) {
      setText(elements.shotKicker, "READY");
      setText(elements.shotTitle, "Design your first penalty.");
      setText(elements.shotCopy, "AI 还没有足够样本，第一脚可以先建立一个假动作基线。");
    } else if (lastShot) {
      renderShotFeedback(lastShot);
    }

    if (elements.ledgerEmpty) {
      elements.ledgerEmpty.hidden = state.history.length > 0;
    }
  }

  function getPreviewCopy(preview) {
    if (!state.history.length) {
      return "AI 正在读取目标区域、力度倾向、弧线方向和历史重复率。";
    }
    if (preview.pattern.indexOf("repeat") !== -1) {
      return "AI 已经捕捉到重复落点，继续打同一区域会提高被预判概率。";
    }
    if (state.style === "disguise") {
      return "Disguise 正在降低读数可信度，但力度过高仍可能暴露真实方向。";
    }
    if (Math.abs(state.curl) > 26) {
      return "弧线幅度明显，AI 会把身体摆动作为一个强信号处理。";
    }
    return "当前信号相对干净，门将会更多依赖你的历史分布。";
  }

  function renderShotFeedback(shot) {
    if (shot.outcome === "goal") {
      setText(elements.shotKicker, "GOAL");
      setText(elements.shotTitle, "You beat the read.");
      setText(
        elements.shotCopy,
        shot.style === "disguise"
          ? "假动作让 AI 扑向了错误车道，这脚胜在信息差。"
          : "落点和速度组合得不错，AI 即使读到方向也没能覆盖。"
      );
    } else if (shot.outcome === "save") {
      setText(elements.shotKicker, "AI SAVE");
      setText(elements.shotTitle, "The keeper had the lane.");
      setText(
        elements.shotCopy,
        "AI 预判到 " + aimMap[shot.prediction].label + "，这次它比球先到。"
      );
    } else {
      setText(elements.shotKicker, "OFF TARGET");
      setText(elements.shotTitle, "Too much signal, not enough control.");
      setText(elements.shotCopy, "力度和弧线把风险推高了，下一脚可以稍微收一点。");
    }
  }

  function renderLedger() {
    if (!elements.ledger) return;
    elements.ledger.innerHTML = "";
    state.history.slice().reverse().forEach(function (shot) {
      var row = document.createElement("div");
      row.className = "penalty-ledger__row";
      row.setAttribute("data-outcome", shot.outcome);
      row.innerHTML =
        "<span>#" +
        shot.round +
        "</span><b>" +
        shot.outcome.toUpperCase() +
        "</b><strong>" +
        shot.aimLabel +
        "</strong><small>" +
        shot.power +
        "% / " +
        formatCurl(shot.curl) +
        " curl</small><small>AI " +
        shot.predictionLabel +
        " · " +
        shot.confidence +
        "%</small>";
      elements.ledger.appendChild(row);
    });
  }

  function showResult() {
    var conversion = state.playerGoals / TOTAL_SHOTS;
    var avgXg = state.history.reduce(function (sum, shot) {
      return sum + shot.xg;
    }, 0) / Math.max(1, state.history.length);
    var styleLabel = getFinalStyleLabel();

    if (!elements.resultPanel) return;
    elements.resultPanel.hidden = false;
    setText(elements.resultScore, state.playerGoals + " - " + state.keeperSaves);
    setText(elements.resultRate, Math.round(conversion * 100) + "% conversion");
    setText(elements.resultGoals, state.playerGoals + " / " + TOTAL_SHOTS);
    setText(elements.resultSaves, state.keeperSaves);
    setText(elements.resultXg, avgXg.toFixed(2));
    setText(elements.resultStyle, styleLabel);

    if (state.playerGoals >= 4) {
      setText(elements.resultKicker, "MODEL BEATEN");
      setText(elements.resultTitle, "You stayed ahead of the keeper.");
      setText(elements.resultCopy, "你把落点、速度和伪装拆成了多层信号，AI 很难稳定预测下一脚。");
    } else if (state.playerGoals >= 3) {
      setText(elements.resultKicker, "NARROW EDGE");
      setText(elements.resultTitle, "Good enough under pressure.");
      setText(elements.resultCopy, "你有几脚处理得很聪明，但重复方向开始被模型记住了。");
    } else {
      setText(elements.resultKicker, "KEEPER ADVANTAGE");
      setText(elements.resultTitle, "The model found your pattern.");
      setText(elements.resultCopy, "下一局可以更早改变侧翼，或用低力度假动作打乱 AI 的读数。");
    }
  }

  function getFinalStyleLabel() {
    var counts = countBy("style");
    var dominant = getDominant(counts, state.style);
    if (!state.history.length) return "Balanced";
    if (dominant.value === "power") return "Direct Power";
    if (dominant.value === "disguise") return "Disguise First";
    return "Placement Led";
  }

  function bindEvents() {
    targetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (state.pending) return;
        state.aim = button.getAttribute("data-aim");
        resetShotVisual();
        render();
      });
    });

    styleButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (state.pending) return;
        state.style = button.getAttribute("data-style");
        render();
      });
    });

    if (elements.powerInput) {
      elements.powerInput.addEventListener("input", function () {
        state.power = Number(elements.powerInput.value);
        render();
      });
    }

    if (elements.curlInput) {
      elements.curlInput.addEventListener("input", function () {
        state.curl = Number(elements.curlInput.value);
        render();
      });
    }

    if (elements.shoot) {
      elements.shoot.addEventListener("click", beginInference);
    }

    if (elements.reset) {
      elements.reset.addEventListener("click", resetMatch);
    }

    if (elements.newMatch) {
      elements.newMatch.addEventListener("click", resetMatch);
    }
  }

  bindEvents();
  resetMatch();
})();
