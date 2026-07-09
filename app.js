(function () {
  "use strict";

  var state = { service: "换胎", time: "今天", geoCity: "", useCurrent: true };

  function $(sel) { return document.querySelector(sel); }
  function $$(sel) { return document.querySelectorAll(sel); }

  function updateActive(group, selected) {
    var btns = $$(group);
    for (var i = 0; i < btns.length; i++) {
      var isActive = btns[i] === selected;
      btns[i].className = btns[i].className.replace(" active", "");
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

  document.addEventListener("click", function (e) {
    var target = e.target.closest ? e.target.closest("button, [data-service], [data-time]") : e.target;
    if (!target) return;

    // 服务类型
    if (target.hasAttribute("data-service")) {
      state.service = target.getAttribute("data-service");
      updateActive("[data-service]", target);
      return;
    }

    // 时间选择
    if (target.hasAttribute("data-time")) {
      state.time = target.getAttribute("data-time");
      updateActive("[data-time]", target);
      return;
    }

    // 当前位置按钮
    if (target.id === "useCurrentBtn") {
      state.useCurrent = true;
      $("#useCurrentBtn").className = "toggle-btn active";
      $("#useCurrentBtn").setAttribute("aria-pressed", "true");
      $("#useOtherBtn").className = "toggle-btn";
      $("#useOtherBtn").setAttribute("aria-pressed", "false");
      $("#locationOther").hidden = true;
      return;
    }

    // 其他位置按钮
    if (target.id === "useOtherBtn") {
      state.useCurrent = false;
      $("#useOtherBtn").className = "toggle-btn active";
      $("#useOtherBtn").setAttribute("aria-pressed", "true");
      $("#useCurrentBtn").className = "toggle-btn";
      $("#useCurrentBtn").setAttribute("aria-pressed", "false");
      $("#locationOther").hidden = false;
      return;
    }

    // 定位区域点击
    if (target.id === "locationCurrent" || target.closest && target.closest("#locationCurrent")) {
      if (state.geoCity) return;
      var lt = $("#locationText");
      lt.textContent = "正在定位...";
      if (!navigator.geolocation) {
        lt.textContent = "浏览器不支持定位，请手动选择";
        return;
      }
      navigator.geolocation.getCurrentPosition(
        function (pos) {
          state.geoCity = pos.coords.latitude.toFixed(2) + "," + pos.coords.longitude.toFixed(2);
          lt.textContent = "定位成功";
        },
        function () {
          lt.textContent = "定位失败，请手动填写";
        },
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 300000 }
      );
      return;
    }

    // 关闭成功弹窗
    if (target.id === "closeModal") {
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
          showToast("请先点击定位或选择其他位置手动填写");
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

      var payload = JSON.stringify({
        service: state.service,
        phone: phone,
        time: state.time,
        location: location
      });

      fetch("/api/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload
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
