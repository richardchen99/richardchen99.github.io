(function () {
  "use strict";

  var root = document.querySelector("[data-home-page]");
  if (!root) return;

  var state = {
    research: "ai",
    projectFilter: "all",
    aiStage: "data",
    decisionScenario: "research",
    decisionEvidence: 72,
    decisionRisk: 48,
    decisionSpeed: 64,
    aiRuns: 0,
    researchPulse: 0,
    lastResearchScore: null,
    shots: 0,
    scores: 0,
    shotAngle: 52,
    shotPower: 76
  };

  var baseConfidence = 93.6;

  var aiStages = {
    data: {
      kicker: "DATA NODE",
      title: "Signal intake",
      copy: "先整理数据、文本证据和背景信息，判断信号是否可靠。"
    },
    model: {
      kicker: "MODEL NODE",
      title: "Reasoning and calibration",
      copy: "模型校准证据权重，给出可追溯的判断依据。"
    },
    decision: {
      kicker: "DECISION NODE",
      title: "Action threshold",
      copy: "结合风险阈值和执行速度，形成最后的行动建议。"
    }
  };

  var decisionScenarios = {
    research: {
      label: "Research",
      title: "Research",
      pulse: "Evidence loop live",
      scoreBias: 2,
      gateBias: 1,
      humanBias: 8,
      uncertaintyBias: -4,
      stage: "data",
      trace: [
        "Research sources are compared before the model answers.",
        "Signal quality is weighted above raw speed.",
        "Final claim keeps a human review checkpoint."
      ],
      rationale: {
        auto: "Ready to move.",
        review: "Keep human check.",
        hold: "Need more sources."
      }
    },
    market: {
      label: "Market",
      title: "Market",
      pulse: "Risk radar active",
      scoreBias: -2,
      gateBias: 7,
      humanBias: 4,
      uncertaintyBias: 8,
      stage: "model",
      trace: [
        "Market movement is separated from narrative noise.",
        "Model confidence is discounted by volatility.",
        "Risk gate tightens before any action signal."
      ],
      rationale: {
        auto: "Risk gate clears.",
        review: "Review volatility.",
        hold: "Risk above signal."
      }
    },
    product: {
      label: "Product",
      title: "Product",
      pulse: "Action threshold tuned",
      scoreBias: 4,
      gateBias: -2,
      humanBias: 12,
      uncertaintyBias: -1,
      stage: "decision",
      trace: [
        "User value, build cost and learning speed are aligned.",
        "Model output is translated into a concrete next step.",
        "Human preference adjusts the final threshold."
      ],
      rationale: {
        auto: "Move is clear.",
        review: "Review scope.",
        hold: "Hold trade-off."
      }
    }
  };

  var researchSignals = {
    ai: {
      label: "AI for Decision",
      score: 92,
      title: "Model-to-decision bridge",
      copy: "把检索证据、推理过程和人在回路连接起来，让 AI 输出可以进入真实决策链。"
    },
    fintech: {
      label: "Financial Intelligence",
      score: 86,
      title: "Risk signal radar",
      copy: "将公告文本、市场行为和政策语义汇聚成可追踪的风险信号，用于解释预期差。"
    },
    analytics: {
      label: "Predictive Analytics",
      score: 79,
      title: "Forecast-to-action loop",
      copy: "把时间序列、实验设计和业务指标连接起来，让预测结果能够转化为运营动作。"
    }
  };
  var researchScoreSeed = Math.floor(Math.random() * 9) - 4;

  var researchTabs = Array.prototype.slice.call(
    root.querySelectorAll("[data-research-tab]")
  );
  var researchPanels = Array.prototype.slice.call(
    root.querySelectorAll("[data-research-panel]")
  );
  var filterButtons = Array.prototype.slice.call(
    root.querySelectorAll("[data-project-filter]")
  );
  var projectCards = Array.prototype.slice.call(
    root.querySelectorAll("[data-project-card]")
  );
  var aiRunButton = root.querySelector("[data-ai-run]");
  var aiRunLabel = root.querySelector("[data-ai-run-label]");
  var aiConfidence = root.querySelector("[data-ai-confidence]");
  var intelligenceMap = root.querySelector(".home-intelligence-map");
  var aiStageButtons = Array.prototype.slice.call(
    root.querySelectorAll("[data-ai-stage]")
  );
  var aiStageKicker = root.querySelector("[data-ai-stage-kicker]");
  var aiStageTitle = root.querySelector("[data-ai-stage-title]");
  var aiStageCopy = root.querySelector("[data-ai-stage-copy]");
  var decisionVerdict = root.querySelector("[data-decision-verdict]");
  var decisionMeter = root.querySelector("[data-decision-meter]");
  var decisionRationale = root.querySelector("[data-decision-rationale]");
  var decisionScenarioButtons = Array.prototype.slice.call(
    root.querySelectorAll("[data-decision-scenario]")
  );
  var decisionCoreLabel = root.querySelector("[data-decision-core-label]");
  var decisionScore = root.querySelector("[data-decision-score]");
  var decisionPulse = root.querySelector("[data-decision-pulse]");
  var researchCoreLabel = root.querySelector("[data-research-core-label]");
  var researchCoreScore = root.querySelector("[data-research-core-score]");
  var researchSignalTitle = root.querySelector("[data-research-signal-title]");
  var researchSignalCopy = root.querySelector("[data-research-signal-copy]");
  var researchSignalMeter = root.querySelector("[data-research-signal-meter]");
  var researchScanButton = root.querySelector("[data-research-scan]");

  function clampScore(value) {
    return Math.max(68, Math.min(98, Math.round(value)));
  }

  function bumpResearchScore(weight) {
    state.researchPulse += weight || 1;
  }

  function getResearchScore(signal) {
    var pulseOffset = ((state.researchPulse * 5 + signal.score) % 11) - 5;
    var nextScore = clampScore(signal.score + researchScoreSeed + pulseOffset);
    if (state.researchPulse && nextScore === state.lastResearchScore) {
      nextScore = clampScore(nextScore + (state.researchPulse % 2 ? 1 : -1));
    }
    return nextScore;
  }

  function animateResearchScore() {
    var core = researchCoreScore && researchCoreScore.closest(".home-research-score");
    if (!core || reduceMotion) return;
    core.classList.remove("is-score-refreshing");
    void core.offsetWidth;
    core.classList.add("is-score-refreshing");
    window.setTimeout(function () {
      core.classList.remove("is-score-refreshing");
    }, 320);
  }

  function renderResearch() {
    researchTabs.forEach(function (tab) {
      var selected = tab.getAttribute("data-research-tab") === state.research;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    researchPanels.forEach(function (panel) {
      panel.hidden =
        panel.getAttribute("data-research-panel") !== state.research;
    });

    var signal = researchSignals[state.research];
    if (!signal) return;
    var liveScore = getResearchScore(signal);
    if (researchCoreLabel) researchCoreLabel.textContent = signal.label;
    if (researchCoreScore) researchCoreScore.textContent = String(liveScore);
    if (researchSignalTitle) researchSignalTitle.textContent = signal.title;
    if (researchSignalCopy) researchSignalCopy.textContent = signal.copy;
    if (researchSignalMeter) researchSignalMeter.style.width = liveScore + "%";
    state.lastResearchScore = liveScore;
    animateResearchScore();
  }

  function activateResearch(nextResearch, weight) {
    if (!nextResearch) return;
    state.research = nextResearch;
    bumpResearchScore(weight);
    renderResearch();
  }

  function renderProjects() {
    filterButtons.forEach(function (button) {
      var active =
        button.getAttribute("data-project-filter") === state.projectFilter;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    projectCards.forEach(function (card) {
      var categories = card.getAttribute("data-categories").split(" ");
      card.hidden =
        state.projectFilter !== "all" &&
        categories.indexOf(state.projectFilter) === -1;
    });
  }

  function renderAiStage() {
    var stage = aiStages[state.aiStage];
    if (intelligenceMap) {
      intelligenceMap.setAttribute("data-ai-stage-active", state.aiStage);
    }
    aiStageButtons.forEach(function (button) {
      var selected = button.getAttribute("data-ai-stage") === state.aiStage;
      button.setAttribute("aria-pressed", String(selected));
    });

    if (!stage) return;
    aiStageKicker.textContent = stage.kicker;
    aiStageTitle.textContent = stage.title;
    aiStageCopy.textContent = stage.copy;
  }

  function getDecisionResult() {
    var scenario = decisionScenarios[state.decisionScenario] || decisionScenarios.research;
    var rawScore =
      state.decisionEvidence * 0.48 +
      state.decisionSpeed * 0.17 +
      baseConfidence * 0.2 -
      state.decisionRisk * 0.11 +
      scenario.scoreBias +
      state.aiRuns * 0.6;
    var score = Math.max(0, Math.min(100, Math.round(rawScore)));
    var gate = 62 + Math.round((state.decisionRisk - 48) * 0.26) + scenario.gateBias;

    if (score >= gate + 10) {
      return {
        score: score,
        verdict: "Auto Go",
        rationale: scenario.rationale.auto
      };
    }

    if (score >= gate) {
      return {
        score: score,
        verdict: "Human Review",
        rationale: scenario.rationale.review
      };
    }

    return {
      score: score,
      verdict: "Hold",
      rationale: scenario.rationale.hold
    };
  }

  function animateDecisionPulse() {
    if (!intelligenceMap || reduceMotion) return;
    intelligenceMap.classList.remove("is-decision-refreshing");
    void intelligenceMap.offsetWidth;
    intelligenceMap.classList.add("is-decision-refreshing");
    window.setTimeout(function () {
      intelligenceMap.classList.remove("is-decision-refreshing");
    }, 420);
  }

  function renderDecisionPanel() {
    var scenario = decisionScenarios[state.decisionScenario] || decisionScenarios.research;
    var decision = getDecisionResult();
    if (intelligenceMap) {
      intelligenceMap.setAttribute("data-decision-scenario-active", state.decisionScenario);
      intelligenceMap.setAttribute("data-decision-state", decision.verdict.toLowerCase().replace(" ", "-"));
      intelligenceMap.style.setProperty("--decision-score", decision.score + "%");
    }
    decisionScenarioButtons.forEach(function (button) {
      var selected = button.getAttribute("data-decision-scenario") === state.decisionScenario;
      button.setAttribute("aria-pressed", String(selected));
    });
    if (decisionCoreLabel) decisionCoreLabel.textContent = scenario.label;
    if (decisionScore) decisionScore.textContent = String(decision.score);
    if (decisionPulse) decisionPulse.textContent = scenario.pulse;
    decisionVerdict.textContent = decision.verdict;
    decisionRationale.textContent = decision.rationale;
    decisionMeter.style.width = decision.score + "%";
    if (aiConfidence) {
      aiConfidence.textContent = "Confidence " + Math.round(decision.score * 0.6 + 58) + "%";
    }
  }

  researchTabs.forEach(function (tab, index) {
    tab.addEventListener("click", function () {
      activateResearch(tab.getAttribute("data-research-tab"), 1);
    });

    tab.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
      event.preventDefault();
      var offset = event.key === "ArrowRight" ? 1 : -1;
      var nextIndex = (index + offset + researchTabs.length) % researchTabs.length;
      activateResearch(researchTabs[nextIndex].getAttribute("data-research-tab"), 1);
      researchTabs[nextIndex].focus();
    });
  });

  if (researchScanButton) {
    researchScanButton.addEventListener("click", function () {
      var currentIndex = researchTabs.findIndex(function (tab) {
        return tab.getAttribute("data-research-tab") === state.research;
      });
      var nextIndex = (currentIndex + 1) % researchTabs.length;
      activateResearch(researchTabs[nextIndex].getAttribute("data-research-tab"), 3);
      researchTabs[nextIndex].focus();
    });
  }

  filterButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.projectFilter = button.getAttribute("data-project-filter");
      renderProjects();
    });
  });

  aiStageButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      state.aiStage = button.getAttribute("data-ai-stage");
      renderAiStage();
      renderDecisionPanel();
      animateDecisionPulse();
    });
  });

  decisionScenarioButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      var nextScenario = button.getAttribute("data-decision-scenario");
      var scenario = decisionScenarios[nextScenario];
      if (!scenario) return;
      state.decisionScenario = nextScenario;
      state.aiStage = scenario.stage;
      renderAiStage();
      renderDecisionPanel();
      animateDecisionPulse();
    });
  });

  if (aiRunButton) {
    aiRunButton.addEventListener("click", function () {
      if (aiRunButton.disabled) return;
      var duration = reduceMotion ? 30 : 2200 + Math.round(Math.random() * 1600);

      state.aiRuns += 1;
      aiRunButton.disabled = true;
      aiRunLabel.textContent = "INFERENCE";
      aiConfidence.textContent = "THINKING...";
      intelligenceMap.classList.add("is-running");

      window.setTimeout(function () {
        intelligenceMap.classList.remove("is-running");
        aiRunButton.disabled = false;
        aiRunLabel.textContent = "Again";
        state.aiStage = "decision";
        renderAiStage();
        renderDecisionPanel();
        var decision = getDecisionResult();
        if (aiConfidence) {
          aiConfidence.textContent = decision.verdict + " · Score " + decision.score;
        }
      }, duration);
    });
  }

  var reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  var clockTime = root.querySelector("[data-clock-time]");
  var clockDate = root.querySelector("[data-clock-date]");

  function updateClock() {
    var now = new Date();
    clockTime.textContent = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Shanghai",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false
    }).format(now);
    clockDate.textContent = new Intl.DateTimeFormat("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "short"
    }).format(now);
  }

  updateClock();
  window.setInterval(updateClock, 1000);

  var likeButton = root.querySelector("[data-like-button]");
  var likeCount = root.querySelector("[data-like-count]");
  var likeLabel = root.querySelector("[data-like-label]");
  var likeWrap = likeButton.closest(".home-like-wrap");
  var visitCount = root.querySelector("[data-visit-count]");
  var visitEndpoint =
    "https://counterapi.com/api/richardchen99.github.io/up/homepage-visits";
  var visitBaseline = 51;
  var likeEndpoint =
    "https://counterapi.com/api/richardchen99.github.io/up/homepage-likes";
  var likeBaseline = 21;
  var likeStorageKey = "richard-home-liked";
  var hasLiked = false;

  try {
    hasLiked = window.localStorage.getItem(likeStorageKey) === "true";
  } catch (error) {
    hasLiked = false;
  }

  function renderLikedState() {
    likeButton.setAttribute("aria-pressed", String(hasLiked));
    likeLabel.textContent = hasLiked ? "感谢你的点赞" : "为主页点赞";
  }

  function isLocalPreview() {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
  }

  function updateVisitCount() {
    if (!visitCount) return;
    if (isLocalPreview()) return;

    window
      .fetch(visitEndpoint)
      .then(function (response) {
        if (!response.ok) throw new Error("Visit counter request failed");
        return response.json();
      })
      .then(function (data) {
        visitCount.textContent = String(visitBaseline + Number(data.value || 0));
      })
      .catch(function () {
        visitCount.textContent = String(visitBaseline + 1);
      });
  }

  function updateLikeCount(readOnly) {
    var url = likeEndpoint + (readOnly ? "?readOnly=true" : "");
    return window
      .fetch(url)
      .then(function (response) {
        if (!response.ok) throw new Error("Counter request failed");
        return response.json();
      })
      .then(function (data) {
        var value = likeBaseline + Number(data.value || 0);
        likeCount.textContent = String(value);
        return value;
      });
  }

  updateVisitCount();
  updateLikeCount(true).catch(function () {
    likeCount.textContent = String(likeBaseline + (hasLiked ? 1 : 0));
  });
  renderLikedState();

  likeButton.addEventListener("click", function () {
    if (hasLiked) return;
    hasLiked = true;
    renderLikedState();
    likeWrap.classList.add("is-celebrating");

    try {
      window.localStorage.setItem(likeStorageKey, "true");
    } catch (error) {
      // The visible interaction remains available when storage is blocked.
    }

    updateLikeCount(false).catch(function () {
      likeCount.textContent = String(Number(likeCount.textContent || 0) + 1);
    });

    window.setTimeout(function () {
      likeWrap.classList.remove("is-celebrating");
    }, 800);
  });

  if (window.matchMedia("(pointer: fine)").matches) {
    projectCards.forEach(function (card) {
      card.addEventListener("pointermove", function (event) {
        var rect = card.getBoundingClientRect();
        var x = (event.clientX - rect.left) / rect.width - 0.5;
        var y = (event.clientY - rect.top) / rect.height - 0.5;
        card.style.setProperty("--project-x", Math.round((x + 0.5) * 100) + "%");
        card.style.setProperty("--project-y", Math.round((y + 0.5) * 100) + "%");
      });

      card.addEventListener("pointerleave", function () {
        card.style.transform = "";
      });
    });
  }

  var shotButton = root.querySelector("[data-shot-button]");
  var shotScore = root.querySelector("[data-shot-score]");
  var shotAttempts = root.querySelector("[data-shot-attempts]");
  var shotStatus = root.querySelector("[data-shot-status]");
  var shotDetail = root.querySelector("[data-shot-detail]");
  var shotConfidence = root.querySelector("[data-shot-confidence]");
  var shotAngleInput = root.querySelector("[data-shot-angle]");
  var shotPowerInput = root.querySelector("[data-shot-power]");
  var shotAngleValue = root.querySelector("[data-shot-angle-value]");
  var shotPowerValue = root.querySelector("[data-shot-power-value]");
  var shotCourt = root.querySelector(".home-basketball__court");
  var shotBallAngle = root.querySelector("[data-ball-angle]");
  var shotBallPower = root.querySelector("[data-ball-power]");
  var shotBallAngleMini = root.querySelector("[data-ball-angle-mini]");
  var shotBallPowerMini = root.querySelector("[data-ball-power-mini]");
  var shotBallPowerFill = root.querySelector("[data-ball-power-fill]");

  function shotProbability() {
    var angleError = Math.abs(state.shotAngle - 52);
    var powerError = Math.abs(state.shotPower - 76);
    return Math.max(18, Math.round(96 - angleError * 5.4 - powerError * 2.2));
  }

  function renderShotControls() {
    if (shotAngleInput) shotAngleInput.value = String(state.shotAngle);
    if (shotPowerInput) shotPowerInput.value = String(state.shotPower);
    if (shotAngleValue) shotAngleValue.textContent = state.shotAngle + "°";
    if (shotPowerValue) shotPowerValue.textContent = String(state.shotPower);
    if (shotBallAngle) shotBallAngle.textContent = state.shotAngle + "°";
    if (shotBallPower) shotBallPower.textContent = "P" + state.shotPower;
    if (shotBallAngleMini) shotBallAngleMini.textContent = state.shotAngle + "°";
    if (shotBallPowerMini) shotBallPowerMini.textContent = "P" + state.shotPower;

    var probability = shotProbability();
    shotConfidence.style.width = probability + "%";
    if (shotBallPowerFill) shotBallPowerFill.style.width = Math.max(0, Math.min(100, (state.shotPower - 55) / 40 * 100)) + "%";
    if (shotCourt) {
      var angleRatio = (state.shotAngle - 42) / 22;
      var powerRatio = (state.shotPower - 55) / 40;
      var targetOffset = (state.shotAngle - 52) * 2.7 + (state.shotPower - 76) * 1.15;
      shotCourt.style.setProperty("--shot-angle-pct", Math.round(angleRatio * 100) + "%");
      shotCourt.style.setProperty("--shot-power-pct", Math.round(powerRatio * 100) + "%");
      shotCourt.style.setProperty("--shot-arc-lift", Math.round(58 + angleRatio * 68) + "px");
      shotCourt.style.setProperty("--shot-target-offset", targetOffset.toFixed(1) + "px");
      shotCourt.style.setProperty("--shot-ball-rotation", ((state.shotAngle - 52) * 2.2).toFixed(1) + "deg");
      shotCourt.style.setProperty("--shot-ball-scale", (0.98 + powerRatio * 0.12).toFixed(3));
      shotCourt.style.setProperty("--shot-power-glow", (0.16 + powerRatio * 0.52).toFixed(3));
    }
    shotDetail.textContent =
      "Angle " +
      state.shotAngle +
      "° · Power " +
      state.shotPower +
      " · Make probability " +
      probability +
      "%";
  }

  function shotAdvice() {
    if (state.shotAngle < 52) return "ARC LOW · ADD ANGLE";
    if (state.shotAngle > 52) return "ARC HIGH · LOWER ANGLE";
    if (state.shotPower < 76) return "SHORT · ADD POWER";
    if (state.shotPower > 76) return "LONG · REDUCE POWER";
    return "PERFECT RELEASE";
  }

  if (shotButton) {
    if (shotAngleInput) {
      shotAngleInput.addEventListener("input", function () {
        state.shotAngle = Number(shotAngleInput.value);
        shotStatus.textContent = "ANGLE LOCKED";
        renderShotControls();
      });
    }

    if (shotPowerInput) {
      shotPowerInput.addEventListener("input", function () {
        state.shotPower = Number(shotPowerInput.value);
        shotStatus.textContent = "POWER LOCKED";
        renderShotControls();
      });
    }

    shotButton.addEventListener("click", function () {
      if (shotButton.classList.contains("is-shooting")) return;

      state.shots += 1;
      var confidence = shotProbability();
      var angleError = state.shotAngle - 52;
      var powerError = state.shotPower - 76;
      var variance = (state.shots * 17) % 23;
      var success = confidence - variance >= 72;

      shotButton.classList.add("is-shooting");
      shotStatus.textContent = "TRAJECTORY PREDICTING";
      shotAttempts.textContent = String(state.shots);
      shotConfidence.style.width = confidence + "%";
      shotDetail.textContent =
        "Angle " +
        state.shotAngle +
        "° · Power " +
        state.shotPower +
        " · Make probability " +
        confidence +
        "%";

      var court = shotButton.closest(".home-basketball__court");
      var hoop = court.querySelector(".home-basketball__hoop i");
      var ballRect = shotButton.getBoundingClientRect();
      var hoopRect = hoop.getBoundingClientRect();
      var dx = hoopRect.left + hoopRect.width / 2 - (ballRect.left + ballRect.width / 2);
      var dy = hoopRect.top + hoopRect.height / 2 - (ballRect.top + ballRect.height / 2);
      var missOffset = angleError * 7 + powerError * 2.4;
      var targetX = success ? dx : dx + missOffset;
      var targetY = success ? dy + 48 : dy + 48 + Math.abs(powerError) * 3 + 28;
      var arcLift = 88 + state.shotAngle * 1.5 + state.shotPower * 0.35;

      var duration = reduceMotion ? 1 : 900;
      if (typeof shotButton.animate === "function") {
        shotButton.animate(
          [
            { transform: "translate(0, 0) rotate(0deg)" },
            {
              transform:
                "translate(" + targetX * 0.55 + "px, " + (dy - arcLift) + "px) rotate(260deg)",
              offset: 0.52
            },
            {
              transform:
                "translate(" + targetX + "px, " + dy + "px) rotate(470deg)",
              offset: 0.78
            },
            {
              transform:
                "translate(" + targetX + "px, " + targetY + "px) rotate(620deg)"
            }
          ],
          {
            duration: duration,
            easing: "cubic-bezier(0.3, 0.05, 0.45, 1)"
          }
        );
      }

      window.setTimeout(function () {
        if (success) {
          state.scores += 1;
          shotScore.textContent = String(state.scores);
          shotStatus.textContent = "SHOT ACCEPTED · " + shotAdvice();
        } else {
          shotStatus.textContent = "MODEL MISS · " + shotAdvice();
        }
        shotButton.classList.remove("is-shooting");
      }, duration + 40);
    });

    renderShotControls();
  }

  var revealItems = Array.prototype.slice.call(
    root.querySelectorAll(
      ".home-pillars, .home-section, .home-personal, .home-contact"
    )
  );

  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("home-reveal");
    });

    var revealObserver = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        });
      },
      { threshold: 0.12 }
    );

    revealItems.forEach(function (item) {
      revealObserver.observe(item);
    });
  }

  renderResearch();
  renderProjects();
  renderAiStage();
  renderDecisionPanel();
})();
