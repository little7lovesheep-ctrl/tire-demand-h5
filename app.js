(function () {
  "use strict";

  var BAIDU_AK = "tipOj2H6KHtBlXMR6wHxpN1jBlmIPkD0";
  var state = { service: "换胎", time: "今天", geoCity: "", mapAddress: "", useCurrent: true, bMapReady: false };

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function updateActive(group, selected) {
    var btns = $$(group);
    for (var i = 0; i < btns.length; i++) {
      var isActive = btns[i] === selected;
      btns[i].className = btns[i].className.replace(/ ?active/g, "");
      if (isActive) btns[i].className += " active";
      btns[i].setAttribute("aria-pressed", isActive ? "true" : "false");
    }
  }

  function showToast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.className = "toast show";
    setTimeout(function () { t.className = "toast"; }, 2200);
  }

  // 定位相关
  function detectLocation() {
    var lt = $("#locationText");
    var retry = $("#locationRetry");
    lt.textContent = "正在定位...";
    retry.hidden = true;

    if (!navigator.geolocation) {
      lt.textContent = "浏览器不支持定位，请手动选择";
      retry.hidden = false;
      return;
    }

    navigator.geolocation.getCurrentPosition(
      function (pos) {
        reverseGeocode(pos.coords.longitude, pos.coords.latitude);
      },
      function () {
        lt.textContent = "定位失败，请点击重试或手动填写";
        retry.hidden = false;
      },
      { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
    );
  }

  function reverseGeocode(lng, lat) {
    var lt = $("#locationText");
    var retry = $("#locationRetry");
    var cbName = "geoCallback_" + Date.now();
    var url = "https://api.map.baidu.com/reverse_geocoding/v3/?ak=" + BAIDU_AK
      + "&output=json&coordtype=wgs84ll&location=" + lat + "," + lng + "&callback=" + cbName;

    window[cbName] = function (data) {
      delete window[cbName];
      if (data && data.status === 0 && data.result) {
        var comp = data.result.addressComponent;
        var city = comp.city || comp.province || "";
        var district = comp.district || "";
        var display = district ? city + district : city;
        if (display) {
          state.geoCity = display;
          lt.textContent = display;
          retry.hidden = false;
        } else {
          lt.textContent = "无法识别位置，请手动填写";
          retry.hidden = false;
        }
      } else {
        lt.textContent = "定位服务暂不可用，请手动填写";
        retry.hidden = false;
      }
    };

    var script = document.createElement("script");
    script.src = url;
    script.onerror = function () {
      lt.textContent = "地址解析失败，请手动填写";
      retry.hidden = false;
      script.remove();
    };
    document.head.appendChild(script);

    setTimeout(function () {
      if (!state.geoCity) {
        lt.textContent = "定位超时，请手动填写";
        retry.hidden = false;
      }
    }, 8000);
  }

  // 地图相关
  var map = null;
  var mapMarker = null;

  function loadBaiduMap(cb) {
    if (state.bMapReady) { cb(); return; }
    $("#mapResult").textContent = "地图加载中...";
    window.initBMap = function () {
      state.bMapReady = true;
      cb();
    };
    var s = document.createElement("script");
    s.src = "https://api.map.baidu.com/api?v=3.0&ak=" + BAIDU_AK + "&callback=initBMap";
    s.onerror = function () { $("#mapResult").textContent = "地图加载失败，请手动输入"; };
    document.head.appendChild(s);
  }

  function initMap() {
    try {
      var Lib = (typeof BMapGL !== "undefined") ? BMapGL : BMap;
      map = new Lib.Map("mapContainer");
      map.centerAndZoom(new Lib.Point(116.404, 39.915), 13);
      map.enableScrollWheelZoom(true);
      $("#mapResult").textContent = "点击地图选择位置";

      if (state.geoCity) {
        var gc = new Lib.Geocoder();
        gc.getPoint(state.geoCity, function (pt) {
          if (pt) map.centerAndZoom(pt, 13);
        });
      }

      map.addEventListener("click", function (e) {
        var pt = e.latlng || e.point;
        if (!pt) return;
        if (mapMarker) { mapMarker.setPosition(pt); }
        else { mapMarker = new Lib.Marker(pt); map.addOverlay(mapMarker); }

        var gc2 = new Lib.Geocoder();
        gc2.getLocation(pt, function (r) {
          if (r) {
            state.mapAddress = r.address;
            $("#mapResult").textContent = r.address;
          }
        });
      });
    } catch (ex) {
      $("#mapResult").textContent = "地图初始化失败，请手动输入";
    }
  }

  function openMap() {
    $("#mapModal").className = "modal-backdrop open";
    $("#mapModal").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (!map) loadBaiduMap(initMap);
  }

  function closeMap() {
    $("#mapModal").className = "modal-backdrop";
    $("#mapModal").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  // 事件委托
  document.addEventListener("click", function (e) {
    var target = e.target.closest ? e.target.closest("button, [data-service], [data-time], #locationCurrent, #locationRetry") : e.target;
    if (!target) return;

    if (target.hasAttribute("data-service")) {
      state.service = target.getAttribute("data-service");
      updateActive("[data-service]", target);
      return;
    }

    if (target.hasAttribute("data-time")) {
      state.time = target.getAttribute("data-time");
      updateActive("[data-time]", target);
      return;
    }

    if (target.id === "useCurrentBtn") {
      state.useCurrent = true;
      $("#useCurrentBtn").className = "toggle-btn active";
      $("#useCurrentBtn").setAttribute("aria-pressed", "true");
      $("#useOtherBtn").className = "toggle-btn";
      $("#useOtherBtn").setAttribute("aria-pressed", "false");
      $("#locationOther").hidden = true;
      return;
    }

    if (target.id === "useOtherBtn") {
      state.useCurrent = false;
      $("#useOtherBtn").className = "toggle-btn active";
      $("#useOtherBtn").setAttribute("aria-pressed", "true");
      $("#useCurrentBtn").className = "toggle-btn";
      $("#useCurrentBtn").setAttribute("aria-pressed", "false");
      $("#locationOther").hidden = false;
      return;
    }

    if (target.id === "locationCurrent" || (target.closest && target.closest("#locationCurrent"))) {
      if (!state.geoCity) detectLocation();
      return;
    }

    if (target.id === "locationRetry") {
      state.geoCity = "";
      detectLocation();
      return;
    }

    if (target.id === "openMapBtn") {
      openMap();
      return;
    }

    if (target.id === "closeMapBtn") {
      closeMap();
      return;
    }

    if (target.id === "confirmMapBtn") {
      if (state.mapAddress) $("#locationInput").value = state.mapAddress;
      closeMap();
      return;
    }

    if (target.id === "closeModal") {
      $("#successModal").className = "modal-backdrop";
      $("#successModal").setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      return;
    }

    if (target === $("#mapModal")) {
      closeMap();
      return;
    }

    if (target === $("#successModal")) {
      $("#successModal").className = "modal-backdrop";
      $("#successModal").setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
      return;
    }
  });

  // 表单提交
  var form = $("#intentForm");
  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      var phone = $("#driverPhone").value.replace(/\s/g, "");
      if (!/^1\d{10}$/.test(phone)) {
        showToast("请输入正确的11位手机号");
        $("#driverPhone").focus();
        return;
      }

      var location = "";
      if (state.useCurrent) {
        location = state.geoCity;
        if (!location) {
          showToast("请先点击定位获取位置或选择手动填写");
          return;
        }
      } else {
        location = ($("#locationInput").value || "").replace(/^\s+|\s+$/g, "");
        if (!location) {
          showToast("请填写期望服务的区域");
          $("#locationInput").focus();
          return;
        }
      }

      var btn = $("#submitButton");
      btn.disabled = true;
      btn.textContent = "提交中...";

      fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: state.service, phone: phone, time: state.time, location: location })
      })
        .then(function (r) { return r.json(); })
        .then(function (data) {
          if (data.success) {
            var html = "<div><span>服务类型</span><strong>" + state.service + "</strong></div>"
              + "<div><span>联系电话</span><strong>" + phone + "</strong></div>"
              + "<div><span>预计时间</span><strong>" + state.time + "</strong></div>"
              + "<div><span>服务区域</span><strong>" + location + "</strong></div>";
            $("#bookingResult").innerHTML = html;
            $("#successModal").className = "modal-backdrop open";
            $("#successModal").setAttribute("aria-hidden", "false");
            document.body.style.overflow = "hidden";
          } else {
            showToast(data.error || "提交失败，请重试");
          }
        })
        .catch(function () { showToast("网络异常，请重试"); })
        .finally(function () {
          btn.disabled = false;
          btn.textContent = "免费获取报价";
        });
    });
  }
})();
