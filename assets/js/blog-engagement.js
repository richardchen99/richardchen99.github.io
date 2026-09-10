(function () {
  "use strict";

  var modules = Array.prototype.slice.call(document.querySelectorAll("[data-blog-engagement]"));
  if (!modules.length) return;

  var likeBaselines = {
    "ice-cars-vs-new-energy-vehicles": 11,
    "from-analysis-to-decision-intelligence": 9
  };

  var visitBaselines = {
    "ice-cars-vs-new-energy-vehicles": 20,
    "from-analysis-to-decision-intelligence": 29
  };

  function sanitizeKey(value) {
    return String(value || "post")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || "post";
  }

  function setButtonState(button, active, label, labelNode) {
    if (!button) return;
    button.setAttribute("aria-pressed", String(active));
    if (labelNode && label) labelNode.textContent = label;
  }

  function copyText(value) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(value);
    }

    return new Promise(function (resolve, reject) {
      var field = document.createElement("textarea");
      field.value = value;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      document.body.appendChild(field);
      field.select();
      try {
        if (!document.execCommand("copy")) throw new Error("Copy command failed");
        resolve();
      } catch (error) {
        reject(error);
      } finally {
        document.body.removeChild(field);
      }
    });
  }

  function showManualShare(module, value) {
    var existing = module.querySelector("[data-blog-share-fallback]");
    if (existing) existing.remove();

    var fallback = document.createElement("input");
    fallback.type = "text";
    fallback.value = value;
    fallback.readOnly = true;
    fallback.className = "blog-engagement__share-fallback";
    fallback.setAttribute("data-blog-share-fallback", "");
    fallback.setAttribute("aria-label", "文章链接");

    var actions = module.querySelector(".blog-engagement__actions");
    if (actions) actions.appendChild(fallback);

    fallback.focus();
    fallback.select();

    window.setTimeout(function () {
      fallback.remove();
    }, 5200);
  }

  function isLocalPreview() {
    return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/.test(window.location.hostname);
  }

  function setCommentStatus(statusNode, message, state) {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.setAttribute("data-state", state || "idle");
  }

  function shellQuote(value) {
    return "'" + String(value || "").replace(/'/g, "'\"'\"'") + "'";
  }

  function encodeBase64(value) {
    var text = String(value || "");
    if (window.TextEncoder && window.btoa) {
      var bytes = new window.TextEncoder().encode(text);
      var binary = "";
      bytes.forEach(function (byte) {
        binary += String.fromCharCode(byte);
      });
      return window.btoa(binary);
    }

    return window.btoa(encodeURIComponent(text).replace(/%([0-9A-F]{2})/g, function (_, code) {
      return String.fromCharCode(parseInt(code, 16));
    }));
  }

  function buildApprovalCommand(postKey, name, message, submittedAt, commentId, parentCommentId, parentCommentName) {
    var command = [
      "node scripts/approve-blog-comment.js",
      "--post " + shellQuote(postKey),
      "--name " + shellQuote(name),
      "--date " + shellQuote(submittedAt),
      "--id " + shellQuote(commentId),
      "--message-base64 " + shellQuote(encodeBase64(message))
    ];

    if (parentCommentId) {
      command.push("--parent-id " + shellQuote(parentCommentId));
      command.push("--parent-name " + shellQuote(parentCommentName || ""));
      command.push("--review-type reply");
    }

    return command.join(" ");
  }

  function buildReviewLink(action, payload) {
    var params = new URLSearchParams({
      action: action,
      review_type: payload.review_type || "comment",
      comment_id: payload.comment_id,
      post_key: payload.post_key,
      post_title: payload.post_title,
      post_url: payload.post_url,
      submitted_at: payload.submitted_at,
      name: payload.name,
      message_base64: payload.message_base64
    });

    if (payload.parent_comment_id) {
      params.set("parent_comment_id", payload.parent_comment_id);
      params.set("parent_comment_name", payload.parent_comment_name || "");
      params.set("parent_comment_excerpt", payload.parent_comment_excerpt || "");
    }

    if (payload.visitor_ip) {
      params.set("visitor_ip", payload.visitor_ip);
    }
    if (payload.visitor_ip_checked_at) {
      params.set("visitor_ip_checked_at", payload.visitor_ip_checked_at);
    }
    if (payload.visitor_location) {
      params.set("visitor_location", payload.visitor_location);
    }
    if (payload.visitor_timezone) {
      params.set("visitor_timezone", payload.visitor_timezone);
    }
    if (payload.visitor_network) {
      params.set("visitor_network", payload.visitor_network);
    }
    if (payload.visitor_geo_source) {
      params.set("visitor_geo_source", payload.visitor_geo_source);
    }

    return new URL("/blog-comment-review/", window.location.origin).href + "?" + params.toString();
  }

  function refreshReviewLinks(payload) {
    payload.approve_link = buildReviewLink("approve", payload);
    payload.reject_link = buildReviewLink("reject", payload);
    return payload;
  }

  function formatBeijingTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleString("zh-CN", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).replace(/\//g, "-") + " 北京时间";
  }

  function renderCommentTimes(module) {
    var timeNodes = Array.prototype.slice.call(module.querySelectorAll("time[data-blog-comment-time]"));
    timeNodes.forEach(function (timeNode) {
      var formatted = formatBeijingTime(timeNode.getAttribute("data-blog-comment-time") || timeNode.getAttribute("datetime"));
      if (formatted) timeNode.textContent = formatted;
    });
  }

  modules.forEach(function (module) {
    var postKey = sanitizeKey(module.getAttribute("data-post-key"));
    var postTitle = module.getAttribute("data-post-title") || document.title;
    var postUrl = new URL(module.getAttribute("data-post-url") || window.location.pathname, window.location.href).href;
    var likeButton = module.querySelector("[data-blog-like]");
    var likeCount = module.querySelector("[data-blog-like-count]");
    var likeLabel = module.querySelector("[data-blog-like-label]");
    var visitCount = module.querySelector("[data-blog-visit-count]");
    var shareButton = module.querySelector("[data-blog-share]");
    var shareLabel = module.querySelector("[data-blog-share-label]");
    var commentForm = module.querySelector("[data-blog-comment-form]");
    var commentEndpoint = commentForm ? commentForm.getAttribute("data-blog-comment-endpoint") : "";
    var commentRepository = module.getAttribute("data-comment-repository") || "";
    var commentLikeButtons = Array.prototype.slice.call(module.querySelectorAll("[data-comment-like]"));
    var replyToggleButtons = Array.prototype.slice.call(module.querySelectorAll("[data-reply-toggle]"));
    var replyForms = Array.prototype.slice.call(module.querySelectorAll("[data-blog-reply-form]"));
    var commentName = module.querySelector("[data-blog-comment-name]");
    var commentMessage = module.querySelector("[data-blog-comment-message]");
    var commentStatus = module.querySelector("[data-blog-comment-status]");
    var commentSubmit = module.querySelector("[data-blog-comment-submit]");
    var commentIdField = module.querySelector("[data-blog-comment-id]");
    var commentUrlField = module.querySelector("[data-blog-comment-url]");
    var commentTimeField = module.querySelector("[data-blog-comment-time]");
    var commentApproveField = module.querySelector("[data-blog-comment-approve]");
    var commentRejectField = module.querySelector("[data-blog-comment-reject]");
    var commentCommandField = module.querySelector("[data-blog-comment-command]");
    var commentIpField = module.querySelector("[data-blog-comment-ip]");
    var commentIpCheckedAtField = module.querySelector("[data-blog-comment-ip-checked-at]");
    var commentLocationField = module.querySelector("[data-blog-comment-location]");
    var commentTimezoneField = module.querySelector("[data-blog-comment-timezone]");
    var commentNetworkField = module.querySelector("[data-blog-comment-network]");
    var commentGeoSourceField = module.querySelector("[data-blog-comment-geo-source]");
    var counterEndpoint = "https://counterapi.com/api/richardchen99.github.io/up/blog-" + postKey;
    var likeBaseline = likeBaselines[postKey] || 0;
    var visitEndpoint = "https://counterapi.com/api/richardchen99.github.io/up/blog-" + postKey + "-visits";
    var visitBaseline = visitBaselines[postKey] || 0;
    var storageKey = "richard-blog-liked-" + postKey;
    var hasLiked = false;

    try {
      hasLiked = window.localStorage.getItem(storageKey) === "true";
    } catch (error) {
      hasLiked = false;
    }

    function renderLike() {
      setButtonState(likeButton, hasLiked, hasLiked ? "已点赞" : "点赞", likeLabel);
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
      var url = counterEndpoint + (readOnly ? "?readOnly=true" : "");
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

    renderLike();
    updateVisitCount();
    updateLikeCount(true).catch(function () {
      likeCount.textContent = String(likeBaseline + (hasLiked ? 1 : 0));
    });

    if (likeButton) {
      likeButton.addEventListener("click", function () {
        if (hasLiked) return;
        hasLiked = true;
        renderLike();
        module.classList.add("is-liked");

        try {
          window.localStorage.setItem(storageKey, "true");
        } catch (error) {
          // The public counter still works when local storage is blocked.
        }

        updateLikeCount(false).catch(function () {
          likeCount.textContent = String(Number(likeCount.textContent || 0) + 1);
        });

        window.setTimeout(function () {
          module.classList.remove("is-liked");
        }, 700);
      });
    }

    if (shareButton) {
      shareButton.addEventListener("click", function () {
        copyText(postUrl)
          .then(function () {
            shareLabel.textContent = "已复制";
            shareButton.classList.add("is-copied");
            window.setTimeout(function () {
              shareLabel.textContent = "复制链接";
              shareButton.classList.remove("is-copied");
            }, 1600);
          })
          .catch(function () {
            showManualShare(module, postUrl);
            shareLabel.textContent = "链接已显示";
            window.setTimeout(function () {
              shareLabel.textContent = "复制链接";
            }, 1600);
          });
      });
    }

    renderCommentTimes(module);

    function renderCommentLike(button, liked, labelNode) {
      button.setAttribute("aria-pressed", String(liked));
      if (labelNode) labelNode.textContent = liked ? "已赞" : "赞";
    }

    commentLikeButtons.forEach(function (button) {
      var rawCommentId = button.getAttribute("data-comment-id") || "";
      var commentId = sanitizeKey(rawCommentId);
      if (!commentId) return;

      var countNode = button.querySelector("[data-comment-like-count]");
      var labelNode = button.querySelector("[data-comment-like-label]");
      var commentCounterEndpoint = "https://counterapi.com/api/richardchen99.github.io/up/blog-" + postKey + "-comment-" + commentId;
      var commentStorageKey = "richard-blog-comment-liked-" + postKey + "-" + commentId;
      var commentLiked = false;

      try {
        commentLiked = window.localStorage.getItem(commentStorageKey) === "true";
      } catch (error) {
        commentLiked = false;
      }

      renderCommentLike(button, commentLiked, labelNode);

      window
        .fetch(commentCounterEndpoint + "?readOnly=true")
        .then(function (response) {
          if (!response.ok) throw new Error("Comment like counter request failed");
          return response.json();
        })
        .then(function (data) {
          if (countNode) countNode.textContent = String(Number(data.value || 0));
        })
        .catch(function () {
          if (countNode) countNode.textContent = commentLiked ? "1" : "0";
        });

      button.addEventListener("click", function () {
        if (commentLiked) return;
        commentLiked = true;
        renderCommentLike(button, commentLiked, labelNode);
        button.classList.add("is-liked");

        try {
          window.localStorage.setItem(commentStorageKey, "true");
        } catch (error) {
          // The public counter still works when local storage is blocked.
        }

        window
          .fetch(commentCounterEndpoint)
          .then(function (response) {
            if (!response.ok) throw new Error("Comment like counter request failed");
            return response.json();
          })
          .then(function (data) {
            if (countNode) countNode.textContent = String(Number(data.value || 0));
          })
          .catch(function () {
            if (countNode) {
              countNode.textContent = String(Number(countNode.textContent || 0) + 1);
            }
          });

        window.setTimeout(function () {
          button.classList.remove("is-liked");
        }, 520);
      });
    });

    replyToggleButtons.forEach(function (button) {
      var controls = button.getAttribute("aria-controls");
      var replyForm = controls ? module.querySelector("#" + controls) : null;
      if (!replyForm) return;

      button.addEventListener("click", function () {
        var willOpen = replyForm.hasAttribute("hidden");
        replyForm.toggleAttribute("hidden", !willOpen);
        button.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
          var firstInput = replyForm.querySelector("[data-blog-reply-name]");
          if (firstInput) firstInput.focus();
        }
      });
    });

    function buildCommentPayload(name, message) {
      var submittedAt = new Date().toISOString();
      var commentId = "comment-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      var messageBase64 = encodeBase64(message);
      var approvalCommand = buildApprovalCommand(postKey, name, message, submittedAt, commentId);
      var payload = {
        _subject: "Blog comment pending review: " + postTitle,
        _template: "table",
        _captcha: "false",
        _url: postUrl,
        source: "Blog Comment Review",
        review_type: "comment",
        review_status: "pending",
        review_note: "点击 approve_link 通过评论，点击 reject_link 拒绝评论；approval_command 是备用手动发布命令。",
        comment_id: commentId,
        post_key: postKey,
        post_title: postTitle,
        post_url: postUrl,
        submitted_at: submittedAt,
        review_repository: commentRepository,
        visitor_ip: "Lookup pending",
        visitor_ip_checked_at: "",
        visitor_location: "Lookup pending",
        visitor_timezone: "",
        visitor_network: "",
        visitor_geo_source: "",
        name: name,
        message: message,
        message_base64: messageBase64,
        approval_command: approvalCommand
      };

      refreshReviewLinks(payload);

      if (commentIdField) commentIdField.value = commentId;
      if (commentUrlField) commentUrlField.value = postUrl;
      if (commentTimeField) commentTimeField.value = submittedAt;
      if (commentApproveField) commentApproveField.value = payload.approve_link;
      if (commentRejectField) commentRejectField.value = payload.reject_link;
      if (commentCommandField) commentCommandField.value = approvalCommand;

      return payload;
    }

    function setFieldValue(form, selector, value) {
      var field = form.querySelector(selector);
      if (field) field.value = value;
    }

    function buildReplyPayload(replyForm, name, message) {
      var submittedAt = new Date().toISOString();
      var replyId = "reply-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
      var parentCommentId = replyForm.getAttribute("data-parent-comment-id") || "";
      var parentCommentName = replyForm.getAttribute("data-parent-comment-name") || "匿名访客";
      var parentCommentExcerpt = replyForm.getAttribute("data-parent-comment-excerpt") || "";
      var messageBase64 = encodeBase64(message);
      var approvalCommand = buildApprovalCommand(
        postKey,
        name,
        message,
        submittedAt,
        replyId,
        parentCommentId,
        parentCommentName
      );
      var payload = {
        _subject: "Blog reply pending review: " + postTitle,
        _template: "table",
        _captcha: "false",
        _url: postUrl,
        source: "Blog Reply Review",
        review_type: "reply",
        review_status: "pending",
        review_note: "这是一条博客评论回复；回复对象：" + parentCommentName + " / " + parentCommentId + "；原评论摘要：" + parentCommentExcerpt,
        comment_id: replyId,
        post_key: postKey,
        post_title: postTitle,
        post_url: postUrl,
        submitted_at: submittedAt,
        review_repository: commentRepository,
        parent_comment_id: parentCommentId,
        parent_comment_name: parentCommentName,
        parent_comment_excerpt: parentCommentExcerpt,
        visitor_ip: "Lookup pending",
        visitor_ip_checked_at: "",
        visitor_location: "Lookup pending",
        visitor_timezone: "",
        visitor_network: "",
        visitor_geo_source: "",
        name: name,
        message: message,
        message_base64: messageBase64,
        approval_command: approvalCommand
      };

      payload.approve_link = buildReviewLink("approve", payload);
      payload.reject_link = buildReviewLink("reject", payload);

      setFieldValue(replyForm, "[data-blog-reply-id]", replyId);
      setFieldValue(replyForm, "[data-blog-reply-url]", postUrl);
      setFieldValue(replyForm, "[data-blog-reply-time]", submittedAt);
      setFieldValue(replyForm, "[data-blog-reply-approve]", payload.approve_link);
      setFieldValue(replyForm, "[data-blog-reply-reject]", payload.reject_link);
      setFieldValue(replyForm, "[data-blog-reply-command]", approvalCommand);

      return payload;
    }

    function attachCommentMetadata(payload, metadata) {
      var current = metadata || {};
      if (
        !current.visitor_ip &&
        window.RichardVisitorMetadata &&
        typeof window.RichardVisitorMetadata.getCurrent === "function"
      ) {
        current = window.RichardVisitorMetadata.getCurrent();
      }

      payload.visitor_ip = current.visitor_ip || "Unavailable";
      payload.visitor_ip_checked_at = current.visitor_ip_checked_at || new Date().toISOString();
      payload.visitor_location = current.visitor_location || "Unavailable";
      payload.visitor_timezone = current.visitor_timezone || "";
      payload.visitor_network = current.visitor_network || "";
      payload.visitor_geo_source = current.visitor_geo_source || "";
      refreshReviewLinks(payload);

      if (commentIpField) commentIpField.value = payload.visitor_ip;
      if (commentIpCheckedAtField) {
        commentIpCheckedAtField.value = payload.visitor_ip_checked_at;
      }
      if (commentLocationField) commentLocationField.value = payload.visitor_location;
      if (commentTimezoneField) commentTimezoneField.value = payload.visitor_timezone;
      if (commentNetworkField) commentNetworkField.value = payload.visitor_network;
      if (commentGeoSourceField) commentGeoSourceField.value = payload.visitor_geo_source;
      if (commentApproveField) commentApproveField.value = payload.approve_link;
      if (commentRejectField) commentRejectField.value = payload.reject_link;

      return payload;
    }

    function attachReplyMetadata(replyForm, payload, metadata) {
      var current = metadata || {};
      if (
        !current.visitor_ip &&
        window.RichardVisitorMetadata &&
        typeof window.RichardVisitorMetadata.getCurrent === "function"
      ) {
        current = window.RichardVisitorMetadata.getCurrent();
      }

      payload.visitor_ip = current.visitor_ip || "Unavailable";
      payload.visitor_ip_checked_at = current.visitor_ip_checked_at || new Date().toISOString();
      payload.visitor_location = current.visitor_location || "Unavailable";
      payload.visitor_timezone = current.visitor_timezone || "";
      payload.visitor_network = current.visitor_network || "";
      payload.visitor_geo_source = current.visitor_geo_source || "";
      refreshReviewLinks(payload);

      setFieldValue(replyForm, "[data-blog-reply-ip]", payload.visitor_ip);
      setFieldValue(replyForm, "[data-blog-reply-ip-checked-at]", payload.visitor_ip_checked_at);
      setFieldValue(replyForm, "[data-blog-reply-location]", payload.visitor_location);
      setFieldValue(replyForm, "[data-blog-reply-timezone]", payload.visitor_timezone);
      setFieldValue(replyForm, "[data-blog-reply-network]", payload.visitor_network);
      setFieldValue(replyForm, "[data-blog-reply-geo-source]", payload.visitor_geo_source);
      setFieldValue(replyForm, "[data-blog-reply-approve]", payload.approve_link);
      setFieldValue(replyForm, "[data-blog-reply-reject]", payload.reject_link);

      return payload;
    }

    function fallbackCommentSubmit() {
      try {
        commentForm.submit();
      } catch (error) {
        setCommentStatus(commentStatus, "提交暂时失败，请稍后再试。", "error");
        return false;
      }
      setCommentStatus(commentStatus, "已提交，审核通过后会显示在文章下方。", "success");
      return true;
    }

    function fallbackReplySubmit(replyForm, statusNode) {
      try {
        replyForm.submit();
      } catch (error) {
        setCommentStatus(statusNode, "提交暂时失败，请稍后再试。", "error");
        return false;
      }
      setCommentStatus(statusNode, "已提交，审核通过后会显示在这条评论下方。", "success");
      return true;
    }

    if (commentForm) {
      commentForm.addEventListener("submit", function (event) {
        event.preventDefault();

        var name = String(commentName && commentName.value || "").trim();
        var message = String(commentMessage && commentMessage.value || "").trim();
        var honey = commentForm.querySelector("[name='_honey']");

        if (honey && honey.value) {
          setCommentStatus(commentStatus, "已提交，审核通过后会显示在文章下方。", "success");
          commentForm.reset();
          return;
        }

        if (!name || !message) {
          setCommentStatus(commentStatus, "请填写昵称和评论内容。", "error");
          return;
        }

        if (message.length < 2) {
          setCommentStatus(commentStatus, "评论内容可以再具体一点。", "error");
          return;
        }

        var payload = buildCommentPayload(name, message);
        setCommentStatus(commentStatus, "正在提交审核...", "sending");
        if (commentSubmit) commentSubmit.disabled = true;

        function submitPayload(metadata) {
          attachCommentMetadata(payload, metadata);

          if (!window.fetch || !commentEndpoint) {
            fallbackCommentSubmit();
            if (commentSubmit) commentSubmit.disabled = false;
            window.setTimeout(function () {
              commentForm.reset();
            }, 300);
            return;
          }

          window.fetch(commentEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(payload)
          })
            .then(function (response) {
              if (!response.ok) throw new Error("Comment review request failed");
              return response.json().catch(function () {
                return {};
              });
            })
            .then(function () {
              commentForm.reset();
              setCommentStatus(commentStatus, "已提交，审核通过后会显示在文章下方。", "success");
            })
            .catch(function () {
              fallbackCommentSubmit();
              window.setTimeout(function () {
                commentForm.reset();
              }, 300);
            })
            .finally(function () {
              if (commentSubmit) commentSubmit.disabled = false;
            });
        }

        if (
          window.RichardVisitorMetadata &&
          typeof window.RichardVisitorMetadata.ready === "function"
        ) {
          setCommentStatus(commentStatus, "正在补充访客信息并提交审核...", "sending");
          window.RichardVisitorMetadata.ready(1600).then(submitPayload).catch(function () {
            submitPayload();
          });
          return;
        }

        submitPayload();
      });
    }

    replyForms.forEach(function (replyForm) {
      var replyEndpoint = replyForm.getAttribute("data-blog-comment-endpoint") || commentEndpoint;
      var replyName = replyForm.querySelector("[data-blog-reply-name]");
      var replyMessage = replyForm.querySelector("[data-blog-reply-message]");
      var replyStatus = replyForm.querySelector("[data-blog-reply-status]");
      var replySubmit = replyForm.querySelector("[data-blog-reply-submit]");

      replyForm.addEventListener("submit", function (event) {
        event.preventDefault();

        var name = String(replyName && replyName.value || "").trim();
        var message = String(replyMessage && replyMessage.value || "").trim();
        var honey = replyForm.querySelector("[name='_honey']");

        if (honey && honey.value) {
          setCommentStatus(replyStatus, "已提交，审核通过后会显示在这条评论下方。", "success");
          replyForm.reset();
          return;
        }

        if (!name || !message) {
          setCommentStatus(replyStatus, "请填写昵称和回复内容。", "error");
          return;
        }

        if (message.length < 2) {
          setCommentStatus(replyStatus, "回复内容可以再具体一点。", "error");
          return;
        }

        var payload = buildReplyPayload(replyForm, name, message);
        setCommentStatus(replyStatus, "正在提交回复审核...", "sending");
        if (replySubmit) replySubmit.disabled = true;

        function submitPayload(metadata) {
          attachReplyMetadata(replyForm, payload, metadata);

          if (!window.fetch || !replyEndpoint) {
            fallbackReplySubmit(replyForm, replyStatus);
            if (replySubmit) replySubmit.disabled = false;
            window.setTimeout(function () {
              replyForm.reset();
            }, 300);
            return;
          }

          window.fetch(replyEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Accept": "application/json"
            },
            body: JSON.stringify(payload)
          })
            .then(function (response) {
              if (!response.ok) throw new Error("Reply review request failed");
              return response.json().catch(function () {
                return {};
              });
            })
            .then(function () {
              replyForm.reset();
              setCommentStatus(replyStatus, "已提交，审核通过后会显示在这条评论下方。", "success");
            })
            .catch(function () {
              fallbackReplySubmit(replyForm, replyStatus);
              window.setTimeout(function () {
                replyForm.reset();
              }, 300);
            })
            .finally(function () {
              if (replySubmit) replySubmit.disabled = false;
            });
        }

        if (
          window.RichardVisitorMetadata &&
          typeof window.RichardVisitorMetadata.ready === "function"
        ) {
          setCommentStatus(replyStatus, "正在补充访客信息并提交回复审核...", "sending");
          window.RichardVisitorMetadata.ready(1600).then(submitPayload).catch(function () {
            submitPayload();
          });
          return;
        }

        submitPayload();
      });
    });
  });
})();
