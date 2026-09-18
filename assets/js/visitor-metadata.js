(function () {
  "use strict";

  var ipLookupUrls = [
    {
      url: "https://ipwho.is/?fields=success,ip,country,country_code,region,city,postal,latitude,longitude,timezone,connection",
      type: "geo-ipwho"
    },
    {
      url: "https://ipapi.co/json/",
      type: "geo-ipapi"
    },
    {
      url: "https://api64.ipify.org?format=json",
      type: "json"
    },
    {
      url: "https://api.ip.sb/jsonip",
      type: "json"
    },
    {
      url: "https://icanhazip.com",
      type: "text"
    }
  ];
  var metadata = {
    visitor_ip: "Lookup pending",
    visitor_ip_checked_at: "",
    visitor_location: "Lookup pending",
    visitor_timezone: "",
    visitor_network: "",
    visitor_geo_source: ""
  };
  var lookupPromise = null;

  function markUnavailable() {
    metadata.visitor_ip = "Unavailable";
    metadata.visitor_ip_checked_at = new Date().toISOString();
    metadata.visitor_location = "Unavailable";
    metadata.visitor_timezone = "";
    metadata.visitor_network = "";
    metadata.visitor_geo_source = "";
    return metadata;
  }

  function compactJoin(parts, separator) {
    return parts
      .map(function (part) {
        return String(part || "").trim();
      })
      .filter(Boolean)
      .join(separator || " · ");
  }

  function formatCountry(name, code) {
    var country = String(name || "").trim();
    var countryCode = String(code || "").trim();
    if (country && countryCode) return country + " (" + countryCode + ")";
    return country || countryCode;
  }

  function formatPostal(value) {
    var postal = String(value || "").trim();
    return postal ? "Postal " + postal : "";
  }

  function formatCoordinates(latitude, longitude) {
    var lat = Number(latitude);
    var lon = Number(longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return "";
    return "Lat/Lng " + lat.toFixed(4) + ", " + lon.toFixed(4);
  }

  function formatAsn(value) {
    var asn = String(value || "").trim();
    if (!asn) return "";
    return asn.indexOf("AS") === 0 ? asn : "AS" + asn;
  }

  function formatNetwork(parts) {
    return compactJoin(parts.map(function (part) {
      return String(part || "").trim();
    }).filter(function (part, index, list) {
      return part && list.indexOf(part) === index;
    }));
  }

  function normalizeGeo(data, source) {
    var ip = "";
    var location = "";
    var timezone = "";
    var network = "";

    if (source === "geo-ipapi") {
      ip = String(data.ip || "").trim();
      location = compactJoin([
        formatCountry(data.country_name, data.country_code),
        data.region,
        data.city,
        formatPostal(data.postal),
        formatCoordinates(data.latitude, data.longitude)
      ]);
      timezone = String(data.timezone || "").trim();
      network = formatNetwork([data.org, formatAsn(data.asn), data.network]);
    } else if (source === "geo-ipwho") {
      ip = String(data.ip || "").trim();
      location = compactJoin([
        formatCountry(data.country, data.country_code),
        data.region,
        data.city,
        formatPostal(data.postal),
        formatCoordinates(data.latitude, data.longitude)
      ]);
      timezone = data.timezone && data.timezone.id ? String(data.timezone.id).trim() : "";
      network = data.connection
        ? formatNetwork([data.connection.org || data.connection.isp, formatAsn(data.connection.asn), data.connection.domain])
        : "";
    }

    if (!ip) throw new Error("Geo lookup returned empty IP");

    return {
      visitor_ip: ip,
      visitor_ip_checked_at: new Date().toISOString(),
      visitor_location: location || "Location unavailable",
      visitor_timezone: timezone,
      visitor_network: network,
      visitor_geo_source: source
    };
  }

  function applyToForm(form, data) {
    if (!form) return false;
    var next = data || metadata;
    var ipField = form.querySelector("[data-visitor-ip]");
    var checkedAtField = form.querySelector("[data-visitor-ip-checked-at]");
    var locationField = form.querySelector("[data-visitor-location]");
    var timezoneField = form.querySelector("[data-visitor-timezone]");
    var networkField = form.querySelector("[data-visitor-network]");
    var sourceField = form.querySelector("[data-visitor-geo-source]");

    if (ipField) ipField.value = next.visitor_ip || "Unavailable";
    if (checkedAtField) {
      checkedAtField.value = next.visitor_ip_checked_at || new Date().toISOString();
    }
    if (locationField) locationField.value = next.visitor_location || "Unavailable";
    if (timezoneField) timezoneField.value = next.visitor_timezone || "";
    if (networkField) networkField.value = next.visitor_network || "";
    if (sourceField) sourceField.value = next.visitor_geo_source || "";
    return true;
  }

  function extractIp(response, type) {
    if (type === "text") {
      return response.text().then(function (text) {
        return text.trim();
      });
    }

    return response.json().then(function (data) {
      return data && data.ip ? String(data.ip).trim() : "";
    });
  }

  function requestIp(index) {
    var endpoint = ipLookupUrls[index];
    if (!endpoint) return Promise.reject(new Error("IP lookup failed"));

    return window.fetch(endpoint.url, {
      cache: "no-store",
      credentials: "omit"
    })
      .then(function (response) {
        if (!response.ok) throw new Error("IP lookup failed");
        if (endpoint.type.indexOf("geo-") === 0) {
          return response.json().then(function (data) {
            return normalizeGeo(data || {}, endpoint.type);
          });
        }
        return extractIp(response, endpoint.type);
      })
      .then(function (value) {
        if (typeof value === "object" && value.visitor_ip) return value;
        if (!value) throw new Error("IP lookup returned empty value");
        return {
          visitor_ip: value,
          visitor_ip_checked_at: new Date().toISOString(),
          visitor_location: "Location unavailable",
          visitor_timezone: "",
          visitor_network: "",
          visitor_geo_source: endpoint.type
        };
      })
      .catch(function () {
        return requestIp(index + 1);
      });
  }

  function lookupIp() {
    if (lookupPromise) return lookupPromise;

    if (!window.fetch) {
      lookupPromise = Promise.resolve(markUnavailable());
      return lookupPromise;
    }

    lookupPromise = requestIp(0)
      .then(function (data) {
        metadata.visitor_ip = data.visitor_ip;
        metadata.visitor_ip_checked_at = data.visitor_ip_checked_at || new Date().toISOString();
        metadata.visitor_location = data.visitor_location || "Location unavailable";
        metadata.visitor_timezone = data.visitor_timezone || "";
        metadata.visitor_network = data.visitor_network || "";
        metadata.visitor_geo_source = data.visitor_geo_source || "";
        return metadata;
      })
      .catch(function () {
        return markUnavailable();
      });

    return lookupPromise;
  }

  function ready(timeoutMs) {
    var lookup = lookupIp();
    if (!timeoutMs) return lookup;

    return new Promise(function (resolve) {
      var completed = false;
      var timer = window.setTimeout(function () {
        if (completed) return;
        completed = true;
        resolve(metadata);
      }, timeoutMs);

      lookup.then(function (data) {
        if (completed) return;
        completed = true;
        window.clearTimeout(timer);
        resolve(data);
      });
    });
  }

  function initForm(form) {
    applyToForm(form, metadata);
    ready().then(function (data) {
      applyToForm(form, data);
    });

    form.addEventListener("submit", function (event) {
      if (form.getAttribute("data-visitor-metadata-ready") === "true") return;
      event.preventDefault();
      ready(1600).then(function (data) {
        applyToForm(form, data);
        form.setAttribute("data-visitor-metadata-ready", "true");
        if (form.requestSubmit) {
          form.requestSubmit();
        } else {
          form.submit();
        }
      });
    });
  }

  window.RichardVisitorMetadata = {
    ready: ready,
    getCurrent: function () {
      return metadata;
    },
    applyToForm: applyToForm
  };

  Array.prototype.slice.call(document.querySelectorAll("[data-visitor-metadata]"))
    .forEach(initForm);
})();
