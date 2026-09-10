(function () {
  "use strict";

  var root = document.querySelector("[data-little-r-assistant]");
  if (!root) return;

  var toggle = root.querySelector("[data-little-r-toggle]");
  var panel = root.querySelector("[data-little-r-panel]");
  var closeButton = root.querySelector("[data-little-r-close]");
  var status = root.querySelector("[data-little-r-status]");
  var storageKey = "richard-little-r-position-v1";
  var hoverTimer = 0;
  var isPinned = false;
  var isDragging = false;
  var moved = false;
  var suppressClick = false;
  var startX = 0;
  var startY = 0;
  var startLeft = 0;
  var startTop = 0;

  if (!toggle || !panel) return;

  function setStatus(value) {
    if (status) status.textContent = value || "小R助手";
  }

  function alignPanel() {
    var rect = root.getBoundingClientRect();
    var isLeftSide = rect.left < window.innerWidth / 2;
    var isHigh = rect.top < 240;
    root.classList.toggle("little-r-assistant--left", isLeftSide);
    root.classList.toggle("little-r-assistant--high", isHigh);
  }

  function setOpen(next, pinned) {
    if (typeof pinned === "boolean") isPinned = pinned && next;
    panel.hidden = !next;
    root.classList.toggle("is-open", next);
    toggle.setAttribute("aria-expanded", String(next));
    setStatus(next ? "Ready" : "小R助手");
    if (next) alignPanel();
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setPosition(left, top, shouldSave) {
    var margin = window.innerWidth <= 520 ? 8 : 14;
    var rect = root.getBoundingClientRect();
    var width = rect.width || 58;
    var height = rect.height || 58;
    var nextLeft = clamp(left, margin, window.innerWidth - width - margin);
    var nextTop = clamp(top, margin, window.innerHeight - height - margin);

    root.style.left = nextLeft + "px";
    root.style.top = nextTop + "px";
    root.style.right = "auto";
    root.style.bottom = "auto";
    alignPanel();

    if (shouldSave) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ left: nextLeft, top: nextTop }));
      } catch (error) {
        return;
      }
    }
  }

  function restorePosition() {
    try {
      var stored = JSON.parse(window.localStorage.getItem(storageKey) || "null");
      if (!stored || typeof stored.left !== "number" || typeof stored.top !== "number") return;
      window.requestAnimationFrame(function () {
        setPosition(stored.left, stored.top, false);
      });
    } catch (error) {
      return;
    }
  }

  function startDrag(event) {
    if (event.button && event.button !== 0) return;
    isDragging = true;
    moved = false;
    startX = event.clientX;
    startY = event.clientY;
    var rect = root.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    root.classList.add("is-dragging");
    setStatus("Moving");
    if (toggle.setPointerCapture) {
      toggle.setPointerCapture(event.pointerId);
    }
  }

  function drag(event) {
    if (!isDragging) return;
    var deltaX = event.clientX - startX;
    var deltaY = event.clientY - startY;
    if (Math.abs(deltaX) > 4 || Math.abs(deltaY) > 4) {
      moved = true;
      event.preventDefault();
    }
    if (moved) {
      setPosition(startLeft + deltaX, startTop + deltaY, false);
    }
  }

  function stopDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    root.classList.remove("is-dragging");
    if (toggle.releasePointerCapture) {
      try {
        toggle.releasePointerCapture(event.pointerId);
      } catch (error) {
        // Pointer capture may already be released by the browser.
      }
    }
    if (moved) {
      suppressClick = true;
      var rect = root.getBoundingClientRect();
      setPosition(rect.left, rect.top, true);
      setStatus("Position saved");
      window.setTimeout(function () {
        suppressClick = false;
        setStatus(panel.hidden ? "小R助手" : "Ready");
      }, 180);
    } else {
      setStatus(panel.hidden ? "小R助手" : "Ready");
    }
  }

  toggle.addEventListener("pointerdown", startDrag);
  toggle.addEventListener("pointermove", drag);
  toggle.addEventListener("pointerup", stopDrag);
  toggle.addEventListener("pointercancel", stopDrag);

  toggle.addEventListener("click", function () {
    if (suppressClick) return;
    if (!panel.hidden && !isPinned) {
      setOpen(true, true);
      return;
    }
    setOpen(panel.hidden, true);
  });

  root.addEventListener("pointerenter", function (event) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    window.clearTimeout(hoverTimer);
    setOpen(true, isPinned);
  });

  root.addEventListener("pointerleave", function (event) {
    if (event.pointerType && event.pointerType !== "mouse") return;
    if (isPinned) return;
    hoverTimer = window.setTimeout(function () {
      setOpen(false, false);
    }, 900);
  });

  if (closeButton) {
    closeButton.addEventListener("click", function () {
      setOpen(false, false);
      toggle.focus();
    });
  }

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false, false);
  });

  window.addEventListener("resize", function () {
    var rect = root.getBoundingClientRect();
    setPosition(rect.left, rect.top, true);
  });

  restorePosition();
  alignPanel();
})();
