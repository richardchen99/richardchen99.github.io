(function () {
  "use strict";

  var root = document.querySelector("[data-comment-review]");
  if (!root) return;

  var owner = root.getAttribute("data-review-owner") || "richardchen99";
  var repo = root.getAttribute("data-review-repo") || "richardchen99.github.io";
  var branch = root.getAttribute("data-review-branch") || "master";
  var tokenKey = "richard-blog-comment-review-token-" + owner + "-" + repo;

  var statusNode = root.querySelector("[data-review-status]");
  var postNode = root.querySelector("[data-review-post]");
  var nameNode = root.querySelector("[data-review-name]");
  var typeNode = root.querySelector("[data-review-type]");
  var parentNode = root.querySelector("[data-review-parent]");
  var dateNode = root.querySelector("[data-review-date]");
  var ipNode = root.querySelector("[data-review-ip]");
  var locationNode = root.querySelector("[data-review-location]");
  var networkNode = root.querySelector("[data-review-network]");
  var messageNode = root.querySelector("[data-review-message]");
  var tokenInput = root.querySelector("[data-review-token-input]");
  var saveTokenButton = root.querySelector("[data-review-save-token]");
  var clearTokenButton = root.querySelector("[data-review-clear-token]");
  var approveButton = root.querySelector("[data-review-approve]");
  var rejectButton = root.querySelector("[data-review-reject]");
  var postLink = root.querySelector("[data-review-post-link]");

  function setStatus(message, state) {
    if (!statusNode) return;
    statusNode.textContent = message;
    statusNode.setAttribute("data-state", state || "idle");
  }

  function sanitizeSlug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function sanitizeId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "") || ("comment-" + Date.now().toString(36));
  }

  function sanitizeOptionalId(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function decodeBase64(value) {
    try {
      var binary = window.atob(String(value || ""));
      var bytes = Array.prototype.map.call(binary, function (char) {
        return char.charCodeAt(0);
      });
      if (window.TextDecoder) {
        return new window.TextDecoder().decode(new Uint8Array(bytes));
      }
      return decodeURIComponent(Array.prototype.map.call(binary, function (char) {
        return "%" + ("00" + char.charCodeAt(0).toString(16)).slice(-2);
      }).join(""));
    } catch (error) {
      return "";
    }
  }

  function encodeContent(value) {
    var text = String(value || "");
    var bytes = new window.TextEncoder().encode(text);
    var binary = "";
    bytes.forEach(function (byte) {
      binary += String.fromCharCode(byte);
    });
    return window.btoa(binary);
  }

  function quoteYaml(value) {
    return "\"" + String(value || "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"")
      .replace(/\r/g, "\\r")
      .replace(/\n/g, "\\n") + "\"";
  }

  function blockScalar(value) {
    var text = String(value || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    if (!text) return "  ";
    return text.split("\n").map(function (line) {
      return "  " + line;
    }).join("\n");
  }

  function buildCommentYaml(comment) {
    var lines = [
      "message: |-",
      blockScalar(comment.message),
      "name: " + quoteYaml(comment.name || "Anonymous Visitor"),
      "url: \"\"",
      "hidden: \"\"",
      "date: " + quoteYaml(comment.submittedAt || new Date().toISOString())
    ];

    if (comment.reviewType === "reply") {
      lines.push("review_type: \"reply\"");
      lines.push("parent_id: " + quoteYaml(comment.parentId));
      lines.push("parent_name: " + quoteYaml(comment.parentName || ""));
    }

    if (comment.visitorIp) {
      lines.push("visitor_ip: " + quoteYaml(comment.visitorIp));
    }
    if (comment.visitorIpCheckedAt) {
      lines.push("visitor_ip_checked_at: " + quoteYaml(comment.visitorIpCheckedAt));
    }
    if (comment.visitorLocation) {
      lines.push("visitor_location: " + quoteYaml(comment.visitorLocation));
    }
    if (comment.visitorTimezone) {
      lines.push("visitor_timezone: " + quoteYaml(comment.visitorTimezone));
    }
    if (comment.visitorNetwork) {
      lines.push("visitor_network: " + quoteYaml(comment.visitorNetwork));
    }
    if (comment.visitorGeoSource) {
      lines.push("visitor_geo_source: " + quoteYaml(comment.visitorGeoSource));
    }

    lines.push("");
    return lines.join("\n");
  }

  function formatBeijingTime(value) {
    var date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value || "--");

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

  function formatVisitorIp(ip, checkedAt) {
    if (!ip) return "未随审核链接提供";
    var checkedLabel = checkedAt ? " / " + formatBeijingTime(checkedAt) : "";
    return ip + checkedLabel;
  }

  function formatVisitorLocation(location, timezone) {
    if (!location) return "未随审核链接提供";
    return location + (timezone ? " / " + timezone : "");
  }

  function getToken() {
    try {
      return window.localStorage.getItem(tokenKey) || "";
    } catch (error) {
      return "";
    }
  }

  function saveToken(value) {
    try {
      window.localStorage.setItem(tokenKey, value);
      return true;
    } catch (error) {
      return false;
    }
  }

  function clearToken() {
    try {
      window.localStorage.removeItem(tokenKey);
    } catch (error) {
      return false;
    }
    return true;
  }

  function githubHeaders(token) {
    return {
      "Authorization": "Bearer " + token,
      "Accept": "application/vnd.github+json",
      "Content-Type": "application/json",
      "X-GitHub-Api-Version": "2022-11-28"
    };
  }

  function encodeRepoPath(value) {
    return value.split("/").map(function (part) {
      return encodeURIComponent(part);
    }).join("/");
  }

  function apiUrl(filePath) {
    return "https://api.github.com/repos/" + owner + "/" + repo + "/contents/" + encodeRepoPath(filePath);
  }

  function repoUrl() {
    return "https://api.github.com/repos/" + owner + "/" + repo;
  }

  function parseErrorBody(response) {
    return response.json().catch(function () {
      return {};
    }).then(function (data) {
      return data || {};
    });
  }

  function githubErrorMessage(response, data, context) {
    var message = data && data.message ? String(data.message) : "";
    if (response.status === 401) {
      return "GitHub Token 无效或已过期。请重新生成 Token，并授权 private source repo。";
    }
    if (response.status === 403) {
      return "GitHub Token 权限不足或需要完成 SSO 授权。请确认已授予 richardchen99/richardchen99.github.io-source 的 Contents: Read and write。";
    }
    if (response.status === 404) {
      return context + " 返回 Not Found。通常是 Token 没有访问 private source repo 的权限，或 Token 选成了 public 发布仓库。请使用授权 richardchen99/richardchen99.github.io-source 的 fine-grained token，并开启 Contents: Read and write。";
    }
    return context + " 失败：" + response.status + (message ? " / " + message : "");
  }

  function validateRepositoryAccess(token) {
    return window.fetch(repoUrl(), {
      method: "GET",
      headers: githubHeaders(token)
    }).then(function (response) {
      if (response.ok) return response.json().catch(function () { return {}; });
      return parseErrorBody(response).then(function (data) {
        throw new Error(githubErrorMessage(response, data, "访问 private source repo"));
      });
    });
  }

  function parseComment() {
    var params = new URLSearchParams(window.location.search);
    var message = decodeBase64(params.get("message_base64"));
    var postKey = sanitizeSlug(params.get("post_key"));
    var postTitle = params.get("post_title") || postKey;
    var postUrl = params.get("post_url") || "/blog/";
    var reviewType = sanitizeSlug(params.get("review_type") || "comment");

    return {
      action: params.get("action") || "",
      reviewType: reviewType === "reply" ? "reply" : "comment",
      id: sanitizeId(params.get("comment_id")),
      postKey: postKey,
      postTitle: postTitle,
      postUrl: postUrl,
      submittedAt: params.get("submitted_at") || new Date().toISOString(),
      name: params.get("name") || "Anonymous Visitor",
      parentId: sanitizeOptionalId(params.get("parent_comment_id")),
      parentName: params.get("parent_comment_name") || "",
      parentExcerpt: params.get("parent_comment_excerpt") || "",
      visitorIp: params.get("visitor_ip") || "",
      visitorIpCheckedAt: params.get("visitor_ip_checked_at") || "",
      visitorLocation: params.get("visitor_location") || "",
      visitorTimezone: params.get("visitor_timezone") || "",
      visitorNetwork: params.get("visitor_network") || "",
      visitorGeoSource: params.get("visitor_geo_source") || "",
      message: message
    };
  }

  var comment = parseComment();
  var filePath = "_data/comments/" + comment.postKey + "/" + comment.id + ".yml";
  var isApproving = comment.action === "approve";

  function renderComment() {
    if (!comment.postKey || !comment.message || (comment.reviewType === "reply" && !comment.parentId)) {
      setStatus("审核链接缺少必要评论信息。", "error");
      if (approveButton) approveButton.disabled = true;
      if (rejectButton) rejectButton.disabled = true;
      return false;
    }

    if (postNode) postNode.textContent = comment.postTitle || comment.postKey;
    if (nameNode) nameNode.textContent = comment.name;
    if (typeNode) typeNode.textContent = comment.reviewType === "reply" ? "回复" : "评论";
    if (parentNode) {
      parentNode.textContent = comment.reviewType === "reply"
        ? ((comment.parentName || "匿名访客") + " / " + comment.parentId + (comment.parentExcerpt ? " / " + comment.parentExcerpt : ""))
        : "主评论";
    }
    if (dateNode) dateNode.textContent = formatBeijingTime(comment.submittedAt);
    if (ipNode) ipNode.textContent = formatVisitorIp(comment.visitorIp, comment.visitorIpCheckedAt);
    if (locationNode) locationNode.textContent = formatVisitorLocation(comment.visitorLocation, comment.visitorTimezone);
    if (networkNode) networkNode.textContent = comment.visitorNetwork || comment.visitorGeoSource || "未随审核链接提供";
    if (messageNode) messageNode.value = comment.message;
    if (postLink) {
      postLink.href = comment.postUrl;
      postLink.textContent = "查看文章";
    }
    return true;
  }

  function setBusy(isBusy) {
    if (approveButton) approveButton.disabled = isBusy;
    if (rejectButton) rejectButton.disabled = isBusy;
  }

  function approveComment() {
    var token = getToken();
    if (!token) {
      setStatus("首次审核需要先保存 GitHub Token。", "error");
      if (tokenInput) tokenInput.focus();
      return;
    }

    setBusy(true);
    setStatus("正在验证 Token 是否能访问 private source repo...", "sending");

    validateRepositoryAccess(token)
      .then(function () {
        setStatus("正在检查" + (comment.reviewType === "reply" ? "回复" : "评论") + "是否已经发布...", "sending");
        return window.fetch(apiUrl(filePath) + "?ref=" + encodeURIComponent(branch), {
          method: "GET",
          headers: githubHeaders(token)
        });
      })
      .then(function (response) {
        if (response.status === 200) {
          setStatus("这条" + (comment.reviewType === "reply" ? "回复" : "评论") + "已经通过并发布过了。", "success");
          return null;
        }
        if (response.status !== 404) {
          return parseErrorBody(response).then(function (data) {
            throw new Error(githubErrorMessage(response, data, "检查评论文件"));
          });
        }

        setStatus("正在发布" + (comment.reviewType === "reply" ? "回复" : "评论") + "到博客...", "sending");
        return window.fetch(apiUrl(filePath), {
          method: "PUT",
          headers: githubHeaders(token),
          body: JSON.stringify({
            message: comment.reviewType === "reply"
              ? "Approve blog reply for " + comment.postKey + " to " + comment.parentId
              : "Approve blog comment for " + comment.postKey,
            branch: branch,
            content: encodeContent(buildCommentYaml(comment))
          })
        });
      })
      .then(function (response) {
        if (!response) return null;
        if (!response.ok) {
          return parseErrorBody(response).then(function (data) {
            throw new Error(githubErrorMessage(response, data, "发布到 private source repo"));
          });
        }
        return response.json();
      })
      .then(function () {
        setStatus("已通过并写入 " + owner + "/" + repo + "。GitHub Actions 会自动发布，稍后" + (comment.reviewType === "reply" ? "回复" : "评论") + "会显示在文章下方。", "success");
      })
      .catch(function (error) {
        setStatus(error.message || "发布失败，请检查 Token 权限。", "error");
      })
      .finally(function () {
        setBusy(false);
      });
  }

  function rejectComment() {
    setBusy(true);
    setStatus("已拒绝。这条" + (comment.reviewType === "reply" ? "回复" : "评论") + "不会发布到博客。", "success");
  }

  if (!renderComment()) return;

  if (tokenInput) tokenInput.value = getToken();

  if (saveTokenButton) {
    saveTokenButton.addEventListener("click", function () {
      var value = String(tokenInput && tokenInput.value || "").trim();
      if (!value) {
        setStatus("请先输入 GitHub Token。", "error");
        return;
      }

      saveTokenButton.disabled = true;
      setStatus("正在验证 Token 是否能访问 " + owner + "/" + repo + "...", "sending");
      validateRepositoryAccess(value)
        .then(function () {
          if (saveToken(value)) {
            setStatus("Token 已验证并保存在当前浏览器。现在可以通过评论或回复。", "success");
          } else {
            setStatus("Token 保存失败，请检查浏览器设置。", "error");
          }
        })
        .catch(function (error) {
          setStatus(error.message || "Token 验证失败，请检查 private source repo 权限。", "error");
        })
        .finally(function () {
          saveTokenButton.disabled = false;
        });
    });
  }

  if (clearTokenButton) {
    clearTokenButton.addEventListener("click", function () {
      clearToken();
      if (tokenInput) tokenInput.value = "";
      setStatus("Token 已从当前浏览器清除。", "success");
    });
  }

  if (approveButton) {
    approveButton.addEventListener("click", approveComment);
  }

  if (rejectButton) {
    rejectButton.addEventListener("click", rejectComment);
  }

  if (comment.action === "reject") {
    rejectComment();
    return;
  }

  setStatus(
    getToken()
      ? "正在自动通过这条" + (comment.reviewType === "reply" ? "回复" : "评论") + "..."
      : (comment.reviewType === "reply" ? "回复" : "评论") + "已载入。首次审核需要保存一次 GitHub Token。",
    getToken() ? "sending" : "idle"
  );
  if (isApproving && getToken()) {
    approveComment();
  }
})();
